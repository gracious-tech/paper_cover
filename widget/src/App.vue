
<template lang="pug">

//- Sidebar with all form sections
aside.sidebar-panel(class="flex flex-col w-80 shrink-0 bg-(--ui-bg-elevated) border-r border-(--ui-border) overflow-hidden")
    div(class="flex-1 overflow-y-auto flex flex-col")
        div(class="text-[10px] font-bold tracking-[0.08em] uppercase text-(--ui-text-muted) bg-(--ui-bg-accented) border-b border-(--ui-border) px-4 py-[7px]") Content
        div(class="flex flex-col gap-[10px] px-4 py-[14px]")
            ContentSection

        div(class="text-[10px] font-bold tracking-[0.08em] uppercase text-(--ui-text-muted) bg-(--ui-bg-accented) border-t border-b border-(--ui-border) px-4 py-[7px]") Design
        div(class="flex flex-col gap-[10px] px-4 py-[14px]")
            DesignSection

        div(class="text-[10px] font-bold tracking-[0.08em] uppercase text-(--ui-text-muted) bg-(--ui-bg-accented) border-t border-b border-(--ui-border) px-4 py-[7px]") Size &amp; Print
        div(class="flex flex-col gap-[10px] px-4 py-[14px]")
            SizeSection

//- Preview pane with toolbar and content area
div.preview-panel(class="flex-1 flex flex-col overflow-hidden bg-(--ui-bg-muted) min-w-0")
    div(class="flex items-center justify-between px-[14px] py-[10px] bg-(--ui-bg-elevated) border-b border-(--ui-border) shrink-0 gap-[10px]")
        span(class="text-sm" :class="status_class") {{ status_text }}

        //- View mode toggle: 3D / Split panels / Full cover
        div(class="flex items-center gap-0.5")
            UButton(
                v-for="m in VIEW_MODES"
                :key="m.id"
                :label="m.label"
                :variant="view_mode === m.id ? 'soft' : 'ghost'"
                color="neutral"
                size="xl"
                @click="view_mode = m.id"
            )

        div(class="flex items-center gap-2 shrink-0")
            //- Color mode toggle — switches between light and dark
            UButton(
                :icon="is_dark ? 'i-lucide-moon' : 'i-lucide-sun'"
                color="neutral"
                variant="ghost"
                :aria-label="`Switch to ${is_dark ? 'light' : 'dark'} mode`"
                @click="toggle_color_mode"
            )
            UButton(
                color="primary"
                :disabled="!is_ready || is_exporting"
                :loading="is_exporting"
                @click="export_pdf"
            ) Export PDF
            UButton(
                v-if="pdf_blob_url"
                as="a"
                :href="pdf_blob_url"
                download="cover.pdf"
                color="neutral"
                variant="outline"
            ) Download

    //- Preview area — switches between 3D, split panel, and full SVG views
    div(class="flex-1 relative overflow-hidden")

        //- 3D canvas — kept in DOM at all times to preserve the WebGL renderer state
        div(v-show="view_mode === '3d'" class="absolute inset-0 flex items-center justify-center overflow-hidden")
            div(v-if="!has_preview" class="flex flex-col items-center justify-center gap-3 text-dimmed")
                svg(width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round")
                    path(d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z")
                    polyline(points="14 2 14 8 20 8")
                    line(x1="12" y1="18" x2="12" y2="12")
                    line(x1="9" y1="15" x2="15" y2="15")
                p(class="text-[13px]") Generating preview…
            canvas#preview-canvas(
                v-show="has_preview"
                ref="canvas_el"
                class="cursor-grab active:cursor-grabbing select-none"
                style="max-width: 100%; max-height: 100%; display: block;"
                @mousedown="on_mouse_down"
                @mousemove="on_mouse_move"
                @mouseup="on_mouse_up"
                @mouseleave="on_mouse_up"
            )

        //- Split view — panels wrap, each at natural print size (or 100% width if narrower)
        div(v-show="view_mode === 'split'" class="absolute inset-0 flex flex-wrap gap-6 p-6 overflow-auto content-start justify-center")
            div(
                v-for="panel in split_panels"
                :key="panel.face"
                class="flex flex-col items-center gap-2"
            )
                img(
                    :src="svg_data_url(panel.svg)"
                    class="max-w-full h-auto shadow-lg"
                    :alt="panel.face"
                )
                span(class="text-xs font-mono uppercase tracking-widest text-muted") {{ panel.face }}

        //- Full view — complete spread at print size, fills width if narrower
        div(v-show="view_mode === 'full'" class="absolute inset-0 overflow-auto p-6")
            img(
                v-if="full_svg"
                :src="svg_data_url(full_svg)"
                class="w-full h-auto max-w-max shadow-lg"
                alt="Full cover"
            )

</template>

<script setup lang="ts">

// App root — provides form state, handles WASM init, 3D preview, and PDF export

import wasm_url from '@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm?url'
import renderer_wasm_url from '@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm?url'
import {init, generate} from '@paper/cover-generator-web'
import {Book3DRenderer} from '@paper/cover-3d'
import type {CoverType} from '@paper/cover-3d'
import {ref, watch, provide, computed, onMounted, onUnmounted} from 'vue'
import {useColorMode} from '@vueuse/core'
import {make_form, FORM_KEY} from './form_state'
import {derive_colors} from './colors'
import ContentSection from './components/ContentSection.vue'
import DesignSection from './components/DesignSection.vue'
import SizeSection from './components/SizeSection.vue'

// Parse SVG dimensions from width/height attributes
function parse_svg_size(svg:string):{width:number, height:number} {
    const w = svg.match(/width="([\d.]+)(?:pt)?"/)
    const h = svg.match(/height="([\d.]+)(?:pt)?"/)
    if (!w || !h)
        throw new Error('Could not parse SVG dimensions')
    return {width: parseFloat(w[1]), height: parseFloat(h[1])}
}

// Create reactive form state and provide it to all child components
const form = make_form()
provide(FORM_KEY, form)

// Color mode toggle — reads resolved value (not preference) to match actual appearance
const color_mode = useColorMode()

// True when the resolved theme is dark (follows system if preference is 'auto')
const is_dark = computed(() => color_mode.value === 'dark')

/** Toggle between light and dark mode */
function toggle_color_mode(): void {
    color_mode.preference = is_dark.value ? 'light' : 'dark'
}

// UI state refs
const status_text   = ref('Loading…')
const is_generating = ref(false)
const is_exporting  = ref(false)
const is_ready      = ref(false)
const has_preview   = ref(false)
const pdf_blob_url  = ref<string | null>(null)

// View mode: '3d' for 3D preview, 'split' for individual face SVGs, 'full' for the complete spread
type ViewMode = '3d' | 'split' | 'full'
const VIEW_MODES:{id:ViewMode, label:string}[] = [
    {id: '3d',    label: '3D'},
    {id: 'split', label: 'Split'},
    {id: 'full',  label: 'Full'},
]
const view_mode  = ref<ViewMode>('3d')
const split_svgs = ref<{front:string, back:string, spine:string|undefined} | null>(null)
const full_svg   = ref<string | null>(null)

/** Ordered panels for the split view: front, spine (if present), then back */
const split_panels = computed(() => {
    if (!split_svgs.value)
        return []
    const {front, back, spine} = split_svgs.value
    return [
        {face: 'front', svg: front},
        {face: 'back', svg: back},
        ...(spine ? [{face: 'spine', svg: spine}] : []),
    ]
})

/** Convert an SVG string to a base64 data URL for use as an img src */
function svg_data_url(svg:string):string {
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)))
}

