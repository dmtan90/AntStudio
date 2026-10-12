// AI text & content (storyboards, copy, planning, LLM) (moved verbatim from routes/ai.ts).
// Mounted by ai.ts after its router-level middleware.
import { Router } from 'express';
import { Response } from 'express';
import { generateJSON, generateText, generateStoryboard, generateSocialMeta, translateContent } from '../../utils/AIGenerator.js';
import { buildKnowledgeSearchPrompt, buildGeneratePollPrompt, buildVerifyFactPrompt, buildAdHeadlinesPrompt, buildAdSubheadlinesPrompt, buildAdCTAPrompt, buildTrendingTopicsPrompt } from '../../utils/PromptBuilder.js';
import { AuthRequest } from '../../middleware/auth.js';
import { connectDB } from '../../utils/db.js';
import { deductCredits, getCreditCost } from '../../utils/credits.js';
import { videoWorkflow } from '../../services/ai/VideoWorkflow.js';
import { Logger } from '../../utils/Logger.js';
import { promptService } from '../../services/ai/PromptService.js';
import { AIModelType } from '~/models/AdminSettings.js';
import { ServiceType } from '~/models/CreditUsage.js';
import { cleanResponse } from './shared.js';

const router = Router();

/**
 * AI Storyboard Generation
 */
router.post('/generate-storyboard', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const { scriptOrTopic, projectAnalysis, targetDuration, language } = req.body;
        const userId = req.user!.userId;

        try {
            const creditCost = await getCreditCost(AIModelType.TEXT);
            await deductCredits(userId, ServiceType.TEXT, creditCost, `Generate Storyboard: ${scriptOrTopic?.substring(0, 30)}...`);
        } catch (ce: any) {
            return res.status(402).json({ success: false, error: ce.message });
        }

        const storyboard = await generateStoryboard(scriptOrTopic, projectAnalysis, targetDuration, language);
        res.json({ success: true, data: { storyboard } });
    } catch (error: any) {
        Logger.error('Storyboard generation error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to generate storyboard' });
    }
});

/**
 * AI Social Meta Generation
 */
router.post('/generate-social-meta', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const { contentSummary } = req.body;
        const userId = req.user!.userId;

        // Credit Deduction
        try {
            const creditCost = await getCreditCost(AIModelType.TEXT);
            await deductCredits(userId, ServiceType.TEXT, creditCost, 'Generate Social Meta');
        } catch (ce: any) {
            return res.status(402).json({ success: false, error: ce.message });
        }

        const result = await generateSocialMeta(contentSummary);
        res.json({ success: true, data: result });
    } catch (error: any) {
        Logger.error('Social meta generation error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to generate social meta' });
    }
});

/**
 * AI Translation / Localization
 */
router.post(['/translate-media', '/translate-project'], async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const { text, targetLanguage } = req.body;
        const userId = req.user!.userId;

        // Credit Deduction
        try {
            const creditCost = await getCreditCost(AIModelType.TEXT);
            await deductCredits(userId, ServiceType.TEXT, creditCost, `Translate Content to ${targetLanguage}`);
        } catch (ce: any) {
            return res.status(402).json({ success: false, error: ce.message });
        }

        const translated = await translateContent(text, targetLanguage);
        res.json({ success: true, data: { translated } });
    } catch (error: any) {
        Logger.error('Translation error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to translate content' });
    }
});

// POST /api/ai/headlines
router.post('/headlines', async (req, res) => {
    try {
        const { product_name, description } = req.body;
        const prompt = await buildAdHeadlinesPrompt({ product_name, description });

        const result = await generateJSON<{ data: string[] }>(prompt);
        res.json({ success: true, data: { data: cleanResponse(result.data) } });
    } catch (error: any) {
        Logger.error('Headlines generation error:', error);
        res.status(500).json({ success: false, error: 'Failed to generate headlines' });
    }
});

// POST /api/ai/subheadlines
router.post('/subheadlines', async (req, res) => {
    try {
        const { product_name, description } = req.body;
        const prompt = await buildAdSubheadlinesPrompt({ product_name, description });

        const result = await generateJSON<{ data: string[] }>(prompt);
        res.json({ success: true, data: { data: cleanResponse(result.data) } });
    } catch (error: any) {
        Logger.error('Subheadlines generation error:', error);
        res.status(500).json({ success: false, error: 'Failed to generate subheadlines' });
    }
});

// POST /api/ai/ad-cta
router.post('/ad-cta', async (req, res) => {
    try {
        const { name, description, objective } = req.body;
        const prompt = await buildAdCTAPrompt({ name, description, objective });

        const result = await generateJSON<{ data: string[] }>(prompt);
        res.json({ success: true, data: { data: cleanResponse(result.data) } });
    } catch (error: any) {
        Logger.error('CTA generation error:', error);
        res.status(500).json({ success: false, error: 'Failed to generate CTAs' });
    }
});

/**
 * POST /api/ai/generate-recap - Generate session recap
 */
