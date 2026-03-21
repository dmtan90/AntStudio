import { WebGLUtils } from '@/utils/webgl/WebGLUtils';
import * as Shaders from '@/utils/webgl/WebGLShaders';
import { ShaderLibrary } from '@/utils/webgl/ShaderLibrary';

export interface VisualSettings {
    beauty: {
        smoothing: number;
        brighten: number;
        brightness: number;
        denoise: number;
        sharpen: number;
        slimming: number;
        eyeEnlarge: number;
    };
    background: {
        mode: 'none' | 'blur' | 'virtual';
        blurLevel: 'low' | 'medium' | 'high';
        imageUrl?: string;
    };
    chromaKey?: {
        enabled: boolean;
        keyColor: string;
        similarity: number;
        smoothness: number;
        spill: number;
    };
    ar?: {
        beauty?: {
            smoothing: number;
            brighten: number;
            denoise: number;
            slimming: number;
            eyeEnlarge: number;
        };
        active3DMask?: string | null;
        landmarks?: any;
    };
    streamRatio: '16:9' | '9:16' | 'both';
    ai?: {
        autonomousProduction: boolean;
        autoDirector: boolean;
        humanFreeMode?: boolean;
    };
    streamingContext?: string;
    vibeScore?: number;
    chatVelocity?: number;
}

export class WebGLCompositor {
    public gl: WebGL2RenderingContext | WebGLRenderingContext | null = null;
    public shaderLib: ShaderLibrary | null = null;
    
    // Program references
    public compositeProgram: Shaders.ShaderProgram | null = null;
    public bilateralShader: Shaders.ShaderProgram | null = null;
    public blurHorizontalShader: Shaders.ShaderProgram | null = null;
    public blurVerticalShader: Shaders.ShaderProgram | null = null;
    public sharpenShader: Shaders.ShaderProgram | null = null;
    public brightnessShader: Shaders.ShaderProgram | null = null;
    public denoiseShader: Shaders.ShaderProgram | null = null;
    public virtualBgShader: Shaders.ShaderProgram | null = null;
    public blurCompositeShader: Shaders.ShaderProgram | null = null;
    public chromaKeyShader: Shaders.ShaderProgram | null = null;
    public colorGradingShader: Shaders.ShaderProgram | null = null;
    public alphaBlendShader: Shaders.ShaderProgram | null = null;
    public glitchTransitionShader: Shaders.ShaderProgram | null = null;
    public zoomTransitionShader: Shaders.ShaderProgram | null = null;
    public slideTransitionShader: Shaders.ShaderProgram | null = null;

    // AntAR Shaders
    public beauty20Shader: Shaders.ShaderProgram | null = null;
    public faceMorphShader: Shaders.ShaderProgram | null = null;
    public antArMaskTexture: WebGLTexture | null = null;
    public framedHostTexture: WebGLTexture | null = null;

    // Intermediate Textures & State
    public texPing: WebGLTexture | null = null;
    public texPong: WebGLTexture | null = null;
    public texEffects: WebGLTexture | null = null;
    public texMask: WebGLTexture | null = null;
    public maskTexture: WebGLTexture | null = null;
    public blurBuffer1: WebGLTexture | null = null;
    public blurBuffer2: WebGLTexture | null = null;
    public backgroundTexture: WebGLTexture | null = null;
    public backgroundMetadata: { width: number, height: number } = { width: 0, height: 0 };
    
    public lutTexture: WebGLTexture | null = null;
    public lutEnabled: boolean = false;
    public oldSceneTexture: WebGLTexture | null = null;
    public currentSceneTexture: WebGLTexture | null = null;
    
    // Geometries
    public unitQuad: any = null;
    public fullScreenQuad: any = null;

    private width: number = 0;
    private height: number = 0;
    private framebuffer: WebGLFramebuffer | null = null;
    private targetRatio: '16:9' | '9:16' | 'both' = '16:9';

    // Transition State
    public transitionActive: boolean = false;
    public transitionStartTime: number = 0;
    public transitionDuration: number = 500;
    public transitionType: 'glitch' | 'zoom' | 'slide' | 'fade' = 'glitch';

