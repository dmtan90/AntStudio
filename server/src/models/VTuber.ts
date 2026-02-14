import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IVTuber extends Document {
    userId: Types.ObjectId;
    organizationId?: Types.ObjectId;
    entityId: string; // The character name or specialized ID
    uuid?: string; // New UUID field
    entityType: 'character' | 'world' | 'style';

    // Core Identity
    identity: {
        name: string;
        description: string;
        traits: string[]; // ['stoic', 'sarcastic', 'tech-savvy']
        backstory?: string;
    };

    // Neural Memory
    memory: {
        summaries: string[]; // Historical session summaries
        keyEvents: Array<{
            missionId: string;
            description: string;
            date: Date;
        }>;
        knowledgeEntries: Array<{
            title: string;
            content: string;
        }>;
    };

    // Metadata & Config
    meta: {
        loras: Array<{
            id: string;      // e.g. "pixar_style"
            weight: number;   // 0.0 to 1.5
            trigger?: string; // "in style of pixar"
        }>;
        embeddings?: string[];
        voiceConfig?: {
            provider: string; // 'elevenlabs', 'openai', 'google'
            voiceId: string;
            voiceName?: string;
            language?: string; // 'en-US', 'vi-VN'
            settings?: any;
        };
    };

    // Visual Presence
    visual?: {
        modelType?: '3d' | 'live2d' | 'static';  // Model type selector
        modelUrl?: string;       // Unified model URL (replaces glbUrl, live2dModelUrl, avatarUrl)
        lastGenerated?: Date;
        
        // Live2D Specific Config
        live2dConfig?: {
            idleMotion?: string;   // Default idle animation name
            talkMotion?: string;   // Talking animation name
            scale?: number;        // Model scale (default 1.0)
            position?: { x: number; y: number }; // Model position offset
        };
        
        // Shared Fields
        backgroundUrl?: string;  // Custom or stock background image
        thumbnailUrl?: string;   // Auto-generated preview for model list
        previewVideoUrl?: string; // Auto-generated demo video
    };

    // Social Connectivity (Neural Bonds)
    social?: {
        relationships: Array<{
            targetId: string;    // ID of host or other guest
            targetName: string;
            type: 'friend' | 'rival' | 'mentor' | 'fan' | 'colleague' | 'stranger';
            level: number;       // Bond strength (0 to 100)
            description?: string; // e.g. "Trusted sidekick", "Professional competitor"
        }>;
    };

    // Performance Configuration (added for Audience Interaction)
    performanceConfig?: {
        auraEnabled?: boolean;
        auraColor?: string;
        particleType?: 'sakura' | 'snow' | 'glitter' | null;
        lightingPreset?: 'studio' | 'neon' | 'dramatic' | 'vocal_orange';
    };

    animationConfig?: {
        gestureIntensity?: number;
        headTiltRange?: number;
        nodIntensity?: number;
    };

    // Audience Analytics & History
    analytics?: {
        totalStreamTime?: number;
        totalInteractions?: number;
        engagementScore?: number;
        lastActive?: Date;
    };

    interactions?: Array<{
        type: 'chat' | 'gift' | 'poll' | 'qa';
        userName?: string;
        content?: string;
        response?: string;
        timestamp: Date;
        sentiment?: number;
    }>;

    preferences?: {
        autoReplyEnabled?: boolean;
        replyRate?: number; // 0-100%
        blockedKeywords?: string[];
        personalityCalibration?: {
            humor: number;
            empathy: number;
            sarcasm: number;
        };
    };

    lastUpdated: Date;
}

const VTuberSchema = new Schema<IVTuber>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    entityId: { type: String, required: true, index: true },
    uuid: { type: String, index: true }, // Added for UUID migration
    entityType: { type: String, enum: ['character', 'world', 'style'], default: 'character' },

    identity: {
        name: { type: String, required: true },
        description: String,
        traits: [String],
        backstory: String
    },

    memory: {
        summaries: [String],
        keyEvents: [{
            missionId: String,
            description: String,
            date: { type: Date, default: Date.now }
        }],
        knowledgeEntries: [{
            title: String,
            content: String
        }]
    },

    meta: {
        loras: [{
            id: String,
            weight: { type: Number, default: 1.0 },
            trigger: String
        }],
        embeddings: [String],
        voiceConfig: {
            provider: { type: String, default: 'gemini' },
            voiceId: String,
            voiceName: String,
            language: { type: String, default: 'en-US' },
            settings: Schema.Types.Mixed
        }
    },

    visual: {
        modelType: { type: String, enum: ['3d', 'live2d', 'static'], default: '3d' },
        modelUrl: String,
        lastGenerated: Date,
        
        // Live2D Fields
        live2dConfig: {
            idleMotion: String,
            talkMotion: String,
            scale: { type: Number, default: 1.0 },
            position: {
                x: { type: Number, default: 0 },
                y: { type: Number, default: 0 }
            }
        },
        
        // Shared Fields
        backgroundUrl: String,
        thumbnailUrl: String,
        previewVideoUrl: String
    },

    social: {
        relationships: [{
            targetId: String,
            targetName: String,
            type: { type: String, enum: ['friend', 'rival', 'mentor', 'fan', 'colleague', 'stranger'], default: 'stranger' },
            level: { type: Number, default: 0 },
            description: String
        }]
    },

    performanceConfig: {
        auraEnabled: { type: Boolean, default: false },
        auraColor: { type: String, default: '#00f2ff' },
        particleType: { type: String, enum: ['sakura', 'snow', 'glitter', null], default: null },
        lightingPreset: { type: String, enum: ['studio', 'neon', 'dramatic', 'vocal_orange'], default: 'studio' }
    },

    animationConfig: {
        gestureIntensity: { type: Number, default: 1.0 },
        headTiltRange: { type: Number, default: 1.0 },
        nodIntensity: { type: Number, default: 1.0 }
    },

    analytics: {
        totalStreamTime: { type: Number, default: 0 },
        totalInteractions: { type: Number, default: 0 },
        engagementScore: { type: Number, default: 0 },
        lastActive: Date
    },

    interactions: [{
        type: { type: String, enum: ['chat', 'gift', 'poll', 'qa'] },
        userName: String,
        content: String,
        response: String,
        timestamp: { type: Date, default: Date.now },
        sentiment: Number
    }],

    preferences: {
        autoReplyEnabled: { type: Boolean, default: false },
        replyRate: { type: Number, default: 50 },
        blockedKeywords: [String],
        personalityCalibration: {
            humor: { type: Number, default: 0.5 },
            empathy: { type: Number, default: 0.8 },
            sarcasm: { type: Number, default: 0.1 }
        }
    },

    lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

// Ensure unique VTuber per entity within a user/org context
VTuberSchema.index({ userId: 1, entityId: 1 }, { unique: true });

export const VTuber = mongoose.model<IVTuber>('VTuber', VTuberSchema);
