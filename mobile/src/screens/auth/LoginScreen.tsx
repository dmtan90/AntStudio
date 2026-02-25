import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useAuthStore } from '../../stores/useAuthStore';

export const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const login = useAuthStore((state) => state.login);

    const handleLogin = async () => {
        try {
            // Mock login for demo
            if (email && password) {
                await login('mock-jwt-token', { name: 'AntStudio User', email });
            } else {
                Alert.alert('Error', 'Please enter email and password');
            }

        } catch (error) {
            Alert.alert('Login Failed', 'Invalid credentials');
        }
    };

    return (
        <View className="flex-1 justify-center items-center bg-gray-900 p-4">
            <Text className="text-3xl font-bold text-white mb-8">AntStudio Mobile</Text>

            <View className="w-full space-y-4">
                <TextInput
                    className="bg-gray-800 text-white p-4 rounded-lg"
                    placeholder="Email"
                    placeholderTextColor="#9ca3af"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                />

                <TextInput
                    className="bg-gray-800 text-white p-4 rounded-lg"
                    placeholder="Password"
                    placeholderTextColor="#9ca3af"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />

                <TouchableOpacity
                    className="bg-blue-600 p-4 rounded-lg items-center"
                    onPress={handleLogin}
                >
                    <Text className="text-white font-bold text-lg">Sign In</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};
