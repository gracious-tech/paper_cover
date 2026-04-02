
// Public API for the paper cover generator

import {cover_schema} from './schema.js'
import {calculate_dimensions} from './printers.js'
import {get_theme} from './themes.js'
import {calculate_font_sizes} from './font_sizes.js'
import {resolve_colors, resolve_font_family} from './design.js'
import {build_cover_files} from './build_files.js'

export type {CoverSchema, PrinterConfig, CoverColors, ThemeName, FontName} from './schema.js'
export type {PrinterDimensions} from './printers.js'
export type {FontSizes} from './font_sizes.js'
export type {ResolvedColors} from './design.js'
export type {ThemeLayout} from './themes.js'
export type {ImageInput} from './build_files.js'
export type {CropRegion, PixelCropRegion, SplitResult, PngCropFn} from './split.js'

export type OutputFormat = 'pdf' | 'svg' | 'png'

// Re-export lower-level functions needed by generator-node and generator-web
export {cover_schema, calculate_dimensions, get_theme, calculate_font_sizes,
        resolve_colors, resolve_font_family}
export {calculate_crop_regions, calculate_pixel_crop_regions, split_svg, split_png} from './split.js'

/**
 * Validate schema, compute all derived values, and build every file needed
 * for typst compilation — entirely in memory.
 *
 * Returns a Map of filename → bytes. The caller writes these to a working
 * directory (generator-node) or feeds them to a WASM compiler (generator-web).
 *
 * @param schema - Cover specification (text, colors, size, images, theme, printer)
 * @param image  - Optional background image; required when the chosen theme uses one
 */
export function build(
    schema:unknown,
    image?:{data:Uint8Array, ext:string},
):Map<string, Uint8Array> {
    const parsed      = cover_schema.parse(schema)
    const dims        = calculate_dimensions(parsed.size, parsed.printer)
    const colors      = resolve_colors(parsed.colors)
    const font_family = resolve_font_family(parsed.theme.font)
    const font_sizes  = calculate_font_sizes(parsed.text, dims)
    const layout      = get_theme(parsed.theme.name)

    return build_cover_files(parsed, dims, colors, font_family, font_sizes, layout, image)
}
