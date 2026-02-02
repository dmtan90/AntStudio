import { systemLogger } from '../utils/systemLogger.js';
import { StorageFactory } from './storage/StorageFactory.js';
import path from 'path';
import fs from 'fs';
import { nanoid } from 'nanoid';

interface StreamBuffer {
    sessionId: string;
    chunks: { timestamp: number; data: Buffer }[];
    maxSize: number; // in ms
}

/**
 * Service to manage rolling video buffers and capture highlights from live streams.
 */
export class HighlightService {
    private buffers: Map<string, StreamBuffer> = new Map();
    private readonly MAX_BUFFER_DURATION = 30000; // 30 seconds

    /**
     * Add a chunk to the session's rolling buffer
     */
    public appendChunk(sessionId: string, chunk: Buffer) {
        let buffer = this.buffers.get(sessionId);
        if (!buffer) {
            buffer = { sessionId, chunks: [], maxSize: this.MAX_BUFFER_DURATION };
            this.buffers.set(sessionId, buffer);
        }

        buffer.chunks.push({ timestamp: Date.now(), data: chunk });

        // Clean up old chunks
        const cutoff = Date.now() - this.MAX_BUFFER_DURATION;
        buffer.chunks = buffer.chunks.filter(c => c.timestamp >= cutoff);
    }

    /**
     * Capture the last X seconds and save as a highlight
     */
    public async captureHighlight(sessionId: string, durationMs: number = 15000): Promise<{ s3Url: string, id: string } | null> {
        const buffer = this.buffers.get(sessionId);
        if (!buffer || buffer.chunks.length === 0) {
            systemLogger.warn(`[HighlightService] No buffer found for session ${sessionId}`, 'HighlightService');
            return null;
        }

        const cutoff = Date.now() - durationMs;
        const highlightChunks = buffer.chunks.filter(c => c.timestamp >= cutoff);

        if (highlightChunks.length === 0) return null;

        const combinedBuffer = Buffer.concat(highlightChunks.map(c => c.data));
        const highlightId = nanoid();
        const fileName = `highlights/${sessionId}/${highlightId}.webm`;

        try {
            const storage = StorageFactory.getActiveAdapter();
            const result = await storage.uploadFile(combinedBuffer, fileName, 'video/webm');

            systemLogger.info(`[HighlightService] Captured highlight for ${sessionId}: ${result}`, 'HighlightService');

            return {
                id: highlightId,
                s3Url: result
            };
        } catch (error: any) {
            systemLogger.error(`[HighlightService] Failed to upload highlight: ${error.message}`, 'HighlightService');
            return null;
        }
    }

    public cleanupSession(sessionId: string) {
        this.buffers.delete(sessionId);
    }
}

export const highlightService = new HighlightService();
