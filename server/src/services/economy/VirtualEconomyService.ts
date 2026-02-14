import { EventEmitter } from 'events';
import { socketServer } from '../SocketServer.js';
import { Wallet } from '../../models/Wallet.js';
import { Transaction } from '../../models/Transaction.js';
import mongoose from 'mongoose';

export interface EconomyItem {
    id: string;
    type: 'gift' | 'sticker' | 'powerup';
    name: string;
    cost: number;
    icon: string;
    effectId?: string; // Links to client-side visual effects
    description: string;
}

export interface UserWallet {
    userId: string;
    balance: number;
    inventory: string[]; // Item IDs
}

class VirtualEconomyService extends EventEmitter {
    private catalog: EconomyItem[] = [];

    constructor() {
        super();
        this.initializeCatalog();
    }

    private initializeCatalog() {
        this.catalog = [
            // Gifts (Trigger Animations)
            { id: 'gift_coffee', type: 'gift', name: 'Coffee', cost: 50, icon: '☕', effectId: 'anim_coffee', description: 'Buy the host a coffee' },
            { id: 'gift_rose', type: 'gift', name: 'Rose', cost: 10, icon: '🌹', effectId: 'anim_rose', description: 'Show some love' },
            { id: 'gift_rocket', type: 'gift', name: 'Rocket', cost: 500, icon: '🚀', effectId: 'anim_rocket', description: 'To the moon!' },
            
            // Stickers (Chat/Overlay)
            { id: 'sticker_gg', type: 'sticker', name: 'GG', cost: 25, icon: '👾', description: 'Good Game sticker' },
            { id: 'sticker_fire', type: 'sticker', name: 'Fire', cost: 25, icon: '🔥', description: 'This is fire!' },

            // Director Powerups (Functionality)
            { id: 'power_sfx', type: 'powerup', name: 'SFX Access', cost: 1000, icon: '🔊', description: 'Unlock SFX panel for 5 mins' }
        ];
    }

    public getCatalog(): EconomyItem[] {
        return this.catalog;
    }

    public async getWallet(userId: string): Promise<UserWallet> {
        let wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            wallet = await Wallet.create({
                userId,
                balance: 100, // Starting bonus
                inventory: []
            });
        }
        return {
            userId: wallet.userId,
            balance: wallet.balance,
            inventory: wallet.inventory
        };
    }

    public async addCredits(userId: string, amount: number) {
        const wallet = await Wallet.findOneAndUpdate(
            { userId },
            { $inc: { balance: amount } },
            { new: true, upsert: true }
        );

        // Log transaction
        await Transaction.create({
            userId: new mongoose.Types.ObjectId(userId),
            type: 'credit_add',
            amount: amount,
            currency: '₵',
            status: 'completed',
            gateway: 'economy',
            metadata: {
                credits: amount
            }
        });

        this.emitBalanceUpdate(userId, wallet);
    }

    public async purchaseItem(userId: string, itemId: string): Promise<{ success: boolean; message: string }> {
        const item = this.catalog.find(i => i.id === itemId);
        if (!item) return { success: false, message: 'Item not found' };

        // Atomic update with balance check
        const wallet = await Wallet.findOneAndUpdate(
            { userId, balance: { $gte: item.cost } },
            { 
                $inc: { balance: -item.cost },
                ...(item.type !== 'gift' ? { $push: { inventory: itemId } } : {})
            },
            { new: true }
        );

        if (!wallet) return { success: false, message: 'Insufficient funds or wallet not found' };

        // Log transaction
        await Transaction.create({
            userId: new mongoose.Types.ObjectId(userId),
            type: 'economy_purchase',
            amount: item.cost,
            currency: '₵',
            status: 'completed',
            gateway: 'economy',
            metadata: {
                packageId: itemId
            }
        });

        if (item.type === 'gift') {
            // Broadcast gift event immediately for real-time overlays
            socketServer.emitToAll('economy:gift_received', { 
                senderId: userId, 
                item: item 
            });
        }

        this.emitBalanceUpdate(userId, wallet);
        return { success: true, message: `Purchased ${item.name}` };
    }

    private emitBalanceUpdate(userId: string, wallet: any) {
        socketServer.emitToUser(userId, 'economy:balance_update', {
            userId: wallet.userId,
            balance: wallet.balance,
            inventory: wallet.inventory
        });
    }
}

export const virtualEconomyService = new VirtualEconomyService();
