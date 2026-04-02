
// Build all typst compilation files in memory — no disk I/O

import {COVER_TEMPLATE} from './template_content.js'
import {build_data_file} from './data_file.js'
import {generate_isbn_barcode, printer_needs_barcode} from './barcode.js'
import type {CoverSchema} from './schema.js'
import type {PrinterDimensions} from './printers.js'
import type {ResolvedColors} from './design.js'
import type {FontSizes} from './font_sizes.js'
import type {ThemeLayout} from './themes.js'

const encoder = new TextEncoder()

export interface ImageInput {
    // Raw image bytes
    data:Uint8Array
    // File extension including dot: '.jpg', '.png', '.webp'
    ext:string
}

/**
 * Build all files needed for typst compilation, entirely in memory.
 * Returns a map of filename → bytes ready to write into a working directory.
 *
 * The caller is responsible for providing image data when the theme requires it.
 * Throws if the theme requires an image but none is provided.
 */
export function build_cover_files(
    schema:CoverSchema,
    dims:PrinterDimensions,
    colors:ResolvedColors,
    font_family:string,
    font_sizes:FontSizes,
    layout:ThemeLayout,
    image?:ImageInput,
):Map<string, Uint8Array> {
    const files = new Map<string, Uint8Array>()

    // Template
    files.set('cover.typ', encoder.encode(COVER_TEMPLATE))

    // Image asset
    let image_filename:string | null = null
    if (image) {
        const ext = image.ext.startsWith('.') ? image.ext : `.${image.ext}`
        image_filename = `background${ext}`
        files.set(image_filename, image.data)
    }

    // Barcode (SVG — platform-independent, supported by Typst)
    let has_barcode = false
    if (schema.text.isbn && printer_needs_barcode(schema.printer.name)) {
        const barcode_bytes = generate_isbn_barcode(schema.text.isbn)
        files.set('barcode.svg', barcode_bytes)
        has_barcode = true
    }

    // Data file
    const data_content = build_data_file(
        schema, dims, colors, font_family, font_sizes, layout,
        image_filename, has_barcode,
    )
    files.set('_data.typ', encoder.encode(data_content))

    return files
}
