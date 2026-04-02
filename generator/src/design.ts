
// Resolve final color and font values, applying defaults where fields are omitted

import type {CoverColors, CoverSchema} from './schema.js'

// Font families available in the typst-assets WASM bundle (text asset group)
const FONT_FAMILIES:Record<CoverSchema['theme']['font'], string> = {
    serif: 'Libertinus Serif',
    sans:  'New Computer Modern',
    mono:  'DejaVu Sans Mono',
}

// Baseline default colors (light theme)
const COLOR_DEFAULTS:Required<CoverColors> = {
    front_background:  '#ffffff',
    back_background:   '#ffffff',
    spine_background:  '#333333',
    front_title:       '#1a1a1a',
    front_title_pre:   '#555555',
    front_title_post:  '#555555',
    front_subtitle:    '#333333',
    front_author:      '#333333',
    back_blurb:        '#1a1a1a',
    spine_title:       '#ffffff',
    spine_author:      '#dddddd',
    accent:            '#333333',
}

export interface ResolvedColors {
    front_background:string
    back_background:string
    spine_background:string
    front_title:string
    front_title_pre:string
    front_title_post:string
    front_subtitle:string
    front_author:string
    back_blurb:string
    spine_title:string
    spine_author:string
    accent:string
}

/** Merge user-supplied colors with defaults, deriving related fields when possible */
export function resolve_colors(colors:CoverColors):ResolvedColors {
    const accent = colors.accent ?? COLOR_DEFAULTS.accent

    return {
        front_background:  colors.front_background  ?? COLOR_DEFAULTS.front_background,
        // Back background falls back to front background
        back_background:   colors.back_background   ?? colors.front_background ?? COLOR_DEFAULTS.back_background,
        // Spine background falls back to accent
        spine_background:  colors.spine_background  ?? accent,
        front_title:       colors.front_title       ?? COLOR_DEFAULTS.front_title,
        front_title_pre:   colors.front_title_pre   ?? colors.front_title ?? COLOR_DEFAULTS.front_title_pre,
        front_title_post:  colors.front_title_post  ?? colors.front_title ?? COLOR_DEFAULTS.front_title_post,
        front_subtitle:    colors.front_subtitle    ?? COLOR_DEFAULTS.front_subtitle,
        front_author:      colors.front_author      ?? COLOR_DEFAULTS.front_author,
        back_blurb:        colors.back_blurb        ?? COLOR_DEFAULTS.back_blurb,
        spine_title:       colors.spine_title       ?? COLOR_DEFAULTS.spine_title,
        spine_author:      colors.spine_author      ?? COLOR_DEFAULTS.spine_author,
        accent,
    }
}

/** Get the Typst font family string for the chosen font */
export function resolve_font_family(font:CoverSchema['theme']['font']):string {
    return FONT_FAMILIES[font]
}
