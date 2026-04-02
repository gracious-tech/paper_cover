
// SVG parsing and rasterisation utilities

/** Parse dimensions from the root SVG element's width/height attributes.
 *  Accepts both "Xpt" (node backend) and bare "X" (web backend) forms. */
export function parse_svg_size(svg:string):{width:number, height:number} {
    const w = svg.match(/width="([\d.]+)(?:pt)?"/)
    const h = svg.match(/height="([\d.]+)(?:pt)?"/)
    if (!w || !h)
        throw new Error('[cover-3d] Could not parse SVG dimensions')
    return {width: parseFloat(w[1]), height: parseFloat(h[1])}
}

/** Render an SVG string to an ImageBitmap via an HTMLImageElement.
 *  createImageBitmap(svgBlob) is unsupported in many browsers; the img→canvas
 *  route works universally. Must be called on the main thread. */
export async function svg_to_bitmap(svg:string, w_pt:number, h_pt:number):Promise<ImageBitmap> {
    const w = Math.round(w_pt)
    const h = Math.round(h_pt)

    // Strip out foreignObject elements (not rendered by image conversion)
    const cleaned_svg = svg.replace(/<foreignObject[^>]*>[\s\S]*?<\/foreignObject>/g, '')

    const blob = new Blob([cleaned_svg], {type: 'image/svg+xml'})
    const url  = URL.createObjectURL(blob)
    try {
        // Load SVG as an image element — handles pt units, CSS vars, etc.
        const img = new Image()
        await new Promise<void>((resolve, reject) => {
            img.onload  = () => resolve()
            img.onerror = () => reject(new Error('[cover-3d] SVG failed to load as image'))
            img.src = url
        })


        console.log('made bitmap')
        return createImageBitmap(img)
    }
    finally {
        URL.revokeObjectURL(url)
    }
}
