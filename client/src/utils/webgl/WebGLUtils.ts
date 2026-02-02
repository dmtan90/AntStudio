export class WebGLUtils {
    static createShader(gl: WebGL2RenderingContext | WebGLRenderingContext, type: number, source: string): WebGLShader | null {
        const shader = gl.createShader(type);
        if (!shader) return null;

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    static createProgram(gl: WebGL2RenderingContext | WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram | null {
        const program = gl.createProgram();
        if (!program) return null;

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(program));
            return null;
        }

        return program;
    }

    static createTexture(gl: WebGL2RenderingContext | WebGLRenderingContext): WebGLTexture | null {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);

        // standard parameters for video textures
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        return texture;
    }

    static updateTexture(gl: WebGL2RenderingContext | WebGLRenderingContext, texture: WebGLTexture, source: VideoFrame | ImageBitmap) {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    }

    static createQuadBuffer(gl: WebGL2RenderingContext | WebGLRenderingContext): WebGLBuffer | null {
        // Create a buffer for the square's positions.
        const positionBuffer = gl.createBuffer();

        // Select the positionBuffer as the one to apply buffer
        // operations to from here out.
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

        // Now create an array of positions for the square.
        // Screen coordinates: -1 to 1. 0,0 is center.
        // We actually want a standard quad 0,0 to 1,1 for easy mapping?
        // Or -1,-1 to 1,1.
        // Let's use -1,-1 to 1,1 (Clip Space)
        const positions = [
            -1.0, 1.0,
            1.0, 1.0,
            -1.0, -1.0,
            1.0, -1.0,
        ];

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

        return positionBuffer;
    }

    static createTextureCoordBuffer(gl: WebGL2RenderingContext | WebGLRenderingContext): WebGLBuffer | null {
        const textureCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);

        const textureCoordinates = [
            0.0, 0.0, // Top-Left? WebGL texture coords: 0,0 bottom left usually? 
            // Depends on flipY. Videos are usually top-down.
            1.0, 0.0,
            0.0, 1.0,
            1.0, 1.0,
        ];

        // Typically image/video: 0,0 is top-left in Canvas 2D. 
        // In WebGL: 0,0 is Bottom-Left. 
        // Pixel Unpack FlipY can handle this.

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);
        return textureCoordBuffer;
    }
}
