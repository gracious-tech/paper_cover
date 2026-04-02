
// Exported public types for the cover-3d module

/** SVG strings for each face of the book cover */
export interface BookFaces {
    front:string
    back:string
    spine?:string
}

export type CoverType = 'paperback' | 'hardback'

export interface GenerateOptions {
    cover_type?:CoverType
    // Horizontal camera angle in degrees (0 = straight-on, negative = see spine)
    azimuth?:number
    // Vertical camera angle in degrees (positive = looking down)
    elevation?:number
    width?:number
    height?:number
}
