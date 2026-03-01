import { AutoModel, AutoProcessor, RawImage, env } from "@huggingface/transformers";

// Environment configuration for the worker
env.allowLocalModels = false;
env.useBrowserCache = true;

let model: any = null;
let processor: any = null;

async function initialize(modelId: string) {
    if (model && processor) return;
    
    console.log(`[BG-Worker] Initializing model: ${modelId}`);
    
    const isWebGPU = (navigator as any).gpu !== undefined;
    
    try {
        model = await AutoModel.from_pretrained(modelId, {
            device: isWebGPU ? "webgpu" : "wasm",
            config: {
                model_type: 'modnet',
                // @ts-ignore
                architectures: ['MODNet']
            }
        });
        processor = await AutoProcessor.from_pretrained(modelId);
        console.log(`[BG-Worker] Model ${modelId} initialized on ${isWebGPU ? 'WebGPU' : 'WASM'}`);
    } catch (err) {
        console.error(`[BG-Worker] Initialization failed:`, err);
        throw err;
    }
}

async function removeBackground(imageData: ImageData) {
    if (!model || !processor) throw new Error("Model not initialized");

    // Convert ImageData to RawImage
    const rawImage = new RawImage(imageData.data, imageData.width, imageData.height, 4);
    
    // Pre-process
    const { pixel_values } = await processor(rawImage);
    
    // Predict
    const { output } = await model({ input: pixel_values });
    
    // Resize mask back to original size
    const mask = await RawImage.fromTensor(output[0].mul(255).to("uint8")).resize(
        imageData.width,
        imageData.height
    );
    
    return mask.data; // Uint8Array
}

self.onmessage = async (e) => {
    const { type, payload, id } = e.data;
    
    try {
        if (type === 'init') {
            await initialize(payload.modelId);
            self.postMessage({ type: 'init-complete', id });
        } else if (type === 'remove-bg') {
            const mask = await removeBackground(payload.imageData);
            self.postMessage({ type: 'remove-bg-complete', payload: { mask }, id }, [mask.buffer] as any);
        }
    } catch (err: any) {
        self.postMessage({ type: 'error', payload: err.message, id });
    }
};
