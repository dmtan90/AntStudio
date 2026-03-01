// @ts-ignore
import { createInstance, createMap, createPromise } from "video-editor/lib/utils";
import { AutoModel, AutoProcessor, PreTrainedModel, Processor, RawImage, env, pipeline } from "@huggingface/transformers";
// // Since we will download the model from the Hugging Face Hub, we can skip the local model check
env.allowLocalModels = false;
env.useBrowserCache = false;

// // Proxy the WASM backend to prevent the UI from freezing
// env.backends.onnx.wasm.proxy = true;
// Initialize different model configurations
export const WEBGPU_MODEL_ID = "Xenova/modnet";
export const FALLBACK_MODEL_ID = "briaai/RMBG-1.4";
type CacheUsage = "original" | "modified";

interface RmbgAICache {
  original: string;
  modified: string;
  usage: CacheUsage;
}

interface ModelResponse {
  output: any;
}

interface ProcessorResponse {
  pixel_values: any;
}

interface InitializationResponse {
  model: PreTrainedModel;
  processor: Processor;
}

interface ModelState {
  model: PreTrainedModel | null;
  processor: Processor | null;
  isWebGPUSupported: boolean;
  currentModelId: string;
  isIOS: boolean;
}

interface ModelInfo {
  currentModelId: string;
  isWebGPUSupported: boolean;
  isIOS: boolean;
  isLoaded: boolean;
}

// iOS detection
const isIOS = () => {
  return [
    'iPad Simulator',
    'iPhone Simulator',
    'iPod Simulator',
    'iPad',
    'iPhone',
    'iPod'
  ].includes(navigator.platform)
    || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
};

const config = {
  do_normalize: true,
  do_pad: false,
  do_rescale: true,
  do_resize: true,
  image_mean: [0.5, 0.5, 0.5],
  feature_extractor_type: "ImageFeatureExtractor",
  image_std: [1, 1, 1],
  resample: 2,
  rescale_factor: 0.00392156862745098,
  size: { width: 1024, height: 1024 },
};

export class RmbgAI {
  cache: Map<string, RmbgAICache>;
  pending: Map<string, boolean>;
  worker: Worker | null = null;
  state: ModelState = {
    model: null,
    processor: null,
    isWebGPUSupported: false,
    currentModelId: FALLBACK_MODEL_ID,
    isIOS: isIOS()
  };

  private initPromise: Promise<void> | null = null;

  constructor() {
    this.cache = createMap<string, RmbgAICache>();
    this.pending = createMap<string, boolean>();
  }

  // Initialize the model (now using worker)
  async initializeModel(forceModelId?: string): Promise<boolean> {
    if (this.initPromise) return this.initPromise.then(() => true);

    this.initPromise = (async () => {
        const modelId = forceModelId || FALLBACK_MODEL_ID;
        
        if (!this.worker) {
            // @ts-ignore
            this.worker = new Worker(new URL('../../../workers/BackgroundRemoval.worker.ts', import.meta.url), { type: 'module' });
        }

        return new Promise((resolve, reject) => {
            const handler = (e: MessageEvent) => {
                if (e.data.type === 'init-complete') {
                    this.worker?.removeEventListener('message', handler);
                    this.state.currentModelId = modelId;
                    resolve();
                } else if (e.data.type === 'error') {
                    this.worker?.removeEventListener('message', handler);
                    reject(new Error(e.data.payload));
                }
            };
            this.worker?.addEventListener('message', handler);
            this.worker?.postMessage({ type: 'init', payload: { modelId } });
        });
    })();

    await this.initPromise;
    return true;
  }

  // Get current model info
  getModelInfo(): ModelInfo {
    return {
      currentModelId: this.state.currentModelId,
      isWebGPUSupported: Boolean((navigator as any).gpu),
      isIOS: this.state.isIOS,
      isLoaded: this.initPromise !== null
    };
  }

