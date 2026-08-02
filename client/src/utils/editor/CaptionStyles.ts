export interface CaptionStyle {
    id: string;
    name: string;
    css: Record<string, string>;
    canvasFont: string;
    canvasFill: string;
    canvasStroke?: string;
    canvasBg?: string;
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
        canvasFont: '600 24px Inter, sans-serif',
        canvasFill: '#ffffff',
        canvasShadow: {
            color: 'rgba(0,0,0,0.8)',
            blur: 4,
            offsetX: 0,
            offsetY: 2
        }
    },
    default: {
        id: 'default',
        name: 'Default',
        css: {
            color: '#ffffff',
            fontFamily: 'Inter, sans-serif',
            fontWeight: '600'
        },
        canvasFont: 'bold 24px Inter, sans-serif',
        canvasFill: '#ffffff',
        canvasBg: 'rgba(0, 0, 0, 0.65)'
    },
    capcut: {
        id: 'capcut',
        name: 'CapCut Yellow',
        css: {
            color: '#FBFF00',
            fontFamily: 'Inter, sans-serif',
            fontWeight: '900',
            textStroke: '2px #000000'
        },
        canvasFont: '900 26px Inter, sans-serif',
        canvasFill: '#FBFF00',
        canvasStroke: '#000000'
    },
    cinematic: {
        id: 'cinematic',
        name: 'Cinematic Gold',
        css: {
            color: '#FFD700',
            fontFamily: 'Outfit, sans-serif',
            fontWeight: '800',
            letterSpacing: '1px',
            textTransform: 'uppercase'
        },
        canvasFont: '800 28px Outfit, sans-serif',
        canvasFill: '#FFD700',
        canvasShadow: {
            color: 'rgba(0,0,0,0.9)',
            blur: 4,
            offsetX: 0,
            offsetY: 2
        }
    },
    bold: {
        id: 'bold',
        name: 'Bold Red',
        css: {
            color: '#EF4444',
            fontFamily: 'Inter, sans-serif',
            fontWeight: '900'
        },
        canvasFont: '900 26px Inter, sans-serif',
        canvasFill: '#EF4444',
        canvasStroke: '#000000'
    },
    minimal: {
        id: 'minimal',
        name: 'Minimal White',
        css: {
            color: '#FFFFFF',
            fontFamily: 'Inter, sans-serif',
            fontWeight: '500'
        },
        canvasFont: '500 22px Inter, sans-serif',
        canvasFill: '#FFFFFF',
        canvasBg: 'rgba(255, 255, 255, 0.15)'
    },
    neon: {
        id: 'neon',
        name: 'Neon Blue',
        css: {
            color: '#3B82F6',
            fontFamily: 'Inter, sans-serif',
            fontWeight: '800'
        },
        canvasFont: '800 26px Inter, sans-serif',
        canvasFill: '#60A5FA',
        canvasShadow: {
            color: '#3B82F6',
            blur: 10,
            offsetX: 0,
            offsetY: 0
        }
    }
};

export const DEFAULT_CAPTION_STYLE = CAPTION_STYLES.default;
