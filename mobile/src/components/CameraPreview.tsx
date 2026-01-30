import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { cameraService, CameraPosition } from '../services/CameraService';

interface Props {
    position: CameraPosition;
    onCameraReady?: (camera: Camera) => void;
    isActive: boolean;
}

export const CameraPreview: React.FC<Props> = ({ position, onCameraReady, isActive }) => {
    const cameraRef = useRef<Camera>(null);
    const device = useCameraDevice(position);

    useEffect(() => {
        if (cameraRef.current && device) {
            cameraService.setCameraRef(cameraRef.current);
            cameraService.setCurrentDevice(device);
            onCameraReady?.(cameraRef.current);
        }
    }, [device, onCameraReady]);

    if (!device) {
        return (
            <View className="flex-1 bg-black items-center justify-center">
                <Text className="text-white">No camera available</Text>
            </View>
        );
    }

    return (
        <View className="flex-1">
            <Camera
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={isActive}
                video={true}
                audio={true}
            />
        </View>
    );
};
