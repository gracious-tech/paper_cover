
// WebGL shader sources and low-level helpers

const AMBIENT   = 0.35
const LIGHT_DIR = [0.5, 1.0, 2.0] as const

export const VERT_SRC = `
attribute vec3 a_pos;
attribute vec2 a_uv;
attribute vec3 a_normal;
uniform mat4 u_mvp;
uniform mat3 u_norm_mat;
varying vec2 v_uv;
varying float v_light;
void main() {
    gl_Position = u_mvp * vec4(a_pos, 1.0);
    v_uv = a_uv;
    vec3 light = normalize(vec3(${LIGHT_DIR[0]}, ${LIGHT_DIR[1]}, ${LIGHT_DIR[2]}));
    float diffuse = max(dot(normalize(u_norm_mat * a_normal), light), 0.0);
    v_light = ${AMBIENT.toFixed(2)} + ${(1.0 - AMBIENT).toFixed(2)} * diffuse;
}
`

export const FRAG_SRC = `
precision mediump float;
varying vec2 v_uv;
varying float v_light;
uniform sampler2D u_tex;
uniform bool u_use_tex;
uniform vec3 u_color;
void main() {
    vec3 base = u_use_tex ? texture2D(u_tex, v_uv).rgb : u_color;
    gl_FragColor = vec4(base * v_light, 1.0);
}
`

/** Compile a single shader stage from GLSL source */
export function compile_shader(gl:WebGLRenderingContext, type:number, src:string):WebGLShader {
    const shader = gl.createShader(type)!
    gl.shaderSource(shader, src)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw new Error(`[cover-3d] Shader compile error: ${gl.getShaderInfoLog(shader)}`)
    return shader
}

/** Link a vertex + fragment shader into a program */
export function build_program(gl:WebGLRenderingContext, vert:string, frag:string):WebGLProgram {
    const prog = gl.createProgram()!
    gl.attachShader(prog, compile_shader(gl, gl.VERTEX_SHADER, vert))
    gl.attachShader(prog, compile_shader(gl, gl.FRAGMENT_SHADER, frag))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
        throw new Error(`[cover-3d] Program link error: ${gl.getProgramInfoLog(prog)}`)
    return prog
}

/** Upload an ImageBitmap to a WebGL texture (no mipmaps for NPOT support) */
export function upload_texture(gl:WebGLRenderingContext, bitmap:ImageBitmap):WebGLTexture {
    const tex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, tex)
    // Flip Y so UV (0,0) maps to the top-left of the source image
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap)
    // Skip mipmap generation for NPOT textures (SVG dimensions may not be powers of 2)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    return tex
}
