/**
 * WebGL Shader Library for Visual Effects
 * Provides reusable shader programs for beauty filters, background effects, and segmentation
 */

export interface ShaderProgram {
    program: WebGLProgram;
    uniforms: Record<string, WebGLUniformLocation | null>;
    attributes: Record<string, number>;
}

/**
 * Creates a basic vertex shader for texture mapping
 */
export function createBasicVertexShader(gl: WebGLRenderingContext): WebGLShader {
    const source = `
        attribute vec2 a_position;
        attribute vec2 a_texCoord;
        varying vec2 v_texCoord;
        
        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
            v_texCoord = a_texCoord;
        }
    `;

    const shader = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Vertex shader compilation error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        throw new Error('Failed to compile vertex shader');
    }

    return shader;
}

/**
 * Creates a bilateral filter shader for skin smoothing
 * This preserves edges while smoothing flat areas (perfect for beauty effects)
 */
export function createBilateralFilterShader(gl: WebGLRenderingContext): ShaderProgram {
    const fragmentSource = `
        precision mediump float;
        uniform sampler2D u_texture;
        uniform vec2 u_resolution;
        uniform float u_smoothing; // 0.0 to 1.0
        varying vec2 v_texCoord;
        
        const int KERNEL_SIZE = 9;
        const float SIGMA_SPACE = 2.0;
        
        void main() {
            if (u_smoothing < 0.01) {
                gl_FragColor = texture2D(u_texture, v_texCoord);
                return;
            }
            
            vec2 texelSize = 1.0 / u_resolution;
            vec4 centerColor = texture2D(u_texture, v_texCoord);
            
            float sigmaColor = 0.1 + u_smoothing * 0.2;
            float totalWeight = 0.0;
            vec4 sum = vec4(0.0);
            
            for (int x = -4; x <= 4; x++) {
                for (int y = -4; y <= 4; y++) {
                    vec2 offset = vec2(float(x), float(y)) * texelSize;
                    vec4 sampleColor = texture2D(u_texture, v_texCoord + offset);
                    
                    float spatialDist = length(vec2(float(x), float(y)));
                    float colorDist = length(sampleColor.rgb - centerColor.rgb);
                    
                    float spatialWeight = exp(-spatialDist * spatialDist / (2.0 * SIGMA_SPACE * SIGMA_SPACE));
                    float colorWeight = exp(-colorDist * colorDist / (2.0 * sigmaColor * sigmaColor));
                    
                    float weight = spatialWeight * colorWeight;
                    sum += sampleColor * weight;
                    totalWeight += weight;
                }
            }
            
            gl_FragColor = sum / totalWeight;
        }
    `;

    return compileShaderProgram(gl, fragmentSource, ['u_texture', 'u_resolution', 'u_smoothing']);
}

/**
 * Creates a Gaussian blur shader for background blur
 */
export function createGaussianBlurShader(gl: WebGLRenderingContext, horizontal: boolean): ShaderProgram {
    const fragmentSource = `
        precision mediump float;
        uniform sampler2D u_texture;
        uniform vec2 u_resolution;
        uniform float u_blurStrength; // 0.0 to 1.0
        uniform bool u_horizontal;
        varying vec2 v_texCoord;
        
        // Gaussian weights for 5-tap kernel
        float getWeight(int i) {
            if (i == 0) return 0.227027;
            if (i == 1) return 0.1945946;
            if (i == 2) return 0.1216216;
            if (i == 3) return 0.054054;
            return 0.016216;
        }
        
        void main() {
            vec2 texelSize = 1.0 / u_resolution;
            vec2 direction = u_horizontal ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            
            float blurRadius = u_blurStrength * 5.0;
            vec4 result = texture2D(u_texture, v_texCoord) * getWeight(0);
            
            for (int i = 1; i < 5; i++) {
                float weight = getWeight(i);
                vec2 offset = direction * texelSize * float(i) * blurRadius;
                result += texture2D(u_texture, v_texCoord + offset) * weight;
                result += texture2D(u_texture, v_texCoord - offset) * weight;
            }
            
            gl_FragColor = result;
        }
    `;

    return compileShaderProgram(gl, fragmentSource, ['u_texture', 'u_resolution', 'u_blurStrength', 'u_horizontal']);
}

/**
 * Creates a composite shader for background blur (blends sharp and blurred)
 */
