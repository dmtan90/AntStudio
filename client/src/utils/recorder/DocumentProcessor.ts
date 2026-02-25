import api from '@/utils/api'

export class DocumentProcessor {
    private static PDF_JS_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
    private static PDF_WORKER_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

    static async loadPdfJS() {
        if ((window as any).pdfjsLib) return (window as any).pdfjsLib;
        
        return new Promise((resolve, reject) => {
            console.log('[DocumentProcessor] Loading PDF.js via Script tag...');
            const script = document.createElement('script');
            script.src = this.PDF_JS_URL;
            script.onload = () => {
                const pdfjs = (window as any).pdfjsLib;
                pdfjs.GlobalWorkerOptions.workerSrc = this.PDF_WORKER_URL;
                console.log('[DocumentProcessor] PDF.js loaded successfully');
                resolve(pdfjs);
            };
            script.onerror = (err) => {
                console.error('[DocumentProcessor] Script load error:', err);
                reject(new Error('Failed to load PDF.js library'));
            };
            document.head.appendChild(script);
        });
    }

    static async pdfToImages(file: File): Promise<ImageBitmap[]> {
        console.log('[DocumentProcessor] pdfToImages started');
        const pdfjs = await this.loadPdfJS();
        console.log('[DocumentProcessor] ArrayBuffer loading...');
        const arrayBuffer = await file.arrayBuffer();
        console.log('[DocumentProcessor] getDocument initiated');
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        
        loadingTask.onProgress = (progress: any) => {
            console.log(`[DocumentProcessor] Loading: ${Math.round(progress.loaded / progress.total * 100)}%`);
        };

        console.log('[DocumentProcessor] Waiting for loadingTask promise...');
        const pdf = await loadingTask.promise;
        console.log(`[DocumentProcessor] PDF loaded: ${pdf.numPages} pages`);
        const images: ImageBitmap[] = [];
 
        for (let i = 1; i <= pdf.numPages; i++) {
            console.log(`[DocumentProcessor] Processing page ${i}...`);
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 }); // High quality
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
 
            if (context) {
                console.log(`[DocumentProcessor] Rendering page ${i}...`);
                await page.render({ canvasContext: context, viewport }).promise;
                console.log(`[DocumentProcessor] Creating ImageBitmap for page ${i}...`);
                const bitmap = await createImageBitmap(canvas);
                images.push(bitmap);
            }
        }
 
        console.log('[DocumentProcessor] pdfToImages completed, total images:', images.length);
        return images;
    }

    static async pptToImages(file: File): Promise<ImageBitmap[]> {
        const formData = new FormData();
        formData.append('file', file);

        const res: any = await api.post('/ai/presentation/analyze', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 300000
        });

        if (!res.success || !res.data?.scenes) {
            throw new Error(res.error || 'Failed to process PPT/PPTX file');
        }

        const scenes = res.data.scenes as Array<{ id: number; text: string }>;
        const images: ImageBitmap[] = [];

        for (const s of scenes) {
            const canvas = document.createElement('canvas');
            canvas.width = 1920;
            canvas.height = 1080;
            const ctx = canvas.getContext('2d');
            if (!ctx) continue;

            ctx.fillStyle = '#020617';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = '#0f172a';
            ctx.fillRect(120, 120, canvas.width - 240, canvas.height - 240);

            ctx.fillStyle = '#e5e7eb';
            ctx.font = 'bold 40px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';

            const marginX = 160;
            const marginY = 160;
            const maxWidth = canvas.width - marginX * 2;

            const text = s.text || '';
            const words = text.split(/\s+/);
            let line = '';
            let y = marginY;

            for (let n = 0; n < words.length; n++) {
                const testLine = line + words[n] + ' ';
                const metrics = ctx.measureText(testLine);
                if (metrics.width > maxWidth && n > 0) {
                    ctx.fillText(line, marginX, y);
                    line = words[n] + ' ';
                    y += 56;
                    if (y > canvas.height - marginY - 60) break;
                } else {
                    line = testLine;
                }
            }
            if (line && y <= canvas.height - marginY - 60) {
                ctx.fillText(line, marginX, y);
            }

            const bitmap = await createImageBitmap(canvas);
            images.push(bitmap);
        }

        return images;
    }

    static async processFile(file: File): Promise<{ pages: ImageBitmap[], type: 'pdf' | 'ppt' | 'video' }> {
        const ext = file.name.split('.').pop()?.toLowerCase();
        
        if (ext === 'pdf') {
            const pages = await this.pdfToImages(file);
            return { pages, type: 'pdf' };
        } else if (ext === 'pptx' || ext === 'ppt') {
            const pages = await this.pptToImages(file);
            return { pages, type: 'ppt' };
        } else if (file.type.startsWith('video/')) {
            // For videos, we might just return the video as a single page or handle it as a stream
            return { pages: [], type: 'video' };
        }
        
        throw new Error('Unsupported file type');
    }
}
