import { ref } from 'vue';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface ARMask {
    id: string;
    modelUrl: string;
    scale: number;
    offset: THREE.Vector3;
    rotation: THREE.Euler;
    anchorLandmark: number;
}

export class AREngine {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D | null;
    private video: HTMLVideoElement;
    private isProcessing = false;
    private animationId = 0;
    public stream: MediaStream | null = null;
    public enabled = ref(false);

    // Beauty Settings
    public smoothing = ref(0);
    public brighten = ref(1.0);

    // 3D Mask Stuff
    private scene: THREE.Scene | null = null;
    private camera: THREE.PerspectiveCamera | null = null;
    private renderer: THREE.WebGLRenderer | null = null;
    private maskObject: THREE.Group | null = null;
    private loader = new GLTFLoader();
    private threeCanvas: HTMLCanvasElement | null = null;

    private landmarks: any[] = [];

    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.video = document.createElement('video');
        this.video.autoplay = true;
        this.video.muted = true;
        this.video.playsInline = true;
    }

    private initThree() {
        if (this.scene) return;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, this.canvas.width / this.canvas.height, 0.1, 100);
        this.camera.position.set(0, 0, 5);

        const ambient = new THREE.AmbientLight(0xffffff, 1.2);
        this.scene.add(ambient);
        const directional = new THREE.DirectionalLight(0xffffff, 1.0);
        directional.position.set(1, 1, 5);
        this.scene.add(directional);

        this.threeCanvas = document.createElement('canvas');
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.threeCanvas,
            alpha: true,
            antialias: true
        });
        this.renderer.setSize(this.canvas.width, this.canvas.height);
        this.renderer.setClearColor(0x000000, 0);
    }

    async init(inputVideoStream: MediaStream): Promise<MediaStream> {
        this.video.srcObject = inputVideoStream;
        
        await new Promise<void>((resolve) => {
            this.video.onloadedmetadata = () => {
                this.video.play().then(resolve).catch(console.error);
            };
        });
        
        const track = inputVideoStream.getVideoTracks()[0];
        const settings = track.getSettings();
        this.canvas.width = settings.width || 1280;
        this.canvas.height = settings.height || 720;

        this.initThree();

        this.stream = this.canvas.captureStream(30);
        inputVideoStream.getAudioTracks().forEach(t => this.stream?.addTrack(t));

        if (!this.isProcessing) {
            this.isProcessing = true;
            this.processFrame();
        }

        return this.stream;
    }

    public async loadMask(mask: ARMask) {
        this.initThree();
        if (this.maskObject) {
            this.scene?.remove(this.maskObject);
            this.maskObject = null;
        }

        return new Promise<void>((resolve, reject) => {
            this.loader.load(mask.modelUrl, (gltf) => {
                this.maskObject = gltf.scene;
                this.maskObject.scale.setScalar(mask.scale);
                this.maskObject.position.copy(mask.offset);
                this.maskObject.rotation.copy(mask.rotation);
                this.scene?.add(this.maskObject);
                resolve();
            }, undefined, reject);
        });
    }

    public updateLandmarks(landmarks: any[]) {
        this.landmarks = landmarks;
        if (!this.maskObject || !landmarks || landmarks.length === 0) return;

        // Simplified anchoring for preview
        const noseTip = landmarks[1];
        if (noseTip) {
            this.maskObject.position.x = (noseTip.x - 0.5) * 4;
            this.maskObject.position.y = -(noseTip.y - 0.5) * 4 * (this.canvas.height / this.canvas.width);
            this.maskObject.position.z = 2; // Fixed depth for preview
        }
    }

    setEnabled(enabled: boolean) {
        this.enabled.value = enabled;
    }

    private processFrame = () => {
        if (!this.isProcessing || !this.ctx) return;
        
        // 1. Draw Video Base
        this.ctx.filter = `brightness(${this.brighten.value}) blur(${this.smoothing.value * 2}px)`;
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        this.ctx.filter = 'none';
        
        // 2. Render 3D Mask Overlays
        if (this.enabled.value && this.renderer && this.scene && this.camera && this.maskObject) {
            this.renderer.render(this.scene, this.camera);
            this.ctx.drawImage(this.threeCanvas!, 0, 0);
        }

        this.animationId = requestAnimationFrame(this.processFrame);
    }

    destroy() {
        this.isProcessing = false;
        cancelAnimationFrame(this.animationId);
        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
            this.stream = null;
        }
        this.video.srcObject = null;
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer = null;
        }
        this.scene = null;
    }
}

export const arEngine = new AREngine();

