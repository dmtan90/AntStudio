import mongoose, { Schema, Document, Model, Types } from 'mongoose'

interface ISegment {
    _id: Types.ObjectId
    uuid?: string
    order: number
    title: string
    description: string
    duration: number // in seconds
    voiceover: string
    cameraAngle: string
    mood: string
    style: string
    characters: string[]
    location: string
    visualKeywords: string[]
    audioKeywords: string[]
    locationDetails?: {
        type: string
        objects: string
        layout: string
        atmosphere: string
        visualStyle: string
        lighting: string
    }
    cameraDetails?: {
        framing: string
        angle: string
        movement: string
        focus: string
    }
    audioDetails?: {
        ambience: string
        sfx: string
        music: string
    }
    detailedDialogue?: Array<{
        characterId: string
        characterName: string
        line: string
        language: string
        tts_config?: {
            voice_id: string
            provider?: string
            rate: number
            pitch: number
        }
        delivery: string
        style: string
        timing: string
    }>
    lipSyncRequired?: boolean
    sceneImage?: string
    speed?: number // 0.1 to 10
    volume?: number // 0 to 1
    generatedVideo?: {
        s3Key: string
        status: 'pending' | 'generating' | 'completed' | 'failed'
        veoJobId?: string
        generatedAt?: Date
        duration?: number
    }
    generatedAudio?: {
        s3Key: string
        status: 'pending' | 'generating' | 'completed' | 'failed'
        generatedAt?: Date
    }
}

const SegmentSchema = new Schema<ISegment>({
    order: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    duration: { type: Number, required: true },
    voiceover: { type: String, required: true },
    cameraAngle: {
        type: String,
        default: 'medium'
    },
    mood: { type: String, required: true },
    style: { type: String, required: true },
    characters: [{ type: String }],
    location: { type: String, required: true },
    visualKeywords: [{ type: String }],
    audioKeywords: [{ type: String }],
    locationDetails: { type: Schema.Types.Mixed, default: {} },
    cameraDetails: { type: Schema.Types.Mixed, default: {} },
    audioDetails: { type: Schema.Types.Mixed, default: {} },
    detailedDialogue: [
        {
            characterId: String,
            characterName: String,
            line: String,
            language: String,
            tts_config: {
                voice_id: String,
                provider: String,
                rate: Number,
                pitch: Number
            },
            delivery: String,
            style: String,
            timing: String
        }
    ],
    lipSyncRequired: { type: Boolean, default: false },
    sceneImage: String,
    speed: { type: Number, default: 1 },
    volume: { type: Number, default: 1 },
    generatedVideo: {
        s3Key: String,
        status: {
            type: String,
            enum: ['pending', 'generating', 'completed', 'failed'],
            default: 'pending'
        },
        veoJobId: String,
        generatedAt: Date,
        duration: Number
    },
    generatedAudio: {
        s3Key: String,
        status: {
            type: String,
            enum: ['pending', 'generating', 'completed', 'failed'],
            default: 'pending'
        },
        generatedAt: Date
    }
})

export interface IDetailedCharacter {
    char_id?: string
    name: string
    description: string
    species?: string
    gender?: string
    age?: string
    voice_personality?: string
    body_build?: string
    face_shape?: string
    hair?: string
    eyes?: string
    skin_or_fur_color?: string
    signature_feature?: string
    outfit_top?: string
    outfit_bottom?: string
    helmet_or_hat?: string
    shoes_or_footwear?: string
    props?: string
    body_metrics?: string
    color_spec?: {
        primary_body?: { hex: string; natural: string; coverage: string }
        clothing_primary?: { hex: string; natural: string; coverage: string }
        clothing_accent?: { hex: string; natural: string; coverage: string }
    }
    tts_config?: {
        voice_id?: string
        provider?: string
        base_speaking_rate?: number
        base_pitch?: number
        style_category?: string
    }
    referenceImage?: string
}

export interface IProject extends Document {
    userId: Types.ObjectId
    organizationId?: Types.ObjectId // Shared Team Context
    collaborators?: Array<{
        userId: Types.ObjectId;
        role: 'viewer' | 'editor' | 'admin';
        addedAt: Date;
    }>
    title: string
    description: string
    mode: 'topic' | 'upload' | 'avatar' | 'template' | 'blank' | 'livestream'
    aspectRatio: '16:9' | '9:16' | '1:1' | '4:3'
    videoStyle: string
    targetDuration: number
    input: {
        topic?: string
        scriptFile?: {
            originalName: string
            s3Key: string
            fileType: 'txt' | 'pdf' | 'docx' | 'pptx'
            uploadedAt: Date
        }
    }
    scriptAnalysis?: any
    storyboard?: any
    scripts?: any
    musics: Array<{
        id?: string
        s3Key: string
        volume: number
    }>
    subtitles: Array<{
        id?: string
        enabled: boolean
        language: string
        s3Key?: string
    }>
    publish?: {
        s3Key: string
        reviewKey?: string
        thumbnailKey?: string
        previewKey?: string
        duration: number
        resolution: string
        fileSize: number
        generatedAt: Date
    }
    publishing?: {
        youtube?: {
            videoId: string
            url: string
            publishedAt: Date
            status: string
        }
        facebook?: {
            videoId: string
            url: string
            publishedAt: Date
            status: string
        }
    }
    status: 'draft' | 'analyzing' | 'storyboard' | 'generating' | 'editing' | 'completed' | 'failed'
    chatHistory?: Array<{
        author: 'user' | 'ai' | 'system'
        content?: string
        type?: 'text' | 'thinking' | 'result' | 'visual-guide' | 'visual-path' | 'visual-assets'
        result?: any
        files?: Array<{ name: string, s3Key?: string }>
        timestamp?: Date
    }>
    creativeBrief?: any
    visualAssets?: Array<{
        _id?: string | any // Types.ObjectId
        name: string
        description: string
        type: 'image' | 'video' | 'audio'
        status: 'pending' | 'ready' | 'error'
        s3Key?: string
        metadata?: any
        createdAt: Date
    }>
    pages?: any //pages in editor templates
    scriptContent?: string // Legacy or raw input
    metadata?: any
    analytics?: {
        viewCount: number
        peakViewers?: number
        shareCount: number
        likeCount: number
        dislikeCount: number
        assemblyTime?: number // time in ms
        lastViewedAt?: Date
    }
    createdAt: Date
    updatedAt: Date
}

