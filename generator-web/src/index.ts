
// Browser cover generator — compiles typst files via WebAssembly, supports PDF/SVG/PNG output

import {createTypstCompiler, CompileFormatEnum} from '@myriaddreamin/typst.ts/compiler'
import {createTypstRenderer} from '@myriaddreamin/typst.ts/renderer'
import type {TypstCompiler} from '@myriaddreamin/typst.ts/compiler'
import type {TypstRenderer} from '@myriaddreamin/typst.ts/renderer'
import {loadFonts} from '@myriaddreamin/typst.ts'
import {build, cover_schema, calculate_dimensions, split_svg, split_png} from '@paper/cover-generator'
import type {OutputFormat, SplitResult, PrinterDimensions} from '@paper/cover-generator'

export type {CoverSchema, PrinterConfig, CoverColors, ThemeName, FontName,
    OutputFormat, SplitResult} from '@paper/cover-generator'

const decoder = new TextDecoder()
const encoder = new TextEncoder()

// Singleton compiler and renderer, created on first init()
let compiler:TypstCompiler | null = null
let renderer:TypstRenderer | null = null

export interface InitOptions {
    // URL or path to typst_ts_web_compiler_bg.wasm — required
    wasm_url:string
    // URL or path to typst_ts_renderer_bg.wasm — required for SVG/PNG output
    renderer_wasm_url?:string
    // Base URL for Typst font files (e.g. '/fonts/' to serve locally).
    // Defaults to the jsDelivr typst-assets CDN.
    font_url_prefix?:string
}

export interface GenerateOptions {
    schema:unknown
    image?:Uint8Array
    image_ext?:string
    // Output format: 'pdf' (default), 'svg', or 'png'
    format?:OutputFormat
    // PPI for PNG output (default 144)
    ppi?:number
    // Whether to split the result into front/back/spine panels
    split?:boolean
}

export interface GenerateResult {
    // The full cover data (PDF/PNG bytes, or UTF-8 SVG bytes)
    data:Uint8Array
    // Split panel data (only present when split is true and format is svg/png)
    split?:SplitResult<Uint8Array>
}

/**
 * Initialise the Typst WASM compiler and optional renderer.
 * Must be called once before generate(). Calling again is a no-op.
 */
export async function init(options:InitOptions):Promise<void> {
    // Font loader config shared by compiler and renderer
    const font_opts = loadFonts([], {
        assets: ['text'],
        ...(options.font_url_prefix ? {assetUrlPrefix: options.font_url_prefix} : {}),
    })

    // Initialise compiler (always needed)
    if (!compiler) {
        const c = createTypstCompiler()
        await c.init({
            getModule: () => options.wasm_url,
            beforeBuild: [font_opts],
        })
        compiler = c
    }

    // Initialise renderer (needed for SVG/PNG output)
    if (!renderer && options.renderer_wasm_url) {
        const r = createTypstRenderer()
        await r.init({
            getModule: () => options.renderer_wasm_url!,
            beforeBuild: [font_opts],
        })
        renderer = r
    }
}

/** Load the typst file map into the compiler's shadow filesystem */
function load_files(files:Map<string, Uint8Array>):void {
    compiler!.resetShadow()
    for (const [filename, bytes] of files) {
        const vpath = `/${filename}`
        if (filename.endsWith('.typ')) {
            compiler!.addSource(vpath, decoder.decode(bytes))
        }
        else {
            compiler!.mapShadow(vpath, bytes)
        }
    }
}

/** Compile to PDF and return raw bytes */
async function compile_pdf():Promise<Uint8Array> {
    const result = await compiler!.compile({
        mainFilePath: '/cover.typ',
        format: CompileFormatEnum.pdf,
    })
    if (!result.result) {
        throw_compile_error(result.diagnostics)
    }
    return result.result!
}

/** Compile to vector format, then render as SVG string covering the full canvas */
async function compile_svg(dims:PrinterDimensions):Promise<string> {
    assert_renderer('SVG')
    const result = await compiler!.compile({
        mainFilePath: '/cover.typ',
        format: CompileFormatEnum.vector,
    })
    if (!result.result) {
        throw_compile_error(result.diagnostics)
    }

    // Without a window, renderSvg defaults to showing only the first page's trim area.
    // Pass the full canvas bounds so the viewBox covers the complete spread (matching
    // what the node CLI produces with `typst compile`).
    const in_to_pt = (i:number) => i * 72
    const w = in_to_pt(dims.total_width)
    const h = in_to_pt(dims.total_height)
    return await renderer!.renderSvg({
        artifactContent: result.result!,
        format: 'vector',
        // window: {lo: {x: 0, y: 0}, hi: {x: w, y: h}},
        data_selection: {js: false, css: true, body: true, defs: true},
    })
}

