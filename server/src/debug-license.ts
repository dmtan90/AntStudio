/**
 * Debug: Check current license status in database
 */

import mongoose from 'mongoose';
import { License, ILicense } from './models/License.js';

async function checkLicense() {
    try {
        console.log('[Debug] Connecting to MongoDB...');
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI environment variable is not set');
        }

        await mongoose.connect(mongoUri);
        console.log('[Debug] Connected successfully');

        const licenses = await License.find();
        console.log('[Debug] Found licenses:', JSON.stringify(licenses, null, 2));

        if (licenses.length === 0) {
            console.log('[Debug] ⚠️ No licenses found in database. This will cause licenseGating to fail with 402.');
        } else {
            const activeLicense = licenses.find((l: ILicense) => l.status === 'valid');
            if (activeLicense) {
                console.log(`[Debug] ✅ Active License: Tier=${activeLicense.tier}, Status=${activeLicense.status}, EndDate=${activeLicense.endDate}`);
            } else {
                console.log('[Debug] ❌ No valid license found (all expired or revoked).');
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('[Debug] Error:', error);
        process.exit(1);
    }
}

checkLicense();
