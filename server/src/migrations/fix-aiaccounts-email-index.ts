/**
 * Migration: Drop old email_1 unique index from AIAccount collection
 * This allows the same email to be used with different accountType values
 * (e.g., standard + antigravity for the same Google account)
 */

import mongoose from 'mongoose';
import { AIAccount } from '../models/AIAccount.js';

async function migrate() {
    try {
        console.log('[Migration] Connecting to MongoDB...');
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI environment variable is not set');
        }

        await mongoose.connect(mongoUri);
        console.log('[Migration] Connected successfully');

        // Get the collection
        const collection = AIAccount.collection;

        // List all indexes
        const indexes = await collection.indexes();
        console.log('[Migration] Current indexes:', JSON.stringify(indexes, null, 2));

        // Check if the old email_1 index exists
        const hasOldIndex = indexes.some(idx => idx.name === 'email_1');

        if (hasOldIndex) {
            console.log('[Migration] Dropping old email_1 unique index...');
            await collection.dropIndex('email_1');
            console.log('[Migration] ✅ Successfully dropped email_1 index');
        } else {
            console.log('[Migration] ℹ️  Old email_1 index not found (already removed or never existed)');
        }

        // Verify the compound index exists
        const hasCompoundIndex = indexes.some(idx =>
            idx.name === 'email_1_accountType_1' ||
            (idx.key && idx.key.email === 1 && idx.key.accountType === 1)
        );

        if (!hasCompoundIndex) {
            console.log('[Migration] Creating compound unique index on email + accountType...');
            await collection.createIndex(
                { email: 1, accountType: 1 },
                { unique: true, name: 'email_1_accountType_1' }
            );
            console.log('[Migration] ✅ Created compound index');
        } else {
            console.log('[Migration] ✅ Compound index already exists');
        }

        console.log('[Migration] Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('[Migration] Error:', error);
        process.exit(1);
    }
}

migrate();
