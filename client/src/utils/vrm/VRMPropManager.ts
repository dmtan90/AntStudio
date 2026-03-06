import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRM } from '@pixiv/three-vrm';

export interface PropConfig {
    id: string;
    url: string;
    targetBone: string;
    offset: {
        position: { x: number; y: number; z: number };
        rotation: { x: number; y: number; z: number };
        scale: number;
    };
    meshConfig?: {
        type: 'box' | 'cylinder' | 'sphere';
        dimensions: number[]; // [w, h, d] or [radius, height]
        color: string;
    };
}

const PROP_PRESETS: Record<string, PropConfig> = {
    'mic_pop': {
        id: 'mic_pop',
        url: 'https://models.market/mic_pop.glb', 
        targetBone: 'rightHand',
        offset: {
            position: { x: 0.1, y: 0.05, z: 0 },
            rotation: { x: Math.PI / 2, y: 0, z: 0 },
            scale: 1.0
        },
        meshConfig: {
            type: 'cylinder',
            dimensions: [0.03, 0.25], // radius, height
            color: '#333333'
        }
    },
    'guitar_acoustic': {
        id: 'guitar_acoustic',
        url: 'https://models.market/guitar.glb',
        targetBone: 'leftUpperArm', // Held across body
        offset: {
             position: { x: 0.4, y: -0.2, z: 0.2 },
             rotation: { x: 0, y: Math.PI / 2, z: 0 },
             scale: 1.0
        },
        meshConfig: {
            type: 'box',
            dimensions: [0.3, 0.8, 0.1], // w, h, d
            color: '#8b4513'
        }
    },
    'keytar': {
        id: 'keytar',
        url: 'https://models.market/keytar.glb',
        targetBone: 'leftLowerArm',
        offset: {
            position: { x: 0, y: -0.1, z: 0 },
            rotation: { x: 0, y: 0, z: Math.PI / 2 },
            scale: 1.0
        },
        meshConfig: {
            type: 'box',
            dimensions: [0.6, 0.2, 0.1],
            color: '#ff0055'
        }
    },
    'violin': {
        id: 'violin',
        url: 'https://models.market/violin.glb',
        targetBone: 'leftShoulder',
        offset: {
            position: { x: 0.15, y: 0.1, z: 0.1 },
            rotation: { x: 0, y: 0, z: -Math.PI / 4 },
            scale: 1.0
        },
        meshConfig: {
            type: 'box', // Approximation
            dimensions: [0.2, 0.5, 0.1],
            color: '#5c3a21'
        }
    },
    'cyber_mic': {
        id: 'cyber_mic',
        url: '',
        targetBone: 'head',
        offset: {
            position: { x: 0.12, y: 0.05, z: 0.1 },
            rotation: { x: 0, y: Math.PI / 4, z: Math.PI / 2 }, // Near mouth
            scale: 1.0
        },
        meshConfig: {
            type: 'sphere',
            dimensions: [0.03],
            color: '#00f2ff'
        }
    },
    'water_bottle': {
        id: 'water_bottle',
        url: '',
        targetBone: 'rightHand',
        offset: {
            position: { x: 0, y: 0.05, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: 1.0
        },
        meshConfig: {
            type: 'cylinder',
            dimensions: [0.03, 0.2],
            color: '#7bd5ff'
        }
    },
    'smartphone': {
        id: 'smartphone',
        url: '',
        targetBone: 'leftHand',
        offset: {
            position: { x: 0, y: 0.05, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: 1.0
        },
        meshConfig: {
            type: 'box',
            dimensions: [0.07, 0.14, 0.01],
            color: '#222222'
        }
    }
};

export class VRMPropManager {
    private loader = new GLTFLoader();
    private activePropModel: THREE.Object3D | null = null;

    async attachProp(vrm: VRM, propId: string): Promise<THREE.Object3D | null> {
        const config = PROP_PRESETS[propId];
        if (!config) return null;

        // Cleanup previous prop
        this.detachProp();

        let model: THREE.Object3D | null = null;

        try {
            // Attempt to load GLB if URL is valid (and not placeholder)
            if (config.url && !config.url.includes('models.market')) {
                const gltf = await this.loader.loadAsync(config.url);
                model = gltf.scene;
            } else {
                throw new Error('Placeholder or empty URL');
            }
        } catch (e) {
            // Fallback to procedural mesh
            // console.warn(`[VRMPropManager] Using procedural fallback for ${propId}`);
            model = this.createProceduralMesh(config);
        }

        if (model) {
            // Apply offsets
            model.position.set(config.offset.position.x, config.offset.position.y, config.offset.position.z);
            model.rotation.set(config.offset.rotation.x, config.offset.rotation.y, config.offset.rotation.z);
            model.scale.setScalar(config.offset.scale);

            // Find target bone
            const bone = vrm.humanoid?.getNormalizedBoneNode(config.targetBone as any);
            if (bone) {
                bone.add(model);
                this.activePropModel = model;
                return model;
            } else {
                console.warn(`[VRMPropManager] Target bone ${config.targetBone} not found`);
            }
        }

        return null;
    }

    private createProceduralMesh(config: PropConfig): THREE.Mesh {
        let geometry: THREE.BufferGeometry;
        const meshConfig = config.meshConfig || { type: 'box', dimensions: [0.1, 0.1, 0.1], color: '#ff0000' };

        switch (meshConfig.type) {
            case 'cylinder':
                // radiusTop, radiusBottom, height, radialSegments
                geometry = new THREE.CylinderGeometry(
                    meshConfig.dimensions[0], 
                    meshConfig.dimensions[0], 
                    meshConfig.dimensions[1], 12
                );
                break;
            case 'sphere':
                geometry = new THREE.SphereGeometry(meshConfig.dimensions[0], 16, 16);
                break;
            case 'box':
            default:
                geometry = new THREE.BoxGeometry(
                    meshConfig.dimensions[0], 
                    meshConfig.dimensions[1], 
                    meshConfig.dimensions[2]
                );
                break;
        }

        // Add a "wireframe" feel for cybersecurity vibe
        const material = new THREE.MeshPhysicalMaterial({
            color: meshConfig.color,
            metalness: 0.8,
            roughness: 0.2,
            transmission: 0.1, // Glass-like
            opacity: 0.9,
            transparent: true,
            emissive: meshConfig.color,
            emissiveIntensity: 0.3
        });

        const mesh = new THREE.Mesh(geometry, material);
        
        // Add a simple glow sprite or second geometry for detail? 
        // Keep it simple for now.
        return mesh;
    }

    detachProp() {
        if (this.activePropModel && this.activePropModel.parent) {
            this.activePropModel.parent.remove(this.activePropModel);
            
            // Dispose geometry/material if it's a mesh we created
            if (this.activePropModel instanceof THREE.Mesh) {
                this.activePropModel.geometry.dispose();
                if (Array.isArray(this.activePropModel.material)) {
                    this.activePropModel.material.forEach((m: any) => m.dispose());
                } else {
                    (this.activePropModel.material as any).dispose();
                }
            }
            
            this.activePropModel = null;
        }
    }

    getPresets() {
        return Object.values(PROP_PRESETS);
    }
}
