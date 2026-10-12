// Streaming, VOD, publishing & syndication (moved verbatim from routes/projects.ts).
// Mounted by routes/projects.ts after authMiddleware.
import { Router } from 'express';
import { Response } from 'express';
import { connectDB } from '../../utils/db.js';
import { Project } from '../../models/Project.js';
import { Media } from '../../models/Media.js';
import { Logger } from '../../utils/Logger.js';
import { WebhookService } from '../../services/system/WebhookService.js';
import { AuthRequest } from '../../middleware/auth.js';
import { rbacMiddleware } from '../../middleware/rbac.js';
import { Permission } from '../../utils/permissions.js';
import { uploadToS3, S3KeyGenerator } from '../../utils/s3.js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { socketServer } from '../../services/streaming/SocketServer.js';
import { socialSyndicationService } from '../../services/streaming/SocialSyndicationService.js';
import { antMediaService } from '../../utils/AntMedia.js';
import { getSignedS3Url } from '../../utils/s3.js';
import { UserPlatformAccount } from '../../models/UserPlatformAccount.js';
import { writeFile, mkdir, processVideo, upload } from './shared.js';

const router = Router();

// DELETED legacy publish route - functionality merged into consolidated /publish

// POST /api/projects/:id/stream - Initiate Ant Media broadcast
router.post('/:id/stream', rbacMiddleware(Permission.STREAM_START), async (req: any, res: Response) => {
    try {
        await connectDB();
        const project = await Project.findOne({ _id: req.params.id, userId: req.user!.userId });
        if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
        if (!project.publish?.s3Key) return res.status(400).json({ success: false, error: 'Final video not found' });

        const { streamId, accountId } = req.body;
        // const { antMediaService } = await import('../utils/AntMedia.js');
        // const { getSignedS3Url } = await import('../utils/s3.js');
        // const { UserPlatformAccount } = await import('../models/UserPlatformAccount.js');

        // Dynamically resolve AMS config from connected platform accounts
        let amsAccount = null;
        if (accountId) {
            amsAccount = await UserPlatformAccount.findOne({ _id: accountId, userId: req.user!.userId, isActive: true });
        }
        if (!amsAccount) {
            amsAccount = await UserPlatformAccount.findOne({ userId: req.user!.userId, platform: 'ant-media', isActive: true });
        }

        const amsConfig = amsAccount ? {
            baseUrl: amsAccount.credentials?.serverUrl || amsAccount.rtmpUrl,
            appName: amsAccount.credentials?.appName || amsAccount.accountName || 'LiveApp',
            email: amsAccount.credentials?.email,
            password: amsAccount.credentials?.password
        } : undefined;

        await antMediaService.authenticate(amsConfig);

        const videoUrl = await getSignedS3Url(project.publish.s3Key);
        const broadcast = await antMediaService.createBroadcast({
            name: project.title || 'AntStudio Stream',
            streamId: streamId || `antflow-${project._id}`,
            type: 'streamSource',
            streamUrl: videoUrl
        }, amsConfig);

        if (!broadcast || !broadcast.streamId) throw new Error("Failed to create stream source on Ant Media Server");
        await antMediaService.startStreamSource(broadcast.streamId, amsConfig);

        WebhookService.dispatch(req.user!.userId, 'stream.started', {
            projectId: project._id,
            streamId: broadcast.streamId,
            name: project.title
        });

        res.json({ success: true, data: { streamId: broadcast.streamId } });
    } catch (error: any) {
        Logger.error('Ant Media stream initiation failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/projects/:id/vod - Save project final video as VoD to Ant Media Server
router.post('/:id/vod', rbacMiddleware(Permission.STREAM_START), async (req: any, res: Response) => {
    try {
        await connectDB();
        const project = await Project.findOne({ _id: req.params.id, userId: req.user!.userId });
        if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
        if (!project.publish?.s3Key) return res.status(400).json({ success: false, error: 'Final video not found' });

        const { accountId } = req.body;
        // const { antMediaService } = await import('../utils/AntMedia.js');
        // const { getSignedS3Url } = await import('../utils/s3.js');
        // const { UserPlatformAccount } = await import('../models/UserPlatformAccount.js');

        let amsAccount = null;
        if (accountId) {
            amsAccount = await UserPlatformAccount.findOne({ _id: accountId, userId: req.user!.userId, isActive: true });
        }
        if (!amsAccount) {
            amsAccount = await UserPlatformAccount.findOne({ userId: req.user!.userId, platform: 'ant-media', isActive: true });
        }

        const amsConfig = amsAccount ? {
            baseUrl: amsAccount.credentials?.serverUrl || amsAccount.rtmpUrl,
            appName: amsAccount.credentials?.appName || amsAccount.accountName || 'LiveApp',
            email: amsAccount.credentials?.email,
            password: amsAccount.credentials?.password
        } : undefined;

        await antMediaService.authenticate(amsConfig);

        const videoUrl = await getSignedS3Url(project.publish.s3Key);
        const vod = await antMediaService.uploadVoD({
            name: `${project.title || 'AntStudio Video'}.mp4`,
            streamUrl: videoUrl
        }, undefined, amsConfig);

        if (!vod) throw new Error("Failed to save VoD on Ant Media Server");

        res.json({ success: true, data: vod });
    } catch (error: any) {
        Logger.error('Ant Media VoD save failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/projects/:id/publish - Finalizes project with client-side output and server-side processing
router.post('/:id/publish', rbacMiddleware(Permission.PROJECT_EDIT), upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
    { name: 'preview', maxCount: 1 }
]), async (req: AuthRequest, res: Response) => {
    let tempDir = '';
    let tempVideoPath = '';
    try {
        await connectDB();
        const projectId = req.params.id;
        const project = await Project.findOne({ _id: projectId, userId: req.user!.userId });

        if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        const videoFile = files['video']?.[0];
        const thumbFile = files['thumbnail']?.[0];
        const previewFile = files['preview']?.[0];

        if (!videoFile) return res.status(400).json({ success: false, error: 'Video file is required' });

        // Save to temporary file for FFmpeg with correct extension
        tempDir = path.join(os.tmpdir(), `antflow_pub_${projectId}_${Date.now()}`);
        if (!fs.existsSync(tempDir)) await mkdir(tempDir, { recursive: true });

        if (thumbFile) {
            await writeFile(path.join(tempDir, 'thumb.jpg'), thumbFile.buffer);
        }
        if (previewFile) {
            await writeFile(path.join(tempDir, 'preview.mp4'), previewFile.buffer);
        }
        
        const isWebm = videoFile.mimetype?.includes('webm') || videoFile.originalname?.endsWith('.webm');
        const fileExt = isWebm ? '.webm' : '.mp4';
        tempVideoPath = path.join(tempDir, `input${fileExt}`);
        await writeFile(tempVideoPath, videoFile.buffer);

        // 1. Extract Metadata and Generate Assets
        const processed = await processVideo(tempVideoPath, projectId);

        // 2. Upload Everything to S3
        const finalKey = isWebm ? `projects/${projectId}/final.webm` : S3KeyGenerator.finalVideo(projectId);
        const thumbKey = `projects/${projectId}/publish/thumbnail.jpg`;
        const previewKey = `projects/${projectId}/publish/preview.mp4`;

        await Promise.all([
            uploadToS3(finalKey, videoFile.buffer, videoFile.mimetype),
            uploadToS3(thumbKey, fs.readFileSync(processed.thumbnailPath), 'image/jpeg'),
            uploadToS3(previewKey, fs.readFileSync(processed.previewPath), 'video/mp4')
        ]);

        // 3. Update Project State
        project.status = 'completed';
        project.publish = {
            s3Key: finalKey,
            thumbnailKey: thumbKey,
            previewKey: previewKey,
            duration: processed.duration,
            resolution: processed.resolution,
            fileSize: videoFile.size,
            generatedAt: new Date()
        };

        await project.save();

        // Notify
        // const { socketServer } = await import('../services/streaming/SocketServer.js');
        socketServer.emitProjectUpdate(req.user!.userId, projectId, {
            type: 'publish_ready',
            result: {
                s3Key: finalKey,
                duration: processed.duration
            }
        });

        res.json({
            success: true,
            data: {
                message: 'Project published successfully with processed assets',
                publish: project.publish,
                project: project
            }
        });

    } catch (error: any) {
        Logger.error('[Publish] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        // Cleanup temp files safely after Windows file locks release
        if (tempDir) {
            const dirToDelete = tempDir;
            setTimeout(() => {
                if (fs.existsSync(dirToDelete)) {
                    try {
                        fs.rmSync(dirToDelete, { recursive: true, force: true });
                    } catch (e) {}
                }
            }, 500);
        }
    }
});

// POST /api/projects/:id/syndicate-final - Syndicate final montage to social media
router.post('/:id/syndicate-final', rbacMiddleware(Permission.PROJECT_EDIT), async (req: AuthRequest, res: Response) => {
    try {
        await connectDB();
        const projectId = req.params.id;
        const { caption, hashtags } = req.body;

        // const { socialSyndicationService } = await import('../services/streaming/SocialSyndicationService.js');
        const result = await socialSyndicationService.syndicateFinalVideo(projectId, { caption, hashtags });

        res.json({ success: true, data: result });
    } catch (error: any) {
        Logger.error('[SyndicateFinal] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
