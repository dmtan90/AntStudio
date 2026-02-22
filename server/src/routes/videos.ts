import { Router } from 'express';
import { Project } from '../models/Project.js';
import { connectDB } from '../utils/db.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { clippingEngine } from '../services/ai/ClippingEngine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '../../tmp/recordings');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
        cb(null, `rec-${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage });

const router = Router();

// GET /api/videos/list - List user's exported videos
router.get('/list', authMiddleware, async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 12;
        const projectId = req.query.projectId as string;
        const search = req.query.search as string;

        const filter: any = {
            userId: req.user!.userId,
            'publish.s3Key': { $exists: true }
        };

        if (projectId) {
            filter._id = projectId;
        }

        if (search) {
            filter.title = { $regex: new RegExp(search, 'i') };
        }

        const total = await Project.countDocuments(filter);
        const projects = await Project.find(filter)
            .sort({ 'publish.generatedAt': -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .select('title publish createdAt')
            .lean();

        const videos = projects.map(project => ({
            _id: project._id,
            projectTitle: project.title,
            s3Key: project.publish?.s3Key,
            reviewKey: project.publish?.previewKey,
            thumbnailKey: project.publish?.thumbnailKey,
            duration: project.publish?.duration,
            resolution: project.publish?.resolution,
            fileSize: project.publish?.fileSize,
            generatedAt: project.publish?.generatedAt,
            createdAt: project.createdAt
        }));

        res.json({
            success: true,
            data: {
                videos,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error: any) {
        console.error('Fetch videos error:', error);
        res.status(500).json({ success: false, data: null, error: 'Failed to fetch videos' });
    }
});

// POST /api/videos/upload-recording - Receive studio recording for viral clipping
router.post('/upload-recording', authMiddleware, upload.single('video'), async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const { projectId } = req.body;
        const videoFile = req.file;

        if (!videoFile) return res.status(400).json({ success: false, error: 'No video file provided' });

        // Associate with project as a viral asset
        const project = await Project.findOne({
            $or: [
                { _id: (mongoose.Types.ObjectId.isValid(projectId) ? projectId : new mongoose.Types.ObjectId()) },
                { title: { $regex: new RegExp(projectId, 'i') } }
            ],
            userId: req.user!.userId
        });

        if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

        // Log receipt
        console.log(`🎬 Received recording for project ${project.title}: ${videoFile.path}`);

        // Asynchronously trigger Clipping Engine (Phase 7)
        clippingEngine.processRecording({
            videoPath: videoFile.path,
            projectId: project._id.toString(),
            userId: req.user!.userId
        });

        res.json({ success: true, data: { status: 'queued', filePath: videoFile.path } });
    } catch (error: any) {
        console.error('Upload recording error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
