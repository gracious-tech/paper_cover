
// ISBN barcode generation using bwip-js (SVG output — works in both Node and browser)

import * as bwipjs from 'bwip-js'

const encoder = new TextEncoder()

/**
 * Generate an ISBN-13 barcode as SVG bytes.
 * Uses toSVG() which is platform-independent (no canvas / Node Buffer required).
 * Only called when isbn is present and the printer requires a barcode (e.g. Lulu).
 */
export function generate_isbn_barcode(isbn:string):Uint8Array {
    // Trim surrounding whitespace but preserve internal dashes —
    // bwip-js requires dashes for ISBN grouping validation
    const clean_isbn = isbn.trim()

    const svg = bwipjs.toSVG({
        bcid:        'isbn',
        text:        clean_isbn,
        scale:       3,
        height:      15,       // millimetres
        includetext: true,
        textxalign:  'center',
    })

    return encoder.encode(svg)
}

/**
 * Returns true if the printer requires a barcode embedded in the cover.
 * KDP generates its own barcode during publishing; Lulu requires one on the cover.
 */
export function printer_needs_barcode(printer_name:string):boolean {
    return printer_name === 'lulu'
}