    init(canvas: HTMLCanvasElement | OffscreenCanvas, shaderLib?: ShaderLibrary) {
        this.width = canvas.width;
        this.height = canvas.height;

        this.gl = canvas.getContext('webgl2', { alpha: false, desynchronized: true, premultipliedAlpha: false }) as WebGL2RenderingContext;
        if (!this.gl) {
            this.gl = canvas.getContext('webgl', { alpha: false, desynchronized: true, premultipliedAlpha: false }) as WebGLRenderingContext;
            if (!this.gl) throw new Error('WebGL not supported');
        }

        const gl = this.gl;
        this.shaderLib = shaderLib || new ShaderLibrary(gl);
        const lib = this.shaderLib;
        
        this.bilateralShader = lib.getOrCompile('bilateral', Shaders.createBilateralFilterShader);
        this.blurHorizontalShader = lib.getOrCompile('blurH', (gl) => Shaders.createGaussianBlurShader(gl, true));
        this.blurVerticalShader = lib.getOrCompile('blurV', (gl) => Shaders.createGaussianBlurShader(gl, false));
        this.sharpenShader = lib.getOrCompile('sharpen', Shaders.createUnsharpMaskShader);
        this.brightnessShader = lib.getOrCompile('brightness', Shaders.createBrightnessShader);
        this.denoiseShader = lib.getOrCompile('denoise', Shaders.createDenoiseShader);
        this.virtualBgShader = lib.getOrCompile('virtualBg', Shaders.createVirtualBackgroundShader);
        this.blurCompositeShader = lib.getOrCompile('blurComposite', Shaders.createBlurCompositeShader);
        this.chromaKeyShader = lib.getOrCompile('chromaKey', Shaders.createChromaKeyShader);
        this.colorGradingShader = lib.getOrCompile('colorGrading', Shaders.createColorGradingShader);
        this.alphaBlendShader = lib.getOrCompile('alphaBlend', Shaders.createAlphaBlendShader);
        this.glitchTransitionShader = lib.getOrCompile('glitch', Shaders.createGlitchTransitionShader);
        this.zoomTransitionShader = lib.getOrCompile('zoom', Shaders.createZoomTransitionShader);
        this.slideTransitionShader = lib.getOrCompile('slide', Shaders.createSlideTransitionShader);

        // AntAR
        this.beauty20Shader = lib.getOrCompile('beauty20', Shaders.createBeauty20Shader);
        this.faceMorphShader = lib.getOrCompile('faceMorph', Shaders.createFaceMorphShader);
        this.compositeProgram = lib.getOrCompile('composite', Shaders.createCompositeShader);

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
        if (!this.gl || !this.shaderLib || !this.compositeProgram) return;

        let program = this.compositeProgram;
        let progress = 0;
        
        if (this.transitionActive) {
            const now = performance.now();
            progress = (now - this.transitionStartTime) / this.transitionDuration;
            if (progress >= 1.0) { this.transitionActive = false; progress = 1.0; }

            if (this.transitionType === 'glitch') program = this.glitchTransitionShader || program;
            else if (this.transitionType === 'zoom') program = this.zoomTransitionShader || program;
            else if (this.transitionType === 'slide') program = this.slideTransitionShader || program;
        }

        let x = region.x / 100.0, y = region.y / 100.0, w = region.width / 100.0, h = region.height / 100.0;
        const targetAspect = (w * this.width) / (h * this.height);
        const sourceAspect = meta.width / meta.height;

        let texScaleX = 1.0, texScaleY = 1.0, texOffsetX = 0.0, texOffsetY = 0.0;

        if (region.objectFit === 'contain') {
            if (sourceAspect > targetAspect) { const scaleY = targetAspect / sourceAspect; y += (h * (1.0 - scaleY)) / 2.0; h *= scaleY; } 
            else { const scaleX = sourceAspect / targetAspect; x += (w * (1.0 - scaleX)) / 2.0; w *= scaleX; }
        } else {
            if (sourceAspect > targetAspect) {
                texScaleX = targetAspect / sourceAspect; texOffsetX = (1.0 - texScaleX) / 2.0;
                if (cropToFace) { const maxOffset = 1.0 - texScaleX; texOffsetX = Math.max(0, Math.min(maxOffset, faceTargetX - (texScaleX / 2.0))); }
            } else if (sourceAspect < targetAspect) {
                texScaleY = sourceAspect / targetAspect; texOffsetY = (1.0 - texScaleY) / 2.0;
                if (cropToFace) { const maxOffset = 1.0 - texScaleY; texOffsetY = Math.max(0, Math.min(maxOffset, faceTargetY - (texScaleY / 2.0))); }
            }
        }

        let shape = 0, borderRadius = region.borderRadius || 0;
        if (region.shape === 'circle') shape = 1;
        else if (borderRadius > 0) { shape = 2; const sizeInPixels = Math.min(w * this.width, h * this.height); borderRadius = (region.borderRadius / sizeInPixels) * 100.0; }

        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

        this.shaderLib.renderQuad(program, inputTexture, {
            translation: [x, y],
            scale: [w, h],
            texScale: [texScaleX, texScaleY],
            texOffset: [texOffsetX, texOffsetY],
            flipHorizontal: mirrored,
            flipY: true,
            shape,
            aspect: targetAspect,
            borderRadius: borderRadius,
            extraUniforms: { u_progress: progress },
            useUnitQuad: true
        });

        this.gl.disable(this.gl.BLEND);
    }
}
