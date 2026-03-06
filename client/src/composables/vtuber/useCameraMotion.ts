import { ref, computed } from 'vue';

export type CameraPath = 'orbit' | 'slow_zoom' | 'side_sweep' | 'dramatic_low' | 'none';

export function useCameraMotion() {
    const activePath = ref<CameraPath>('none');
    const intensity = ref(1.0);
    const progress = ref(0);

    const cameraTransform = computed(() => {
        const p = progress.value;
        const i = intensity.value;

        let zoom = 1.0;
        let x = 0;
        let y = 0;
        let rotation = 0;

        switch (activePath.value) {
            case 'orbit':
                // Gentle horizontal sway with slight rotation
                x = Math.sin(p * 2) * 50 * i;
                rotation = Math.sin(p * 2) * 0.02 * i;
                break;
            case 'slow_zoom':
                // Continuous zoom in
                zoom = 1.0 + (p % 1) * 0.2 * i;
                break;
            case 'side_sweep':
                // Moving from one side to another
                x = Math.cos(p) * 100 * i;
                break;
            case 'dramatic_low':
                // Zooming from bottom
                zoom = 1.1 + Math.sin(p) * 0.1 * i;
                y = 20 * i;
                break;
        }

        return { zoom, x, y, rotation };
    });

    const updateProgress = (delta: number) => {
        if (activePath.value === 'none') {
            progress.value = 0;
            return;
        }
        progress.value += delta * 0.01;
    };

    const setPath = (path: CameraPath, newIntensity: number = 1.0) => {
        activePath.value = path;
        intensity.value = newIntensity;
        if (path === 'none') progress.value = 0;
    };

    return {
        activePath,
        intensity,
        cameraTransform,
        updateProgress,
        setPath
    };
}
