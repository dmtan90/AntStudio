import * as THREE from 'three';

/**
 * Service for autonomous 3D cinematography and camera orchestration.
 */
export class CinematographyEngine {
    private camera: THREE.PerspectiveCamera | null = null;
    private targetPosition = new THREE.Vector3(0, 1.6, 5);
    private currentPosition = new THREE.Vector3(0, 1.6, 5);
    private lookAtTarget = new THREE.Vector3(0, 1.6, 0);
    private lerpFactor = 0.05;

    /**
     * Set the Three.js camera to be controlled.
     */
    public setCamera(camera: THREE.PerspectiveCamera) {
        this.camera = camera;
    }

    /**
     * Updates the camera position and orientation based on production logic.
     * Called every frame in the render loop.
     */
    public update(context: {
        vibe: string,
        activeSpeaker: 'host' | 'guest' | 'none',
        intensity: number
    }) {
        if (!this.camera) return;

        // 1. Determine Target Shot
        this.applyShotLogic(context);

        // 2. Smooth Interpolation
        this.currentPosition.lerp(this.targetPosition, this.lerpFactor);
        this.camera.position.copy(this.currentPosition);
        this.camera.lookAt(this.lookAtTarget);

        // 3. Shake/Dynamic Effect based on Hype
        if (context.vibe === 'hype') {
            this.camera.position.x += (Math.random() - 0.5) * 0.01 * context.intensity;
            this.camera.position.y += (Math.random() - 0.5) * 0.01 * context.intensity;
        }
    }

    private applyShotLogic(context: any) {
        // Wide Shot: Default or group discussion
        if (context.activeSpeaker === 'none') {
            this.targetPosition.set(0, 2, 7);
            this.lerpFactor = 0.02; // Slow cinematic pan
        }
        // Close-up: Someone is talking
        else if (context.activeSpeaker === 'host') {
            this.targetPosition.set(-0.5, 1.6, 2.5);
            this.lerpFactor = 0.05;
        }
        else if (context.activeSpeaker === 'guest') {
            this.targetPosition.set(0.5, 1.6, 2.5);
            this.lerpFactor = 0.05;
        }

        // Adjust for Vibe
        if (context.vibe === 'serious') {
            this.targetPosition.z *= 0.8; // Closer for intimacy
        } else if (context.vibe === 'hype') {
            this.lerpFactor = 0.1; // Faster, aggressive cuts
        }
    }

    /**
     * Returns the target focal length for DoF calculation.
     */
    public getFocusDistance(): number {
        return this.currentPosition.distanceTo(this.lookAtTarget);
    }
}

export const cinematographyEngine = new CinematographyEngine();
