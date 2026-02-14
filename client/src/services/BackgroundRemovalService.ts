import { AutoModel, AutoProcessor, RawImage, env, PreTrainedModel, Processor } from "@huggingface/transformers";

// Configuration
env.allowLocalModels = false;
env.useBrowserCache = true;

const MODEL_ID = "briaai/RMBG-1.4";

export interface BackgroundRemovalResult {
    foregroundUrl: string; // Data URL of person with transparent background
    maskUrl: string; // Data URL of segmentation mask
    originalUrl: string;
}

export class BackgroundRemovalService {
    private model: PreTrainedModel | null = null;
    private processor: Processor | null = null;
    private initialized = false;

    async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            console.log('[BackgroundRemoval] Initializing RMBG-1.4 with Transformers.js...');
            
            // Check for WebGPU support
            const gpu = (navigator as any).gpu;
            const useWebGPU = !!gpu && (await gpu.requestAdapter());
            
            if (useWebGPU) {
                console.log('[BackgroundRemoval] WebGPU supported, enabling acceleration.');
                if (env.backends?.onnx?.wasm) env.backends.onnx.wasm.proxy = false;
            } else {
                console.log('[BackgroundRemoval] WebGPU not supported, using WASM backend.');
                if (env.backends?.onnx?.wasm) env.backends.onnx.wasm.proxy = true;
            }

            this.model = await AutoModel.from_pretrained(MODEL_ID, {
                device: useWebGPU ? "webgpu" : "wasm",
                progress_callback: (p: any) => {
                    if (p.progress) console.log(`[BackgroundRemoval] Loading Model: ${Math.round(p.progress)}%`);
                }
            });

            this.processor = await AutoProcessor.from_pretrained(MODEL_ID, {
                config: {
                    do_normalize: true,
                    do_pad: true,
                    do_rescale: true,
                    do_resize: true,
                    image_mean: [0.5, 0.5, 0.5],
                    feature_extractor_type: "ImageFeatureExtractor",
                    image_std: [0.5, 0.5, 0.5],
                    resample: 2,
                    rescale_factor: 0.00392156862745098,
                    size: { width: 1024, height: 1024 }
                }
            });

            this.initialized = true;
            console.log('[BackgroundRemoval] RMBG-1.4 initialized successfully');
        } catch (error) {
            console.error('[BackgroundRemoval] Initialization failed:', error);
            throw new Error('Failed to initialize background removal model');
        }
    }

    async removeBackground(imageUrl: string): Promise<BackgroundRemovalResult> {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            console.log('[BackgroundRemoval] Processing image with RMBG-1.4:', imageUrl);

            // 1. Load Image
            const img = await RawImage.fromURL(imageUrl);

            // 2. Pre-process
            const { pixel_values } = await this.processor!(img);

            // 3. Predict Alpha Matte
            const { output } = await this.model!({ input: pixel_values });

            // 4. Resize mask back to original size
            const maskImageData = await RawImage.fromTensor(output[0].mul(255).to("uint8")).resize(
                img.width,
                img.height,
            );
            const maskData = maskImageData.data;

            // 5. Create Final Image
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Could not get 2d context");

            // Draw original image to canvas
            ctx.drawImage(img.toCanvas(), 0, 0);

            // Apply alpha mask
            const pixelData = ctx.getImageData(0, 0, img.width, img.height);
            for (let i = 0; i < maskData.length; ++i) {
                // maskData contains 0-255 alpha values
                pixelData.data[4 * i + 3] = maskData[i];
            }
            ctx.putImageData(pixelData, 0, 0);

            // Generate results
            const foregroundUrl = canvas.toDataURL('image/png');
            
            // Create mask visualization
            const maskCanvas = document.createElement('canvas');
            maskCanvas.width = img.width;
            maskCanvas.height = img.height;
            const maskCtx = maskCanvas.getContext('2d')!;
            const visualMaskData = maskCtx.createImageData(img.width, img.height);
            
            for (let i = 0; i < maskData.length; i++) {
                const pixelIndex = i * 4;
                const value = maskData[i];
                visualMaskData.data[pixelIndex] = value;     // R
                visualMaskData.data[pixelIndex + 1] = value; // G
                visualMaskData.data[pixelIndex + 2] = value; // B
                visualMaskData.data[pixelIndex + 3] = 255;   // A
            }
            maskCtx.putImageData(visualMaskData, 0, 0);
            const maskUrl = maskCanvas.toDataURL('image/png');

            console.log('[BackgroundRemoval] Processing complete');

            return {
                foregroundUrl,
                maskUrl,
                originalUrl: imageUrl
            };
        } catch (error) {
            console.error('[BackgroundRemoval] Processing failed:', error);
            throw error;
        }
    }

    dispose(): void {
        this.model = null;
        this.processor = null;
        this.initialized = false;
    }
}

// Singleton instance
let instance: BackgroundRemovalService | null = null;

export function useBackgroundRemoval(): BackgroundRemovalService {
    if (!instance) {
        instance = new BackgroundRemovalService();
    }
    return instance;
}
