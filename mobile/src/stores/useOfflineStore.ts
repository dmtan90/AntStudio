import { create } from 'zustand';
import NetInfo from '@react-native-community/netinfo';
import { storage } from '../utils/storage';

interface OfflineState {
    isOnline: boolean;
    syncQueue: any[];
    setOnline: (online: boolean) => void;
    addToQueue: (action: any) => Promise<void>;
    processSyncQueue: () => Promise<void>;
    initializeNetworkListener: () => void;
}

export const useOfflineStore = create<OfflineState>((set, get) => ({
    isOnline: true,
    syncQueue: [],

    setOnline: (online) => set({ isOnline: online }),

    addToQueue: async (action) => {
        await storage.addToSyncQueue(action);
        const queue = await storage.getSyncQueue();
        set({ syncQueue: queue });
    },

    processSyncQueue: async () => {
        const { isOnline, syncQueue } = get();
        if (!isOnline || syncQueue.length === 0) return;

        console.log(`Processing ${syncQueue.length} queued actions...`);

        // Process each action
        for (let i = 0; i < syncQueue.length; i++) {
            const action = syncQueue[i];
            try {
                // Execute the action based on type
                switch (action.type) {
                    case 'upload':
                        // await mediaApi.upload(action.uri, action.contentType, action.name);
                        console.log('Syncing upload:', action);
                        break;
                    case 'update':
                        // await apiClient.put(action.endpoint, action.data);
                        console.log('Syncing update:', action);
                        break;
                    default:
                        console.warn('Unknown action type:', action.type);
                }

                // Remove from queue on success
                await storage.removeFromSyncQueue(i);
            } catch (error) {
                console.error('Failed to sync action:', error);
                // Keep in queue for retry
            }
        }

        // Refresh queue state
        const updatedQueue = await storage.getSyncQueue();
        set({ syncQueue: updatedQueue });
    },

    initializeNetworkListener: () => {
        NetInfo.addEventListener(state => {
            const online = state.isConnected === true && state.isInternetReachable !== false;
            set({ isOnline: online });

            if (online) {
                console.log('📡 Network restored, processing sync queue...');
                get().processSyncQueue();
            } else {
                console.log('📴 Network offline');
            }
        });
    }
}));
