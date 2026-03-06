import { WebGLUtils } from '@/utils/webgl/WebGLUtils';
import * as Shaders from '@/utils/webgl/WebGLShaders';

export interface VisualSettings {
    beauty: {
        smoothing: number;
        brightness: number;
        sharpen: number;
        denoise: number;
    };
    background: {
        mode: string;
        blurLevel: string;
    };
    chromaKey?: {
        enabled: boolean;
        keyColor: string;
        similarity: number;
        smoothness: number;
    };
    ar?: {
        beauty: {
            smoothing: number;
            brighten: number;
            denoise: number;
            slimming: number;
            eyeEnlarge: number;
        };
        landmarks?: any; // Face Mesh data
    };
}

export class WebGLCompositor {
    public gl: WebGL2RenderingContext | WebGLRenderingContext | null = null;
    
    // Shaders
    public compositeProgram: WebGLProgram | null = null;
    public bilateralShader: any = null;
    public blurHorizontalShader: any = null;
    public blurVerticalShader: any = null;
    public sharpenShader: any = null;
    public brightnessShader: any = null;
    public denoiseShader: any = null;
    public virtualBgShader: any = null;
    public blurCompositeShader: any = null;
    public chromaKeyShader: any = null;
    public colorGradingShader: any = null;
    public alphaBlendShader: any = null;
    public glitchTransitionShader: any = null;
    public zoomTransitionShader: any = null;
    public slideTransitionShader: any = null;

    // AntAR Shaders
    public beauty20Shader: any = null;
    public faceMorphShader: any = null;
    public antArMaskTexture: WebGLTexture | null = null;

    // Geometry
    public fullScreenQuad: any = null;
    public unitQuad: any = null;

    // Uniform Locs
    public uTranslationLoc: WebGLUniformLocation | null = null;
    public uScaleLoc: WebGLUniformLocation | null = null;
    public uTexScaleLoc: WebGLUniformLocation | null = null;
    public uTexOffsetLoc: WebGLUniformLocation | null = null;
    public uFlipHorizontalLoc: WebGLUniformLocation | null = null;
    public uFlipVerticalLoc: WebGLUniformLocation | null = null;
    public uFlipYLoc: WebGLUniformLocation | null = null;
    public uShapeLoc: WebGLUniformLocation | null = null;
    public uAspectLoc: WebGLUniformLocation | null = null;
    public uBorderRadiusLoc: WebGLUniformLocation | null = null;
    public uImageLoc: WebGLUniformLocation | null = null;

    // Intermediate Textures
    public texPing: WebGLTexture | null = null;
    public texPong: WebGLTexture | null = null;
    public blurBuffer1: WebGLTexture | null = null;
    public blurBuffer2: WebGLTexture | null = null;
    public framedHostTexture: WebGLTexture | null = null;
    public framebuffer: WebGLFramebuffer | null = null;

    // Backgrounds & Masks
    public maskTexture: WebGLTexture | null = null;
    public backgroundTexture: WebGLTexture | null = null;
    public backgroundMetadata = { width: 0, height: 0 };
    
    public lutTexture: WebGLTexture | null = null;
    public lutEnabled = false;

    // Transition State
    public transitionStartTime: number = 0;
    public transitionDuration: number = 500;
    public transitionType: 'glitch' | 'zoom' | 'slide' | 'fade' = 'fade';
    public transitionActive: boolean = false;
    public oldSceneTexture: WebGLTexture | null = null;
    public currentSceneTexture: WebGLTexture | null = null;

    // Viewport & Ratio
    public width: number = 0;
    public height: number = 0;
    public targetRatio: '16:9' | '9:16' = '16:9';