export function createBlurCompositeShader(gl: WebGLRenderingContext): ShaderProgram {
    const fragmentSource = `
        precision mediump float;
        uniform sampler2D u_texture;  // Original sharp texture
        uniform sampler2D u_blurred;  // Fully blurred texture
        uniform sampler2D u_mask;     // AI Mask
        uniform float u_feather;     // Feathering amount
        uniform bool u_flipX;        // Horizontal flip for mask to match video mirror
        uniform vec2 u_maskScale;    // Scale to match video crop
        uniform vec2 u_maskOffset;   // Offset to match video crop
        varying vec2 v_texCoord;
        
        void main() {
            vec4 original = texture2D(u_texture, v_texCoord);
            vec4 blurred = texture2D(u_blurred, v_texCoord);
            
            // Calculate Mask UV to match original video crop
            vec2 maskUV = v_texCoord;
            if (u_flipX) maskUV.x = 1.0 - maskUV.x;
            maskUV = maskUV * u_maskScale + u_maskOffset;
            
            // Clamp to avoid edge artifacts if precision is slightly off
            // maskUV = clamp(maskUV, 0.0, 1.0); // Optional, texture wrapping should handle it
            
            float mask = texture2D(u_mask, maskUV).r;
            
            // Feather the mask
            float factor = smoothstep(0.5 - u_feather, 0.5 + u_feather, mask);
            
            gl_FragColor = mix(blurred, original, factor);
        }
    `;

    return compileShaderProgram(gl, fragmentSource, ['u_texture', 'u_blurred', 'u_mask', 'u_feather', 'u_flipX', 'u_maskScale', 'u_maskOffset']);
}

/**
 * Creates an unsharp mask shader for sharpening
 */
export function createUnsharpMaskShader(gl: WebGLRenderingContext): ShaderProgram {
    const fragmentSource = `
        precision mediump float;
        uniform sampler2D u_texture;
        uniform vec2 u_resolution;
        uniform float u_sharpen; // 0.0 to 1.0
        varying vec2 v_texCoord;
        
        void main() {
            if (u_sharpen < 0.01) {
                gl_FragColor = texture2D(u_texture, v_texCoord);
                return;
            }
            
            vec2 texelSize = 1.0 / u_resolution;
            vec4 center = texture2D(u_texture, v_texCoord);
            
            // Sample surrounding pixels
            vec4 blur = vec4(0.0);
            blur += texture2D(u_texture, v_texCoord + vec2(-1.0, -1.0) * texelSize) * 0.0625;
            blur += texture2D(u_texture, v_texCoord + vec2(0.0, -1.0) * texelSize) * 0.125;
            blur += texture2D(u_texture, v_texCoord + vec2(1.0, -1.0) * texelSize) * 0.0625;
            blur += texture2D(u_texture, v_texCoord + vec2(-1.0, 0.0) * texelSize) * 0.125;
            blur += texture2D(u_texture, v_texCoord + vec2(1.0, 0.0) * texelSize) * 0.125;
            blur += texture2D(u_texture, v_texCoord + vec2(-1.0, 1.0) * texelSize) * 0.0625;
            blur += texture2D(u_texture, v_texCoord + vec2(0.0, 1.0) * texelSize) * 0.125;
            blur += texture2D(u_texture, v_texCoord + vec2(1.0, 1.0) * texelSize) * 0.0625;
            
            // Unsharp mask: original + (original - blur) * amount
            vec4 sharpened = center + (center - blur) * u_sharpen * 2.0;
            gl_FragColor = clamp(sharpened, 0.0, 1.0);
        }
    `;

    return compileShaderProgram(gl, fragmentSource, ['u_texture', 'u_resolution', 'u_sharpen']);
}

/**
 * Creates a brightness adjustment shader
 */
export function createBrightnessShader(gl: WebGLRenderingContext): ShaderProgram {
    const fragmentSource = `
        precision mediump float;
        uniform sampler2D u_texture;
        uniform float u_brightness; // 0.0 to 2.0 (1.0 = no change)
        varying vec2 v_texCoord;
        
        void main() {
            vec4 color = texture2D(u_texture, v_texCoord);
            gl_FragColor = vec4(color.rgb * u_brightness, color.a);
        }
    `;

    return compileShaderProgram(gl, fragmentSource, ['u_texture', 'u_brightness']);
}

/**
 * Creates a virtual background shader (replaces background with image/video)
 */
export function createVirtualBackgroundShader(gl: WebGLRenderingContext): ShaderProgram {
    const fragmentSource = `
        precision mediump float;
        uniform sampler2D u_texture; // Original video
        uniform sampler2D u_background; // Background image/video
        uniform sampler2D u_mask; // Segmentation mask
        uniform float u_feather; // Edge feathering amount
        uniform bool u_flipX;        // Horizontal flip for mask to match video mirror
        uniform vec2 u_maskScale;    // Scale to match video crop
        uniform vec2 u_maskOffset;   // Offset to match video crop
        varying vec2 v_texCoord;
        
        void main() {
            vec4 original = texture2D(u_texture, v_texCoord);
            vec4 background = texture2D(u_background, v_texCoord);
            
            // Calculate Mask UV to match original video crop
            vec2 maskUV = v_texCoord;
            if (u_flipX) maskUV.x = 1.0 - maskUV.x;
            maskUV = maskUV * u_maskScale + u_maskOffset;
            
            float mask = texture2D(u_mask, maskUV).r;
            
            // Feather the mask edges for smoother compositing
            float featheredMask = smoothstep(0.5 - u_feather, 0.5 + u_feather, mask);
            
            gl_FragColor = mix(background, original, featheredMask);
        }
    `;

    return compileShaderProgram(gl, fragmentSource, ['u_texture', 'u_background', 'u_mask', 'u_feather', 'u_flipX', 'u_maskScale', 'u_maskOffset']);
}

/**
 * Creates a noise reduction shader
 */