// Canvas element and 3D renderer
const canvas_el = ref<HTMLCanvasElement | null>(null)
let renderer:Book3DRenderer | null = null

// Current camera angles; defaults show front + spine at a gentle tilt
const default_az = -30
const default_el = 20
let current_az   = default_az
let current_el   = default_el

// RAF handle to throttle mouse-driven renders
let raf_id:number | null = null

// Track the current status class ('', 'ok', or 'error') for styling
const status_cls = ref<'' | 'ok' | 'error'>('')

// Compute the Tailwind colour class for the status text
const status_class = computed(() => {
    if (status_cls.value === 'ok')
        return 'text-green-600 dark:text-green-400'
    if (status_cls.value === 'error')
        return 'text-red-500 dark:text-red-400'
    return 'text-(--ui-text-muted)'
})

/** Update the status message and its visual class */
function set_status(msg:string, cls:'' | 'ok' | 'error' = ''): void {
    status_text.value = msg
    status_cls.value  = cls
}

/** Build the printer config object based on selected printer name */
function build_printer(): Record<string, unknown> {
    const name = form.printer_name
    // KDP and Lulu include a paper type
    if (name === 'kdp')
        return {name, paper_type: form.paper_type}
    if (name === 'lulu')
        return {name, paper_type: form.paper_type}
    // Custom printer includes bleed, spine, and units
    if (name === 'custom')
        return {name, bleed: form.custom_bleed, spine_width: form.custom_spine, units: form.custom_units}
    // Generic and home printers need only a name
    return {name}
}

