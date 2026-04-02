
// Cover splitting — crop region calculation, SVG viewBox splitting, PNG split orchestration

import type {PrinterDimensions} from './printers.js'
import {in_to_pt} from './utils.js'

// -- Types --

export interface CropRegion {
    // All values in inches
    x:number
    y:number
    width:number
    height:number
    label:'front' | 'back' | 'spine'
}

export interface PixelCropRegion {
    // All values in pixels
    x:number
    y:number
    width:number
    height:number
    label:'front' | 'back' | 'spine'
}

export interface SplitResult<T> {
    front:T
    back:T
    spine?:T    // undefined when has_spine is false (home printer)
}

// Platform-specific crop callback: receives full PNG data and pixel region, returns cropped PNG
export type PngCropFn = (
    data:Uint8Array, x:number, y:number, w:number, h:number,
) => Promise<Uint8Array>

// -- Crop region calculation --

/** Calculate crop regions (in inches) for front, back, and optionally spine panels.
 *  Bleed is excluded — each panel covers only its trim area. */
export function calculate_crop_regions(dims:PrinterDimensions):CropRegion[] {
    const regions:CropRegion[] = []

    // Back panel: trim area only (skip left and top/bottom bleed)
    regions.push({
        x: dims.bleed,
        y: dims.bleed,
        width: dims.trim_width,
        height: dims.trim_height,
        label: 'back',
    })

    // Spine: only present on non-home printers (skip top/bottom bleed)
    if (dims.has_spine && dims.spine_width > 0) {
        regions.push({
            x: dims.spine_x,
            y: dims.bleed,
            width: dims.spine_width,
            height: dims.trim_height,
            label: 'spine',
        })
    }

    // Front panel: trim area only (skip right and top/bottom bleed)
    regions.push({
        x: dims.front_x,
        y: dims.bleed,
        width: dims.trim_width,
        height: dims.trim_height,
        label: 'front',
    })

    return regions
}

/** Convert crop regions from inches to pixel coordinates at a given PPI.
 *  Widths and heights are derived from edge positions to avoid rounding gaps/overlaps. */
export function calculate_pixel_crop_regions(
    dims:PrinterDimensions,
    ppi:number,
):PixelCropRegion[] {
    return calculate_crop_regions(dims).map(r => {
        // Round edges, then derive size from the difference
        const left = Math.round(r.x * ppi)
        const top = Math.round(r.y * ppi)
        const right = Math.round((r.x + r.width) * ppi)
        const bottom = Math.round((r.y + r.height) * ppi)
        return {x: left, y: top, width: right - left, height: bottom - top, label: r.label}
    })
}

// -- SVG splitting --

/** Split a full-cover SVG into individual panel SVGs by adjusting the viewBox */
export function split_svg(
    svg:string,
    dims:PrinterDimensions,
):SplitResult<string> {
    const regions = calculate_crop_regions(dims)
    const parts = new Map<string, string>()

    for (const region of regions) {
        // Typst SVGs use points (1in = 72pt) as their coordinate system
        const vb_x = in_to_pt(region.x)
        const vb_y = in_to_pt(region.y)
        const vb_w = in_to_pt(region.width)
        const vb_h = in_to_pt(region.height)

        const w_str = vb_w.toFixed(4)
        const h_str = vb_h.toFixed(4)
        const vb_str = `${vb_x.toFixed(4)} ${vb_y.toFixed(4)} ${w_str} ${h_str}`

        // Replace attributes on the root <svg> element
        const cropped = svg.replace(/<svg([^>]*)>/, (_match, attrs:string) => {
            let new_attrs = attrs
            new_attrs = new_attrs.replace(/width="[^"]*"/, `width="${w_str}pt"`)
            new_attrs = new_attrs.replace(/height="[^"]*"/, `height="${h_str}pt"`)

            if (/viewBox="[^"]*"/.test(new_attrs)) {
                new_attrs = new_attrs.replace(/viewBox="[^"]*"/, `viewBox="${vb_str}"`)
            }
            else {
                new_attrs += ` viewBox="${vb_str}"`
            }

            return `<svg${new_attrs}>`
        })

        parts.set(region.label, cropped)
    }

    return {
        front: parts.get('front')!,
        back: parts.get('back')!,
        spine: parts.get('spine'),
    }
}

// -- PNG splitting --

/**
 * Split a full-cover PNG into individual panel PNGs.
 * The actual pixel cropping is delegated to crop_fn, which each platform provides.
 */
export async function split_png(
    png:Uint8Array,
    dims:PrinterDimensions,
    ppi:number,
    crop_fn:PngCropFn,
):Promise<SplitResult<Uint8Array>> {
    const regions = calculate_pixel_crop_regions(dims, ppi)
    const parts = new Map<string, Uint8Array>()

    for (const region of regions) {
        const cropped = await crop_fn(png, region.x, region.y, region.width, region.height)
        parts.set(region.label, cropped)
    }

    return {
        front: parts.get('front')!,
        back: parts.get('back')!,
        spine: parts.get('spine'),
    }
}
