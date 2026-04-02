
// Book box geometry — builds the 6-face vertex/index data for a given cover size

import type {CoverType} from './types.js'

// Hardback board overhang and thickness, in normalized units (h = 1.0)
const BOARD_EXTEND    = 0.02
const BOARD_THICKNESS = 0.005

// Cream colour for page-edge faces (fore-edge, top, bottom)
const PAGE_COLOR = [0.94, 0.91, 0.86] as const

/** A single face ready for GPU upload: interleaved [xyz, uv, normal] × 4 verts + 6 indices */
export interface FaceData {
    vertices:number[]             // 4 × 8 floats
    indices:number[]              // 6 ints (two triangles, zero-based within this face)
    texture:WebGLTexture | null
    color:[number,number,number]
}

/** Build the 6 faces of the book box using normalised dimensions (h = 1).
 *  w = cover_width / cover_height, d = spine_width / cover_height. */
export function build_faces(
    w:number,
    h:number,
    d:number,
    front_tex:WebGLTexture,
    back_tex:WebGLTexture,
    spine_tex:WebGLTexture | null,
    cover_type:CoverType,
):FaceData[] {

    // Half-extents of the paper block
    const hw = w / 2, hh = h / 2, hd = d / 2

    // Hardback boards extend on top/bottom/fore-edge, flush on spine
    const be  = cover_type === 'hardback' ? BOARD_EXTEND    : 0
    const bt  = cover_type === 'hardback' ? BOARD_THICKNESS : 0
    const hw2 = hw + be   // fore-edge side extends
    const hh2 = hh + be   // top and bottom extend
    const hd2 = hd + bt   // boards offset forward/backward

    /** Build a quad face from 4 [x,y,z,u,v] vertices + a flat normal */
    function face(
        verts:[[number,number,number,number,number],[number,number,number,number,number],
               [number,number,number,number,number],[number,number,number,number,number]],
        nx:number, ny:number, nz:number,
        tex:WebGLTexture | null,
        color:[number,number,number] = [1,1,1],
    ):FaceData {
        const vertices:number[] = []
        for (const [x,y,z,u,v] of verts)
            vertices.push(x, y, z, u, v, nx, ny, nz)
        return {vertices, indices: [0,1,2, 0,2,3], texture: tex, color}
    }

    return [
        // Front (z = +hd2) — left(-x)=spine, right(+x)=fore-edge; UV top-left=(0,0)
        face([
            [-hw,  hh2, hd2,  0, 0],
            [ hw2, hh2, hd2,  1, 0],
            [ hw2,-hh2, hd2,  1, 1],
            [-hw, -hh2, hd2,  0, 1],
        ], 0, 0, 1, front_tex),

        // Back (z = -hd2) — from behind: left(+x)=fore-edge, right(-x)=spine
        // Back SVG has spine on the right → U runs from fore-edge(0) to spine(1)
        face([
            [ hw2, hh2,-hd2,  0, 0],
            [-hw,  hh2,-hd2,  1, 0],
            [-hw, -hh2,-hd2,  1, 1],
            [ hw2,-hh2,-hd2,  0, 1],
        ], 0, 0,-1, back_tex),

        // Spine (x = -hw) — from left: left(-z)=back, right(+z)=front
        face([
            [-hw,  hh,-hd,  0, 0],
            [-hw,  hh, hd,  1, 0],
            [-hw, -hh, hd,  1, 1],
            [-hw, -hh,-hd,  0, 1],
        ],-1, 0, 0, spine_tex, PAGE_COLOR as [number,number,number]),

        // Fore-edge (x = +hw2) — page edges, cream solid
        face([
            [ hw2,  hh, hd,  0, 0],
            [ hw2,  hh,-hd,  1, 0],
            [ hw2, -hh,-hd,  1, 1],
            [ hw2, -hh, hd,  0, 1],
        ], 1, 0, 0, null, PAGE_COLOR as [number,number,number]),

        // Top (y = +hh2) — page edges, cream solid
        face([
            [-hw,  hh2, hd,  0, 0],
            [ hw2, hh2, hd,  1, 0],
            [ hw2, hh2,-hd,  1, 1],
            [-hw,  hh2,-hd,  0, 1],
        ], 0, 1, 0, null, PAGE_COLOR as [number,number,number]),

        // Bottom (y = -hh2) — page edges, cream solid
        face([
            [-hw, -hh2,-hd,  0, 0],
            [ hw2,-hh2,-hd,  1, 0],
            [ hw2,-hh2, hd,  1, 1],
            [-hw, -hh2, hd,  0, 1],
        ], 0,-1, 0, null, PAGE_COLOR as [number,number,number]),
    ]
}