    init(canvas: HTMLCanvasElement | OffscreenCanvas) {
        this.width = canvas.width;
        this.height = canvas.height;

        this.gl = canvas.getContext('webgl2', { alpha: false, desynchronized: true, premultipliedAlpha: false }) as WebGL2RenderingContext;
        if (!this.gl) {
            this.gl = canvas.getContext('webgl', { alpha: false, desynchronized: true, premultipliedAlpha: false }) as WebGLRenderingContext;
            if (!this.gl) throw new Error('WebGL not supported');
        }

        const gl = this.gl;
        
        this.bilateralShader = Shaders.createBilateralFilterShader(gl);
        this.blurHorizontalShader = Shaders.createGaussianBlurShader(gl, true);
        this.blurVerticalShader = Shaders.createGaussianBlurShader(gl, false);
        this.sharpenShader = Shaders.createUnsharpMaskShader(gl);
        this.brightnessShader = Shaders.createBrightnessShader(gl);
        this.denoiseShader = Shaders.createDenoiseShader(gl);
        this.virtualBgShader = Shaders.createVirtualBackgroundShader(gl);
        this.blurCompositeShader = Shaders.createBlurCompositeShader(gl);
        this.chromaKeyShader = Shaders.createChromaKeyShader(gl);
        this.colorGradingShader = Shaders.createColorGradingShader(gl);
        this.alphaBlendShader = Shaders.createAlphaBlendShader(gl);
        this.glitchTransitionShader = Shaders.createGlitchTransitionShader(gl);
        this.zoomTransitionShader = Shaders.createZoomTransitionShader(gl);
        this.slideTransitionShader = Shaders.createSlideTransitionShader(gl);

        // AntAR
        this.beauty20Shader = Shaders.createBeauty20Shader(gl);
        this.faceMorphShader = Shaders.createFaceMorphShader(gl);

        const compositeVS = `
        attribute vec2 a_position;
        attribute vec2 a_texCoord;
        uniform vec2 u_translation;
        uniform vec2 u_scale;
        uniform vec2 u_texScale;
        uniform vec2 u_texOffset;
        uniform bool u_flipHorizontal;
        uniform bool u_flipVertical;
        uniform bool u_flipY;
        varying vec2 v_texCoord;
        varying vec2 v_localCoord;
        void main() {
            v_localCoord = a_position;
            vec2 pos = a_position * u_scale + u_translation;
            float yPos = u_flipY ? (1.0 - pos.y) : pos.y;
            gl_Position = vec4(pos.x * 2.0 - 1.0, yPos * 2.0 - 1.0, 0.0, 1.0);
            
            vec2 uv = a_texCoord;
            if (u_flipHorizontal) uv.x = 1.0 - uv.x;
            if (u_flipVertical)   uv.y = 1.0 - uv.y;
            v_texCoord = uv * u_texScale + u_texOffset;
        }
        `;
        
        const compositeFS = `
        precision mediump float;
        varying vec2 v_texCoord;
        varying vec2 v_localCoord;
        uniform sampler2D u_image;
        uniform int u_shape;
        uniform float u_aspect;
        uniform float u_borderRadius;

        void main() {
            if (u_shape == 1) {
                vec2 p = v_localCoord - 0.5;
                p.x *= u_aspect;
                float radius = min(u_aspect, 1.0) * 0.5;
                if (length(p) > radius) discard;
            } else if (u_shape == 2) {
                vec2 p = v_localCoord;
                float r = u_borderRadius / 100.0;
                if (p.x < r && p.y < r && length(p - vec2(r)) > r) discard;
                if (p.x > 1.0-r && p.y < r && length(p - vec2(1.0-r, r)) > r) discard;
                if (p.x < r && p.y > 1.0-r && length(p - vec2(r, 1.0-r)) > r) discard;
                if (p.x > 1.0-r && p.y > 1.0-r && length(p - vec2(1.0-r, 1.0-r)) > r) discard;
            }
            gl_FragColor = texture2D(u_image, v_texCoord);
        }
        `;

        const vs = WebGLUtils.createShader(gl, gl.VERTEX_SHADER, compositeVS);
        const fs = WebGLUtils.createShader(gl, gl.FRAGMENT_SHADER, compositeFS);
        if (vs && fs) {
            this.compositeProgram = WebGLUtils.createProgram(gl, vs, fs);
            this.fullScreenQuad = Shaders.createFullScreenQuad(gl);
            this.unitQuad = Shaders.createUnitQuad(gl);

            if (this.compositeProgram) {
                this.uTranslationLoc = gl.getUniformLocation(this.compositeProgram, 'u_translation');
                this.uScaleLoc = gl.getUniformLocation(this.compositeProgram, 'u_scale');
                this.uTexScaleLoc = gl.getUniformLocation(this.compositeProgram, 'u_texScale');
                this.uTexOffsetLoc = gl.getUniformLocation(this.compositeProgram, 'u_texOffset');
                this.uFlipHorizontalLoc = gl.getUniformLocation(this.compositeProgram, 'u_flipHorizontal');
                this.uFlipVerticalLoc = gl.getUniformLocation(this.compositeProgram, 'u_flipVertical');
                this.uFlipYLoc = gl.getUniformLocation(this.compositeProgram, 'u_flipY');
                this.uShapeLoc = gl.getUniformLocation(this.compositeProgram, 'u_shape');
                this.uAspectLoc = gl.getUniformLocation(this.compositeProgram, 'u_aspect');
                this.uBorderRadiusLoc = gl.getUniformLocation(this.compositeProgram, 'u_borderRadius');
                this.uImageLoc = gl.getUniformLocation(this.compositeProgram, 'u_image');
            }
        }

        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);
        this.framebuffer = gl.createFramebuffer();
        this.resize(this.width, this.height);
    }

    resize(width: number, height: number) {
        this.width = width;
        this.height = height;
        const gl = this.gl;
        if (!gl) return;

        gl.viewport(0, 0, width, height);

        this.texPing = this.createEmptyTexture(width, height);
        this.texPong = this.createEmptyTexture(width, height);
        this.blurBuffer1 = this.createEmptyTexture(width, height);
        this.blurBuffer2 = this.createEmptyTexture(width, height);
        this.framedHostTexture = this.createEmptyTexture(width, height);
        this.antArMaskTexture = this.createEmptyTexture(width, height);

        if (!this.maskTexture) {
            this.maskTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, this.maskTexture);
            const maskData = new Uint8Array(256 * 256).fill(0);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 256, 256, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, maskData);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }

        if (!this.backgroundTexture) {
            this.backgroundTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, this.backgroundTexture);
            const blackData = new Uint8Array(width * height * 4).fill(0);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, blackData);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }

        this.oldSceneTexture = this.createEmptyTexture(width, height);
        this.currentSceneTexture = this.createEmptyTexture(width, height);
    }

    setTargetRatio(ratio: '16:9' | '9:16' | 'both') {
        this.targetRatio = ratio as any;
        console.log(`[WebGLCompositor] Target ratio set to: ${ratio}`);
    }

    startTransition(type: 'glitch' | 'zoom' | 'slide' | 'fade', duration: number = 500) {
        this.transitionType = type;
        this.transitionDuration = duration;
        this.transitionStartTime = performance.now();
        this.transitionActive = true;
        
        // Swap textures: what was current becomes old
        const temp = this.oldSceneTexture;
        this.oldSceneTexture = this.currentSceneTexture;
        this.currentSceneTexture = temp;
    }

    createEmptyTexture(width: number, height: number): WebGLTexture | null {
        const gl = this.gl;
        if (!gl) return null;
        const texture = gl.createTexture();
        if (!texture) return null;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        return texture;
    }

    updateMaskTexture(maskData: Uint8Array, width: number, height: number) {
        if (!this.gl || !this.maskTexture) return;
        const gl = this.gl;
        gl.bindTexture(gl.TEXTURE_2D, this.maskTexture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, width, height, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, maskData);
    }

    updateBackgroundTexture(backgroundData: ImageBitmap | ImageData) {
        if (!this.gl || !this.backgroundTexture) return;
        this.backgroundMetadata.width = backgroundData.width;
        this.backgroundMetadata.height = backgroundData.height;
        const gl = this.gl;
        gl.bindTexture(gl.TEXTURE_2D, this.backgroundTexture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, backgroundData as any);
    }

    updateAntArMaskTexture(maskCanvas: OffscreenCanvas) {
        if (!this.gl || !this.antArMaskTexture) return;
        const gl = this.gl;
        gl.bindTexture(gl.TEXTURE_2D, this.antArMaskTexture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, maskCanvas);
    }

    applyVisualEffects(inputTexture: WebGLTexture, sourceWidth: number, sourceHeight: number, visualSettings: VisualSettings, mirrored: boolean, hostTexScale: number[], hostTexOffset: number[]): WebGLTexture {
        const gl = this.gl;
        if (!gl || !this.fullScreenQuad || !this.framebuffer || !this.texPing || !this.texPong) return inputTexture;

        let currentInput = inputTexture;
        let currentInputWidth = sourceWidth;
        let currentInputHeight = sourceHeight;
        let currentOutput = this.texPing;

        const swap = () => {
            currentInput = currentOutput;
            currentInputWidth = this.width;
            currentInputHeight = this.height;
            currentOutput = (currentInput === this.texPing) ? this.texPong! : this.texPing!;
        };

        // 1. Denoise
        if (visualSettings.beauty.denoise > 0.01 && this.denoiseShader) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, currentOutput, 0);
            gl.viewport(0, 0, this.width, this.height);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, currentInput);
            Shaders.renderWithShader(gl, this.denoiseShader, this.fullScreenQuad, {
                u_texture: { textureUnit: 0 },
                u_resolution: [currentInputWidth, currentInputHeight],
                u_denoise: visualSettings.beauty.denoise
            });
            swap();
        }

        // 2. Chroma Key
        if (visualSettings.chromaKey?.enabled && this.chromaKeyShader) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, currentOutput, 0);
            gl.viewport(0, 0, this.width, this.height);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, currentInput);
            
            const hex = visualSettings.chromaKey.keyColor || '#00ff00';
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            const keyColor = result ? [ parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255 ] : [0, 1, 0];

            Shaders.renderWithShader(gl, this.chromaKeyShader, this.fullScreenQuad, {
                u_texture: { textureUnit: 0 },
                u_keyColor: keyColor,
                u_similarity: visualSettings.chromaKey.similarity,
                u_smoothness: visualSettings.chromaKey.smoothness,
                u_spill: 0.1
            });
            swap();
            
            // Render VA background behind Chroma
            if (visualSettings.background.mode === 'virtual' && this.backgroundTexture && this.alphaBlendShader) {
                gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, currentOutput, 0);
                gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, currentInput); // Foreground
                gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.backgroundTexture); // Background

                Shaders.renderWithShader(gl, this.alphaBlendShader, this.fullScreenQuad, {
                    u_foreground: { textureUnit: 0 },
                    u_background: { textureUnit: 1 }
                });
                swap();
            }
        }

        // 3. Blur Background
        if (visualSettings.background.mode === 'blur' && this.maskTexture && this.blurCompositeShader) {
           const blurStrength = visualSettings.background.blurLevel === 'low' ? 0.5 :
                visualSettings.background.blurLevel === 'medium' ? 0.7 : 1.0;
           
           const sharpInput = currentInput;

           // Horizontal
           gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
           gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.blurBuffer1, 0);
           gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, currentInput);
           Shaders.renderWithShader(gl, this.blurHorizontalShader, this.fullScreenQuad, {
               u_texture: { textureUnit: 0 },
               u_resolution: [currentInputWidth, currentInputHeight],
               u_blurStrength: blurStrength,
               u_horizontal: true
           });

           // Vertical
           gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
           gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.blurBuffer2, 0);
           gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.blurBuffer1);
           Shaders.renderWithShader(gl, this.blurVerticalShader, this.fullScreenQuad, {
               u_texture: { textureUnit: 0 },
               u_resolution: [this.width, this.height],
               u_blurStrength: blurStrength,
               u_horizontal: false
           });

           // Composite mask
           gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
           gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, currentOutput, 0);
           gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, sharpInput);
           gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.blurBuffer2);
           gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.maskTexture);
           Shaders.renderWithShader(gl, this.blurCompositeShader, this.fullScreenQuad, {
               u_texture: { textureUnit: 0 },
               u_blurred: { textureUnit: 1 },
               u_mask: { textureUnit: 2 },
               u_feather: 0.15,
               u_flipX: mirrored,
               u_maskScale: hostTexScale,
               u_maskOffset: hostTexOffset
           });
           swap();
        } 
        else if (visualSettings.background.mode === 'virtual' && this.maskTexture && this.backgroundTexture && this.virtualBgShader) {
           gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
           gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, currentOutput, 0);
           gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, currentInput);
           gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.backgroundTexture);
           gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.maskTexture);
           
           Shaders.renderWithShader(gl, this.virtualBgShader, this.fullScreenQuad, {
                u_texture: { textureUnit: 0 },
                u_background: { textureUnit: 1 },
                u_mask: { textureUnit: 2 },
                u_feather: 0.1,
                u_flipX: mirrored,
                u_maskScale: hostTexScale,
                u_maskOffset: hostTexOffset
           });
           swap();
        }

        // Smoothing, Brightness, Sharpen
        if (visualSettings.beauty.smoothing > 0.01 && this.bilateralShader) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, currentOutput, 0);
            gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, currentInput);
            Shaders.renderWithShader(gl, this.bilateralShader, this.fullScreenQuad, {
                u_texture: { textureUnit: 0 },
                u_resolution: [currentInputWidth, currentInputHeight],
                u_smoothing: visualSettings.beauty.smoothing
            });
            swap();
        }

        if (Math.abs(visualSettings.beauty.brightness - 1.0) > 0.01 && this.brightnessShader) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, currentOutput, 0);
            gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, currentInput);
            Shaders.renderWithShader(gl, this.brightnessShader, this.fullScreenQuad, {
                u_texture: { textureUnit: 0 },
                u_brightness: visualSettings.beauty.brightness
            });
            swap();
        }

        // 4. Beauty 2.0 (High-Pass Smoothing & Denoise)
        if (visualSettings.ar?.beauty && visualSettings.ar.beauty.smoothing > 0.01 && this.beauty20Shader) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, currentOutput, 0);
            gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, currentInput);
            
            Shaders.renderWithShader(gl, this.beauty20Shader, this.fullScreenQuad, {
                u_texture: { textureUnit: 0 },
                u_resolution: [currentInputWidth, currentInputHeight],
                u_smoothing: visualSettings.ar.beauty.smoothing,
                u_brighten: visualSettings.ar.beauty.brighten,
                u_denoise: visualSettings.ar.beauty.denoise
            });
            swap();
        }

        // 5. Face Morphing (Slimming, Eyes)
        if (visualSettings.ar?.beauty && (visualSettings.ar.beauty.slimming > 0.01 || visualSettings.ar.beauty.eyeEnlarge > 0.01) && this.faceMorphShader && visualSettings.ar.landmarks) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, currentOutput, 0);
            gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, currentInput);

            const lm = visualSettings.ar.landmarks;
            // MP Landmarks: Left eye center ~468, Right eye center ~469, Chin ~152, Nose ~1
            // Mapping can be more robust, but these are common indices
            const leftEye = [lm[468]?.x || 0.35, lm[468]?.y || 0.4];
            const rightEye = [lm[473]?.x || 0.65, lm[473]?.y || 0.4];
            const chin = [lm[152]?.x || 0.5, lm[152]?.y || 0.8];
            const nose = [lm[1]?.x || 0.5, lm[1]?.y || 0.5];

            Shaders.renderWithShader(gl, this.faceMorphShader, this.fullScreenQuad, {
                u_texture: { textureUnit: 0 },
                u_resolution: [currentInputWidth, currentInputHeight],
                u_slimming: visualSettings.ar.beauty.slimming,
                u_eyeEnlarge: visualSettings.ar.beauty.eyeEnlarge,
                u_leftEye: leftEye,
                u_rightEye: rightEye,
                u_chin: chin,
                u_nose: nose
            });
            swap();
        }
        
        // LUT
        if (this.lutEnabled && this.lutTexture && this.colorGradingShader) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, currentOutput, 0);
            gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, currentInput);
            gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.lutTexture);
            Shaders.renderWithShader(gl, this.colorGradingShader, this.fullScreenQuad, {
                u_texture: { textureUnit: 0 },
                u_lut: { textureUnit: 1 },
                u_intensity: 1.0
            });
            swap();
        }

        // 6. AntAR 3D Mask Overlay
        if (this.antArMaskTexture && this.alphaBlendShader) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, currentOutput, 0);
            gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, currentInput); // Person
            gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.antArMaskTexture); // Mask
            
            Shaders.renderWithShader(gl, this.alphaBlendShader, this.fullScreenQuad, {
                u_foreground: { textureUnit: 1 },
                u_background: { textureUnit: 0 }
            });
            swap();
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return currentInput;
    }

    renderToCanvas(inputTexture: WebGLTexture, region: any, meta: {width: number, height: number}, mirrored: boolean, cropToFace: boolean, faceTargetX: number = 0.5, faceTargetY: number = 0.5) {
        const gl = this.gl;
        if (!gl || !this.compositeProgram || !this.unitQuad) return;

        // Apply Transition if active
        let progress = 0;
        let program = this.compositeProgram;
        
        if (this.transitionActive) {
            const now = performance.now();
            progress = (now - this.transitionStartTime) / this.transitionDuration;
            if (progress >= 1.0) {
                this.transitionActive = false;
                progress = 1.0;
            }

            if (this.transitionType === 'glitch') program = this.glitchTransitionShader?.program || program;
            else if (this.transitionType === 'zoom') program = this.zoomTransitionShader?.program || program;
            else if (this.transitionType === 'slide') program = this.slideTransitionShader?.program || program;
        }

        gl.useProgram(program);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.unitQuad.positionBuffer);
        const posLoc = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.unitQuad.texCoordBuffer);
        const texLoc = gl.getAttribLocation(program, 'a_texCoord');
        gl.enableVertexAttribArray(texLoc);
        gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, inputTexture);

        let x = region.x / 100.0;
        let y = region.y / 100.0;
        let w = region.width / 100.0;
        let h = region.height / 100.0;

        // Autonomous Re-framing: If target is 9:16 and we are rendering 16:9 regions
        if (this.targetRatio === '9:16' && this.width / this.height > 1.0) {
            // This case happens if the buffer is still 16:9 but we want a 9:16 look
            // or if we are multi-streaming.
        }

        if (this.targetRatio === '9:16' && cropToFace) {
            // Priority re-framing for vertical platforms
            // Ensure we are using 'cover' mode and focusing on face
        }

        const targetAspect = (w * this.width) / (h * this.height);
        const sourceAspect = meta.width / meta.height;

        let texScaleX = 1.0;
        let texScaleY = 1.0;
        let texOffsetX = 0.0;
        let texOffsetY = 0.0;

        if (region.objectFit === 'contain') {
            if (sourceAspect > targetAspect) {
                texScaleY = targetAspect / sourceAspect;
                texOffsetY = (1.0 - texScaleY) / 2.0;
            } else {
                texScaleX = sourceAspect / targetAspect;
                texOffsetX = (1.0 - texScaleX) / 2.0;
            }
        } else {
            // Cover
            if (sourceAspect > targetAspect) {
                texScaleX = targetAspect / sourceAspect;
                texOffsetX = (1.0 - texScaleX) / 2.0;
                
                if (cropToFace) {
                    const maxOffset = 1.0 - texScaleX;
                    const desiredOffset = faceTargetX - (texScaleX / 2.0);
                    texOffsetX = Math.max(0, Math.min(maxOffset, desiredOffset));
                }
            } else if (sourceAspect < targetAspect) {
                texScaleY = sourceAspect / targetAspect;
                texOffsetY = (1.0 - texScaleY) / 2.0;
                
                if (cropToFace) {
                    const maxOffset = 1.0 - texScaleY;
                    const desiredOffset = faceTargetY - (texScaleY / 2.0);
                    texOffsetY = Math.max(0, Math.min(maxOffset, desiredOffset));
                }
            }
        }

        gl.uniform2f(gl.getUniformLocation(program, 'u_translation'), x, y);
        gl.uniform2f(gl.getUniformLocation(program, 'u_scale'), w, h);
        gl.uniform2f(gl.getUniformLocation(program, 'u_texScale'), texScaleX, texScaleY);
        gl.uniform2f(gl.getUniformLocation(program, 'u_texOffset'), texOffsetX, texOffsetY);
        gl.uniform1i(gl.getUniformLocation(program, 'u_flipHorizontal'), mirrored ? 1 : 0);
        gl.uniform1i(gl.getUniformLocation(program, 'u_flipVertical'), 0);
        gl.uniform1i(gl.getUniformLocation(program, 'u_flipY'), 1);

        let shape = 0;
        let borderRadius = region.borderRadius || 0;
        if (region.shape === 'circle') {
            shape = 1;
        } else if (borderRadius > 0) {
            shape = 2;
            const sizeInPixels = Math.min(w * this.width, h * this.height);
            borderRadius = (region.borderRadius / sizeInPixels) * 100.0;
        }
        
        gl.uniform1i(gl.getUniformLocation(program, 'u_shape'), shape);
        gl.uniform1f(gl.getUniformLocation(program, 'u_aspect'), targetAspect);
        gl.uniform1f(gl.getUniformLocation(program, 'u_borderRadius'), borderRadius);
        gl.uniform1i(gl.getUniformLocation(program, 'u_image'), 0);

        const uProgress = gl.getUniformLocation(program, 'u_progress');
        if (uProgress) gl.uniform1f(uProgress, progress);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.disable(gl.BLEND);
    }
}
