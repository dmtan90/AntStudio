import { WebGLUtils } from '@/utils/webgl/WebGLUtils';
import * as Shaders from '@/utils/webgl/WebGLShaders';

/**
 * ShaderLibrary manages the lifecycle and execution of WebGL programs.
 * It provides a centralized repository for shaders, uniforms, and common geometry.
 */
export class ShaderLibrary {
    private gl: WebGL2RenderingContext | WebGLRenderingContext;
    private programs = new Map<string, Shaders.ShaderProgram>();
    private quads = {
        full: null as any,
        unit: null as any
    };

    constructor(gl: WebGL2RenderingContext | WebGLRenderingContext) {
        this.gl = gl;
        this.initGeometry();
    }

    private initGeometry() {
        this.quads.full = Shaders.createFullScreenQuad(this.gl);
        this.quads.unit = Shaders.createUnitQuad(this.gl);
    }

    public getOrCompile(id: string, factory: (gl: any) => Shaders.ShaderProgram): Shaders.ShaderProgram {
        if (this.programs.has(id)) return this.programs.get(id)!;
        const program = factory(this.gl);
        this.programs.set(id, program);
        return program;
    }

    public getProgram(id: string): Shaders.ShaderProgram | undefined {
        return this.programs.get(id);
    }

    /**
     * Renders a quad with standard layout uniforms
     */
    public renderQuad(
        program: Shaders.ShaderProgram, 
        texture: WebGLTexture, 
        params: {
            translation?: [number, number],
            scale?: [number, number],
            texScale?: [number, number],
            texOffset?: [number, number],
            flipHorizontal?: boolean,
            flipVertical?: boolean,
            flipY?: boolean,
            shape?: number,
            aspect?: number,
            borderRadius?: number,
            extraUniforms?: Record<string, any>,
            useUnitQuad?: boolean
        }
    ) {
        const gl = this.gl;
        const quad = params.useUnitQuad ? this.quads.unit : this.quads.full;

        gl.useProgram(program.program);

        // Attributes
        gl.bindBuffer(gl.ARRAY_BUFFER, quad.positionBuffer);
        const posLoc = program.attributes.a_position ?? gl.getAttribLocation(program.program, 'a_position');
        if (posLoc !== -1) {
            gl.enableVertexAttribArray(posLoc);
            gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, quad.texCoordBuffer);
        const texLoc = program.attributes.a_texCoord ?? gl.getAttribLocation(program.program, 'a_texCoord');
        if (texLoc !== -1) {
            gl.enableVertexAttribArray(texLoc);
            gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);
        }

        // Standard Layout Uniforms
        const locs = program.uniforms;
        if (locs.u_translation) gl.uniform2f(locs.u_translation, params.translation?.[0] ?? 0, params.translation?.[1] ?? 0);
        if (locs.u_scale) gl.uniform2f(locs.u_scale, params.scale?.[0] ?? 1, params.scale?.[1] ?? 1);
        if (locs.u_texScale) gl.uniform2f(locs.u_texScale, params.texScale?.[0] ?? 1, params.texScale?.[1] ?? 1);
        if (locs.u_texOffset) gl.uniform2f(locs.u_texOffset, params.texOffset?.[0] ?? 0, params.texOffset?.[1] ?? 0);
        if (locs.u_flipHorizontal) gl.uniform1i(locs.u_flipHorizontal, params.flipHorizontal ? 1 : 0);
        if (locs.u_flipVertical) gl.uniform1i(locs.u_flipVertical, params.flipVertical ? 1 : 0);
        if (locs.u_flipY) gl.uniform1i(locs.u_flipY, params.flipY ? 1 : 0);
        if (locs.u_shape) gl.uniform1i(locs.u_shape, params.shape ?? 0);
        if (locs.u_aspect) gl.uniform1f(locs.u_aspect, params.aspect ?? 1.0);
        if (locs.u_borderRadius) gl.uniform1f(locs.u_borderRadius, params.borderRadius ?? 0);

        // Texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        if (locs.u_image) gl.uniform1i(locs.u_image, 0);
        else if (locs.u_texture) gl.uniform1i(locs.u_texture, 0);

        // Extra Uniforms
        if (params.extraUniforms) {
            for (const [name, val] of Object.entries(params.extraUniforms)) {
                const loc = locs[name] ?? gl.getUniformLocation(program.program, name);
                if (!loc) continue;
                if (typeof val === 'number') gl.uniform1f(loc, val);
                else if (typeof val === 'boolean') gl.uniform1i(loc, val ? 1 : 0);
                else if (Array.isArray(val)) {
                    if (val.length === 2) gl.uniform2f(loc, val[0], val[1]);
                    else if (val.length === 3) gl.uniform3f(loc, val[0], val[1], val[2]);
                    else if (val.length === 4) gl.uniform4f(loc, val[0], val[1], val[2], val[3]);
                } else if (typeof val === 'object' && val.textureUnit !== undefined) {
                    gl.uniform1i(loc, val.textureUnit);
                }
            }
        }

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
}