router.post('/generate-recap', async (req: AuthRequest, res: Response) => {
    try {
        const { moments, sessionData } = req.body;
        const prompt = await promptService.get('studio/recap_gen', {
            moments: JSON.stringify(moments),
            duration: sessionData?.durationMs || 0,
            segments: JSON.stringify(sessionData?.segments || [])
        });

        const result = await generateJSON<any>(prompt, undefined);
        res.json({ success: true, data: result });
    } catch (error: any) {
        Logger.error('[AI] Recap Gen Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/ai/plan-session - Autonomous show planning
 */
router.post('/plan-session', async (req: AuthRequest, res: Response) => {
    try {
        const { topic, streamingContext, constraints } = req.body;
        const prompt = await promptService.get('studio/session_planner', {
            topic,
            streamingContext,
            constraints
        });

        const result = await generateJSON<any>(prompt, undefined);
        res.json({ success: true, data: result });
    } catch (error: any) {
        Logger.error('[AI] Session Plan Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/ai/video-workflow - Trigger a cinematic video generation workflow
 */
router.post('/video-workflow', async (req: AuthRequest, res: Response) => {
    try {
        const { topic, videoStyle, targetDuration, influencerId, productId } = req.body;
        const result = await videoWorkflow.run({
            topic,
            videoStyle,
            targetDuration: targetDuration || 60,
            language: req.query.lang as string || 'en-US',
            influencerId,
            productId
        });
        res.json({ success: true, data: result });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * GET /api/ai/trending-topics - Retrieve current trending topics and keywords
 */
router.get('/trending-topics', async (req: AuthRequest, res: Response) => {
    try {
        const lang = req.query.lang || 'en-US';
        const context = req.query.context || 'general';
        const prompt = await buildTrendingTopicsPrompt({
            context: context as string,
            lang: lang as string
        });
        const result = await generateJSON<any>(prompt, undefined);
        res.json({ success: true, data: result });
    } catch (error: any) {
        Logger.error('[AI] Trending Topics Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/ai/knowledge-search - Search live knowledge
 */
router.post('/knowledge-search', async (req: AuthRequest, res: Response) => {
    try {
        const { prompt: userPrompt, historicalContext, language, context } = req.body;
        const queryTerm = userPrompt || req.body.query;
        const prompt = await buildKnowledgeSearchPrompt({
            query: queryTerm,
            context,
            historicalContext,
            language
        });
        const result = await generateJSON<any>(prompt, undefined);
        res.json({ success: true, data: result });
    } catch (error: any) {
        Logger.error('[AI] Knowledge Search Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/ai/generate-poll - Generate an engaging poll
 */
router.post('/generate-poll', async (req: AuthRequest, res: Response) => {
    try {
        const { topic, context, directive } = req.body;
        const prompt = await buildGeneratePollPrompt({ topic, context, directive });
        const result = await generateJSON<any>(prompt, undefined);
        res.json({ success: true, data: result });
    } catch (error: any) {
        Logger.error('[AI] Generate Poll Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/ai/verify-fact - Fact check a statement
 */
router.post('/verify-fact', async (req: AuthRequest, res: Response) => {
    try {
        const { claim, context, strictness } = req.body;
        const prompt = await buildVerifyFactPrompt({ claim, context, strictness });
        const result = await generateJSON<any>(prompt, undefined);
        res.json({ success: true, data: result });
    } catch (error: any) {
        Logger.error('[AI] Verify Fact Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/ai/generate-dynamic-content - Seed initial session context data
 */
router.post('/generate-dynamic-content', async (req: AuthRequest, res: Response) => {
    try {
        const { context, topic, influencers, initial_stats } = req.body;
        
        // Use the generic session planner or a specific dynamic content prompt
        const prompt = await promptService.get('studio/dynamic_content_seed', {
            context: context || 'general',
            topic: topic || 'live show',
            influencers: JSON.stringify(influencers || []),
            initial_stats: JSON.stringify(initial_stats || {})
        });

        // Generate JSON response
        const result = await generateJSON<any>(prompt, undefined).catch(async () => {
             // Fallback logic if prompt is missing or generation fails
             return {
                 data: {
                    headlines: [
                        `Welcome to our ${topic} livestream!`,
                        `Special deals on ${context} items today`,
                        `Interact now for exclusive rewards`
                    ],
                    ticker: [
                        `Live from AntStudio | ${new Date().toLocaleDateString()}`,
                        `Limited time offer: Free shipping on all-in today`,
                        `New products arriving soon!`
                    ],
                    goals: [
                        `Engage with audience`,
                        `Highlight key features`
                    ]
                 }
             };
        });

        res.json({ success: true, data: result.data || result });
    } catch (error: any) {
        Logger.error('[AI] Dynamic Content Gen Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/ai/llm/completion
 * Unified endpoint for LLM completion using prompt templates.
 * Used by client-side services (FactChecker, VisualConcept, etc.)
 */
router.post('/llm/completion', async (req: AuthRequest, res) => {
    try {
        const { promptId, variables, systemPrompt, response_format, images } = req.body;
        
        let finalPrompt = req.body.prompt;
        if (promptId) {
            finalPrompt = await promptService.get(promptId, variables || {});
        }

        if (!finalPrompt) {
            return res.status(400).json({ success: false, error: 'Prompt or PromptId is required' });
        }

        const options = {
            systemPrompt,
            images: images || [],
            mode: response_format?.type === 'json_object' ? 'json' : 'text'
        };

        let result;
        if (options.mode === 'json') {
            result = await generateJSON(finalPrompt, undefined, options);
        } else {
            result = await generateText(finalPrompt, undefined, options);
        }

        res.json({ success: true, completion: typeof result === 'string' ? result : JSON.stringify(result) });
    } catch (error: any) {
        Logger.error('[AI/LLM] Completion Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