/** Assemble the full schema object from current form state */
function build_schema(): Record<string, unknown> {
    // Collect optional text fields
    const text: Record<string, string> = {
        title:      form.title,
        back_blurb: form.back_blurb,
    }
    if (form.title_pre)  text['title_pre']  = form.title_pre
    if (form.title_post) text['title_post'] = form.title_post
    if (form.subtitle)   text['subtitle']   = form.subtitle
    if (form.author)     text['author']     = form.author
    if (form.isbn)       text['isbn']       = form.isbn

    return {
        text,
        colors:  derive_colors(form.color_mode_dark, form.primary_color, form.secondary_color),
        size: {
            trim_width:  form.trim_width,
            trim_height: form.trim_height,
            trim_unit:   form.trim_unit,
            page_count:  form.page_count,
        },
        images: {},
        theme: {
            name: form.theme,
            font: form.font,
        },
        printer: build_printer(),
    }
}

/** Read the background image file as a Uint8Array if one is selected */
async function read_image(): Promise<{data:Uint8Array, ext:string} | undefined> {
    if (!form.bg_image)
        return undefined
    const buf = await form.bg_image.arrayBuffer()
    const ext = '.' + form.bg_image.name.split('.').pop()!.toLowerCase()
    return {data: new Uint8Array(buf), ext}
}

/** Determine the cover type from the current printer selection */
function get_cover_type():CoverType {
    // Home and generic printers are typically paperback; others default to paperback too
    // This can be extended when the form has an explicit cover type field
    return 'paperback'
}

/** Copy the renderer's OffscreenCanvas onto the displayed canvas element */
function blit_to_canvas():void {
    if (!canvas_el.value || !renderer)
        return
    const ctx = canvas_el.value.getContext('2d')
    if (!ctx)
        return
    // Set display canvas logical size to match renderer's size (CSS will scale it)
    const el = canvas_el.value
    if (el.width !== renderer.canvas.width || el.height !== renderer.canvas.height) {
        el.width  = renderer.canvas.width
        el.height = renderer.canvas.height
    }
    ctx.clearRect(0, 0, el.width, el.height)
    ctx.drawImage(renderer.canvas, 0, 0)
}

/** Render 3D book at the given angles and copy result to the display canvas */
function do_render(az:number, el:number):void {
    if (!renderer)
        return
    renderer.render(az, el)
    blit_to_canvas()
}

/** Run SVG generation and update all three view modes */
async function run_generate(): Promise<void> {
    if (!is_ready.value || is_generating.value)
        return
    is_generating.value = true
    set_status('Generating…')

    try {
        const schema = build_schema()
        const img    = await read_image()

        // Generate SVG with split panels (needed for 3D renderer and split view)
        const result = await generate({
            schema,
            image:      img?.data,
            image_ext:  img?.ext,
            format:     'svg',
            split:      true,
        })

        if (!result.split)
            throw new Error('[3D preview] SVG split result missing')

        const cover_type = get_cover_type()
        const decode = (b:Uint8Array) => new TextDecoder().decode(b)

        // Store SVGs for the split and full views
        const svgs = {
            front: decode(result.split.front),
            back:  decode(result.split.back),
            spine: result.split.spine ? decode(result.split.spine) : undefined,
        }
        split_svgs.value = svgs
        full_svg.value   = decode(result.data)

        // Create renderer at high quality (4x resolution), maintaining book aspect ratio
        const svg_size = parse_svg_size(svgs.front)
        const aspect_ratio = svg_size.width / svg_size.height
        const dpr = 4
        const target_h = 600
        const pw = Math.round(target_h * aspect_ratio * dpr)
        const ph = Math.round(target_h * dpr)

        if (!renderer || renderer.canvas.width !== pw || renderer.canvas.height !== ph) {
            renderer?.destroy()
            renderer = new Book3DRenderer(pw, ph)
        }

        await renderer.load(svgs, cover_type)

        has_preview.value = true
        do_render(current_az, current_el)
        set_status('Ready', 'ok')
    }
    catch (err:unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        set_status(msg, 'error')
        console.error(err)
    }
    finally {
        is_generating.value = false
    }
}

