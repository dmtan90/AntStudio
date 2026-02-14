export class DocumentProcessor {
    private static PDF_JS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.mjs';
    private static PDF_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.mjs';

    static async loadPdfJS() {
        if ((window as any).pdfjsLib) return (window as any).pdfjsLib;
        // Use ESM import if possible
        const pdfjs = await import(/* @vite-ignore */ this.PDF_JS_URL);
        pdfjs.GlobalWorkerOptions.workerSrc = this.PDF_WORKER_URL;
        (window as any).pdfjsLib = pdfjs;
        return pdfjs;
    }

    static async pdfToImages(file: File): Promise<ImageBitmap[]> {
        const pdfjs = await this.loadPdfJS();
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        const images: ImageBitmap[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 }); // High quality
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            if (context) {
                await page.render({ canvasContext: context, viewport }).promise;
                const bitmap = await createImageBitmap(canvas);
                images.push(bitmap);
            }
        }

        return images;
    }

    static async processFile(file: File): Promise<{ pages: ImageBitmap[], type: 'pdf' | 'ppt' | 'video' }> {
        const ext = file.name.split('.').pop()?.toLowerCase();
        
        if (ext === 'pdf') {
            const pages = await this.pdfToImages(file);
            return { pages, type: 'pdf' };
        } else if (ext === 'pptx' || ext === 'ppt') {
            // Mocking PPT for now by showing a notification
            // In a real scenario, we might use a cloud converter
            throw new Error('PPTX processing requires backend conversion. Please use PDF for now.');
        } else if (file.type.startsWith('video/')) {
            // For videos, we might just return the video as a single page or handle it as a stream
            return { pages: [], type: 'video' };
        }
        
        throw new Error('Unsupported file type');
    }
}
