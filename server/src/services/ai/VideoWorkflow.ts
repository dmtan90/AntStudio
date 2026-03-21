import { WorkflowEngine, WorkflowNode } from './WorkflowEngine.js';
import { promptService } from '../PromptService.js';
import { generateText, generateJSON } from '../../utils/AIGenerator.js';
import { projectContext } from '../../utils/ProjectContext.js';
import { generateStoryboardIteratively } from '../iterativeStoryboard.js';
import { Logger } from '../../utils/Logger.js';

export interface VideoContext {
    topic: string;
    videoStyle: string;
    targetDuration: number;
    language: string;
    technicalGrounding?: string;
    influencerId?: string;
    productId?: string;
    
    // Result State
    script?: string;
    analysis?: any;
    storyboard?: any;
    
    // Workflow State
    // Workflow State
    currentStage: 'script' | 'analysis' | 'character' | 'storyboard' | 'completed';
    logs: string[];
    useGreenScreen?: boolean;
    referenceImages?: string[];
    autonomous?: boolean;
}

/**
 * Node: Script Generation
 */
const scriptNode: WorkflowNode<VideoContext> = async (context) => {
    const logs = ['[Writer] Starting script drafting...'];
    const technicalGrounding = await projectContext.getTechnicalGroundingPrompt();
    
    // Fetch Influencer for persona
    let personaContext = '';
    if (context.influencerId) {
        const { Influencer } = await import('../../models/Influencer.js');
        const influencer = await Influencer.findOne({ entityId: context.influencerId });
        if (influencer) {
            personaContext = `Influencer Persona: ${influencer.identity.name}. 
                             Traits: ${influencer.identity.traits.join(', ')}. 
                             Background: ${influencer.identity.description}.
                             Role: ${influencer.jobRole || 'Influencer'}`;
            context.useGreenScreen = influencer.visual?.modelType === 'aidol';
            logs.push(`[Writer] Persona locked: ${influencer.identity.name} (${influencer.jobRole})`);
            if (context.useGreenScreen) {
                logs.push('[Writer] Aidol model detected. Fast-tracking Green Screen layout.');
            }
        }
    }

    // Fetch Product for grounding
    let productContext = '';
    if (context.productId) {
         const { Product } = await import('../../models/Product.js');
         const product = await Product.findById(context.productId);
         if (product) {
             productContext = `Product Focus: ${product.name}. 
                              Description: ${product.description}. 
                              Price: ${product.price} ${product.currency}.
                              Features: ${product.features.join(', ')}`;
             context.referenceImages = [product.image, ...(product.images || [])].filter(Boolean);
             logs.push(`[Writer] Product grounding: ${product.name} (${context.referenceImages.length} images)`);
         }
    }

    const prompt = await promptService.get('video_creation/script_gen', {
        topic: context.topic,
        videoStyle: context.videoStyle,
        technicalGrounding: technicalGrounding || '',
        personaContext,
        productContext,
        targetDuration: context.targetDuration,
        language: context.language,
        useGreenScreen: context.useGreenScreen
    });

    const script = await generateText(prompt, undefined);
    logs.push('[Writer] Persona-driven screenplay completed.');

    return {
        next: 'review',
        updates: { script, currentStage: 'analysis' },
        logs
    };
};

/**
 * Node: Script Review (Self-Correction)
 */
const reviewNode: WorkflowNode<VideoContext> = async (context) => {
    const logs = ['[Critic] Evaluating script quality...'];
    const technicalGrounding = await projectContext.getTechnicalGroundingPrompt();

    const prompt = await promptService.get('video_creation/script_review', {
        script: context.script,
        topic: context.topic,
        videoStyle: context.videoStyle,
        targetDuration: context.targetDuration,
        technicalGrounding: technicalGrounding || ''
    });

    try {
        const review = await generateJSON<any>(prompt, undefined);
        logs.push(`[Critic] Review complete. Score: ${review.score}. Status: ${review.status.toUpperCase()}`);

        if (review.status === 'fail' && !context.logs.includes('[Critic] Loopback triggered.')) {
            logs.push(`[Critic] Loopback triggered. Reason: ${review.feedback}`);
            return {
                next: 'script', // Loop back to script generation
                updates: { topic: `${context.topic} (Refinement needed: ${review.feedback})` },
                logs
            };
        }

        logs.push('[Critic] Script passed automated review.');
        return {
            next: context.autonomous ? 'analysis' : null, 
            updates: { currentStage: 'analysis' },
            logs
        };
    } catch (error) {
        logs.push(`[Critic] Review failed: ${error}. Proceeding anyway.`);
        return { next: context.autonomous ? 'analysis' : null, updates: { currentStage: 'analysis' }, logs };
    }
};

