/**
 * Migration: Drop old email_1 unique index from AIAccount collection
 * This allows the same email to be used with different accountType values
 * (e.g., standard + antigravity for the same Google account)
 */

import mongoose from 'mongoose';
import { AIAccount } from '../models/AIAccount.js';

import { Logger } from '../utils/Logger.js';

async function migrate() {
    try {
        Logger.info('[Migration] Connecting to MongoDB...');
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI environment variable is not set');
        }

        await mongoose.connect(mongoUri);
        Logger.info('[Migration] Connected successfully');

        // Get the collection
        const collection = AIAccount.collection;

        // List all indexes
        const indexes = await collection.indexes();
        Logger.info('[Migration] Current indexes:', JSON.stringify(indexes, null, 2));

        // Check if the old email_1 index exists
        const hasOldIndex = indexes.some(idx => idx.name === 'email_1');

        if (hasOldIndex) {
            Logger.info('[Migration] Dropping old email_1 unique index...');
            await collection.dropIndex('email_1');
            Logger.info('[Migration] ✅ Successfully dropped email_1 index');
        } else {
            Logger.info('[Migration] ℹ️  Old email_1 index not found (already removed or never existed)');
        }

        // Verify the compound index exists
        const hasCompoundIndex = indexes.some(idx =>
            idx.name === 'email_1_accountType_1' ||
            (idx.key && idx.key.email === 1 && idx.key.accountType === 1)
        );

        if (!hasCompoundIndex) {
            Logger.info('[Migration] Creating compound unique index on email + accountType...');
            await collection.createIndex(
                { email: 1, accountType: 1 },
                { unique: true, name: 'email_1_accountType_1' }
            );
            Logger.info('[Migration] ✅ Created compound index');
        } else {
            Logger.info('[Migration] ✅ Compound index already exists');
        }

        Logger.info('[Migration] Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        Logger.error('[Migration] Error:', error);
        process.exit(1);
    }
}

migrate();
