import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface Guest3D {
    id: string;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    renderTarget: THREE.WebGLRenderTarget | any;
    model?: THREE.Group;
    mixer?: THREE.AnimationMixer;
    isThinking?: boolean;
    audioLevel?: number;
}

export class Avatar3DEngine {
    private guests = new Map<string, Guest3D>();
    private authToken: string | null = null;
    private onSceneDirty: () => void;

    private readonly blendShapeMapping: Record<string, string[]> = {
        'browInnerUp': ['Surprise'],
        'browDownLeft': ['Angry'],
        'browDownRight': ['Angry'],
        'browOuterUpLeft': ['Surprise'],
        'browOuterUpRight': ['Surprise'],
        'eyeBlinkLeft': ['Blink', 'Blink_L'],
        'eyeBlinkRight': ['Blink', 'Blink_R'],
        'eyeWideLeft': ['Surprise'],
        'eyeWideRight': ['Surprise'],
        'jawOpen': ['A', 'jawOpen', 'mouthOpen'],
        'mouthFunnel': ['U', 'O'],
        'mouthPucker': ['U'],
        'mouthSmileLeft': ['Joy', 'Fun'],
        'mouthSmileRight': ['Joy', 'Fun'],
        'mouthFrownLeft': ['Sorrow', 'Angry'],
        'mouthFrownRight': ['Sorrow', 'Angry'],
        'mouthDimpleLeft': ['Joy'],
        'mouthDimpleRight': ['Joy'],
        'mouthStretchLeft': ['I'],
        'mouthStretchRight': ['I'],
        'eyeLookInLeft': ['eyeLookInLeft', 'eyeIn_L'],
        'eyeLookInRight': ['eyeLookInRight', 'eyeIn_R'],
        'eyeLookOutLeft': ['eyeLookOutLeft', 'eyeOut_L'],
        'eyeLookOutRight': ['eyeLookOutRight', 'eyeOut_R'],
        'eyeLookUpLeft': ['eyeLookUpLeft', 'eyeUp_L'],
        'eyeLookUpRight': ['eyeLookUpRight', 'eyeUp_R'],
        'eyeLookDownLeft': ['eyeLookDownLeft', 'eyeDown_L'],
        'eyeLookDownRight': ['eyeLookDownRight', 'eyeDown_R'],
    };

    constructor(onSceneDirty: () => void) {
        this.onSceneDirty = onSceneDirty;
    }

    setAuthToken(token: string | null) {
        this.authToken = token;
    }

    getGuest(id: string): Guest3D | undefined {
        return this.guests.get(id);
    }

    getAllGuests(): Map<string, Guest3D> {
        return this.guests;
    }

    initGuest(id: string, modelUrl: string, textureUrl: string) {
        if (this.guests.has(id)) return;

        console.log(`[Avatar3DEngine] Initializing 3D Guest: ${id}, Model: ${modelUrl}`);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        camera.position.set(0, 1.4, 2.5); // Focus on upper body
        camera.lookAt(0, 1.4, 0);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(2, 2, 5);
        scene.add(directionalLight);

        // Renderer (Targets an internal canvas for bitmap transfer)
        const offscreenCanvas = new OffscreenCanvas(512, 512);
        const renderer = new THREE.WebGLRenderer({ 
            canvas: offscreenCanvas,
            antialias: true, 
            alpha: true 
        });
        renderer.setSize(512, 512, false);
        renderer.setClearColor(0x000000, 0);

        // Phase 64: Defensive check for model URL
        if (!modelUrl || (!modelUrl.toLowerCase().endsWith('.glb') && !modelUrl.toLowerCase().endsWith('.vrm'))) {
            console.warn(`[Avatar3DEngine] Skipping 3D initialization for ${id}: Invalid or non-3D model URL: ${modelUrl}`);
            return;
        }

        const loader = new GLTFLoader();
        if (this.authToken) {
            loader.setRequestHeader({ Authorization: `Bearer ${this.authToken}` });
        }

        loader.load(modelUrl, (gltf) => {
            const model = gltf.scene;

            if (textureUrl) {
                const texLoader = new THREE.ImageBitmapLoader();
                if (this.authToken) {
                    texLoader.setRequestHeader({ Authorization: `Bearer ${this.authToken}` });
                }
                texLoader.setOptions({ imageOrientation: 'flipY' }); // Handle Y-flip correctly
                texLoader.load(textureUrl, (imageBitmap) => {
                    const texture = new THREE.Texture(imageBitmap);
                    texture.needsUpdate = true;

                    model.traverse((child: any) => {
                        if (child.isMesh && (child.name.toLowerCase().includes('head') || child.name.toLowerCase().includes('face'))) {
                            child.material.map = texture;
                            child.material.needsUpdate = true;
                        }
                    });
                    this.onSceneDirty();
                });
            }

            scene.add(model);
            const mixer = new THREE.AnimationMixer(model);
            this.guests.set(id, { id, scene, camera, renderer, renderTarget: null, model, mixer });

            console.log(`[Avatar3DEngine] 3D Guest ${id} loaded successfully`);
            this.onSceneDirty();
        }, undefined, (err) => {
            console.error(`[Avatar3DEngine] Failed to load 3D model: ${err}`);
        });
    }

