import { Camera, CameraDevice } from 'react-native-vision-camera';

export type CameraPosition = 'front' | 'back';
export type VideoQuality = '480p' | '720p' | '1080p';

class CameraService {
    private camera: Camera | null = null;
    private currentDevice: CameraDevice | null = null;

    // Request camera permissions
    async requestPermissions(): Promise<boolean> {
        try {
            const cameraPermission = await Camera.requestCameraPermission();
            const microphonePermission = await Camera.requestMicrophonePermission();

            return cameraPermission === 'granted' && microphonePermission === 'granted';
        } catch (error) {
            console.error('Failed to request permissions:', error);
            return false;
        }
    }

    // Check if permissions are granted
    async hasPermissions(): Promise<boolean> {
        const cameraPermission = await Camera.getCameraPermissionStatus();
        const microphonePermission = await Camera.getMicrophonePermissionStatus();

        return cameraPermission === 'granted' && microphonePermission === 'granted';
    }

    // Get available camera devices
    async getDevices(): Promise<CameraDevice[]> {
        try {
            const devices = await Camera.getAvailableCameraDevices();
            return devices;
        } catch (error) {
            console.error('Failed to get camera devices:', error);
            return [];
        }
    }

    // Get device by position
    async getDevice(position: CameraPosition): Promise<CameraDevice | null> {
        const devices = await this.getDevices();
        return devices.find(d => d.position === position) || null;
    }

    // Set current device
    setCurrentDevice(device: CameraDevice) {
        this.currentDevice = device;
    }

    // Get current device
    getCurrentDevice(): CameraDevice | null {
        return this.currentDevice;
    }

    // Set camera reference
    setCameraRef(camera: Camera | null) {
        this.camera = camera;
    }

    // Get camera reference
    getCameraRef(): Camera | null {
        return this.camera;
    }

    // Take photo
    async takePhoto(): Promise<string | null> {
        if (!this.camera) {
            console.error('Camera not initialized');
            return null;
        }

        try {
            const photo = await this.camera.takePhoto({
                flash: 'off',
            });
            return photo.path;
        } catch (error) {
            console.error('Failed to take photo:', error);
            return null;
        }
    }

    // Get video quality settings
    getQualitySettings(quality: VideoQuality) {
        switch (quality) {
            case '480p':
                return { width: 640, height: 480, bitrate: 1000000 }; // 1 Mbps
            case '720p':
                return { width: 1280, height: 720, bitrate: 2500000 }; // 2.5 Mbps
            case '1080p':
                return { width: 1920, height: 1080, bitrate: 5000000 }; // 5 Mbps
            default:
                return { width: 1280, height: 720, bitrate: 2500000 };
        }
    }
}

export const cameraService = new CameraService();
