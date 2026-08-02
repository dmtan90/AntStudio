import mongoose from 'mongoose';
import config from './config.js';
import { clusterManager } from './ClusterManager.js';
import { Logger } from './Logger.js';
import { getAdminSettings } from '~/models/AdminSettings.js';

let isConnected = false;

/**
 * Connects to the database cluster with multi-region support.
 */
export const connectDB = async () => {
    if (isConnected) return;

    try {
        await clusterManager.connect();
        isConnected = true;
        Logger.info(`✅ Global Database Cluster connected successfully (State: ${mongoose.connection.readyState})`, 'Database');
        //must init admin settings first if empty
        await getAdminSettings();
    } catch (error) {
        Logger.error('❌ Database Cluster connection failed', 'Database', { error });
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