/** Compile to vector format, then render as PNG via offscreen canvas */
async function compile_png(ppi:number):Promise<Uint8Array> {
    assert_renderer('PNG')
    const result = await compiler!.compile({
        mainFilePath: '/cover.typ',
        format: CompileFormatEnum.vector,
    })
    if (!result.result) {
        throw_compile_error(result.diagnostics)
    }

    // Render to a canvas at the desired PPI (typst uses 72pt/inch)
    const scale = ppi / 72
    const canvas = document.createElement('canvas')

    await renderer!.renderCanvas({
        artifactContent: result.result!,
        format: 'vector',
        canvas,
        pageOffset: 0,
        pixelPerPt: scale,
        backgroundColor: '#ffffff',
    })

    // Extract PNG from canvas
    const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/png')
    })
    return new Uint8Array(await blob.arrayBuffer())
}

/** Crop a region from a PNG using the Canvas API — used as PngCropFn */
async function canvas_crop(
    data:Uint8Array,
    x:number,
    y:number,
    w:number,
    h:number,
):Promise<Uint8Array> {
    const blob = new Blob([data as BlobPart], {type: 'image/png'})
    const bitmap = await createImageBitmap(blob)

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(bitmap, x, y, w, h, 0, 0, w, h)
    bitmap.close()

    const out_blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/png')
    })
    return new Uint8Array(await out_blob.arrayBuffer())
}

/** Throw if the renderer was not initialised */
function assert_renderer(format:string):void {
    if (!renderer) {
        throw new Error(
            `[generator-web] ${format} output requires renderer_wasm_url in init() options`
        )
    }
}

/** Format compilation diagnostics into a readable error */
function throw_compile_error(diagnostics:unknown):never {
    const diag = Array.isArray(diagnostics)
        ? diagnostics.map((d) => (typeof d === 'string' ? d : JSON.stringify(d))).join('\n')
        : 'unknown error'
    throw new Error(`[generator-web] Typst compilation failed:\n${diag}`)
}

/**
 * Generate a book cover in the browser using the Typst WASM compiler.
 *
 * @param options - Generation options (schema, image, format, split)
 * @returns The generated cover data and optional split panels
 */
export async function generate(options:GenerateOptions):Promise<GenerateResult> {
    if (!compiler) {
        throw new Error('[generator-web] Call init() before generate()')
    }

    const format = options.format ?? 'pdf'
    const ppi = options.ppi ?? 144
    const should_split = options.split ?? false

    // Parse schema to access printer config for dimension calculation
    const parsed = cover_schema.parse(options.schema)
    const dims = calculate_dimensions(parsed.size, parsed.printer)

    // Splitting only applies for non-PDF formats with a spine
    const can_split = should_split && dims.has_spine && format !== 'pdf'

    // Build all typst files in memory and load into the compiler
    const image_input = options.image
        ? {data: options.image, ext: options.image_ext ?? '.jpg'}
        : undefined
    const files = build(parsed, image_input)
    load_files(files)

    // Compile to the requested format
    let data:Uint8Array
    let svg_string:string | undefined

    if (format === 'pdf') {
        data = await compile_pdf()
    }
    else if (format === 'svg') {
        svg_string = await compile_svg(dims)
        data = encoder.encode(svg_string)
    }
    else {
        data = await compile_png(ppi)
    }

    const result:GenerateResult = {data}

    // Split into front/back/spine panels
    if (can_split) {
        if (format === 'svg') {
            const parts = split_svg(svg_string!, dims)
            result.split = {
                front: encoder.encode(parts.front),
                back: encoder.encode(parts.back),
                spine: parts.spine ? encoder.encode(parts.spine) : undefined,
            }
        }
        else if (format === 'png') {
            result.split = await split_png(data, dims, ppi, canvas_crop)
        }
    }

    return result
}
