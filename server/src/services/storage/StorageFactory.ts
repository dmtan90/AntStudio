import { IStorageAdapter } from './StorageAdapter.js';
import { S3StorageAdapter } from './S3StorageAdapter.js';
import { GoogleDriveStorageAdapter } from './GoogleDriveStorageAdapter.js';
import { B2StorageAdapter } from './B2StorageAdapter.js';
import { configService } from '../../utils/ConfigService.js';
import { StorageProviderType } from '~/models/AdminSettings.js';

/**
 * Factory and Registry for Storage Providers.
 * Manages singleton instances of adapters based on configuration.
 */
export class StorageFactory {
    private static adapters: Map<string, Promise<IStorageAdapter>> = new Map();

    /**
     * Gets the currently active storage provider.
     */
    public static async getActiveAdapter(): Promise<IStorageAdapter> {
        const providerName = configService.storage.activeProvider;
        return this.getAdapter(providerName as any);
    }

    /**
     * Gets or creates a specific storage adapter instance.
     * Guaranteed to return a singleton instance even under high concurrent access.
     */
    public static async getAdapter(provider: StorageProviderType): Promise<IStorageAdapter> {
        if (this.adapters.has(provider)) {
            return this.adapters.get(provider)!;
        }

        // Cache the Promise immediately before executing async logic to prevent race conditions
        const adapterPromise = (async () => {
            let adapter: IStorageAdapter;

            if (provider === StorageProviderType.GOOGLE_DRIVE) {
                adapter = GoogleDriveStorageAdapter.getInstance();
            } else if (provider === StorageProviderType.B2) {
                adapter = B2StorageAdapter.getInstance();
            } else {
                // Default to S3
                adapter = S3StorageAdapter.getInstance();
            }

            return adapter;
        })();

        this.adapters.set(provider, adapterPromise);
        return adapterPromise;

    }

    /**
     * Resets the adapter cache (useful after configuration changes).
     */
    public static async reset() {
        const currentAdapters = Array.from(this.adapters.values());
        this.adapters.clear();

        for (const adapterPromise of currentAdapters) {
            try {
                const adapter = await adapterPromise;
                adapter.destroy();
            } catch (err) {
                // Ignore destruction errors for failed initializations
            }
        }
    }
}
