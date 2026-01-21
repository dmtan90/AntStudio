import mongoose, { Schema, Document, Model, Types } from 'mongoose'

interface ISegment {
    _id: Types.ObjectId
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
        s3Url: string
        status: 'pending' | 'generating' | 'completed' | 'failed'
        veoJobId?: string
        generatedAt?: Date
        duration?: number
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
        s3Url: String,
        status: {
            type: String,
            enum: ['pending', 'generating', 'completed', 'failed'],
            default: 'pending'
        },
        veoJobId: String,
        generatedAt: Date,
        duration: Number
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
        base_speaking_rate?: number
        base_pitch?: number
        style_category?: string
    }
    referenceImage?: string
}

export interface IProject extends Document {
    userId: Types.ObjectId
    title: string
    description: string
    mode: 'topic' | 'upload'
    input: {
        topic?: string
        scriptFile?: {
            originalName: string
            s3Key: string
            s3Url: string
            fileType: 'txt' | 'pdf' | 'docx' | 'pptx'
            uploadedAt: Date
        }
    }
    scriptAnalysis?: {
        summary: string
        genre: string
        mood: string
        characters: IDetailedCharacter[]
        locations: Array<{
            name: string
            description: string
            referenceImage?: string
        }>
        themes: string[]
        language?: string
        analyzedAt: Date
    }
    storyboard?: {
        segments: ISegment[]
        totalDuration: number
        createdAt: Date
        updatedAt: Date
    }
    finalVideo?: {
        s3Key: string
        s3Url: string
        duration: number
        resolution: string
        fileSize: number
        backgroundMusic?: {
            s3Key: string
            s3Url: string
            volume: number
        }
        subtitles?: {
            enabled: boolean
            s3Key?: string
            s3Url?: string
        }
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
    aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3'
    videoStyle?: string
    targetDuration?: number
    status: 'draft' | 'analyzing' | 'storyboard' | 'generating' | 'editing' | 'completed'
    chatHistory?: Array<{
        author: 'user' | 'ai' | 'system'
        content?: string
        type?: 'text' | 'thinking' | 'result' | 'visual-guide' | 'visual-path' | 'visual-assets'
        result?: any
        files?: Array<{ name: string, url?: string }>
        timestamp?: Date
    }>
    creativeBrief?: {
        visualStyle: string
        artDirection: string
        colorPalette: string[]
        lightingValues: string
        generatedAt: Date
    }
    visualAssets?: Array<{
        name: string
        description: string
        type: 'image' | 'video' | 'audio'
        status: 'pending' | 'ready' | 'error'
        url?: string
        s3Key?: string
        metadata?: any
        createdAt: Date
    }>
    scriptContent?: string
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
            enum: ['topic', 'upload'],
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
                s3Url: String,
                fileType: {
                    type: String,
                    enum: ['txt', 'pdf', 'docx', 'pptx']
                },
                uploadedAt: Date
            }
        },
        scriptAnalysis: {
            summary: String,
            genre: String,
            mood: String,
            characters: [
                {
                    char_id: String,
                    name: String,
                    description: String,
                    species: String,
                    gender: String,
                    age: String,
                    voice_personality: String,
                    body_build: String,
                    face_shape: String,
                    hair: String,
                    skin_or_fur_color: String,
                    signature_feature: String,
                    outfit_top: String,
                    outfit_bottom: String,
                    helmet_or_hat: String,
                    shoes_or_footwear: String,
                    props: String,
                    body_metrics: String,
                    color_spec: { type: Schema.Types.Mixed, default: {} },
                    tts_config: {
                        voice_id: String,
                        base_speaking_rate: Number,
                        base_pitch: Number,
                        style_category: String
                    },
                    referenceImage: String
                }
            ],
            locations: [
                {
                    name: String,
                    description: String,
                    referenceImage: String
                }
            ],
            themes: [String],
            language: String,
            analyzedAt: Date
        },
        storyboard: {
            segments: [SegmentSchema],
            totalDuration: Number,
            createdAt: Date,
            updatedAt: Date
        },
        finalVideo: {
            s3Key: String,
            s3Url: String,
            duration: Number,
            resolution: String,
            fileSize: Number,
            backgroundMusic: {
                s3Key: String,
                s3Url: String,
                volume: { type: Number, default: 0.5 }
            },
            subtitles: {
                enabled: { type: Boolean, default: false },
                s3Key: String,
                s3Url: String
            },
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
            enum: ['draft', 'analyzing', 'storyboard', 'generating', 'editing', 'completed'],
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
                        url: String
                    }
                ],
                timestamp: { type: Date, default: Date.now }
            }
        ],
        creativeBrief: {
            visualStyle: String,
            artDirection: String,
            colorPalette: [String],
            lightingValues: String,
            generatedAt: Date
        },
        visualAssets: [
            {
                name: String,
                description: String,
                type: { type: String, enum: ['image', 'video', 'audio'], default: 'image' },
                status: { type: String, enum: ['pending', 'ready', 'error'], default: 'pending' },
                url: String,
                s3Key: String,
                metadata: Schema.Types.Mixed,
                createdAt: { type: Date, default: Date.now }
            }
        ],
        scriptContent: String
    },
    {
        timestamps: true
    }
)

// Indexes
ProjectSchema.index({ userId: 1, createdAt: -1 })
ProjectSchema.index({ status: 1 })

export const Project: Model<IProject> = mongoose.models.Project || mongoose.model<IProject>('Project', ProjectSchema)
