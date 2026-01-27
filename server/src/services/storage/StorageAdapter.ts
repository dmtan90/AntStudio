/**
 * Interface defining the standardized storage operations for AntStudio.
 * Supports multi-cloud storage strategy (S3, Google Drive, etc.)
 */
export interface IStorageAdapter {
    /**
     * Uploads a file buffer or stream to the storage provider.
     */
    uploadFile(key: string, body: Buffer | Uint8Array | string, contentType?: string): Promise<{ key: string, url: string }>;

    /**
     * Retrieves a direct or signed URL for a file.
     */
    getFileUrl(key: string, expiresIn?: number): Promise<string>;

    /**
     * Deletes a single file from storage.
     */
    deleteFile(key: string): Promise<void>;

    /**
     * Deletes multiple files or a "folder" (prefix-based).
     */
    deleteFolder(prefix: string): Promise<void>;

    /**
     * Checks if a file exists.
     */
    exists(key: string): Promise<boolean>;
}
