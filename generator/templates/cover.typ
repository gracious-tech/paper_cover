
// Book cover template — receives all variables from _data.typ
#import "_data.typ": *

// -- Page setup --
#set page(
    width:  canvas_width,
    height: canvas_height,
    margin: 0pt,
)

#set text(font: font_family)

// ============================================================
// Helper functions
// ============================================================

// Render a line of text with given size and color, bold weight
#let title_text(content, size, fill) = text(
    size:   size,
    fill:   fill,
    weight: "bold",
    content,
)

// Render a line of text with given size and color, regular weight
#let body_text(content, size, fill) = text(
    size: size,
    fill: fill,
    content,
)

// Render a line of text with small-caps
#let small_caps_text(content, size, fill) = text(
    size:        size,
    fill:        fill,
    features:    ("smcp",),
    content,
)

// ============================================================
// Layer 1 — Background fills
// ============================================================

// Back panel background — extends from canvas left edge through bleed into trim
#place(
    top + left,
    dx: 0pt,
    dy: 0pt,
    rect(width: back_x + trim_width, height: canvas_height, fill: color_back_bg),
)

// Spine background (only when spread has a spine)
#if has_spine {
    place(
        top + left,
        dx: spine_x,
        dy: 0pt,
        rect(width: spine_width, height: canvas_height, fill: color_spine_bg),
    )
}

// Front panel background — extends from trim through bleed to canvas right edge
#place(
    top + left,
    dx: front_x,
    dy: 0pt,
    rect(width: trim_width + bleed, height: canvas_height, fill: color_front_bg),
)

// ============================================================
// Layer 2 — Background image (theme-dependent placement)
// ============================================================

#if has_image {
    if layout_image_style == "full" {
        // Full bleed: cover entire front panel including all bleed margins
        place(
            top + left,
            dx: front_x,
            dy: 0pt,
            image(
                image_filename,
                width:  trim_width + bleed,
                height: canvas_height,
                fit:    "cover",
            ),
        )
    } else if layout_image_style == "top-half" {
        // Top half of front panel, including top and right bleed
        place(
            top + left,
            dx: front_x,
            dy: 0pt,
            image(
                image_filename,
                width:  trim_width + bleed,
                height: bleed + trim_height * 0.5,
                fit:    "cover",
            ),
        )
    } else if layout_image_style == "left-strip" {
        // Left 35% strip of front panel, including top and bottom bleed
        place(
            top + left,
            dx: front_x,
            dy: 0pt,
            image(
                image_filename,
                width:  trim_width * 0.35,
                height: canvas_height,
                fit:    "cover",
            ),
        )
    }
}

// ============================================================
// Layer 3 — Back panel content
// ============================================================

#let back_margin = trim_width * 0.1
#let back_content_width = trim_width - back_margin * 2

// Back blurb text block
#place(
    top + left,
    dx: back_x + back_margin,
    dy: bleed + trim_height * 0.12,
    box(
        width: back_content_width,
        height: trim_height * 0.72,
        clip: true,
        body_text(back_blurb, fs_back_blurb, color_back_blurb),
    ),
)

// ISBN barcode or text at bottom-right of back panel
#if has_barcode {
    place(
        top + left,
        dx: back_x + trim_width - back_margin - 1.8in,
        dy: bleed + trim_height - 1.2in,
        image("barcode.svg", width: 1.8in),
    )
} else if has_isbn {
    place(
        top + left,
        dx: back_x + back_margin,
        dy: bleed + trim_height - 0.35in,
        body_text("ISBN " + isbn, 8pt, color_back_blurb),
    )
}

// ============================================================
// Layer 4 — Spine content
// ============================================================

#if has_spine and fs_spine_title > 0pt {
    // Title rotated along spine (bottom-to-top reading direction).
    // place() anchors the unrotated bounding box top-left, so we subtract
    // half the unrotated dimensions to keep the visual center on the spine.
    place(
        top + left,
        dx: spine_x + spine_width * 0.5 - trim_height * 0.4,
        dy: bleed + trim_height * 0.5 - spine_width * 0.5,
        rotate(
            90deg,
            origin: center,
            box(
                width:  trim_height * 0.8,
                height: spine_width,
                align(
                    center + horizon,
                    stack(
                        dir:     ltr,
                        spacing: spine_width * 0.3,
                        text(
                            size:   fs_spine_title,
                            fill:   color_spine_title,
                            weight: "bold",
                            title,
                        ),
                        if has_author and fs_spine_author > 0pt {
                            text(
                                size: fs_spine_author,
                                fill: color_spine_author,
                                author,
                            )
                        },
                    ),
                ),
            ),
        ),
    )
}

