import { Router, Response } from 'express';
import { Project } from '../models/Project.js';
import { connectDB } from '../utils/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { buildCharacterSheetPrompt, buildScenePrompt, buildVeoVideoPrompt } from '../utils/PromptBuilder.js';

const router = Router();

// All prompt routes require authentication
router.use(authMiddleware);

// GET /api/prompts/character/:projectId/:charIndex - Get character generation prompt
router.get('/character/:projectId/:charIndex', async (req: any, res: Response) => {
    try {
        await connectDB();
        const { projectId, charIndex } = req.params;

        const project = await Project.findOne({ _id: projectId, userId: req.user!.userId });
        if (!project) {
            return res.status(404).json({ success: false, data: null, error: 'Project not found' });
        }

        const index = parseInt(charIndex);
        const character = project.scriptAnalysis?.characters?.[index];

        if (!character) {
            return res.status(404).json({ success: false, data: null, error: 'Character not found' });
        }

        const style = project.creativeBrief?.visualStyle || project.videoStyle || 'Cinematic, Photo-realistic';
        const language = project.scriptAnalysis?.language;

        const prompt = await buildCharacterSheetPrompt(character, style, language);

        res.json({
            success: true,
            data: {
                prompt,
                metadata: {
                    projectId,
                    entityType: 'character',
                    entityId: charIndex,
                    language: language || 'English',
                    translated: language && !language.toLowerCase().includes('english')
                }
            }
        });
    } catch (error: any) {
        console.error('Get character prompt error:', error);
        res.status(500).json({ success: false, data: null, error: error.message || 'Failed to generate character prompt' });
    }
});

// GET /api/prompts/scene/:projectId/:segmentId - Get scene image generation prompt
router.get('/scene/:projectId/:segmentId', async (req: any, res: Response) => {
    try {
        await connectDB();
        const { projectId, segmentId } = req.params;

        const project = await Project.findOne({ _id: projectId, userId: req.user!.userId });
        if (!project) {
            return res.status(404).json({ success: false, data: null, error: 'Project not found' });
        }

        const segment = project.storyboard?.segments?.find((s: any) =>
            s._id?.toString() === segmentId || s.order === parseInt(segmentId)
        );

        if (!segment) {
            return res.status(404).json({ success: false, data: null, error: 'Segment not found' });
        }

        const allCharacters = project.scriptAnalysis?.characters || [];
        const characterContext = (segment.characters || [])
            .map((name: string) => allCharacters.find((c: any) => c.name.toLowerCase() === name.toLowerCase()))
            .filter((c: any): c is any => !!c);

        const style = project.creativeBrief?.visualStyle || project.videoStyle || 'Cinematic';
        const prompt = buildScenePrompt(segment.description, characterContext, style);

        res.json({
            success: true,
            data: {
                prompt,
                metadata: {
                    projectId,
                    entityType: 'scene',
                    entityId: segmentId,
                    language: project.scriptAnalysis?.language || 'English',
                    translated: false
                }
            }
        });
    } catch (error: any) {
        console.error('Get scene prompt error:', error);
        res.status(500).json({ success: false, data: null, error: error.message || 'Failed to generate scene prompt' });
    }
});

// GET /api/prompts/video/:projectId/:segmentId - Get video generation prompt
router.get('/video/:projectId/:segmentId', async (req: any, res: Response) => {
    try {
        await connectDB();
        const { projectId, segmentId } = req.params;

        const project = await Project.findOne({ _id: projectId, userId: req.user!.userId });
        if (!project) {
            return res.status(404).json({ success: false, data: null, error: 'Project not found' });
        }

        const segment = project.storyboard?.segments?.find((s: any) =>
            s._id?.toString() === segmentId || s.order === parseInt(segmentId)
        );

        if (!segment) {
            return res.status(404).json({ success: false, data: null, error: 'Segment not found' });
        }

        const allCharacters = project.scriptAnalysis?.characters || [];
        const projectStyle = project.creativeBrief?.visualStyle || project.videoStyle || 'Cinematic';
        const language = project.scriptAnalysis?.language;

        const prompt = await buildVeoVideoPrompt(segment, allCharacters, projectStyle, language);

        res.json({
            success: true,
            data: {
                prompt,
                metadata: {
                    projectId,
                    entityType: 'video',
                    entityId: segmentId,
                    language: language || 'English',
                    translated: language && !language.toLowerCase().includes('english')
                }
            }
        });
    } catch (error: any) {
        console.error('Get video prompt error:', error);
        res.status(500).json({ success: false, data: null, error: error.message || 'Failed to generate video prompt' });
    }
});

export default router;
