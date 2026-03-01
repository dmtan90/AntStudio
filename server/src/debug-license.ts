/**
 * Debug: Check current license status in database
 */

import mongoose from 'mongoose';
import { License, ILicense } from './models/License.js';

import { Logger } from './utils/Logger.js';

async function checkLicense() {
    try {
        Logger.info('[Debug] Connecting to MongoDB...');
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI environment variable is not set');
        }

        await mongoose.connect(mongoUri);
        Logger.info('[Debug] Connected successfully');

        const licenses = await License.find();
        Logger.info('[Debug] Found licenses:', JSON.stringify(licenses, null, 2));

        if (licenses.length === 0) {
            Logger.info('[Debug] ⚠️ No licenses found in database. This will cause licenseGating to fail with 402.');
        } else {
            const activeLicense = licenses.find((l: ILicense) => l.status === 'valid');
            if (activeLicense) {
                Logger.info(`[Debug] ✅ Active License: Tier=${activeLicense.tier}, Status=${activeLicense.status}, EndDate=${activeLicense.endDate}`);
            } else {
                Logger.info('[Debug] ❌ No valid license found (all expired or revoked).');
            }
        }

        process.exit(0);
    } catch (error) {
        Logger.error('[Debug] Error:', error);
        process.exit(1);
    }
}

checkLicense();
