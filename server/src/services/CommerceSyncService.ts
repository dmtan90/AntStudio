import { Order, IOrder } from '../models/Order.js';
import { systemLogger } from '../utils/systemLogger.js';

/**
 * CommerceSyncService handles real-time order aggregation from external platforms
 * and internal store transactions during live sessions.
 */
export class CommerceSyncService {
    private static instance: CommerceSyncService;
    private activeSessionsOrders: Map<string, number> = new Map();
    private socketServer: any = null;

    private constructor() {}

    public static getInstance(): CommerceSyncService {
        if (!CommerceSyncService.instance) {
            CommerceSyncService.instance = new CommerceSyncService();
        }
        return CommerceSyncService.instance;
    }

    /**
     * Set the socket server instance for broadcasting
     */
    public setSocketServer(server: any) {
        this.socketServer = server;
    }

    /**
     * Record an order from an external platform (Webhook or Polling source)
     */
    public async recordExternalOrder(data: {
        userId: string;
        sessionId: string;
        customerName: string;
        productName: string;
        productId?: string;
        amount: number;
        currency: string;
        platform: string;
    }) {
        try {
            const order: any = await Order.create({
                userId: data.userId,
                customerName: data.customerName,
                productName: data.productName,
                productId: data.productId,
                amount: data.amount,
                currency: data.currency,
                source: 'live',
                status: 'pending'
            });

            // Store session metadata separately if needed
            if (order) {
                order.sessionId = data.sessionId;
                order.platform = data.platform;
            }

            // Broadcast to the specific studio room for real-time UI updates
            if (this.socketServer && order) {
                this.socketServer.to(data.sessionId).emit('commerce:order_recorded', {
                    orderId: order._id.toString(),
                    customerName: data.customerName,
                    productName: data.productName,
                    amount: data.amount,
                    currency: data.currency
                });
            }

            systemLogger.info(`[Commerce] Order recorded for session ${data.sessionId}: ${data.amount} ${data.currency}`, 'CommerceSyncService');
            return order;
        } catch (error: any) {
            systemLogger.error(`[Commerce] Failed to record order: ${error.message}`, 'CommerceSyncService');
            throw error;
        }
    }

    /**
     * Get aggregated commercial report for a session
     */
    public async getSessionCommercialReport(sessionId: string) {
        try {
            const orders = await Order.find({ 'metadata.sessionId': sessionId });
            
            const totalRevenue = orders.reduce((sum, order) => sum + order.amount, 0);
            const orderCount = orders.length;
            
            const productSales: Record<string, { count: number, revenue: number }> = {};
            orders.forEach(order => {
                if (!productSales[order.productName]) {
                    productSales[order.productName] = { count: 0, revenue: 0 };
                }
                productSales[order.productName].count += 1;
                productSales[order.productName].revenue += order.amount;
            });

            return {
                sessionId,
                totalRevenue,
                totalOrders: orderCount,
                currency: orders[0]?.currency || 'USD',
                topSellingProducts: Object.entries(productSales)
                    .map(([name, stats]) => ({ name, ...stats }))
                    .sort((a, b) => b.revenue - a.revenue)
                    .slice(0, 3)
            };
        } catch (error: any) {
            systemLogger.error(`[Commerce] Failed to generate report: ${error.message}`, 'CommerceSyncService');
            return null;
        }
    }
}

export const commerceSyncService = CommerceSyncService.getInstance();
