export interface StudioEnvironment {
    id: string;
    name: string;
    backgroundUrl: string;
    lighting: {
        ambientColor: number;
        ambientIntensity: number;
        directionalColor?: number;
        directionalIntensity?: number;
    };
    vfx: {
        particles?: 'fireflies' | 'petals' | 'rain' | 'snow' | 'none';
        bloom?: boolean;
        colorGrading?: string; // CSS Filter or Lookup table name
    };
}

export const STUDIO_ENVIRONMENTS: Record<string, StudioEnvironment> = {
    cyberpunk: {
        id: 'cyberpunk',
        name: 'Cyberpunk Penthouse',
        backgroundUrl: '/bg/cyberpunk_penthouse.jpg',
        lighting: {
            ambientColor: 0x442266,
            ambientIntensity: 0.8,
            directionalColor: 0xff00ff,
            directionalIntensity: 1.2
        },
        vfx: {
            particles: 'fireflies',
            bloom: true,
            colorGrading: 'hue-rotate(280deg) saturate(1.5) contrast(1.1)'
        }
    },
    zen: {
        id: 'zen',
        name: 'Zen Garden',
        backgroundUrl: '/bg/zen_garden.jpg',
        lighting: {
            ambientColor: 0x66ccff,
            ambientIntensity: 0.6,
            directionalColor: 0xffffcc,
            directionalIntensity: 1.0
        },
        vfx: {
            particles: 'petals',
            bloom: false,
            colorGrading: 'saturate(0.9) sepia(0.1)'
        }
    },
    void: {
        id: 'void',
        name: 'Void Terminal',
        backgroundUrl: '/bg/void_terminal.jpg',
        lighting: {
            ambientColor: 0x001122,
            ambientIntensity: 1.0,
            directionalColor: 0x00ffff,
            directionalIntensity: 1.5
        },
        vfx: {
            particles: 'none',
            bloom: true,
            colorGrading: 'contrast(1.2) brightness(1.1)'
        }
    },
    standard: {
        id: 'standard',
        name: 'Pro Studio',
        backgroundUrl: '/bg/studio_standard.jpg',
        lighting: {
            ambientColor: 0xffffff,
            ambientIntensity: 0.5,
            directionalColor: 0xffffff,
            directionalIntensity: 0.8
        },
        vfx: {
            particles: 'none',
            bloom: false,
            colorGrading: 'none'
        }
    }
};
