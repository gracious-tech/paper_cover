
// Color utility functions for deriving cover color schemes

/** Convert a hex color string to an HSL tuple [h, s, l] */
export function hex_to_hsl(hex:string): [number, number, number] {
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    const l = (max + min) / 2
    if (max === min)
        return [0, 0, l * 100]
    const d = max - min
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    let h = 0
    if (max === r)
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g)
        h = ((b - r) / d + 2) / 6
    else
        h = ((r - g) / d + 4) / 6
    return [h * 360, s * 100, l * 100]
}

/** Convert HSL values to a hex color string */
export function hsl_to_hex(h:number, s:number, l:number): string {
    h = ((h % 360) + 360) % 360
    s = Math.max(0, Math.min(100, s)) / 100
    l = Math.max(0, Math.min(100, l)) / 100
    const c = (1 - Math.abs(2 * l - 1)) * s
    const x = c * (1 - Math.abs((h / 60) % 2 - 1))
    const m = l - c / 2
    let r = 0, g = 0, b = 0
    // Assign RGB based on hue sector
    if (h < 60)       { r = c; g = x; b = 0 }
    else if (h < 120) { r = x; g = c; b = 0 }
    else if (h < 180) { r = 0; g = c; b = x }
    else if (h < 240) { r = 0; g = x; b = c }
    else if (h < 300) { r = x; g = 0; b = c }
    else              { r = c; g = 0; b = x }
    const to_hex = (n:number) => Math.round((n + m) * 255).toString(16).padStart(2, '0')
    return `#${to_hex(r)}${to_hex(g)}${to_hex(b)}`
}

/** Derive all 12 cover colors from dark/light mode and two key colors */
export function derive_colors(dark:boolean, primary:string, secondary:string): Record<string, string> {
    const [ph, ps] = hex_to_hsl(primary)
    const [sh]     = hex_to_hsl(secondary)

    // Dark mode color derivations
    if (dark) {
        return {
            front_background:    primary,
            back_background:     hsl_to_hex(ph, ps * 0.85, 10),
            spine_background:    secondary,
            accent:              secondary,
            front_title:         hsl_to_hex(ph, 18, 92),
            front_title_pre:     hsl_to_hex(sh, 85, 72),
            front_title_post:    hsl_to_hex(sh, 85, 72),
            front_subtitle:      hsl_to_hex(ph, 28, 70),
            front_author:        hsl_to_hex(ph, 18, 78),
            back_blurb:          hsl_to_hex(ph, 14, 84),
            spine_title:         hsl_to_hex(ph, ps * 0.8, 12),
            spine_author:        hsl_to_hex(ph, ps * 0.7, 18),
        }
    }

    // Light mode color derivations
    return {
        front_background:    hsl_to_hex(ph, 55, 90),
        back_background:     hsl_to_hex(ph, 35, 94),
        spine_background:    primary,
        accent:              primary,
        front_title:         hsl_to_hex(ph, ps * 0.6, 13),
        front_title_pre:     secondary,
        front_title_post:    secondary,
        front_subtitle:      hsl_to_hex(ph, ps * 0.45, 32),
        front_author:        hsl_to_hex(ph, ps * 0.35, 26),
        back_blurb:          hsl_to_hex(ph, 16, 18),
        spine_title:         hsl_to_hex(sh, 18, 94),
        spine_author:        hsl_to_hex(sh, 22, 84),
    }
}
