import { create } from 'zustand';
import { authStorage } from '../api/authStorage';
import { socketClient } from '../api/socket';
import { analyticsService } from '../utils/analytics';
import { errorTracking } from '../utils/errorTracking';

interface AuthState {
    isAuthenticated: boolean;
    user: any | null;
    login: (token: string, user: any) => Promise<void>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    isAuthenticated: false,
    user: null,

    login: async (token, user) => {
        await authStorage.setToken(token);
        set({ isAuthenticated: true, user });

        // Connect socket on login
        await socketClient.connect();

        // Track login event
        await analyticsService.logLogin('email');
        await analyticsService.setUserProperties(user.id, {
            email: user.email,
            signup_date: user.createdAt,
        });

        // Set Sentry user context
        errorTracking.setUser(user.id, user.email, user.name);
    },

    logout: async () => {
        await authStorage.removeToken();
        set({ isAuthenticated: false, user: null });

        // Disconnect socket on logout
        socketClient.disconnect();

        // Clear user context
        errorTracking.clearUser();
    },

    checkAuth: async () => {
        const token = await authStorage.getToken();
        if (token) {
            // In real app, validate token with backend
            set({ isAuthenticated: true });

            // Reconnect socket if token exists
            await socketClient.connect();
        }
    },
}));
