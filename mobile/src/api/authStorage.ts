export const authStorage = {
    async setToken(token: string) {
        // In a real implementation with expo-secure-store:
        // await SecureStore.setItemAsync('auth_token', token);
        console.log('Token saved securely:', token);
    },

    async getToken() {
        // return await SecureStore.getItemAsync('auth_token');
        return null;
    },

    async removeToken() {
        // await SecureStore.deleteItemAsync('auth_token');
        console.log('Token removed');
    }
};
