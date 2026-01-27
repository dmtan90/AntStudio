import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const api = axios.create({
  baseURL: (process.env as any).EXPO_PUBLIC_API_URL || 'http://localhost:4000/api',
  timeout: 15000,
});

// Request interceptor to attach JWT token
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  try {
    const token = await AsyncStorage.getItem('auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    console.error('Failed to fetch token from storage', e);
  }
  return config;
});

// Response interceptor to handle authentication failures
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Handle session expiry
      await AsyncStorage.removeItem('auth_token');
      // Potential redirect logic for mobile
    }
    return Promise.reject(error);
  }
);

export default api;
