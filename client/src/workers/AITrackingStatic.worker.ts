// @ts-nocheck
// @ts-ignore
import type { 
    FaceLandmarker, FilesetResolver as FilesetResolverType, 
    ImageSegmenter, HandLandmarker, 
    ImageSegmenterResult 
} from "@mediapipe/tasks-vision";

importScripts('/models/mediapipe/mediapipe.js');

let faceLandmarker: FaceLandmarker | null = null;

async function init() {
    try {
        const vision = await $mediapipe.FilesetResolver.forVisionTasks("/models/mediapipe");
        faceLandmarker = await $mediapipe.FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: `/models/mediapipe/face_landmarker.task`,
                delegate: "GPU"
            },
            runningMode: "IMAGE",
            numFaces: 1
        });
        self.postMessage({ type: 'INIT_COMPLETE' });
    } catch (err) {
        self.postMessage({ type: 'ERROR', error: (err as Error).message });
    }
}

self.onmessage = async (event) => {
    const { type, payload, id } = event.data;

    if (type === 'INIT') {
        await init();
    } else if (type === 'DETECT') {
        if (!faceLandmarker) {
            self.postMessage({ type: 'ERROR', id, error: 'FaceLandmarker not initialized' });
            return;
        }

        try {
            const image = payload as ImageBitmap;
            const result = faceLandmarker.detect(image);
            self.postMessage({ type: 'DETECT_RESULT', id, result });
            image.close();
        } catch (err) {
            self.postMessage({ type: 'ERROR', id, error: (err as Error).message });
        }
    }
};