  async removeBackground(url: string, id: string) {
    if (!this.initPromise) {
      await this.initializeModel();
    }

    // Still need to get image data on main thread (or send URL to worker to fetch)
    // Sending ImageBitmap or ImageData is best.
    const img = await RawImage.fromURL(url);
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas context failed");
    ctx.drawImage(img.toCanvas(), 0, 0);
    const imageData = ctx.getImageData(0, 0, img.width, img.height);

    return new Promise<Blob>((resolve, reject) => {
        const handler = (e: MessageEvent) => {
            if (e.data.type === 'remove-bg-complete' && e.data.id === id) {
                this.worker?.removeEventListener('message', handler);
                const mask = e.data.payload.mask;
                
                // Apply mask to alpha channel
                for (let i = 0; i < mask.length; ++i) {
                    imageData.data[4 * i + 3] = mask[i];
                }
                ctx.putImageData(imageData, 0, 0);

                canvas.toBlob((blob) => {
                    blob ? resolve(blob) : reject(new Error("Blob creation failed"));
                }, "image/png");
            } else if (e.data.type === 'error' && e.data.id === id) {
                this.worker?.removeEventListener('message', handler);
                reject(new Error(e.data.payload));
            }
        };
        
        this.worker?.addEventListener('message', handler);
        this.worker?.postMessage({ 
            type: 'remove-bg', 
            payload: { imageData }, 
            id 
        }, [imageData.data.buffer] as any);
    });
  }

  async removeVideoBackground(url: string, id: string, onProgress?: (p: number) => void): Promise<Blob | null> {
    const { videoBackgroundRemover } = await import("video-editor/services/VideoBackgroundRemover");
    return await videoBackgroundRemover.processVideo(url, { onProgress });
  }

  async upscale(url: string, factor: number = 2) {
    try {
      const upscaler = await pipeline('image-to-image', 'Xenova/swin2SR-classical-sr-x2', {
        device: this.state.isWebGPUSupported ? 'webgpu' : 'wasm'
      });
      const output = await upscaler(url);
      // @ts-expect-error
      const canvas = output.toCanvas();
      return new Promise<Blob>((resolve) => {
        canvas.toBlob((blob: Blob) => resolve(blob), "image/png");
      });
    } catch (error) {
      console.error("Upscale failed:", error);
      throw error;
    }
  }

  async denoise(url: string) {
    try {
      const denoiser = await pipeline('image-to-image', 'Xenova/swinir-denoising-sr-x2', {
        device: this.state.isWebGPUSupported ? 'webgpu' : 'wasm'
      });
      const output = await denoiser(url);
      // @ts-expect-error
      const canvas = output.toCanvas();
      return new Promise<Blob>((resolve) => {
        canvas.toBlob((blob: Blob) => resolve(blob), "image/png");
      });
    } catch (error) {
      console.error("Denoise failed:", error);
      throw error;
    }
  }

  async vectorize(url: string): Promise<string> {
    try {
      const img = await RawImage.fromURL(url);
      const canvas = img.toCanvas();
      const ctx = canvas.getContext('2d');
      if (!ctx) return "";
      const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);

      let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
      const step = 2; // Increased resolution for vectorizer
      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          const i = (y * width + x) * 4;
          if (data[i + 3] > 128) {
            svg += `<rect x="${x}" y="${y}" width="${step}" height="${step}" fill="rgb(${data[i]},${data[i + 1]},${data[i + 2]})" />`;
          }
        }
      }
      return svg + '</svg>';
    } catch (error) {
      console.error("Vectorization failed:", error);
      return "";
    }
  }

  async processImage(image: File | String): Promise<File> {
    const url = typeof image === 'string' ? image : URL.createObjectURL(image as Blob);
    const blob = await this.removeBackground(url as string, "temp_process");
    
    // @ts-ignore
    const [fileName] = image?.name?.split(".") || ["image"];
    return new File([blob], `${fileName}-bg-removed.png`, { type: "image/png" });
  }

  async processImages(images: File[]): Promise<File[]> {
    const processedFiles: File[] = [];
    for (const image of images) {
        try {
            const processedFile = await this.processImage(image);
            processedFiles.push(processedFile);
        } catch (error) {
            console.error("Error processing image", image.name, error);
        }
    }
    return processedFiles;
  }

  addCacheEntry(id: string, original: string, modified: string, usage: CacheUsage) {
    this.cache.set(id, { original, modified, usage });
  }

  getCacheEntry(id: string) {
    return this.cache.get(id);
  }

  hasCacheEntry(id: string) {
    return this.cache.has(id);
  }

  removeCacheEntry(id: string) {
    this.cache.delete(id);
  }
}

export const rmbgAI = createInstance(RmbgAI);