// ============================================================
// Layer 5 — Front panel content
// ============================================================

#let front_margin = trim_width * 0.1
#let front_content_w = trim_width - front_margin * 2

// Vertical position of the title block
#let title_block_y = if layout_title_valign == "top" {
    bleed + trim_height * 0.1
} else if layout_title_valign == "center" {
    bleed + trim_height * 0.35
} else {
    // bottom
    bleed + trim_height * 0.62
}

// Accent band behind title block (bold theme)
#if layout_accent_band {
    place(
        top + left,
        dx: front_x,
        dy: title_block_y - trim_height * 0.05,
        rect(
            width:  trim_width,
            height: trim_height * 0.35,
            fill:   color_accent,
        ),
    )
}

// Semi-transparent band behind title block (hero theme)
#if layout_title_band {
    place(
        top + left,
        dx: front_x,
        dy: title_block_y - trim_height * 0.03,
        rect(
            width:  trim_width,
            height: trim_height * 0.32,
            fill:   color_front_bg.transparentize(25%),
        ),
    )
}

// Title block: pre / title / post / subtitle / author
#place(
    top + left,
    dx: front_x + front_margin,
    dy: title_block_y,
    box(
        width: front_content_w,
        stack(
            dir:     ttb,
            spacing: fs_title * 0.2,

            // title_pre line
            if has_title_pre {
                title_text(title_pre, fs_title_pre, color_front_title_pre)
            },

            // Main title
            title_text(title, fs_title, color_front_title),

            // title_post line
            if has_title_post {
                title_text(title_post, fs_title_post, color_front_title_post)
            },

            // Accent rule under title (minimal theme)
            if not layout_title_band and not layout_accent_band {
                v(fs_title * 0.1)
                line(length: front_content_w * 0.3, stroke: 0.5pt + color_accent)
                v(fs_title * 0.1)
            },

            // Subtitle
            if has_subtitle {
                body_text(subtitle, fs_subtitle, color_front_subtitle)
            },

            // Spacing before author
            v(fs_title * 0.3),

            // Author
            if has_author {
                if layout_author_small_caps {
                    small_caps_text(author, fs_author, color_front_author)
                } else if layout_author_accent {
                    body_text(author, fs_author, color_accent)
                } else {
                    body_text(author, fs_author, color_front_author)
                }
            },
        ),
    ),
)

// Inset decorative border (classic theme)
#if layout_inset_border {
    place(
        top + left,
        dx: front_x + trim_width * 0.04,
        dy: bleed + trim_height * 0.04,
        rect(
            width:  trim_width * 0.92,
            height: trim_height * 0.92,
            stroke: 0.75pt + color_accent,
            fill:   none,
        ),
    )
}

// ============================================================
// Layer 6 — Bleed / crop marks
// ============================================================

#if has_bleed {
    // Mark length and offset from canvas edge
    let mark_len    = 0.25in
    let mark_offset = 0.0625in
    let mark_stroke = stroke(paint: luma(128), thickness: 0.5pt)

    // Helper: draw a corner cross (two lines)
    let corner_mark(cx, cy, dx_sign, dy_sign) = {
        place(top + left, dx: cx, dy: cy,
            line(start: (mark_offset * dx_sign, 0pt),
                 end:   ((mark_offset + mark_len) * dx_sign, 0pt),
                 stroke: mark_stroke))
        place(top + left, dx: cx, dy: cy,
            line(start: (0pt, mark_offset * dy_sign),
                 end:   (0pt, (mark_offset + mark_len) * dy_sign),
                 stroke: mark_stroke))
    }

    // Top-left
    corner_mark(0pt, 0pt, 1, 1)
    // Top-right
    corner_mark(canvas_width, 0pt, -1, 1)
    // Bottom-left
    corner_mark(0pt, canvas_height, 1, -1)
    // Bottom-right
    corner_mark(canvas_width, canvas_height, -1, -1)
}