/** Explicitly generate and download a PDF (on button click only) */
async function export_pdf(): Promise<void> {
    if (!is_ready.value || is_exporting.value)
        return
    is_exporting.value = true
    const prev_status = status_text.value

    try {
        const schema = build_schema()
        const img    = await read_image()
        const result = await generate({schema, image: img?.data, image_ext: img?.ext})

        // Revoke previous PDF blob URL to free memory
        if (pdf_blob_url.value)
            URL.revokeObjectURL(pdf_blob_url.value)

        // .slice() produces Uint8Array<ArrayBuffer> (not ArrayBufferLike), satisfying BlobPart
        const blob = new Blob([result.data.slice()], {type: 'application/pdf'})
        pdf_blob_url.value = URL.createObjectURL(blob)

        // Auto-trigger download
        const a = document.createElement('a')
        a.href     = pdf_blob_url.value
        a.download = 'cover.pdf'
        a.click()
    }
    catch (err:unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        set_status(msg, 'error')
        console.error(err)
        return
    }
    finally {
        is_exporting.value = false
    }

    set_status(prev_status, status_cls.value)
}

/** Standard debounce — delays fn until ms have elapsed since last call */
function debounce(fn:() => void, ms:number): () => void {
    let timer: ReturnType<typeof setTimeout>
    return () => {
        clearTimeout(timer)
        timer = setTimeout(fn, ms)
    }
}

// Debounced auto-generation triggered by any form change
const schedule_generate = debounce(run_generate, 700)

// Deeply watch the reactive form object and schedule generation on any change
watch(form, schedule_generate)

// Drag state for click-and-drag rotation
let drag_active  = false
let drag_start_x = 0
let drag_start_y = 0
let drag_base_az = default_az
let drag_base_el = default_el

// Sensitivity: degrees of rotation per pixel dragged
const AZ_SENS = 0.5
const EL_SENS = 0.3

// Mouse down: begin drag, record starting position and current angles
function on_mouse_down(e:MouseEvent):void {
    if (!has_preview.value)
        return
    drag_active  = true
    drag_start_x = e.clientX
    drag_start_y = e.clientY
    drag_base_az = current_az
    drag_base_el = current_el
}

// Mouse move: update angles based on drag delta and re-render via RAF
function on_mouse_move(e:MouseEvent):void {
    if (!drag_active || !has_preview.value)
        return

    current_az = drag_base_az + (e.clientX - drag_start_x) * AZ_SENS
    // Clamp elevation to 45° range (±45°) — prevents near-vertical/top-down viewing
    current_el = Math.max(-45, Math.min(45, drag_base_el - (e.clientY - drag_start_y) * EL_SENS))

    // Throttle to one render per animation frame
    if (raf_id === null)
        raf_id = requestAnimationFrame(() => {
            raf_id = null
            do_render(current_az, current_el)
        })
}

// Mouse up / leave: end drag, keep current angle
function on_mouse_up():void {
    drag_active = false
}

// -- createImageBitmap smoke tests (runs on startup, results in browser console) --

/** Try createImageBitmap on a given SVG string; log pass/fail with label */
async function test_bitmap(label:string, svg:string, w = 100, h = 100):Promise<boolean> {
    try {
        const blob = new Blob([svg], {type: 'image/svg+xml'})
        const bmp = await createImageBitmap(blob, {resizeWidth: w, resizeHeight: h})
        bmp.close()
        console.log(`[bitmap-test] PASS  ${label}`)
        return true
    }
    catch (e) {
        console.warn(`[bitmap-test] FAIL  ${label}`, e)
        return false
    }
}


// Fonts are served from the local /fonts/ directory (widget/public/fonts/)
const font_url_prefix = new URL('/fonts/', window.location.href).href


// Initialise the WASM compiler then trigger the first preview generation
init({wasm_url, renderer_wasm_url, font_url_prefix}).then(() => {
    is_ready.value = true
    set_status('Ready', 'ok')
    run_generate()
}).catch((err:unknown) => {
    const msg = err instanceof Error ? err.message : String(err)
    set_status(`WASM init failed: ${msg}`, 'error')
})

// Clean up the renderer when the app is torn down
onUnmounted(() => {
    renderer?.destroy()
    renderer = null
    if (raf_id !== null)
        cancelAnimationFrame(raf_id)
})

onMounted(() => {
    // nothing — renderer is created lazily on first generate()
})

</script>
