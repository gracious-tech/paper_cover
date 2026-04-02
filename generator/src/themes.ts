
// Named theme definitions — each theme describes its layout behaviour

import type {ThemeName} from './schema.js'

export interface ThemeLayout {
    // Whether this theme uses a background image
    uses_image:boolean
    // Image crop/positioning style passed to Typst
    image_style:'full' | 'top-half' | 'left-strip' | 'none'
    // Where the front title block sits vertically on the panel
    title_valign:'top' | 'center' | 'bottom'
    // Whether the title block has an opaque/semi-transparent backing band
    title_band:boolean
    // Decorative inset border on the front panel
    inset_border:boolean
    // Author text in accent color instead of normal text color
    author_accent:boolean
    // Solid accent band filling the width behind the title
    accent_band:boolean
    // Small-caps author
    author_small_caps:boolean
}

// Preset layout definitions for each named theme
const THEMES:Record<ThemeName, ThemeLayout> = {
    hero: {
        uses_image:       true,
        image_style:      'full',
        title_valign:     'bottom',
        title_band:       true,
        inset_border:     false,
        author_accent:    false,
        accent_band:      false,
        author_small_caps:false,
    },
    minimal: {
        uses_image:       false,
        image_style:      'none',
        title_valign:     'top',
        title_band:       false,
        inset_border:     false,
        author_accent:    false,
        accent_band:      false,
        author_small_caps:false,
    },
    classic: {
        uses_image:       true,
        image_style:      'top-half',
        title_valign:     'center',
        title_band:       false,
        inset_border:     true,
        author_accent:    false,
        accent_band:      false,
        author_small_caps:true,
    },
    bold: {
        uses_image:       false,
        image_style:      'none',
        title_valign:     'center',
        title_band:       false,
        inset_border:     false,
        author_accent:    false,
        accent_band:      true,
        author_small_caps:false,
    },
    modern: {
        uses_image:       true,
        image_style:      'left-strip',
        title_valign:     'center',
        title_band:       false,
        inset_border:     false,
        author_accent:    true,
        accent_band:      false,
        author_small_caps:false,
    },
}

/** Get layout definition for a named theme */
export function get_theme(name:ThemeName):ThemeLayout {
    return THEMES[name]
}
