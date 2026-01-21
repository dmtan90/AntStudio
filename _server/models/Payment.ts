import mongoose, { Schema, Document, Model, Types } from 'mongoose'

export interface IPayment extends Document {
    userId: Types.ObjectId
    amount: number
    currency: string
    status: 'pending' | 'completed' | 'failed' | 'refunded'
    type: 'subscription' | 'one-time'
    plan?: string
    stripePaymentIntentId?: string
    stripeInvoiceId?: string
    metadata?: Record<string, any>
    createdAt: Date
    updatedAt: Date
}

const PaymentSchema = new Schema<IPayment>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        amount: {
            type: Number,
            required: true
        },
        currency: {
            type: String,
            required: true,
            default: 'usd'
        },
        status: {
            type: String,
            enum: ['pending', 'completed', 'failed', 'refunded'],
            default: 'pending',
            index: true
        },
        type: {
            type: String,
            enum: ['subscription', 'one-time'],
            required: true
        },
        plan: String,
        stripePaymentIntentId: String,
        stripeInvoiceId: String,
        metadata: Schema.Types.Mixed
    },
    {
        timestamps: true
    }
)

// Indexes
PaymentSchema.index({ userId: 1, createdAt: -1 })
PaymentSchema.index({ status: 1, createdAt: -1 })

export const Payment: Model<IPayment> = mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema)
