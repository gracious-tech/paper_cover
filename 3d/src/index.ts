
// 3D book renderer — public API

export type {BookFaces, CoverType, GenerateOptions} from './types.js'
import type {BookFaces, CoverType, GenerateOptions} from './types.js'
import type {FaceData} from './geometry.js'

import {mat4_perspective, mat4_look_at, mat4_mul, normal_matrix} from './math.js'
import {parse_svg_size, svg_to_bitmap} from './svg.js'
import {VERT_SRC, FRAG_SRC, build_program, upload_texture} from './webgl.js'
import {build_faces} from './geometry.js'

// -- Defaults --

const DEFAULT_AZIMUTH   = -30
const DEFAULT_ELEVATION = 20
const DEFAULT_WIDTH     = 800
const DEFAULT_HEIGHT    = 600

// -- Internal types --

interface GlState {
    gl:WebGLRenderingContext
    prog:WebGLProgram
    // Attribute locations
    a_pos:number
    a_uv:number
    a_normal:number
    // Uniform locations
    u_mvp:WebGLUniformLocation
    u_norm_mat:WebGLUniformLocation
    u_tex:WebGLUniformLocation
    u_use_tex:WebGLUniformLocation
    u_color:WebGLUniformLocation
}

interface LoadedFace {
    vbo:WebGLBuffer
    ibo:WebGLBuffer
    tex:WebGLTexture | null
    color:[number,number,number]
    index_count:number
}

// -- Renderer --

/** Persistent WebGL book renderer. Create once, call load() when covers change, render() cheaply. */
export class Book3DRenderer {

    readonly canvas:OffscreenCanvas
    private _gl_state:GlState | null = null
    private _faces:LoadedFace[] = []
    private _w = 1
    private _h = 1
    private _d = 0.1
    private _textures:WebGLTexture[] = []

    constructor(width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT) {
        this.canvas = new OffscreenCanvas(width, height)
    }

    /** Initialise WebGL on first use */
    private _init_gl():GlState {
        if (this._gl_state)
            return this._gl_state

        const gl = this.canvas.getContext('webgl', {alpha: true, premultipliedAlpha: false})
        if (!gl)
            throw new Error('[cover-3d] WebGL not available in this environment')

        const prog = build_program(gl, VERT_SRC, FRAG_SRC)

        this._gl_state = {
            gl, prog,
            a_pos:    gl.getAttribLocation(prog, 'a_pos'),
            a_uv:     gl.getAttribLocation(prog, 'a_uv'),
            a_normal: gl.getAttribLocation(prog, 'a_normal'),
            u_mvp:      gl.getUniformLocation(prog, 'u_mvp')!,
            u_norm_mat: gl.getUniformLocation(prog, 'u_norm_mat')!,
            u_tex:      gl.getUniformLocation(prog, 'u_tex')!,
            u_use_tex:  gl.getUniformLocation(prog, 'u_use_tex')!,
            u_color:    gl.getUniformLocation(prog, 'u_color')!,
        }
        return this._gl_state
    }

