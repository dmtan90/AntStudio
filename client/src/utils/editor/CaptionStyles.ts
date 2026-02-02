export interface CaptionStyle {
    id: string;
    name: string;
    css: Record<string, string>;
    canvasFont: string;
    canvasFill: string;
    canvasStroke?: string;
    canvasShadow?: {
        color: string;
        blur: number;
        offsetX: number;
        offsetY: number;
    };
}

export const CAPTION_STYLES: Record<string, CaptionStyle> = {
    classic: {
        id: 'classic',
        name: 'Classic',
        css: {
            color: '#ffffff',
            textShadow: '0px 2px 4px rgba(0,0,0,0.8)',
            fontFamily: 'Inter, sans-serif',
            fontWeight: '600'
        },
        canvasFont: '600 24px Inter',
        canvasFill: '#ffffff',
        canvasShadow: {
            color: 'rgba(0,0,0,0.8)',
            blur: 4,
            offsetX: 0,
            offsetY: 2
        }
    },
    cinematic: {
        id: 'cinematic',
        name: 'Cinematic Gold',
        css: {
            color: '#FFD700',
            textShadow: '0px 0px 10px rgba(255, 215, 0, 0.3), 0px 2px 4px rgba(0,0,0,0.9)',
            fontFamily: 'Outfit, sans-serif',
            fontWeight: '800',
            letterSpacing: '1px',
            textTransform: 'uppercase'
        },
        canvasFont: '800 28px Outfit',
        canvasFill: '#FFD700',
        canvasShadow: {
            color: 'rgba(0,0,0,0.9)',
            blur: 4,
            offsetX: 0,
            offsetY: 2
        }
    },
    modern: {
        id: 'modern',
        name: 'Modern Clean',
        css: {
            color: '#000000',
            backgroundColor: '#ffffff',
            padding: '4px 12px',
            borderRadius: '4px',
            fontFamily: 'Inter, sans-serif',
            fontWeight: '700'
        },
        canvasFont: '700 24px Inter',
        canvasFill: '#000000',
        // Background box handling requires custom logic in drawing loop
    }
};

export const DEFAULT_CAPTION_STYLE = CAPTION_STYLES.classic;
