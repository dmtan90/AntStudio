import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IMedia extends Document {
    userId: mongoose.Types.ObjectId
    key: string
    fileName: string
    contentType: string
    size: number
    bucket: string
    purpose: string // e.g., 'avatar', 'project_asset'
    createdAt: Date
    updatedAt: Date
}

const MediaSchema = new Schema<IMedia>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        key: {
            type: String,
            required: true,
            unique: true
        },
        fileName: {
            type: String,
            required: true
        },
        contentType: {
            type: String,
            required: true
        },
        size: {
            type: Number,
            required: true
        },
        bucket: {
            type: String,
            required: true
        },
        purpose: {
            type: String,
            default: 'general'
        }
    },
    {
        timestamps: true
    }
)

// Indexes
MediaSchema.index({ userId: 1 })

export const Media: Model<IMedia> = mongoose.models.Media || mongoose.model<IMedia>('Media', MediaSchema)
