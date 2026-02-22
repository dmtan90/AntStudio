import mongoose, { Schema, Document } from 'mongoose';

export interface IOrder extends Document {
  userId: string;
  organizationId?: string;
  customerName: string;
  productName: string;
  productId?: string;
  amount: number;
  currency: string;
  source: 'live' | 'video' | 'store';
  status: 'pending' | 'shipped' | 'delivered' | 'cancelled';
  sessionId?: string;
  createdAt: Date;
}

const OrderSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
  customerName: { type: String, required: true },
  productName: { type: String, required: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product' },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  source: { type: String, enum: ['live', 'video', 'store'], default: 'store' },
  status: { type: String, enum: ['pending', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
  sessionId: { type: String, index: true },
  createdAt: { type: Date, default: Date.now }
});

export const Order = mongoose.model<IOrder>('Order', OrderSchema);
