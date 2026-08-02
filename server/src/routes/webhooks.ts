import express from 'express';
import { Logger } from '../utils/Logger.js';
import { StreamSessionModel } from '../models/StreamSession.js';
import { socketServer } from '../services/streaming/SocketServer.js';

const router = express.Router();

// Configuration for Facebook Webhook
// This should ideally be in env vars, but using a fallback for development
const FB_VERIFY_TOKEN = process.env.FB_WEBHOOK_VERIFY_TOKEN || 'antstudio_fb_webhook_secret';

/**
 * Facebook Webhook Verification Endpoin 
 * Used by Meta App Dashboard when setting up the webhook URL.
 */
router.get('/facebook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === FB_VERIFY_TOKEN) {
            Logger.info('FACEBOOK_WEBHOOK_VERIFIED', 'Webhooks');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(400);
    }
});

/**
 * Facebook Webhook Event Receiver
 * Receives real-time updates for page feed (comments, reactions, etc.)
 */
router.post('/facebook', async (req, res) => {
    const body = req.body;

    // Acknowledge receipt immediately to avoid Facebook retries/timeouts
    res.status(200).send('EVENT_RECEIVED');

    if (body.object === 'page') {
        try {
            for (const entry of body.entry) {
                for (const change of entry.changes) {
                    // Look for new comments being added
                    if (change.field === 'feed' || change.field === 'live_videos') {
                        const val = change.value;
                        
                        // We only care about new comments
                        if (val && val.item === 'comment' && val.verb === 'add') {
                            const message = val.message;
                            const from = val.from?.name || 'Facebook User';
                            const timestamp = val.created_time ? new Date(val.created_time * 1000).toISOString() : new Date().toISOString();
                            const commentId = val.comment_id;
                            const postId = val.post_id || val.video_id; 
                            
                            // For Facebook Live, the post_id often comes as "PAGE_ID_VIDEO_ID"
                            // We need to extract the video_id to match with our targets.externalChatId
                            let videoId = postId;
                            if (postId && postId.includes('_')) {
                                videoId = postId.split('_')[1];
                            }

                            if (!videoId || !message) continue;

                            // Look up if any active stream session is associated with this videoId
                            const activeSession = await StreamSessionModel.findOne({
                                status: 'live',
                                'targets.externalChatId': videoId
                            });

                            if (activeSession) {
                                Logger.info(`[Facebook Webhook] New Comment on Live Stream ${activeSession.sessionId}: ${message}`, 'Webhooks');
                                
                                const io = socketServer.getIO();
                                if (io) {
                                    io.to(activeSession.sessionId).emit('chat:external', {
                                        platform: 'facebook',
                                        messages: [{
                                            id: commentId || Date.now().toString(),
                                            platform: 'facebook',
                                            author: from,
                                            avatar: val.from?.id ? `https://graph.facebook.com/${val.from.id}/picture` : null,
                                            text: message,
                                            timestamp: timestamp
                                        }]
                                    });
                                }
                            }
                        }
                    }
                }
            }
        } catch (error: any) {
            Logger.error('Facebook Webhook Processing Error:', 'Webhooks', error);
        }
    }
});

export default router;
