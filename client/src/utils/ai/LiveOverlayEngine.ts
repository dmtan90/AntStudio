import { QRGenerator } from '../QRGenerator.js';

export interface OverlayGraphic {
    id: string;
    type: 'lower-third' | 'ticker' | 'watermark' | 'subtitles' | 'product-card' | 'poll' | 'question' | 'ai-tip';
    content: any;
    isVisible: boolean;
}

export class LiveOverlayEngine {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private graphics: Map<string, OverlayGraphic> = new Map();
    private qrCache: Map<string, HTMLImageElement> = new Map();

    constructor(width: number = 1920, height: number = 1080) {
        this.canvas = document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx = this.canvas.getContext('2d')!;
    }

    updateGraphic(id: string, update: Partial<OverlayGraphic>) {
        const existing = this.graphics.get(id) || { id, type: 'lower-third', content: {}, isVisible: false };
        this.graphics.set(id, { ...existing, ...update });
        this.render();
    }

    private render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.graphics.forEach(g => {
            if (!g.isVisible) return;

            if (g.type === 'lower-third') {
                this.renderLowerThird(g.content);
            } else if (g.type === 'ticker') {
                this.renderTicker(g.content);
            } else if (g.type === 'watermark') {
                this.renderWatermark(g.content);
            } else if (g.type === 'subtitles') {
                this.renderSubtitles(g.content);
            } else if (g.type === 'product-card') {
                this.renderProductCard(g.content);
            } else if (g.type === 'poll') {
                this.renderPoll(g.content);
            } else if (g.type === 'question') {
                this.renderQuestion(g.content);
            }
        });
    }

    private renderLowerThird(content: { name: string, title: string, color?: string }) {
        const { ctx, canvas } = this;
        const color = content.color || '#3b82f6';

        ctx.save();
        ctx.translate(100, canvas.height - 250);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, 600, 100);

        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 8, 100);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 36px Inter, sans-serif';
        ctx.fillText(content.name.toUpperCase(), 30, 45);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '20px Inter, sans-serif';
        ctx.fillText(content.title, 30, 75);

        ctx.restore();
    }

    private renderTicker(content: { text: string, speed?: number }) {
        const { ctx, canvas } = this;
        ctx.save();
        ctx.fillStyle = 'rgba(59, 130, 246, 0.9)';
        ctx.fillRect(0, canvas.height - 60, canvas.width, 60);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px Inter, sans-serif';
        ctx.fillText(content.text, 50, canvas.height - 22);
        ctx.restore();
    }

    private renderWatermark(content: { url: string, opacity?: number }) {
        // Watermark rendering placeholder
    }

    private renderSubtitles(content: { text: string }) {
        const { ctx, canvas } = this;
        if (!content.text) return;

        ctx.save();
        ctx.font = 'bold 28px Inter, sans-serif';
        const textWidth = ctx.measureText(content.text).width;
        const padding = 20;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect((canvas.width - textWidth) / 2 - padding, canvas.height - 150, textWidth + padding * 2, 50);

        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(content.text, canvas.width / 2, canvas.height - 115);
        ctx.restore();
    }

    private async renderProductCard(content: { title: string, price: string, image: string, qrUrl: string, isFlashDeal?: boolean }) {
        const { ctx, canvas } = this;
        ctx.save();

        ctx.translate(canvas.width - 400, 100);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.beginPath();
        ctx.roundRect(0, 0, 300, 450, 24);
        ctx.fill();
        ctx.strokeStyle = content.isFlashDeal ? '#ef4444' : 'rgba(0,0,0,0.05)';
        ctx.lineWidth = 4;
        ctx.stroke();

        if (content.isFlashDeal) {
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(-10, 20, 120, 30);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px Inter';
            ctx.fillText('FLASH DEAL', 50, 40);
        }

        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(20, 20, 260, 200);

        ctx.fillStyle = '#111';
        ctx.font = 'bold 20px Inter';
        ctx.fillText(content.title.substring(0, 20) + '...', 25, 250);

        ctx.fillStyle = content.isFlashDeal ? '#ef4444' : '#111';
        ctx.font = 'bold 32px Inter';
        ctx.fillText(content.price, 25, 300);

        // QR Code Logic
        let qrImg = this.qrCache.get(content.qrUrl);
        if (!qrImg) {
            QRGenerator.generateImage(content.qrUrl, 100).then(img => {
                this.qrCache.set(content.qrUrl, img);
                this.render(); // Re-render once loaded
            });
        } else {
            ctx.drawImage(qrImg, 100, 330, 100, 100);
        }

        ctx.fillStyle = '#111';
        ctx.font = 'bold 8px Inter';
        ctx.fillText('SCAN TO BUY', 125, 440);

        ctx.restore();
    }

    private renderPoll(content: { question: string, options: { label: string, votes: number }[], totalVotes: number }) {
        const { ctx, canvas } = this;
        ctx.save();

        // Position: Right side centered
        const w = 350;
        const h = 300;
        const x = canvas.width - w - 50;
        const y = (canvas.height - h) / 2;

        // Background
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 16);
        ctx.fill();
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Title
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px Inter';
        ctx.fillText('LIVE POLL', x + 20, y + 35);

        ctx.font = '16px Inter';
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillText(content.question, x + 20, y + 65);

        // Bars
        let currentY = y + 100;
        content.options.forEach(opt => {
            const percent = content.totalVotes > 0 ? (opt.votes / content.totalVotes) : 0;

            // Bar bg
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.fillRect(x + 20, currentY, w - 40, 30);

            // Bar fill
            ctx.fillStyle = '#3b82f6';
            ctx.fillRect(x + 20, currentY, (w - 40) * percent, 30);

            // Text
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px Inter';
            ctx.fillText(`${opt.label} (${Math.round(percent * 100)}%)`, x + 30, currentY + 20);

            currentY += 45;
        });

        ctx.restore();
    }

    private renderQuestion(content: { user: string, text: string, avatar: string }) {
        const { ctx, canvas } = this;
        ctx.save();

        // Position: Bottom Center-Left
        const x = 100;
        const y = canvas.height - 350;
        const w = 500;
        const h = 120;

        // Bubble
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 16);
        ctx.fill();

        // Accent
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(x, y + 20, 4, h - 40);

        // User Info
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 14px Inter';
        ctx.fillText(content.user.toUpperCase(), x + 25, y + 35);

        // Question Text
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 24px Inter';
        // Simple text wrap handling would go here, truncating for now
        ctx.fillText(content.text.substring(0, 35) + (content.text.length > 35 ? '...' : ''), x + 25, y + 70);

        ctx.restore();
    }

    public renderDynamicTicker(content: { label: string, value: string, trend?: 'up' | 'down' }) {
        const { ctx, canvas } = this;
        ctx.save();

        ctx.translate(canvas.width - 350, canvas.height - 120);

        // Glass bg
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.roundRect(0, 0, 250, 60, 12);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = '900 10px Inter';
        ctx.fillText(content.label.toUpperCase(), 15, 20);

        ctx.fillStyle = content.trend === 'up' ? '#22c55e' : (content.trend === 'down' ? '#ef4444' : '#fff');
        ctx.font = 'bold 22px Inter';
        ctx.fillText(content.value, 15, 45);

        ctx.restore();
    }

    public getCanvas(): HTMLCanvasElement {
        return this.canvas;
    }
}

export const liveOverlayEngine = new LiveOverlayEngine();
