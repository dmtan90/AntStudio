import { createWorker } from 'tesseract.js';
import { getFileUrl } from '@/utils/api';

export class OcrService {
    private worker: Tesseract.Worker | null = null;
    private isInitialized = false;

    async initialize(lang: string = 'eng') {
        if (this.isInitialized && this.worker) return;

        this.worker = await createWorker(lang);
        this.isInitialized = true;
        console.log(`[OcrService] Initialized with language: ${lang}`);
    }

    async recognize(mediaUrl: string, options: { onProgress?: (p: number) => void } = {}): Promise<string> {
        if (!this.isInitialized) await this.initialize();
        if (!this.worker) throw new Error("OCR Worker not initialized");

        const url = await getFileUrl(mediaUrl);
        
        const { data: { text } } = await this.worker.recognize(url, {
            // @ts-ignore
            progress: (p: any) => {
                if (options.onProgress && p.status === 'recognizing text') {
                    options.onProgress(p.progress * 100);
                }
            }
        });

        return text;
    }

    async terminate() {
        if (this.worker) {
            await this.worker.terminate();
            this.worker = null;
            this.isInitialized = false;
        }
    }
}

export const ocrService = new OcrService();
