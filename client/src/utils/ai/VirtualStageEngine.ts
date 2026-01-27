import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Three.js Powered Engine for rendering immersive 3D virtual stages.
 * Designed to sit behind the chromakeyed camera layer.
 */
export class VirtualStageEngine {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private canvas: HTMLCanvasElement;
    private loader: GLTFLoader;
    private currentStage: THREE.Group | null = null;
    private ambientLight: THREE.AmbientLight | null = null;
    private spotLight: THREE.SpotLight | null = null;

    constructor() {
        this.canvas = document.createElement('canvas');
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: true
        });
        this.loader = new GLTFLoader();

        this.initScene();
    }

    private initScene() {
        this.renderer.setSize(1280, 720);
        this.camera.position.set(0, 1.6, 5);
        this.camera.lookAt(0, 1.4, 0);

        // Standard Stage Lighting
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(this.ambientLight);

        this.spotLight = new THREE.SpotLight(0x3b82f6, 2);
        this.spotLight.position.set(5, 10, 5);
        this.scene.add(this.spotLight);
    }

    /**
     * Loads a 3D environment model.
     */
    public async loadStage(url: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.currentStage) this.scene.remove(this.currentStage);

            this.loader.load(url, (gltf) => {
                this.currentStage = gltf.scene;
                this.scene.add(this.currentStage);
                resolve();
            }, undefined, reject);
        });
    }

    /**
     * Renders a frame of the 3D stage.
     */
    public renderFrame(): HTMLCanvasElement {
        if (this.currentStage) {
            // Subtle idle animation
            this.currentStage.rotation.y += 0.001;
        }
        this.renderer.render(this.scene, this.camera);
        return this.canvas;
    }

    public getCamera(): THREE.PerspectiveCamera {
        return this.camera;
    }

    public setLightingIntensity(intensity: number) {
        if (this.ambientLight) this.ambientLight.intensity = intensity * 0.6;
        if (this.spotLight) this.spotLight.intensity = intensity * 2.0;
    }

    public setLightingColor(color: number) {
        if (this.spotLight) this.spotLight.color.setHex(color);
    }

    public setResolution(width: number, height: number) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
}

export const virtualStageEngine = new VirtualStageEngine();