export function createDenoiseShader(gl: WebGLRenderingContext): ShaderProgram {
    const fragmentSource = `
        precision mediump float;
        uniform sampler2D u_texture;
        uniform vec2 u_resolution;
        uniform float u_denoise; // 0.0 to 1.0
        varying vec2 v_texCoord;
        
        void main() {
            if (u_denoise < 0.01) {
                gl_FragColor = texture2D(u_texture, v_texCoord);
                return;
            }
            
            vec2 texelSize = 1.0 / u_resolution;
            vec4 center = texture2D(u_texture, v_texCoord);
            vec4 sum = center;
            float count = 1.0;
            
            float threshold = 0.1 * (1.0 - u_denoise);
            
            for (int x = -1; x <= 1; x++) {
                for (int y = -1; y <= 1; y++) {
                    if (x == 0 && y == 0) continue;
                    
                    vec2 offset = vec2(float(x), float(y)) * texelSize;
                    vec4 sample = texture2D(u_texture, v_texCoord + offset);
                    
                    float diff = length(sample.rgb - center.rgb);
                    if (diff < threshold) {
                        sum += sample;
                        count += 1.0;
                    }
                }
            }
            
            gl_FragColor = sum / count;
        }
    `;

    return compileShaderProgram(gl, fragmentSource, ['u_texture', 'u_resolution', 'u_denoise']);
}

/**
 * Helper function to compile a shader program
 */
function compileShaderProgram(
    gl: WebGLRenderingContext,
    fragmentSource: string,
    uniformNames: string[]
): ShaderProgram {
    const vertexShader = createBasicVertexShader(gl);
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;

    gl.shaderSource(fragmentShader, fragmentSource);
    gl.compileShader(fragmentShader);

    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        console.error('Fragment shader compilation error:', gl.getShaderInfoLog(fragmentShader));
        gl.deleteShader(fragmentShader);
        throw new Error('Failed to compile fragment shader');
    }

    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Shader program linking error:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        throw new Error('Failed to link shader program');
    }

    const uniforms: Record<string, WebGLUniformLocation | null> = {};
    for (const name of uniformNames) {
        uniforms[name] = gl.getUniformLocation(program, name);
    }

    const attributes = {
        a_position: gl.getAttribLocation(program, 'a_position'),
        a_texCoord: gl.getAttribLocation(program, 'a_texCoord')
    };

    return { program, uniforms, attributes };
}

/**
 * Creates a full-screen quad (-1 to 1) for rendering full-texture effects
 */
export function createFullScreenQuad(gl: WebGLRenderingContext): {
    positionBuffer: WebGLBuffer;
    texCoordBuffer: WebGLBuffer;
} {
    // Standard clip space coordinates
    const positions = new Float32Array([
        -1, -1,
        1, -1,
        -1, 1,
        1, 1
    ]);

    const positionBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    // Texture coordinates (UV)
    // Most video frames and textures have (0,0) at bottom-left in WebGL
    // But for video processing we often want top-left as (0,0)
    const texCoords = new Float32Array([
        0, 0,
        1, 0,
        0, 1,
        1, 1
    ]);

    const texCoordBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

    return { positionBuffer, texCoordBuffer };
}

/**
 * Creates a unit quad (0 to 1) for layout-based composition
 */
export function createUnitQuad(gl: WebGLRenderingContext): {
    positionBuffer: WebGLBuffer;
    texCoordBuffer: WebGLBuffer;
} {
    const positions = new Float32Array([
        0, 0,
        1, 0,
        0, 1,
        1, 1
    ]);

    const positionBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const texCoords = new Float32Array([
        0, 0,
        1, 0,
        0, 1,
        1, 1
    ]);

    const texCoordBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

    return { positionBuffer, texCoordBuffer };
}

/**
 * Renders a texture using a shader program
 */
export function renderWithShader(
    gl: WebGLRenderingContext,
    shader: ShaderProgram,
    quad: { positionBuffer: WebGLBuffer; texCoordBuffer: WebGLBuffer },
    uniforms: Record<string, any>
): void {
    gl.useProgram(shader.program);

    // Set up position attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, quad.positionBuffer);
    gl.enableVertexAttribArray(shader.attributes.a_position);
    gl.vertexAttribPointer(shader.attributes.a_position, 2, gl.FLOAT, false, 0, 0);

    // Set up texture coordinate attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, quad.texCoordBuffer);
    gl.enableVertexAttribArray(shader.attributes.a_texCoord);
    gl.vertexAttribPointer(shader.attributes.a_texCoord, 2, gl.FLOAT, false, 0, 0);

    // Set uniforms
    for (const [name, value] of Object.entries(uniforms)) {
        const location = shader.uniforms[name];
        if (!location) continue;

        if (typeof value === 'number') {
            gl.uniform1f(location, value);
        } else if (typeof value === 'boolean') {
            gl.uniform1i(location, value ? 1 : 0);
        } else if (Array.isArray(value) && value.length === 2) {
            gl.uniform2f(location, value[0], value[1]);
        } else if (typeof value === 'object' && 'textureUnit' in value) {
            gl.uniform1i(location, value.textureUnit);
        }
    }

    // Draw
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
