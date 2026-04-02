
// Unit conversion and string escaping utilities

/** Convert millimetres to inches */
export function mm_to_in(mm:number):number {
    return mm / 25.4
}

/** Convert inches to points (1 inch = 72pt) */
export function in_to_pt(inches:number):number {
    return inches * 72
}

/** Convert millimetres to points */
export function mm_to_pt(mm:number):number {
    return in_to_pt(mm_to_in(mm))
}

/** Format a point value as a Typst length literal (e.g. "36.0000pt") */
export function pt_to_typst(pt:number):string {
    return pt.toFixed(4) + 'pt'
}

/**
 * Escape a string for embedding as a Typst double-quoted string literal.
 * Escapes backslashes and double-quotes only.
 */
export function escape_typst_str(s:string):string {
    return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

/**
 * Escape a string for embedding as a Typst content block ([...]).
 * Only ] needs escaping inside content blocks.
 */
export function escape_typst_content(s:string):string {
    return s.replace(/]/g, '\\]')
}

/** Clamp a number between min and max */
export function clamp(value:number, min:number, max:number):number {
    return Math.max(min, Math.min(max, value))
}
