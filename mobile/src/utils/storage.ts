import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
    PROJECTS: 'cached_projects',
    USER: 'cached_user',
    SYNC_QUEUE: 'sync_queue',
};

export const storage = {
    // Projects
    async cacheProjects(projects: any[]) {
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
        } catch (error) {
            console.error('Failed to cache projects:', error);
        }
    },

    async getCachedProjects(): Promise<any[]> {
        try {
            const data = await AsyncStorage.getItem(STORAGE_KEYS.PROJECTS);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Failed to get cached projects:', error);
            return [];
        }
    },

    // User
    async cacheUser(user: any) {
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        } catch (error) {
            console.error('Failed to cache user:', error);
        }
    },

    async getCachedUser(): Promise<any | null> {
        try {
            const data = await AsyncStorage.getItem(STORAGE_KEYS.USER);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Failed to get cached user:', error);
            return null;
        }
    },

    // Sync Queue
    async addToSyncQueue(action: any) {
        try {
            const queue = await this.getSyncQueue();
            queue.push({ ...action, timestamp: Date.now() });
            await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
        } catch (error) {
            console.error('Failed to add to sync queue:', error);
        }
    },

    async getSyncQueue(): Promise<any[]> {
        try {
            const data = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Failed to get sync queue:', error);
            return [];
        }
    },

    async clearSyncQueue() {
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify([]));
        } catch (error) {
            console.error('Failed to clear sync queue:', error);
        }
    },

    async removeFromSyncQueue(index: number) {
        try {
            const queue = await this.getSyncQueue();
            queue.splice(index, 1);
            await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
        } catch (error) {
            console.error('Failed to remove from sync queue:', error);
        }
    },

    // Clear all cache
    async clearAll() {
        try {
            await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
        } catch (error) {
            console.error('Failed to clear cache:', error);
        }
    }
};
