import React, { useState } from 'react';
import { Text, TouchableOpacity, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

interface MediaPickerProps {
    onSelect: (asset: ImagePicker.ImagePickerAsset) => void;
}

export const MediaPicker = ({ onSelect }: MediaPickerProps) => {
    const [loading, setLoading] = useState(false);

    const pickMedia = async () => {
        try {
            setLoading(true);

            // Request permissions
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Please allow access to your media library to upload files.');
                setLoading(false);
                return;
            }

            // Pick Image or Video
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All,
                allowsEditing: true, // Calls internal native editor which is handled by OS
                quality: 1,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                onSelect(result.assets[0]);
            }
        } catch (error) {
            console.log('Error picking media:', error);
            Alert.alert('Error', 'Failed to pick media');
        } finally {
            setLoading(false);
        }
    };

    return (
        <TouchableOpacity
            onPress={pickMedia}
            disabled={loading}
            className={`bg-blue-600 px-4 py-2 rounded-lg ${loading ? 'opacity-50' : ''}`}
        >
            <Text className="text-white font-bold">
                {loading ? 'Opening...' : '+ Upload'}
            </Text>
        </TouchableOpacity>
    );
};
