export interface ObjectMetadata {
    key: string;
    size: number;
    lastModified: Date;
    etag: string;
    contentType?: string;
    storageClass?: string;
    metadata: Record<string, string>;
}

export interface FileEntry {
    key: string;
    size: number;
    lastModified: Date;
    etag: string;
    storageClass?: string;
}

export interface ListPage {
    entries: FileEntry[];
    nextToken: string | null;
}

export interface DeleteError {
    key: string;
    code: string;
    message: string;
}

export interface DeleteResult {
    deleted: string[];
    errors: DeleteError[];
    dryRun: boolean;
}

export interface TransferProgress {
    bytesTransferred: number;
    totalBytes: number | null;
    operation: string;
    key: string;
}
