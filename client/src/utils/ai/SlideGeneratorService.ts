import { useStudioStore } from '@/stores/studio';
import { DocumentProcessor } from '@/utils/recorder/DocumentProcessor';
import api from '@/utils/api';
import JSZip from 'jszip';

export interface Slide {
    title: string;
    bullets: string[];
    imageUrl?: string;
    keywords: string[];
}

/**
 * SlideGeneratorService: Orchestrates the creation of educational slides
 * via Gemini and document parsing.
 */
export class SlideGeneratorService {
    private static instance: SlideGeneratorService;

    private constructor() {}

    public static getInstance(): SlideGeneratorService {
        if (!SlideGeneratorService.instance) {
            SlideGeneratorService.instance = new SlideGeneratorService();
        }
        return SlideGeneratorService.instance;
    }

    /**
     * Generates a complete slide deck based on a topic using Gemini.
     */
    public async generateSlides(topic: string): Promise<Slide[]> {
        const studioStore = useStudioStore();
        studioStore.contextData.education.isGenerating = true;

        console.log(`[SlideGenerator] Generating slides for: ${topic}`);

        try {
            const res: any = await api.post('/ai/generate-slides', { topic });
            if (res?.data?.slides) {
                const slides = res.data.slides as Slide[];
                studioStore.contextData.education.slides = slides;
                studioStore.contextData.education.currentLesson = topic;
                studioStore.contextData.education.activeSlide = 0;
                
                // Fetch visuals for the first few slides
                this.enrichSlidesWithVisuals(slides);

                return slides;
            }
        } catch (error) {
            console.error('[SlideGenerator] Generation failed:', error);
        } finally {
            studioStore.contextData.education.isGenerating = false;
        }
        return [];
    }

    /**
     * Processes a PPTX or PDF file client-side to extract content for AI synthesis.
     */
    public async processUploadedDocument(file: File) {
        const studioStore = useStudioStore();
        studioStore.contextData.education.isGenerating = true;
        
        const ext = file.name.split('.').pop()?.toLowerCase();
        let extractedText = '';

        try {
            if (ext === 'pdf') {
                extractedText = await this.extractTextFromPDF(file);
            } else if (ext === 'pptx') {
                extractedText = await this.extractTextFromPPTX(file);
            } else if (ext === 'docx') {
                extractedText = await this.extractTextFromDOCX(file);
            } else if (ext === 'txt') {
                extractedText = await file.text();
            }

            if (extractedText) {
                console.log(`[SlideGenerator] Extracted ${extractedText.length} chars. Synthesizing with AI...`);
                await this.synthesizeAIDocument(extractedText, file.name);
            }
        } catch (error) {
            console.error('[SlideGenerator] Document processing failed:', error);
        } finally {
            studioStore.contextData.education.isGenerating = false;
        }
    }

    private async extractTextFromPDF(file: File): Promise<string> {
        const pdfjs: any = await DocumentProcessor.loadPdfJS();
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map((item: any) => item.str).join(' ');
            fullText += `[Slide ${i}]\n${pageText}\n\n`;
        }
        return fullText;
    }

    private async extractTextFromPPTX(file: File): Promise<string> {
        const zip = await JSZip.loadAsync(file);
        let fullText = '';
        const slideEntries = Object.keys(zip.files).filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'));
        
        // Sort slides numerically
        slideEntries.sort((a, b) => {
            const numA = parseInt(a.match(/\d+/)![0]);
            const numB = parseInt(b.match(/\d+/)![0]);
            return numA - numB;
        });

        const parser = new DOMParser();

        for (let i = 0; i < slideEntries.length; i++) {
            const content = await zip.file(slideEntries[i])?.async('text');
            if (content) {
                const xmlDoc = parser.parseFromString(content, 'text/xml');
                const textNodes = xmlDoc.getElementsByTagName('a:t');
                const slideText = Array.from(textNodes).map(node => node.textContent).join(' ');
                fullText += `[Slide ${i + 1}]\n${slideText}\n\n`;
            }
        }
        return fullText;
    }

    private async extractTextFromDOCX(file: File): Promise<string> {
        const zip = await JSZip.loadAsync(file);
        const content = await zip.file('word/document.xml')?.async('text');
        if (content) {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(content, 'text/xml');
            const textNodes = xmlDoc.getElementsByTagName('w:t');
            return Array.from(textNodes).map(node => node.textContent).join(' ');
        }
        return '';
    }

    private async synthesizeAIDocument(text: string, fileName: string) {
        const studioStore = useStudioStore();
        try {
            const res: any = await api.post('/ai/synthesize-document', { 
                text: text.substring(0, 50000), // Safety limit
                context: 'education',
                fileName 
            });

            if (res?.data?.slides) {
                const slides = res.data.slides as Slide[];
                studioStore.contextData.education.slides = slides;
                studioStore.contextData.education.currentLesson = fileName.replace(/\.[^/.]+$/, "");
                studioStore.contextData.education.activeSlide = 0;
                this.enrichSlidesWithVisuals(slides);
            }
        } catch (error) {
            console.error('[SlideGenerator] Synthesis failed:', error);
        }
    }

    private async enrichSlidesWithVisuals(slides: Slide[]) {
        const { studioDirector } = await import('./StudioDirector');
        
        // Enrich first 3 slides immediately, rest can be lazy loaded or skipped
        for (let i = 0; i < Math.min(slides.length, 3); i++) {
            if (slides[i].keywords?.length > 0) {
                const query = slides[i].keywords[0];
                const media = await studioDirector.fetchStockMedia('image', query);
                if (media?.length > 0) {
                    slides[i].imageUrl = media[0].url;
                }
            }
        }
    }
}

export const slideGeneratorService = SlideGeneratorService.getInstance();
