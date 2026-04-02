
// Auto-calculate font sizes based on available panel dimensions

import {in_to_pt, clamp} from './utils.js'
import type {CoverSchema} from './schema.js'
import type {PrinterDimensions} from './printers.js'

export interface FontSizes {
    title:number        // pt — main title (or only title when alone)
    title_pre:number    // pt — small prefix line
    title_post:number   // pt — small suffix line
    subtitle:number     // pt
    author:number       // pt
    back_blurb:number   // pt
    spine_title:number  // pt (0 if spine too narrow)
    spine_author:number // pt (0 if spine too narrow)
}

// Average character width as a fraction of font size (proportional fonts)
const CHAR_WIDTH_RATIO = 0.55

// Assumed side margin as fraction of panel width
const MARGIN_RATIO = 0.12

// Minimum spine width in pt before text is suppressed
const MIN_SPINE_PT = 18

/**
 * Estimate the font size (in pt) at which `text` fits within `available_pt` width
 * in at most `max_lines` lines.
 */
function fit_size(text:string, available_pt:number, max_lines:number, min_pt:number, max_pt:number):number {
    for (let size = max_pt; size >= min_pt; size -= 0.5) {
        const chars_per_line = available_pt / (size * CHAR_WIDTH_RATIO)
        const lines_needed = Math.ceil(text.length / chars_per_line)
        if (lines_needed <= max_lines) {
            return size
        }
    }
    return min_pt
}

/** Calculate all font sizes from text content and panel dimensions */
export function calculate_font_sizes(
    text:CoverSchema['text'],
    dims:PrinterDimensions,
):FontSizes {
    const panel_pt = in_to_pt(dims.trim_width)
    const available_pt = panel_pt * (1 - 2 * MARGIN_RATIO)

    const has_pre_post = !!(text.title_pre || text.title_post)

    // Main title size
    const title_max = has_pre_post ? 72 : 60
    const title_min = 24
    const title = fit_size(text.title, available_pt, 2, title_min, title_max)

    // Pre/post lines are 38% of title size, min 11pt
    const pre_post = Math.max(11, title * 0.38)

    // Subtitle and author relative to title
    const subtitle = Math.max(11, title * 0.45)
    const author = Math.max(11, title * 0.35)

    // Back blurb: fixed size (content length varies too much)
    const back_blurb = 10

    // Spine: fit title along spine height (rotated 90°, so available = height in pt)
    const spine_pt = in_to_pt(dims.spine_width)
    const spine_height_pt = in_to_pt(dims.trim_height) * 0.85

    let spine_title = 0
    let spine_author = 0

    if (spine_pt >= MIN_SPINE_PT) {
        // Title must fit in one line along spine height
        spine_title = clamp(
            fit_size(text.title, spine_height_pt, 1, 7, spine_pt * 0.65),
            7, spine_pt * 0.65,
        )
        // Author at ~75% of spine title size if there's room
        if (text.author && spine_pt >= MIN_SPINE_PT * 1.5) {
            spine_author = Math.max(7, spine_title * 0.75)
        }
    }

    return {
        title,
        title_pre:   pre_post,
        title_post:  pre_post,
        subtitle,
        author,
        back_blurb,
        spine_title,
        spine_author,
    }
}