    /** Load new cover SVGs and re-upload geometry / textures */
    async load(svgs:BookFaces, cover_type:CoverType = 'paperback'):Promise<void> {
        const {gl} = this._init_gl()

        // Free previous GPU resources
        for (const t of this._textures)
            gl.deleteTexture(t)
        this._textures = []
        for (const f of this._faces) {
            gl.deleteBuffer(f.vbo)
            gl.deleteBuffer(f.ibo)
        }
        this._faces = []

        // Parse SVG dimensions to derive normalised 3D aspect ratios
        const front_size = parse_svg_size(svgs.front)
        this._h = 1.0
        this._w = front_size.width / front_size.height
        const spine_size = svgs.spine ? parse_svg_size(svgs.spine) : null
        this._d = spine_size ? spine_size.width / front_size.height : 0.08

        // Rasterise each SVG face into an ImageBitmap for GPU upload (4x resolution for quality)
        const [front_bmp, back_bmp, spine_bmp] = await Promise.all([
            svg_to_bitmap(svgs.front, front_size.width * 4, front_size.height * 4),
            svg_to_bitmap(svgs.back,  front_size.width * 4, front_size.height * 4),
            spine_size
                ? svg_to_bitmap(svgs.spine!, spine_size.width * 4, spine_size.height * 4)
                : Promise.resolve(null),
        ])

        const front_tex = upload_texture(gl, front_bmp)
        const back_tex  = upload_texture(gl, back_bmp)
        const spine_tex = spine_bmp ? upload_texture(gl, spine_bmp) : null

        front_bmp.close()
        back_bmp.close()
        if (spine_bmp) spine_bmp.close()

        this._textures = [front_tex, back_tex, ...(spine_tex ? [spine_tex] : [])]

        // Build face geometry and upload vertex/index buffers
        const face_data:FaceData[] = build_faces(
            this._w, this._h, this._d,
            front_tex, back_tex, spine_tex, cover_type,
        )

        for (const fd of face_data) {
            const vbo = gl.createBuffer()!
            gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(fd.vertices), gl.STATIC_DRAW)

            const ibo = gl.createBuffer()!
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo)
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(fd.indices), gl.STATIC_DRAW)

            this._faces.push({vbo, ibo, tex: fd.texture, color: fd.color, index_count: fd.indices.length})
        }
    }

    /** Render the book at the given camera angles (degrees) */
    render(azimuth = DEFAULT_AZIMUTH, elevation = DEFAULT_ELEVATION):void {
        if (!this._gl_state || this._faces.length === 0)
            return

        const {gl, prog,
            a_pos, a_uv, a_normal,
            u_mvp, u_norm_mat, u_tex, u_use_tex, u_color} = this._gl_state

        const w = this.canvas.width
        const h = this.canvas.height

        gl.viewport(0, 0, w, h)
        gl.clearColor(0, 0, 0, 0)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
        gl.enable(gl.DEPTH_TEST)
        gl.disable(gl.CULL_FACE)
        gl.useProgram(prog)

        // Camera in spherical coordinates orbiting the origin
        const az   = azimuth   * Math.PI / 180
        const el   = elevation * Math.PI / 180
        const dist = 2.5 * this._h
        const cam:[number,number,number] = [
            dist * Math.sin(az) * Math.cos(el),
            dist * Math.sin(el),
            dist * Math.cos(az) * Math.cos(el),
        ]

        // MVP = projection × view (model is identity — book sits at origin)
        const proj = mat4_perspective(45, w / h, 0.01, 100)
        const view = mat4_look_at(cam, [0, 0, 0])
        const mvp  = mat4_mul(proj, view)
        const norm = normal_matrix(view)

        gl.uniformMatrix4fv(u_mvp, false, mvp)
        gl.uniformMatrix3fv(u_norm_mat, false, norm)

        // Stride: 8 floats per vertex (xyz + uv + normal)
        const stride = 8 * 4

        for (const face of this._faces) {
            gl.bindBuffer(gl.ARRAY_BUFFER, face.vbo)
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, face.ibo)

            gl.enableVertexAttribArray(a_pos)
            gl.enableVertexAttribArray(a_uv)
            gl.enableVertexAttribArray(a_normal)

            gl.vertexAttribPointer(a_pos,    3, gl.FLOAT, false, stride, 0)
            gl.vertexAttribPointer(a_uv,     2, gl.FLOAT, false, stride, 3 * 4)
            gl.vertexAttribPointer(a_normal, 3, gl.FLOAT, false, stride, 5 * 4)

            if (face.tex) {
                gl.activeTexture(gl.TEXTURE0)
                gl.bindTexture(gl.TEXTURE_2D, face.tex)
                gl.uniform1i(u_tex, 0)
                gl.uniform1i(u_use_tex, 1)
            }
            else {
                gl.uniform1i(u_use_tex, 0)
                gl.uniform3fv(u_color, face.color)
            }

            gl.drawElements(gl.TRIANGLES, face.index_count, gl.UNSIGNED_SHORT, 0)
        }
    }

    /** Return the current frame as an ImageBitmap */
    async snapshot():Promise<ImageBitmap> {
        return createImageBitmap(this.canvas)
    }

    /** Render and return the current frame as PNG bytes */
    async to_png():Promise<Uint8Array> {
        const blob = await this.canvas.convertToBlob({type: 'image/png'})
        return new Uint8Array(await blob.arrayBuffer())
    }

    /** Free all WebGL resources */
    destroy():void {
        if (!this._gl_state)
            return
        const {gl} = this._gl_state
        for (const t of this._textures)
            gl.deleteTexture(t)
        for (const f of this._faces) {
            gl.deleteBuffer(f.vbo)
            gl.deleteBuffer(f.ibo)
        }
        gl.deleteProgram(this._gl_state.prog)
        this._gl_state = null
        this._faces    = []
        this._textures = []
    }
}

/**
 * One-shot render: load the SVGs, render at the given angle, return PNG bytes.
 */
export async function generate(svgs:BookFaces, options:GenerateOptions = {}):Promise<Uint8Array> {
    const renderer = new Book3DRenderer(
        options.width  ?? DEFAULT_WIDTH,
        options.height ?? DEFAULT_HEIGHT,
    )
    try {
        await renderer.load(svgs, options.cover_type ?? 'paperback')
        renderer.render(
            options.azimuth   ?? DEFAULT_AZIMUTH,
            options.elevation ?? DEFAULT_ELEVATION,
        )
        return await renderer.to_png()
    }
    finally {
        renderer.destroy()
    }
}
