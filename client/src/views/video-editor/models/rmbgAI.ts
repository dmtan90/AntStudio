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
  state: ModelState = {
    model: null,
    processor: null,
    isWebGPUSupported: false,
    currentModelId: FALLBACK_MODEL_ID,
    isIOS: isIOS()
  };

  constructor() {
    this.cache = createMap<string, RmbgAICache>();
    this.pending = createMap<string, boolean>();
  }

  // Initialize WebGPU with proper error handling
  async _initializeWebGPU() {
    const gpu = (navigator as any).gpu;
    if (!gpu) {
      return false;
    }

    try {
      // Test if we can actually create an adapter
      const adapter = await gpu.requestAdapter();
      if (!adapter) {
        return false;
      }

      // Configure environment for WebGPU
      env.allowLocalModels = false;
      if (env.backends?.onnx?.wasm) {
        env.backends.onnx.wasm.proxy = false;
      }

      // Wait for WebAssembly initialization
      await new Promise(resolve => setTimeout(resolve, 100));

      // Initialize model with WebGPU
      this.state.model = await AutoModel.from_pretrained(WEBGPU_MODEL_ID, {
        device: "webgpu",
        config: {
          model_type: 'modnet',
          // @ts-expect-error
          architectures: ['MODNet']
        }
      });
      this.state.processor = await AutoProcessor.from_pretrained(WEBGPU_MODEL_ID);
      this.state.isWebGPUSupported = true;
      return true;
    } catch (error) {
      console.error("WebGPU initialization failed:", error);
      return false;
    }
  }

  // Initialize the model based on the selected model ID
  async initializeModel(forceModelId?: string): Promise<boolean> {
    try {
      // Always use RMBG-1.4 for iOS
      if (this.state.isIOS) {
        console.log('iOS detected, using RMBG-1.4 model');
        env.allowLocalModels = false;
        if (env.backends?.onnx?.wasm) {
          env.backends.onnx.wasm.proxy = true;
        }

        this.state.model = await AutoModel.from_pretrained(FALLBACK_MODEL_ID, {
          // @ts-expect-error
          config: { model_type: 'custom' }
        });

        this.state.processor = await AutoProcessor.from_pretrained(FALLBACK_MODEL_ID, {
          config: {
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
          }
        });

        this.state.currentModelId = FALLBACK_MODEL_ID;
        return true;
      }

      // Non-iOS flow remains the same
      const selectedModelId = forceModelId || FALLBACK_MODEL_ID;

      // Try WebGPU if requested
      if (selectedModelId === WEBGPU_MODEL_ID) {
        const webGPUSuccess = await this._initializeWebGPU();
        if (webGPUSuccess) {
          this.state.currentModelId = WEBGPU_MODEL_ID;
          return true;
        }
        // If WebGPU fails, fall through to fallback model without error
      }

      // Use fallback model
      env.allowLocalModels = false;
      if (env.backends?.onnx?.wasm) {
        env.backends.onnx.wasm.proxy = true;
      }

      this.state.model = await AutoModel.from_pretrained(FALLBACK_MODEL_ID, {
        // @ts-expect-error
        progress_callback: ({ progress }) => {
          if (progress) {
            console.log(`Loading model: ${Math.round(progress)}%`);
          }
        }
      });

      this.state.processor = await AutoProcessor.from_pretrained(FALLBACK_MODEL_ID, {
        revision: "main",
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

      this.state.currentModelId = FALLBACK_MODEL_ID;

      if (!this.state.model || !this.state.processor) {
        throw new Error("Failed to initialize model or processor");
      }

      this.state.currentModelId = selectedModelId;
      return true;
    } catch (error) {
      console.error("Error initializing model:", error);
      if (forceModelId === WEBGPU_MODEL_ID) {
        console.log("Falling back to cross-browser model...");
        return this.initializeModel(FALLBACK_MODEL_ID);
      }
      throw new Error(error instanceof Error ? error.message : "Failed to initialize background removal model");
    }
  }

  // Get current model info
  getModelInfo(): ModelInfo {
    return {
      currentModelId: this.state.currentModelId,
      isWebGPUSupported: Boolean((navigator as any).gpu),
      isIOS: this.state.isIOS,
      isLoaded: (this.state.model != null && this.state.processor != null)
    };
  }

  async removeBackground(url: string, id: string) {
    if (!this.state.model || !this.state.processor) {
      throw new Error("Model not initialized. Call initializeModel() first.");
      // await this.initializeModel();
    }

    const img = await RawImage.fromURL(url);

    try {
      // Pre-process image
      const { pixel_values } = await this.state.processor(img);

      // Predict alpha matte
      const { output } = await this.state.model({ input: pixel_values });

      // Resize mask back to original size
      const maskData = (
        await RawImage.fromTensor(output[0].mul(255).to("uint8")).resize(
          img.width,
          img.height,
        )
      ).data;

      // Create new canvas
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get 2d context");

      // Draw original image output to canvas
      ctx.drawImage(img.toCanvas(), 0, 0);

      // Update alpha channel
      const pixelData = ctx.getImageData(0, 0, img.width, img.height);
      for (let i = 0; i < maskData.length; ++i) {
        pixelData.data[4 * i + 3] = maskData[i];
      }
      ctx.putImageData(pixelData, 0, 0);

      // Convert canvas to blob
      return createPromise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error("Failed to create blob")),
          "image/png"
        )
      });
    } catch (error) {
      console.error("Error processing image:", error);
      throw new Error("Failed to process image");
    } finally {
      this.pending.delete(id);
    }
  }

  async removeVideoBackground(url: string, id: string): Promise<Blob | null> {
    console.log("removeVideoBackground not implemented", url, id);
    return null;
  }

  async processImage(image: File | String): Promise<File> {
    if (!this.state.model || !this.state.processor) {
      throw new Error("Model not initialized. Call initializeModel() first.");
    }
    // @ts-expect-error
    const img = await RawImage.fromURL(URL.createObjectURL(image));

    try {
      // Pre-process image
      const { pixel_values } = await this.state.processor(img);

      // Predict alpha matte
      const { output } = await this.state.model({ input: pixel_values });

      // Resize mask back to original size
      const maskData = (
        await RawImage.fromTensor(output[0].mul(255).to("uint8")).resize(
          img.width,
          img.height,
        )
      ).data;

      // Create new canvas
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get 2d context");

      // Draw original image output to canvas
      ctx.drawImage(img.toCanvas(), 0, 0);

      // Update alpha channel
      const pixelData = ctx.getImageData(0, 0, img.width, img.height);
      for (let i = 0; i < maskData.length; ++i) {
        pixelData.data[4 * i + 3] = maskData[i];
      }
      ctx.putImageData(pixelData, 0, 0);

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error("Failed to create blob")),
          "image/png"
        )
      );

      // @ts-expect-error
      const [fileName] = image?.name?.split(".");
      const processedFile = new File([blob], `${fileName}-bg-blasted.png`, { type: "image/png" });
      return processedFile;
    } catch (error) {
      console.error("Error processing image:", error);
      throw new Error("Failed to process image");
    }
  }

  async processImages(images: File[]): Promise<File[]> {
    console.log("Processing images...");
    const processedFiles: File[] = [];

    for (const image of images) {
      try {
        const processedFile = await this.processImage(image);
        processedFiles.push(processedFile);
        console.log("Successfully processed image", image.name);
      } catch (error) {
        console.error("Error processing image", image.name, error);
      }
    }

    console.log("Processing images done");
    return processedFiles;
  }

  addCacheEntry(id: string, original: string, modified: string, usage: CacheUsage) {
    this.cache.set(id, { original, modified, usage });
  }

  updateCacheEntry(id: string, data: Partial<RmbgAICache>) {
    const entry = this.cache.get(id);
    if (!entry) return;
    this.cache.set(id, { ...entry, ...data });
  }

  removeCacheEntry(id: string) {
    this.cache.delete(id);
  }

  initializeCache(entries: [string, RmbgAICache][]) {
    this.cache = createMap(entries);
  }

  exportCache() {
    return Array.from(this.cache.entries());
  }
}

export const rmbgAI = createInstance(RmbgAI);
