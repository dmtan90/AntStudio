import * as THREE from 'three';

export interface LightPreset {
    id: string;
    ambient: { color: string; intensity: number };
    directional: { color: string; intensity: number };
    spot: { color: string; intensity: number; position: { x: number; y: number; z: number } } | null;
}

export const LIGHT_PRESETS: Record<string, LightPreset> = {
    'studio': {
        id: 'studio',
        ambient: { color: '#ffffff', intensity: 1.0 },
        directional: { color: '#ffffff', intensity: 1.5 },
        spot: null
    },
    'neon': {
        id: 'neon',
        ambient: { color: '#1a1a2e', intensity: 0.5 },
        directional: { color: '#ff00ff', intensity: 2.0 },
        spot: { color: '#00f2ff', intensity: 5.0, position: { x: 2, y: 4, z: 2 } }
    },
    'dramatic': {
        id: 'dramatic',
        ambient: { color: '#000000', intensity: 0.1 },
        directional: { color: '#ffffff', intensity: 0.5 },
        spot: { color: '#ffffff', intensity: 10.0, position: { x: 0, y: 5, z: 1 } }
    },
    'vocal_orange': {
        id: 'vocal_orange',
        ambient: { color: '#1a0f00', intensity: 0.4 },
        directional: { color: '#ff6a00', intensity: 2.0 },
        spot: { color: '#ffcc00', intensity: 8.0, position: { x: -2, y: 4, z: 2 } }
    }
};

export class VRMLightingManager {
    private ambientLight: THREE.AmbientLight | null = null;
    private directionalLight: THREE.DirectionalLight | null = null;
    private spotLight: THREE.SpotLight | null = null;
    private baseDirectionalIntensity = 1.5;
    private baseSpotIntensity = 0;

    setup(scene: THREE.Scene) {
        // Find existing lights or create new ones
        this.ambientLight = scene.children.find(c => c instanceof THREE.AmbientLight) as THREE.AmbientLight;
        if (!this.ambientLight) {
            this.ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
            scene.add(this.ambientLight);
        }

        this.directionalLight = scene.children.find(c => c instanceof THREE.DirectionalLight) as THREE.DirectionalLight;
        if (!this.directionalLight) {
            this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
            this.directionalLight.position.set(1, 2, 3);
            scene.add(this.directionalLight);
        }

        this.spotLight = scene.children.find(c => c instanceof THREE.SpotLight) as THREE.SpotLight;
        if (!this.spotLight) {
            this.spotLight = new THREE.SpotLight(0xffffff, 0);
            this.spotLight.angle = Math.PI / 6;
            this.spotLight.penumbra = 0.3;
            this.spotLight.castShadow = true;
            scene.add(this.spotLight);
        }
    }

    applyPreset(presetId: string) {
        const preset = LIGHT_PRESETS[presetId] || LIGHT_PRESETS.studio;
        if (!this.ambientLight || !this.directionalLight || !this.spotLight) return;

        this.ambientLight.color.set(preset.ambient.color);
        this.ambientLight.intensity = preset.ambient.intensity;

        this.directionalLight.color.set(preset.directional.color);
        this.directionalLight.intensity = preset.directional.intensity;
        this.baseDirectionalIntensity = preset.directional.intensity;

        if (preset.spot) {
            this.spotLight.color.set(preset.spot.color);
            this.spotLight.position.set(preset.spot.position.x, preset.spot.position.y, preset.spot.position.z);
            this.spotLight.intensity = preset.spot.intensity;
            this.baseSpotIntensity = preset.spot.intensity;
        } else {
            this.spotLight.intensity = 0;
            this.baseSpotIntensity = 0;
        }
    }

    updateReaction(vol: number, intensityFactor: number) {
        if (!this.spotLight || !this.directionalLight) return;

        // Reactive pulsing based on volume
        const boost = vol * intensityFactor;
        
        // Pulse both lights slightly
        this.directionalLight.intensity += (boost * 0.5 - (this.directionalLight.intensity - this.baseDirectionalIntensity)) * 0.1;
        if (this.baseSpotIntensity > 0) {
            this.spotLight.intensity += (boost * 2.0 - (this.spotLight.intensity - this.baseSpotIntensity)) * 0.2;
        }
    }
}