/**
 * Node: Vision Analysis (with Expert Consensus)
 */
const analysisNode: WorkflowNode<VideoContext> = async (context) => {
    const logs = ['[Director] Analyzing script for cinematic vision...'];
    const technicalGrounding = await projectContext.getTechnicalGroundingPrompt();

    // 1. Initial Vision Analysis
    const visionPrompt = await promptService.get('video_creation/vision_analysis', {
        language: context.language,
        technicalGrounding: technicalGrounding || '',
        script: context.script,
        videoStyle: context.videoStyle
    });

    const visionResult = await generateJSON<any>(visionPrompt, undefined);
    logs.push('[Director] Initial vision analysis complete.');

    // 2. Expert Board Review
    logs.push('[Board] Convening Expert Board (Cinematographer & Script Editor)...');
    const expertPrompt = await promptService.get('video_creation/expert_feedback', {
        script: context.script,
        analysis: JSON.stringify(visionResult)
    });

    try {
        const expertResult = await generateJSON<any>(expertPrompt, undefined);
        (expertResult.expertFeedback || []).forEach((fb: any) => {
            logs.push(`[${fb.expert}] ${fb.message}`);
            if (fb.suggestion) {
                logs.push(`[${fb.expert}] Suggestion: ${fb.suggestion}`);
            }
        });

        // Add expert feedback to final analysis result
        visionResult.expertFeedback = expertResult.expertFeedback;
        logs.push('[Director] Vision finalized with Expert Consensus.');
    } catch (error) {
        logs.push(`[Board] Expert review failed: ${error}. Proceeding with initial vision.`);
    }

    return {
        next: 'character', // Transition to character design after analysis
        updates: { analysis: visionResult, currentStage: 'character' },
        logs
    };
};

/**
 * Node: Character Design (Actor Stability)
 */
const characterNode: WorkflowNode<VideoContext> = async (context) => {
    const logs = ['[Artist] Designing character visual references...'];
    
    const prompt = await promptService.get('video_creation/character_design', {
        script: context.script
    });

    try {
        const result = await generateJSON<any>(prompt, undefined);
        const charCount = result.characters?.length || 0;
        logs.push(`[Artist] Designed reference sheets for ${charCount} characters.`);
        
        // Merge characters into analysis for consumption by storyboard
        const updatedAnalysis = { 
            ...(context.analysis || {}), 
            characters: result.characters 
        };

        return {
            next: context.autonomous ? 'storyboard' : null,
            updates: { analysis: updatedAnalysis, currentStage: 'storyboard' },
            logs
        };
    } catch (error) {
        logs.push(`[Artist] Character design failed: ${error}.`);
        return { next: context.autonomous ? 'storyboard' : null, updates: { currentStage: 'storyboard' }, logs };
    }
};

/**
 * Node: Storyboard Generation
 */
const storyboardNode: WorkflowNode<VideoContext> = async (context) => {
    const logs = ['[Artist] Sketching storyboard segments...'];
    
    const storyboard = await generateStoryboardIteratively(
        context.script || context.topic,
        context.analysis?.analysis || context.analysis || {},
        context.targetDuration,
        context.language,
        context.useGreenScreen
    );

    logs.push('[Artist] Storyboard generation finished.');

    return {
        next: null,
        updates: { storyboard, currentStage: 'completed' },
        logs
    };
};

/**
 * Video Workflow Orchestrator
 */
export class VideoWorkflow {
    private engine: WorkflowEngine<VideoContext>;

    constructor() {
        this.engine = new WorkflowEngine<VideoContext>({
            nodes: {
                script: scriptNode,
                review: reviewNode,
                analysis: analysisNode,
                character: characterNode,
                storyboard: storyboardNode
            },
            initialNode: 'script'
        });
    }

    public async run(initialContext: Partial<VideoContext>, stage?: string): Promise<VideoContext> {
        const fullContext: VideoContext = {
            topic: '',
            videoStyle: 'Cinematic',
            targetDuration: 60,
            language: 'English',
            currentStage: 'script',
            logs: [],
            ...initialContext
        } as VideoContext;

        const startNode = stage || 'script';

        return await this.engine.execute(fullContext, startNode, (nodeName, logs) => {
            // Keep track of logs in context
            fullContext.logs.push(...logs);
        });
    }
}

export const videoWorkflow = new VideoWorkflow();
