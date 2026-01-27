/**
 * Utility for real-time background removal (Chromakey/Green Screen) using WebGL.
 * Optimized for high-fidelity edge detection and spill suppression.
 */
export class ChromakeyProcessor {
    private gl: WebGLRenderingContext | null = null;
    private program: WebGLProgram | null = null;
    private texture: WebGLTexture | null = null;
    private canvas: HTMLCanvasElement;

    private settings = {
        keyColor: [0.0, 1.0, 0.0], // Default Green
        similarity: 0.4,
        smoothness: 0.08,
        spill: 0.1
    };

    constructor() {
        this.canvas = document.createElement('canvas');
        this.initGL();
    }

    private initGL() {
        const gl = this.canvas.getContext('webgl', { preserveDrawingBuffer: true });
        if (!gl) return;
        this.gl = gl;

        const vsSource = `
            attribute vec2 a_position;
            attribute vec2 a_texCoord;
            varying vec2 v_texCoord;
            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
                v_texCoord = a_texCoord;
            }
        `;

        const fsSource = `
            precision mediump float;
            uniform sampler2D u_image;
            uniform vec3 u_keyColor;
            uniform float u_similarity;
            uniform float u_smoothness;
            uniform float u_spill;
            varying vec2 v_texCoord;

            void main() {
                vec4 texColor = texture2D(u_image, v_texCoord);
                
                float dist = distance(texColor.rgb, u_keyColor);
                float edge0 = u_similarity;
                float edge1 = u_similarity + u_smoothness;
                
                float mask = smoothstep(edge0, edge1, dist);
                
                // Spill suppression
                float desat = clamp(dist / u_spill, 0.0, 1.0);
                texColor.rgb = mix(u_keyColor, texColor.rgb, desat);
                
                gl_FragColor = vec4(texColor.rgb, mask);
            }
        `;

        this.program = this.createProgram(vsSource, fsSource);
        this.initBuffers();
    }

    private createProgram(vsSource: string, fsSource: string): WebGLProgram | null {
        if (!this.gl) return null;
        const vs = this.compileShader(this.gl.VERTEX_SHADER, vsSource);
        const fs = this.compileShader(this.gl.FRAGMENT_SHADER, fsSource);
        const program = this.gl.createProgram();
        if (!program || !vs || !fs) return null;
        this.gl.attachShader(program, vs);
        this.gl.attachShader(program, fs);
        this.gl.linkProgram(program);
        return program;
    }

    private compileShader(type: number, source: string): WebGLShader | null {
        if (!this.gl) return null;
        const shader = this.gl.createShader(type);
        if (!shader) return null;
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        return shader;
    }

    private initBuffers() {
        if (!this.gl || !this.program) return;
        const positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([
            -1, -1, 1, -1, -1, 1,
            -1, 1, 1, -1, 1, 1,
        ]), this.gl.STATIC_DRAW);

        const texCoordBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, texCoordBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([
            0, 1, 1, 1, 0, 0,
            0, 0, 1, 1, 1, 0,
        ]), this.gl.STATIC_DRAW);

        this.texture = this.gl.createTexture();
    }

    public processFrame(video: HTMLVideoElement, keyColor?: number[]): HTMLCanvasElement {
        if (!this.gl || !this.program) return this.canvas;

        if (this.canvas.width !== video.videoWidth) {
            this.canvas.width = video.videoWidth;
            this.canvas.height = video.videoHeight;
            this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
        }

        const gl = this.gl;
        gl.useProgram(this.program);

        // Bind Texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

        // Set Uniforms
        const keyLoc = gl.getUniformLocation(this.program, 'u_keyColor');
        gl.uniform3fv(keyLoc, keyColor || this.settings.keyColor);

        const simLoc = gl.getUniformLocation(this.program, 'u_similarity');
        gl.uniform1f(simLoc, this.settings.similarity);

        const smoothLoc = gl.getUniformLocation(this.program, 'u_smoothness');
        gl.uniform1f(smoothLoc, this.settings.smoothness);

        const spillLoc = gl.getUniformLocation(this.program, 'u_spill');
        gl.uniform1f(spillLoc, this.settings.spill);

        // Setup Attributes
        const posLoc = gl.getAttribLocation(this.program, 'a_position');
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        // Draw
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        return this.canvas;
    }
}

export const chromakeyProcessor = new ChromakeyProcessor();