    updateGuestAudioTracking(id: string, audioLevel: number) {
        const guest = this.guests.get(id);
        if (guest) {
            guest.audioLevel = audioLevel;
            this.updateAnimations(id, audioLevel, false, null); // Defer mocap to main tick
        }
    }

    updateGuestThinking(id: string, isThinking: boolean) {
        const guest = this.guests.get(id);
        if (guest) {
            guest.isThinking = isThinking;
            this.onSceneDirty();
        }
    }

    updateAnimations(id: string, audioLevel: number, isHost: boolean, faceData: any | null) {
        const guest = this.guests.get(id);
        if (!guest || !guest.model) return;

        // Use latest MoCap data if available and for the right guest
        if (isHost && faceData && faceData.blendshapes) {
            this.applyMoCapToAvatar(guest, faceData);
            return;
        }

        // Fallback: Micro-expression (Audio-driven)
        guest.model.traverse((child: any) => {
            if (child.isMesh && child.morphTargetInfluences) {
                const targets = child.morphTargetDictionary;
                if (targets) {
                    if (targets['jawOpen']) child.morphTargetInfluences[targets['jawOpen']] = audioLevel * 1.5;
                    else if (targets['mouthOpen']) child.morphTargetInfluences[targets['mouthOpen']] = audioLevel * 1.5;
                    else if (targets['A']) child.morphTargetInfluences[targets['A']] = audioLevel * 1.5;
                }
            }
        });

        this.onSceneDirty();
    }

    private applyMoCapToAvatar(guest: Guest3D, faceData: any) {
        if (!guest.model || !faceData.blendshapes) return;

        const blendshapes = faceData.blendshapes;
        
        guest.model.traverse((child: any) => {
            if (child.isMesh && child.morphTargetInfluences && child.morphTargetDictionary) {
                const targets = child.morphTargetDictionary;
                
                // Map MediaPipe categories to model morph targets
                blendshapes.forEach((category: any) => {
                    const targetNames = this.blendShapeMapping[category.categoryName];
                    if (targetNames) {
                        targetNames.forEach(name => {
                            if (targets[name] !== undefined) {
                                child.morphTargetInfluences[targets[name]] = category.score;
                            }
                        });
                    }
                });
            }

            // Apply head rotation if matrix is available
            if (child.name.toLowerCase().includes('head') || child.name.toLowerCase().includes('neck')) {
                if (faceData.matrix) {
                    const m = new THREE.Matrix4().fromArray(faceData.matrix.array);
                    const rotation = new THREE.Euler().setFromRotationMatrix(m);
                    
                    // Fine-tune Euler rotation for typical face orientation
                    child.rotation.x = rotation.x;
                    child.rotation.y = rotation.y;
                    child.rotation.z = rotation.z;
                }
            }
        });
    }

    applyIdleState(guest: Guest3D, time: number, hasActiveMoCap: boolean) {
        if (!guest.model) return;

        // Subtle breathing (slight vertical scale oscillation)
        const breathing = Math.sin(time / 2000) * 0.005;
        guest.model.scale.set(1 + breathing, 1 + breathing, 1 + breathing);

        // Random micro-movements on head/neck if found
        guest.model.traverse((child: any) => {
            if (child.isMesh) {
                // Cognitive Glow: If thinking, make eyes or head parts emit a blue light
                if (guest.isThinking && (child.name.toLowerCase().includes('eye') || child.name.toLowerCase().includes('head'))) {
                    if (child.material && child.material.emissive) {
                        const glow = (Math.sin(time / 100) + 1) * 0.5; // Pulsing
                        child.material.emissive.setRGB(0.1 * glow, 0.4 * glow, 1.0 * glow);
                        child.material.emissiveIntensity = 2.0 * glow;
                    }
                } else if (child.material && child.material.emissive) {
                    child.material.emissive.setRGB(0, 0, 0);
                }

                if (!hasActiveMoCap && (child.name.toLowerCase().includes('head') || child.name.toLowerCase().includes('neck'))) {
                    // If thinking, faster oscillation to signal "calculating"
                    if (guest.isThinking) {
                        child.rotation.z = Math.sin(time / 200) * 0.05;
                        child.rotation.x = Math.cos(time / 150) * 0.03;
                    } else {
                        child.rotation.z = Math.sin(time / 3000) * 0.02;
                        child.rotation.x = Math.cos(time / 2500) * 0.01;
                    }
                }
            }
        });

        this.onSceneDirty();
    }

    renderAll(time: number, isHostActive: boolean, latestFaceData: any) {
        this.guests.forEach(guest => {
            if (guest.model && guest.scene && guest.camera) {
                const isHost = guest.id === 'host' || isHostActive;
                
                // Apply base animations
                this.updateAnimations(guest.id, guest.audioLevel || 0, isHost, latestFaceData);
                
                // Apply idle physics
                const hasMoCap = isHost && latestFaceData && latestFaceData.matrix;
                this.applyIdleState(guest, time, hasMoCap);
                
                if (guest.mixer) {
                    guest.mixer.update(0.016); // Assuming ~60fps step
                }

                guest.renderer.render(guest.scene, guest.camera);
            }
        });
    }
}
