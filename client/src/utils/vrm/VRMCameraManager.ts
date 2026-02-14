import * as THREE from 'three';

export interface CameraPath {
    id: string;
    update: (camera: THREE.PerspectiveCamera, target: THREE.Vector3, time: number, intensity: number) => void;
}

export const CAMERA_PATHS: Record<string, CameraPath> = {
    'orbit': {
        id: 'orbit',
        update: (camera, target, time, intensity) => {
            const radius = 3.5;
            const speed = 0.5 * intensity;
            camera.position.x = target.x + radius * Math.sin(time * speed);
            camera.position.z = target.z + radius * Math.cos(time * speed);
            camera.position.y = 1.6 + Math.sin(time * 0.3) * 0.2;
            camera.lookAt(target);
        }
    },
    'slow_zoom': {
        id: 'slow_zoom',
        update: (camera, target, time, intensity) => {
            const baseRadius = 4.0;
            const radius = baseRadius - (Math.sin(time * 0.2) * 1.5 * intensity);
            camera.position.set(0, 1.4, radius);
            camera.lookAt(target);
        }
    },
    'side_sweep': {
        id: 'side_sweep',
        update: (camera, target, time, intensity) => {
            const sweep = Math.sin(time * 0.4) * 1.5 * intensity;
            camera.position.set(sweep, 1.5, 3.0);
            camera.lookAt(target);
        }
    },
    'dramatic_low': {
        id: 'dramatic_low',
        update: (camera, target, time, intensity) => {
            camera.position.set(1.5 * Math.sin(time * 0.1), 0.5, 2.5);
            camera.lookAt(new THREE.Vector3(target.x, target.y + 0.5, target.z));
        }
    }
};

export class VRMCameraManager {
    private activePathId: string | null = null;
    private initialPos = new THREE.Vector3();
    private initialTarget = new THREE.Vector3();

    setPath(pathId: string | null, camera: THREE.PerspectiveCamera, currentTarget: THREE.Vector3) {
        if (pathId === this.activePathId) return;
        
        this.activePathId = pathId;
        if (!pathId) {
            // Restore? Optional, usually orbit controls take back
            return;
        }
        
        this.initialPos.copy(camera.position);
        this.initialTarget.copy(currentTarget);
    }

    update(camera: THREE.PerspectiveCamera, target: THREE.Vector3, time: number, intensity: number = 1.0) {
        if (!this.activePathId) return false;

        const path = CAMERA_PATHS[this.activePathId];
        if (path) {
            path.update(camera, target, time, intensity);
            return true; // Path is controlling the camera
        }
        return false;
    }

    getActivePath() {
        return this.activePathId;
    }
}
