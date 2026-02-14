import mongoose from 'mongoose';
import config from './config.js';
import { clusterManager } from './ClusterManager.js';

let isConnected = false;

/**
 * Connects to the database cluster with multi-region support.
 */
export const connectDB = async () => {
    if (isConnected) return;

    try {
        await clusterManager.connect();
        isConnected = true;
        console.log(`✅ Global Database Cluster connected successfully (State: ${mongoose.connection.readyState})`);
    } catch (error) {
        console.error('❌ Database Cluster connection failed:', error);
        throw error;
    }
};

/**
 * Helper to get a connection for specific operations.
 */
export const getDB = (mode: 'read' | 'write' = 'write') => {
    return clusterManager.getConnection(mode);
};

export default connectDB;

