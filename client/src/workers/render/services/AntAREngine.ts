import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface ARMask {
    id: string;
    modelUrl: string;
    offset: THREE.Vector3;
    scale: number;
    rotation: THREE.Euler;
    anchorLandmark: number; // MediaPipe landmark index (e.g. 1 for nose tip)
}

export class AntAREngine {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private loader = new GLTFLoader();
    
    private activeMask: ARMask | null = null;
    private maskObject: THREE.Group | null = null;
    
    private landmarks: any[] = [];
    private faceMatrix: any = null;
    
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        this.camera.position.set(0, 0, 5);
        this.camera.lookAt(0, 0, 0);

        // Lights
        const ambient = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambient);
        const directional = new THREE.DirectionalLight(0xffffff, 1.0);
        directional.position.set(1, 1, 5);
        this.scene.add(directional);

        // Renderer for offscreen texture
        const canvas = new OffscreenCanvas(512, 512);
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(512, 512);
        this.renderer.setClearColor(0x000000, 0);
    }

    public async loadMask(mask: ARMask) {
        if (this.activeMask?.id === mask.id) return;
        
        // Cleanup old
        if (this.maskObject) {
            this.scene.remove(this.maskObject);
            this.maskObject = null;
        }

        this.activeMask = mask;
        
        return new Promise<void>((resolve, reject) => {
            this.loader.load(mask.modelUrl, (gltf) => {
                this.maskObject = gltf.scene;
                this.maskObject.scale.setScalar(mask.scale);
                this.maskObject.position.copy(mask.offset);
                this.maskObject.rotation.copy(mask.rotation);
                this.scene.add(this.maskObject);
                resolve();
            }, undefined, reject);
        });
    }

    public updateFaceData(landmarks: any[], matrix: any) {
        this.landmarks = landmarks;
        this.faceMatrix = matrix;
        
        if (!this.maskObject || !landmarks || landmarks.length === 0) return;

        // 1. Position based on anchor landmark (e.g. Nose tip is index 1)
        const anchorIdx = this.activeMask?.anchorLandmark ?? 1;
        const anchor = landmarks[anchorIdx];
        
        // MediaPipe coordinates are 0-1. Convert to Three.js space.
        // Screen center is (0,0). Width/Height roughly -2 to 2 at Z=0 depending on FOV.
        // Simplification for now: Use the transformation matrix if provided by MediaPipe
        if (matrix) {
            const m = new THREE.Matrix4().fromArray(matrix.array);
            const position = new THREE.Vector3();
            const quaternion = new THREE.Quaternion();
            const scale = new THREE.Vector3();
            m.decompose(position, quaternion, scale);

            // Apply matrix to mask parent
            this.maskObject.position.set(
                (anchor.x - 0.5) * 4,
                -(anchor.y - 0.5) * 4 * (16/9), // Aspect correction
                -position.z * 0.1 // Z-depth from matrix
            );
            
            // Rotation from matrix
            this.maskObject.quaternion.copy(quaternion);
            
            // Add user defined offsets
            if (this.activeMask) {
                // this.maskObject.translateX(this.activeMask.offset.x);
                // ...
            }
        }
    }

    public render(): OffscreenCanvas {
        this.renderer.render(this.scene, this.camera);
        return (this.renderer.domElement as unknown) as OffscreenCanvas;
    }
}
