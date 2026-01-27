import { IStorageAdapter } from './StorageAdapter.js';
import { S3StorageAdapter } from './S3StorageAdapter.js';
import { GoogleDriveStorageAdapter } from './GoogleDriveStorageAdapter.js';
import { configService } from '../../utils/configService.js';

/**
 * Factory and Registry for Storage Providers.
 * Manages singleton instances of adapters based on configuration.
 */
export class StorageFactory {
    private static adapters: Map<string, IStorageAdapter> = new Map();

    /**
     * Gets the currently active storage provider.
     */
    public static async getActiveAdapter(): Promise<IStorageAdapter> {
        const providerName = configService.storage.activeProvider;
        return this.getAdapter(providerName);
    }

    /**
     * Gets or creates a specific storage adapter instance.
     */
    public static async getAdapter(provider: 's3' | 'google_drive'): Promise<IStorageAdapter> {
        if (this.adapters.has(provider)) {
            return this.adapters.get(provider)!;
        }

        let adapter: IStorageAdapter;

        if (provider === 'google_drive') {
            adapter = new GoogleDriveStorageAdapter();
        } else {
            // Default to S3
            adapter = new S3StorageAdapter();
        }

        this.adapters.set(provider, adapter);
        return adapter;
    }

    /**
     * Resets the adapter cache (useful after configuration changes).
     */
    public static reset() {
        this.adapters.clear();
    }
}