const ProjectSchema = new Schema<IProject>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        organizationId: {
            type: Schema.Types.ObjectId,
            ref: 'Organization',
            index: true
        },
        collaborators: [
            {
                userId: { type: Schema.Types.ObjectId, ref: 'User' },
                role: { type: String, enum: ['viewer', 'editor', 'admin'], default: 'viewer' },
                addedAt: { type: Date, default: Date.now }
            }
        ],
        title: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            trim: true
        },
        mode: {
            type: String,
            enum: ['topic', 'upload', 'avatar', 'template', 'blank', 'livestream'],
            required: true
        },
        aspectRatio: {
            type: String,
            enum: ['16:9', '9:16', '1:1', '4:3'],
            default: '16:9'
        },
        videoStyle: {
            type: String,
            default: 'cinematic'
        },
        targetDuration: {
            type: Number,
            default: 60
        },
        input: {
            topic: String,
            scriptFile: {
                originalName: String,
                s3Key: String,
                fileType: {
                    type: String,
                    enum: ['txt', 'pdf', 'docx', 'pptx']
                },
                uploadedAt: Date
            }
        },
        scriptAnalysis: { type: Schema.Types.Mixed, default: {} },
        storyboard: { type: Schema.Types.Mixed, default: {} },
        scripts: { type: Schema.Types.Mixed, default: {} },
        musics: [{
            id: String,
            s3Key: String,
            volume: { type: Number, default: 0.5 }
        }],
        subtitles: [{
            id: String,
            enabled: { type: Boolean, default: false },
            language: String,
            s3Key: String
        }],
        publish: {
            s3Key: String,
            reviewKey: String,
            thumbnailKey: String,
            previewKey: String,
            duration: Number,
            resolution: String,
            fileSize: Number,
            generatedAt: Date
        },
        publishing: {
            youtube: {
                videoId: String,
                url: String,
                publishedAt: Date,
                status: String
            },
            facebook: {
                videoId: String,
                url: String,
                publishedAt: Date,
                status: String
            }
        },
        status: {
            type: String,
            enum: ['draft', 'analyzing', 'storyboard', 'generating', 'editing', 'completed', 'failed'],
            default: 'draft'
        },
        chatHistory: [
            {
                author: { type: String, required: true },
                content: String,
                type: { type: String },
                result: Schema.Types.Mixed,
                files: [
                    {
                        name: String,
                        s3Key: String
                    }
                ],
                timestamp: { type: Date, default: Date.now }
            }
        ],
        creativeBrief: { type: Schema.Types.Mixed, default: {} },
        visualAssets: [
            {
                name: String,
                description: String,
                type: { type: String, enum: ['image', 'video', 'audio'], default: 'image' },
                status: { type: String, enum: ['pending', 'ready', 'error'], default: 'pending' },
                s3Key: String,
                metadata: Schema.Types.Mixed,
                createdAt: { type: Date, default: Date.now }
            }
        ],
        pages: { type: Schema.Types.Mixed, default: null },
        scriptContent: String,
        metadata: { type: Schema.Types.Mixed, default: {} },
        analytics: {
            viewCount: { type: Number, default: 0 },
            peakViewers: { type: Number, default: 0 },
            shareCount: { type: Number, default: 0 },
            likeCount: { type: Number, default: 0 },
            dislikeCount: { type: Number, default: 0 },
            assemblyTime: Number,
            lastViewedAt: Date
        }
    },
    {
        timestamps: true
    }
)

// Indexes for performance
ProjectSchema.index({ userId: 1, createdAt: -1 }); // User's project list (most common query)
ProjectSchema.index({ organizationId: 1, status: 1 }); // Organization project filtering
ProjectSchema.index({ status: 1, updatedAt: -1 }); // Status-based queries with recency
ProjectSchema.index({ 'storyboard.segments.generatedVideo.jobId': 1 }, { sparse: true }); // Job lookup

export const Project: Model<IProject> = mongoose.models.Project || mongoose.model<IProject>('Project', ProjectSchema)
