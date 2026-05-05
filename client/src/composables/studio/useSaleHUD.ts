import * as PIXI from 'pixi.js';
import { getFileUrl } from '@/utils/api';

/**
 * useSaleHUD
 * Pixi-native HUD management for SaleStudioV2.
 * Focuses on zero-DOM overhead for commerce elements.
 */
export function useSaleHUD(app: PIXI.Application | null) {
    const container = new PIXI.Container();
    container.name = 'HUDLayer';

    // Product Spotlight State
    let productContainer: PIXI.Container | null = null;
    let productImage: PIXI.Sprite | null = null;
    let titleText: PIXI.Text | null = null;
    let priceText: PIXI.Text | null = null;

    // Revenue Goal State
    let revenueGoalContainer: PIXI.Container;
    let revenueProgressBar: PIXI.Graphics;
    let revenueText: PIXI.Text;
    const GOAL_TARGET = 1000; // Mock goal target

    // Status HUD
    let statusContainer: PIXI.Container;
    let bitrateText: PIXI.Text;
    let viewerText: PIXI.Text;

    // Chat Ticker State
    let tickerContainer: PIXI.Container | null = null;
    let tickerText: PIXI.Text | null = null;
    const tickerMessages: string[] = [];

    // Thinking State
    let thinkingIndicator: PIXI.Graphics | null = null;
    let isThinkingActive = false;

    // QR Code & Sales State
    let qrContainer: PIXI.Container | null = null;
    let flashSaleContainer: PIXI.Container | null = null;
    let flashSaleTimerText: PIXI.Text | null = null;

    /**
     * Create the Product Spotlight Widget — CENTER BOTTOM, includes QR code
     * Card layout: [Product Image | Name + Price | QR Code]
     * Width: 500px, Height: 120px
     */
    const CARD_W = 500;
    const CARD_H = 120;
    const initProductSpotlight = () => {
        productContainer = new PIXI.Container();
        productContainer.alpha = 0;
        productContainer.pivot.set(CARD_W / 2, CARD_H); // Anchor to bottom-center
        productContainer.y = (app?.screen.height || 1080) + 20; // Start below screen

        // Glassmorphism Card Background
        const card = new PIXI.Graphics();
        card.beginFill(0x000000, 0.82);
        card.lineStyle(1.5, 0xffffff, 0.12);
        card.drawRoundedRect(0, 0, CARD_W, CARD_H, 20);
        card.endFill();
        productContainer.addChild(card);

        // Orange accent bar at bottom
        const accent = new PIXI.Graphics();
        accent.beginFill(0xf97316);
        accent.drawRoundedRect(0, CARD_H - 3, CARD_W, 3, 2);
        accent.endFill();
        productContainer.addChild(accent);

        // Product Image (left side)
        productImage = new PIXI.Sprite(PIXI.Texture.EMPTY);
        productImage.x = 14;
        productImage.y = 14;
        productImage.width = 92;
        productImage.height = 92;
        const imgMask = new PIXI.Graphics();
        imgMask.beginFill(0xffffff);
        imgMask.drawRoundedRect(14, 14, 92, 92, 12);
        imgMask.endFill();
        productImage.mask = imgMask;
        productContainer.addChild(imgMask);
        productContainer.addChild(productImage);

        // Text area (middle)
        const titleStyle = new PIXI.TextStyle({
            fontFamily: 'Outfit, sans-serif',
            fontSize: 17,
            fontWeight: '900',
            fill: '#ffffff',
            wordWrap: true,
            wordWrapWidth: 240
        });
        const priceStyle = new PIXI.TextStyle({
            fontFamily: 'Outfit, sans-serif',
            fontSize: 22,
            fontWeight: 'bold',
            fill: '#f97316'
        });
        const scanStyle = new PIXI.TextStyle({
            fontFamily: 'Inter, sans-serif',
            fontSize: 11,
            fill: '#ffffff',
            letterSpacing: 1
        });

        titleText = new PIXI.Text('', titleStyle);
        titleText.x = 120;
        titleText.y = 14;
        productContainer.addChild(titleText);

        priceText = new PIXI.Text('', priceStyle);
        priceText.x = 120;
        priceText.y = 65;
        productContainer.addChild(priceText);

        // QR Code area (right side, embedded inside productContainer)
        qrContainer = new PIXI.Container();
        qrContainer.x = CARD_W - 114;
        qrContainer.y = 10;
        qrContainer.alpha = 0;
        productContainer.addChild(qrContainer);

        const qrBg = new PIXI.Graphics();
        qrBg.beginFill(0x111111, 0.9);
        qrBg.drawRoundedRect(0, 0, 100, 100, 10);
        qrBg.endFill();
        qrContainer.addChild(qrBg);

        const scanLabel = new PIXI.Text('SCAN TO BUY', scanStyle);
        scanLabel.anchor.set(0.5);
        scanLabel.x = 50;
        scanLabel.y = -14;
        qrContainer.addChild(scanLabel);

        // Separator line
        const sep = new PIXI.Graphics();
        sep.beginFill(0xffffff, 0.08);
        sep.drawRect(CARD_W - 118, 10, 1, CARD_H - 20);
        sep.endFill();
        productContainer.addChild(sep);

        container.addChild(productContainer);
    };

    /**
     * Update Product Details
     */
    const updateProduct = async (product: any) => {
        if (!productContainer || !app) return;

        if (!product) {
            hideProduct();
            updateQRCode(null);
            return;
        }

        // Update Text
        if (titleText) titleText.text = product.name.toUpperCase();
        if (priceText) priceText.text = `${product.currency || 'đ'}${product.price.toLocaleString()}`;

        // Update Image
        if (productImage && product.image) {
            const texture = await PIXI.Assets.load(getFileUrl(product.image));
            productImage.texture = texture;
            // Fitzone
            productImage.width = 80;
            productImage.height = 80;
        }

        showProduct();
        const productUrl = `${window.location.origin}/p/${product._id || product.id}`;
        updateQRCode(productUrl);
    };

    const showProduct = () => {
        if (!productContainer || !app) return;
        const screenW = app.screen.width;
        const screenH = app.screen.height;

        // Center bottom: pivot is (CARD_W/2, CARD_H), so x = center, y = bottom-padding
        productContainer.x = screenW / 2;
        productContainer.y = screenH + 20; // Start below screen
        productContainer.alpha = 0;

        const targetY = screenH - 30; // 30px above bottom
        const animate = (dt: number) => {
            if (productContainer!.y > targetY) {
                productContainer!.y -= 14 * dt;
                productContainer!.alpha = Math.min(1, productContainer!.alpha + 0.1 * dt);
            } else {
                productContainer!.y = targetY;
                productContainer!.alpha = 1;
                app!.ticker.remove(animate);
            }
        };
        app.ticker.add(animate);
    };

    const hideProduct = () => {
        if (!productContainer || !app) return;
        const screenH = app.screen.height;

        const animate = (dt: number) => {
            productContainer!.y += 14 * dt;
            productContainer!.alpha = Math.max(0, productContainer!.alpha - 0.12 * dt);
            if (productContainer!.alpha <= 0) {
                productContainer!.alpha = 0;
                productContainer!.y = screenH + 20;
                app!.ticker.remove(animate);
            }
        };
        app.ticker.add(animate);
    };

    /**
     * Create Chat Ticker
     */
    const initChatTicker = () => {
        tickerContainer = new PIXI.Container();
        const screenWidth = app?.screen.width || 1280;
        const screenHeight = app?.screen.height || 720;
        
        tickerContainer.y = screenHeight - 60;
        
        const bg = new PIXI.Graphics();
        bg.beginFill(0x000000, 0.4);
        bg.drawRect(0, 0, screenWidth, 40);
        bg.endFill();
        tickerContainer.addChild(bg);

        const style = new PIXI.TextStyle({
            fontFamily: 'Inter, sans-serif',
            fontSize: 14,
            fill: '#ffffff',
            letterSpacing: 1
        });

        tickerText = new PIXI.Text('', style);
        tickerText.y = 10;
        tickerText.x = screenWidth; // Start from right
        tickerContainer.addChild(tickerText);

        container.addChild(tickerContainer);

        // Animation Loop for Ticker
        app!.ticker.add((dt) => {
            if (tickerText) {
                tickerText.x -= 2 * dt;
                if (tickerText.x < -tickerText.width) {
                    tickerText.x = screenWidth;
                }
            }
        });
    };

    const addChatMessage = (msg: string) => {
        tickerMessages.push(msg);
        if (tickerMessages.length > 5) tickerMessages.shift();
        if (tickerText) tickerText.text = tickerMessages.join('  •  ').toUpperCase();
    };

    /**
     * Thinking Indicator
     */
    const initThinkingIndicator = () => {
        thinkingIndicator = new PIXI.Graphics();
        thinkingIndicator.beginFill(0x6366f1, 0.8); // Indigo 500
        thinkingIndicator.drawCircle(0, 0, 6);
        thinkingIndicator.endFill();
        
        thinkingIndicator.x = (app?.screen.width || 1280) - 40;
        thinkingIndicator.y = 40;
        thinkingIndicator.alpha = 0;
        
        container.addChild(thinkingIndicator);

        // Pulsing animation
        app!.ticker.add((dt) => {
            if (isThinkingActive && thinkingIndicator) {
                thinkingIndicator.alpha = 0.5 + Math.sin(Date.now() / 150) * 0.5;
                thinkingIndicator.scale.set(1 + Math.sin(Date.now() / 150) * 0.2);
            } else if (thinkingIndicator) {
                thinkingIndicator.alpha = 0;
            }
        });
    };

    const setThinking = (active: boolean) => {
        isThinkingActive = active;
    };

    /**
     * Revenue Goal Widget
     */
    function createRevenueGoal() {
        revenueGoalContainer = new PIXI.Container();
        container.addChild(revenueGoalContainer);

        const bg = new PIXI.Graphics();
        bg.beginFill(0x000000, 0.6);
        bg.drawRoundedRect(0, 0, 220, 65, 16);
        bg.endFill();
        revenueGoalContainer.addChild(bg);

        const label = new PIXI.Text('REVENUE GOAL', {
            fontFamily: 'Inter, sans-serif',
            fontSize: 12,
            fill: 0xffffff,
            fontWeight: '900',
            letterSpacing: 1
        });
        label.position.set(12, 10);
        label.alpha = 0.5;
        revenueGoalContainer.addChild(label);

        // Position below Status HUD
        revenueGoalContainer.position.set(20, 100);

        revenueText = new PIXI.Text('$0 / $1000', {
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 16,
            fill: 0xffffff,
            fontWeight: 'bold'
        });
        revenueText.position.set(12, 30);
        revenueGoalContainer.addChild(revenueText);

        const track = new PIXI.Graphics();
        track.beginFill(0xffffff, 0.1);
        track.drawRoundedRect(10, 32, 160, 3, 2);
        track.endFill();
        revenueGoalContainer.addChild(track);

        revenueProgressBar = new PIXI.Graphics();
        revenueGoalContainer.addChild(revenueProgressBar);
        
        updateRevenueGoal(0);
    }

    function updateRevenueGoal(current: number) {
        if (!revenueProgressBar) return;
        
        const percent = Math.min(1, current / GOAL_TARGET);
        revenueText.text = `$${current.toLocaleString()} / $${GOAL_TARGET.toLocaleString()}`;
        
        revenueProgressBar.clear();
        if (percent > 0) {
            revenueProgressBar.beginFill(0xf97316); // Orange theme
            revenueProgressBar.drawRoundedRect(10, 32, 160 * percent, 3, 2);
            revenueProgressBar.endFill();
        }
    }

    /**
     * Reaction Floaters (Emitter-like)
     */
    const spawnEmoji = (emoji: string) => {
        const text = new PIXI.Text(emoji, { fontSize: 32 });
        text.x = (app?.screen.width || 1280) * (0.2 + Math.random() * 0.6);
        text.y = (app?.screen.height || 720);
        text.alpha = 1;
        container.addChild(text);

        const vx = (Math.random() - 0.5) * 2;
        const vy = -2 - Math.random() * 3;

        app!.ticker.add((dt) => {
            if (text.destroyed) return;
            text.x += vx * dt;
            text.y += vy * dt;
            text.alpha -= 0.01 * dt;
            if (text.alpha <= 0) {
                text.destroy();
            }
        });
    };

    const initQRCode = () => {
        // QR code is now embedded inside productContainer (see initProductSpotlight)
        // This is kept as a no-op for API compatibility
    };

    /**
     * Responsive Layout Handler
     */
    const resize = () => {
        if (!app) return;
        const width = app.screen.width;
        const height = app.screen.height;
        const isPortrait = height > width;

        // 1. Product Spotlight (center-bottom; pivot is at card center-bottom)
        if (productContainer && productContainer.alpha > 0) {
            productContainer.x = width / 2;
            productContainer.y = height - 30;
        }

        // 2. Chat Ticker
        if (tickerContainer) {
            tickerContainer.y = height - 60;
            const bg = tickerContainer.children[0] as PIXI.Graphics;
            bg.clear();
            bg.beginFill(0x000000, 0.4);
            bg.drawRect(0, 0, width, 40);
            bg.endFill();
        }

        // 3. QR Code — now embedded inside productContainer, no separate positioning needed

        // 4. Flash Sale (center-top)
        if (flashSaleContainer) {
            flashSaleContainer.x = width / 2;
            flashSaleContainer.y = 60;
        }

        // 5. Thinking Indicator
        if (thinkingIndicator) {
            thinkingIndicator.x = width - 40;
            thinkingIndicator.y = 40;
        }
    };

    const updateQRCode = async (url: string | null) => {
        if (!qrContainer) return;
        if (!url) {
            qrContainer.alpha = 0;
            return;
        }

        try {
            const { QRCodeGenerator } = await import('@/utils/ai/QRCodeGenerator');
            // getProductQR is now async and returns a data URL (local qrcode library)
            const dataUrl = await QRCodeGenerator.getProductQR(url, 180);
            if (!dataUrl) return;

            const texture = await PIXI.Assets.load(dataUrl);
            // Clear old QR sprite (children 1+ are sprites; child 0 is the bg rect)
            [...qrContainer.children].filter(c => c instanceof PIXI.Sprite).forEach(c => c.destroy());

            const sprite = new PIXI.Sprite(texture);
            sprite.width = 80;
            sprite.height = 80;
            sprite.x = 10;
            sprite.y = 10;
            qrContainer.addChild(sprite);
            qrContainer.alpha = 1;
        } catch (e) {
            console.error('[SaleHUD] QR Code Load Failed:', e);
        }
    };

    /**
     * Flash Sale Header
     */
    const initFlashSaleHUD = () => {
        flashSaleContainer = new PIXI.Container();
        flashSaleContainer.x = (app?.screen.width || 1280) / 2;
        flashSaleContainer.y = 60;
        flashSaleContainer.alpha = 0;
        container.addChild(flashSaleContainer);

        const bg = new PIXI.Graphics();
        bg.beginFill(0xFFD700, 0.1);
        bg.lineStyle(2, 0xFFD700, 0.5);
        bg.drawRoundedRect(-150, -30, 300, 80, 20);
        bg.endFill();
        flashSaleContainer.addChild(bg);

        const label = new PIXI.Text('FLASH SALE ENDS IN', {
            fontFamily: 'Inter, sans-serif',
            fontSize: 10,
            fill: 0xFFD700,
            fontWeight: '900',
            letterSpacing: 2
        });
        label.anchor.set(0.5);
        label.y = -10;
        flashSaleContainer.addChild(label);

        flashSaleTimerText = new PIXI.Text('00:00:00', {
            fontFamily: 'Inter, sans-serif',
            fontSize: 32,
            fill: 0xFFFFFF,
            fontWeight: '900'
        });
        flashSaleTimerText.anchor.set(0.5);
        flashSaleTimerText.y = 25;
        flashSaleContainer.addChild(flashSaleTimerText);
    };

    /**
     * Status HUD (Top Left)
     */
    const initStatusHUD = () => {
        statusContainer = new PIXI.Container();
        statusContainer.position.set(20, 20);
        container.addChild(statusContainer);

        const bg = new PIXI.Graphics();
        bg.beginFill(0x000000, 0.6);
        bg.drawRoundedRect(0, 0, 180, 65, 16);
        bg.endFill();
        statusContainer.addChild(bg);

        viewerText = new PIXI.Text('👥 0', {
            fontFamily: 'Inter, sans-serif',
            fontSize: 18,
            fill: 0xffffff,
            fontWeight: 'bold'
        });
        viewerText.position.set(15, 10);
        statusContainer.addChild(viewerText);

        bitrateText = new PIXI.Text('OFFLINE', {
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 12,
            fill: 0xffffff,
            fontWeight: 'bold'
        });
        bitrateText.alpha = 0.5;
        bitrateText.position.set(15, 35);
        statusContainer.addChild(bitrateText);
    };

    const updateStatus = (viewers: number, bitrate: number, healthy: boolean) => {
        if (!statusContainer) return;
        viewerText.text = `👥 ${viewers.toLocaleString()}`;
        bitrateText.text = bitrate > 0 ? `${(bitrate / 1000).toFixed(1)} Mbps` : 'OFFLINE';
        bitrateText.style.fill = healthy ? 0x10b981 : 0xef4444; // Green vs Red
    };

    const updateFlashSale = (active: boolean, remainingMs: number) => {
        if (!flashSaleContainer || !flashSaleTimerText) return;
        flashSaleContainer.alpha = active ? 1 : 0;
        
        if (active) {
            const h = Math.floor(remainingMs / 3600000);
            const m = Math.floor((remainingMs % 3600000) / 60000);
            const s = Math.floor((remainingMs % 60000) / 1000);
            flashSaleTimerText.text = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
    };

    // Initialize on creation
    initProductSpotlight();
    initChatTicker();
    initThinkingIndicator();
    initQRCode();
    initFlashSaleHUD();
    createRevenueGoal();
    initStatusHUD();

    return {
        container,
        updateProductSpotlight: updateProduct,
        addChatMessage,
        setThinking,
        updateQRCode,
        updateFlashSale,
        updateRevenueGoal,
        updateStatus,
        spawnEmoji,
        resize
    };
}
