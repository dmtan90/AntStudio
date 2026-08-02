import { Server, Socket } from 'socket.io';
import { creditManager, ServiceType } from '../../utils/CreditManager.js';
import { getCreditCost } from '~/utils/credits.js';
import { AIModelType } from '~/models/AdminSettings.js';

export class BinaryStreamService {
    /**
     * Broadcast a binary chunk to a tactical studio room.
     */
    static streamChunk(io: Server, roomId: string, type: 'audio' | 'video' | 'meta', chunk: Buffer | any) {
        io.to(roomId).emit(`stream:${type}`, {
            timestamp: Date.now(),
            data: chunk
        });
    }

    /**
     * Orchestrate a multi-phase neural handover (Assembly).
     */
    static async handleNeuralHandover(socket: Socket, payload: { targetLang: string, sourceStream: any }) {
        // Credit Deduction for Real-time AI Translation (Start Session)
        const userId = socket.data.user?.id;
        if (userId) {
            // Deduct 20 credits for starting a translation session
            const creditCost = await getCreditCost(AIModelType.TEXT);
            const success = await creditManager.deductCredits(userId, ServiceType.AI_TRANSLATION, creditCost, 'Agent Handover (Live Translation)');
            if (!success) {
               socket.emit('neural:handover:error', { message: 'Insufficient credits for AI translation' });
               return; 
            }
        }

        // Logic for real-time translation routing...
        // This will interface with AIServiceManager in Phase 14.2
        socket.emit('neural:handover:started', { status: 'stabilizing' });
    }
}
