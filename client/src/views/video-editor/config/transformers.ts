import { env } from "@huggingface/transformers";

env.allowLocalModels = false;
env.allowRemoteModels = true;
env.backends.onnx.wasm.proxy = true;
