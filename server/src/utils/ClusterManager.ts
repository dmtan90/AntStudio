import mongoose from 'mongoose';
import { Logger } from './Logger.js';

/**
 * Service to manage multi-region database clusters.
 * Implements Read/Write splitting for global scalability.
 */
export class ClusterManager {
    private primaryConnection: mongoose.Connection | null = null;
    private readReplicas: mongoose.Connection[] = [];
    private currentReaderIndex = 0;

    /**
     * Initializes the cluster connections.
     * ENV: MONGODB_URI (Primary), MONGODB_READ_REPLICAS (Comma-separated list)
     */
    public async connect() {
        try {
            const primaryUri = process.env.MONGODB_URI;
            if (!primaryUri) throw new Error("Primary MONGODB_URI is not defined");

            // 1. Connect Primary (Master Writer)
            // Use mongoose.connect to initialize the default connection for models
            // Disable buffering to fail fast if connection is not ready
            mongoose.set('bufferCommands', true);
            await mongoose.connect(primaryUri);
            this.primaryConnection = mongoose.connection;
            Logger.info(`[ClusterManager] 🟢 Primary DB Connected (Default): ${this.getHost(primaryUri)}`, 'ClusterManager');

            // 2. Connect Read Replicas (Optional Readers)
            const replicaUris = process.env.MONGODB_READ_REPLICAS?.split(',') || [];
            for (const uri of replicaUris) {
                if (!uri) continue;
                const conn = await mongoose.createConnection(uri.trim()).asPromise();
                this.readReplicas.push(conn);
                Logger.info(`[ClusterManager] 🟢 Read Replica Connected: ${this.getHost(uri)}`, 'ClusterManager');
            }

            if (this.readReplicas.length === 0) {
                Logger.warn("[ClusterManager] ⚠️ No read replicas defined. All traffic routed to Primary.", 'ClusterManager');
            }

        } catch (error: any) {
            Logger.error("[ClusterManager] ❌ Connection failed:", 'ClusterManager', error);
            throw error;
        }
    }

    /**
     * Gets the appropriate connection based on operation type.
     * @param mode 'read' or 'write'
     */
    public getConnection(mode: 'read' | 'write' = 'write'): mongoose.Connection {
        if (mode === 'write' || this.readReplicas.length === 0) {
            return this.primaryConnection!;
        }

        // Round-robin for Read Replicas
        const conn = this.readReplicas[this.currentReaderIndex];
        this.currentReaderIndex = (this.currentReaderIndex + 1) % this.readReplicas.length;
        return conn;
    }

    private getHost(uri: string): string {
        try {
            return new URL(uri).host;
        } catch {
            return 'hidden-host';
        }
    }

    public async disconnect() {
        if (this.primaryConnection) await this.primaryConnection.close();
        for (const conn of this.readReplicas) await conn.close();
    }

    /**
     * Returns information about all nodes in the cluster.
     */
    public getClusterInfo() {
        const nodes = [];
        
        if (this.primaryConnection) {
            nodes.push({
                id: 'primary',
                host: this.primaryConnection.host,
                role: 'WRITER',
                status: this.primaryConnection.readyState === 1 ? 'Active' : 'Disconnected'
            });
        }

        this.readReplicas.forEach((conn, index) => {
            nodes.push({
                id: `replica-${index + 1}`,
                host: conn.host,
                role: 'READER',
                status: conn.readyState === 1 ? 'Active' : 'Disconnected'
            });
        });

        return nodes;
    }
}

export const clusterManager = new ClusterManager();
