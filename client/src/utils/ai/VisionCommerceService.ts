import { useStudioStore } from '@/stores/studio';
import { toast } from 'vue-sonner';

export class VisionCommerceService {
    private static instance: VisionCommerceService;
    private isInitialized = false;

    private constructor() {}

    public static getInstance(): VisionCommerceService {
        if (!VisionCommerceService.instance) {
            VisionCommerceService.instance = new VisionCommerceService();
        }
        return VisionCommerceService.instance;
    }

    public init() {
        if (this.isInitialized) return;
        
        window.addEventListener('vision:detection_result', (event: any) => {
            this.handleDetection(event.detail.raw);
        });

        this.isInitialized = true;
        console.log('[VisionCommerceService] Initialized and listening for detection events.');
    }

    private handleDetection(detectionRaw: string) {
        const studioStore = useStudioStore();
        const products = studioStore.liveProducts;

        // detectionRaw is usually a descriptive string or JSON from Gemini
        console.log('[VisionCommerceService] Processing AI Vision output:', detectionRaw);

        // Simple fuzzy matching or keyword matching against live products
        const detectedLower = detectionRaw.toLowerCase();
        
        const matchedProduct = products.find(p => {
            const nameMatch = detectedLower.includes(p.name.toLowerCase());
            const descMatch = p.description ? detectedLower.includes(p.description.toLowerCase()) : false;
            const categoryMatch = p.category ? detectedLower.includes(p.category.toLowerCase()) : false;
            
            return nameMatch || descMatch || categoryMatch;
        });

        if (matchedProduct) {
            console.log(`[VisionCommerceService] V2C Match Found! Updating store: ${matchedProduct.name}`);
            
            studioStore.updateV2CMatch({
                productId: matchedProduct.id,
                name: matchedProduct.name,
                confidence: 0.95, // Gemini match is usually high confidence if name matched
                timestamp: Date.now()
            });

            if (!studioStore.humanFreeMode) {
                // Suggestion for human mode
                toast.info(`AI suggests highlighting: ${matchedProduct.name}`, {
                    action: {
                        label: 'Showcase',
                        onClick: () => studioStore.highlightProduct(matchedProduct.id)
                    }
                });
            }
        } else {
            studioStore.updateV2CMatch(null);
        }
    }
}

export const visionCommerceService = VisionCommerceService.getInstance();
