
// Printer specifications and physical dimension calculations

import {mm_to_in} from './utils.js'
import type {PrinterConfig, CoverSchema} from './schema.js'

// Spine width in inches per page, by printer and paper type
const SPINE_PPI = {
    kdp:  {white: 0.002252, cream: 0.0025},
    lulu: {white: 0.002252, cream: 0.0025, color: 0.002347},
    generic: {white: 0.002252},
} as const

// Bleed in inches
const BLEED_IN = 0.125

// Minimum spine width in inches (KDP enforces a minimum for text to appear)
const MIN_SPINE_IN = 0.0625

export interface PrinterDimensions {
    // All values in inches
    trim_width:number
    trim_height:number
    spine_width:number
    bleed:number
    total_width:number
    total_height:number
    // X-anchor positions (from left edge of canvas, in inches)
    back_x:number
    spine_x:number
    front_x:number
    // Flags
    has_spine:boolean
    has_bleed:boolean
}

/** Calculate all physical dimensions for the cover canvas */
export function calculate_dimensions(
    size:CoverSchema['size'],
    printer:PrinterConfig,
):PrinterDimensions {
    // Convert trim dimensions to inches
    const trim_width = size.trim_unit === 'mm' ? mm_to_in(size.trim_width) : size.trim_width
    const trim_height = size.trim_unit === 'mm' ? mm_to_in(size.trim_height) : size.trim_height

    // Home printer: no bleed, no spine, front panel only
    if (printer.name === 'home') {
        return {
            trim_width, trim_height,
            spine_width: 0, bleed: 0,
            total_width: trim_width, total_height: trim_height,
            back_x: 0, spine_x: trim_width, front_x: trim_width,
            has_spine: false, has_bleed: false,
        }
    }

    // Calculate bleed
    let bleed = BLEED_IN
    let spine_width = 0

    if (printer.name === 'custom') {
        // Custom printer: use provided values
        bleed = printer.units === 'mm' ? mm_to_in(printer.bleed) : printer.bleed
        spine_width = printer.units === 'mm' ? mm_to_in(printer.spine_width) : printer.spine_width
    }
    else {
        // Known printers: calculate spine from page count
        const ppi_table = SPINE_PPI[printer.name]
        const paper = (printer as {paper_type:string}).paper_type as keyof typeof ppi_table
        const ppi = ppi_table[paper] as number
        spine_width = size.page_count * ppi
        // Apply minimum spine width silently
        spine_width = Math.max(spine_width, MIN_SPINE_IN)
    }

    const total_width = bleed + trim_width + spine_width + trim_width + bleed
    const total_height = bleed + trim_height + bleed

    return {
        trim_width, trim_height,
        spine_width, bleed,
        total_width, total_height,
        back_x:   bleed,
        spine_x:  bleed + trim_width,
        front_x:  bleed + trim_width + spine_width,
        has_spine: true,
        has_bleed: true,
    }
}
