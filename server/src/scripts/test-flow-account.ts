import mongoose from 'mongoose';
import { AIAccount } from '../models/AIAccount.js';
import { aiAccountManager } from '../utils/ai/AIAccountManager.js';
import { flowSyncService } from '../utils/ai/FlowSyncService.js';
import { Logger } from '../utils/Logger.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Test script for Google Flow integration
 * This script tests credit extraction from mock session data 
 * and account selection logic.
 */
async function test() {
    console.log('--- Starting Google Flow Integration Test ---');

    // 1. Test Credit Extraction
    console.log('\n--- 1. Testing Credit Extraction ---');
    const mockSessions = [
        { user: { credits: 300, email: 'test1@gmail.com' }, access_token: 'at1' },
        { credits: 150, user: { email: 'test2@gmail.com' }, access_token: 'at2' },
        { user: { usage: { credits: 50 }, email: 'test3@gmail.com' }, access_token: 'at3' }
    ];

    for (const session of mockSessions) {
        let credits = 0;
        if (session.user?.credits !== undefined) {
            credits = session.user.credits;
        } else if (session.credits !== undefined) {
            credits = session.credits;
        } else if (session.user?.usage?.credits !== undefined) {
            credits = session.user.usage.credits;
        }
        console.log(`Extracted Credits: ${credits} from ${session.user?.email}`);
    }

    // 2. Test Account Selection Logic (Mocked)
    console.log('\n--- 2. Testing Account Selection Logic (Least-Used) ---');
    
    // We mock the DB results or just logic
    const mockAccounts = [
        { email: 'acc1@flow.com', credits: 100, lastUsedAt: new Date(Date.now() - 10000), accountType: 'google-flow' },
        { email: 'acc2@flow.com', credits: 100, lastUsedAt: new Date(Date.now() - 5000), accountType: 'google-flow' },
        { email: 'acc3@flow.com', credits: 50, lastUsedAt: new Date(Date.now() - 20000), accountType: 'google-flow' }
    ];

    // Simulate Sorting Logic from AIAccountManager.ts
    const sorted = [...mockAccounts].sort((a, b) => {
        if (a.accountType === 'google-flow' && b.accountType === 'google-flow') {
            const creditsA = a.credits || 0;
            const creditsB = b.credits || 0;
            if (creditsA !== creditsB) return creditsB - creditsA; // More credits first
        }
        
        const timeA = a.lastUsedAt?.getTime() || 0;
        const timeB = b.lastUsedAt?.getTime() || 0;
        return timeA - timeB; // Least used first
    });

    console.log('Selection Order:');
    sorted.forEach((acc, i) => console.log(`${i+1}. ${acc.email} (Credits: ${acc.credits}, Last Used: ${acc.lastUsedAt.toISOString()})`));

    console.log('\n--- Test Completed ---');
}

test().catch(console.error);
