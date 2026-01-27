import * as THREE from 'three';

/**
 * Utility to project a 2D segmentation mask as a dynamic shadow in 3D space.
 * Grounds the host into the virtual stage.
 */
export class ShadowProjector {
    private shadowMesh: THREE.Mesh | null = null;
    private shadowMaterial: THREE.MeshBasicMaterial;

    constructor() {
        // Transparent shadow plane
        const geometry = new THREE.PlaneGeometry(3, 3);
        this.shadowMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        this.shadowMesh = new THREE.Mesh(geometry, this.shadowMaterial);
        this.shadowMesh.rotation.x = -Math.PI / 2; // Flat on floor
        this.shadowMesh.position.set(0, 0.01, -1); // Slightly above floor to prevent z-fighting
    }

    public getMesh(): THREE.Mesh {
        return this.shadowMesh!;
    }

    /**
     * Updates the shadow position and scale based on host mask.
     * @param mask Relative width/height of the host persona
     */
    public update(hostPresence: { x: number, y: number, scale: number }) {
        if (!this.shadowMesh) return;

        // Map 2D mask center to 3D floor coordinates
        this.shadowMesh.position.x = (hostPresence.x - 0.5) * 5;
        this.shadowMesh.position.z = (hostPresence.y - 0.5) * 2 - 1;

        // Dynamically scale shadow based onhost size
        this.shadowMesh.scale.set(hostPresence.scale, hostPresence.scale, 1);

        // Dynamic opacity based on "distance" from camera
        this.shadowMaterial.opacity = 0.3 * (1 - hostPresence.y);
    }
}

export const shadowProjector = new ShadowProjector();
