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

    // --- COMMERCE HUD STATE ---
    let productContainer: PIXI.Container | null = null;
    let productImage: PIXI.Sprite | null = null;
    let titleText: PIXI.Text | null = null;
    let priceText: PIXI.Text | null = null;

    let revenueGoalContainer: PIXI.Container;
    let revenueProgressBar: PIXI.Graphics;
    let revenueText: PIXI.Text;
    const GOAL_TARGET = 1000;

    let statusContainer: PIXI.Container;
    let bitrateText: PIXI.Text;
    let viewerText: PIXI.Text;

    let tickerContainer: PIXI.Container | null = null;
    let tickerText: PIXI.Text | null = null;
    const tickerMessages: string[] = [];

    let thinkingIndicator: PIXI.Graphics | null = null;
    let isThinkingActive = false;

    let qrContainer: PIXI.Container | null = null;
    let flashSaleContainer: PIXI.Container | null = null;
    let flashSaleTimerText: PIXI.Text | null = null;

    // --- AI DYNAMIC OVERLAYS STATE ---
    let pollContainer: PIXI.Container | null = null;
    let questionContainer: PIXI.Container | null = null;
    let lowerThirdContainer: PIXI.Container | null = null;
    let mainTickerContainer: PIXI.Container | null = null;
    let mainTickerText: PIXI.Text | null = null;

    const CARD_W = 500;
    const CARD_H = 120;

    // --- INITIALIZERS ---

    const initProductSpotlight = () => {
        productContainer = new PIXI.Container();
        productContainer.alpha = 0;
        productContainer.pivot.set(CARD_W / 2, CARD_H);
        productContainer.y = (app?.screen.height || 1080) + 20;

        const card = new PIXI.Graphics();
        card.beginFill(0x000000, 0.82);
        card.lineStyle(1.5, 0xffffff, 0.12);
        card.drawRoundedRect(0, 0, CARD_W, CARD_H, 20);
        card.endFill();
        productContainer.addChild(card);

        const accent = new PIXI.Graphics();
        accent.beginFill(0xf97316);
        accent.drawRoundedRect(0, CARD_H - 3, CARD_W, 3, 2);
        accent.endFill();
        productContainer.addChild(accent);

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

        titleText = new PIXI.Text('', titleStyle);
        titleText.x = 120;
        titleText.y = 14;
        productContainer.addChild(titleText);

        priceText = new PIXI.Text('', priceStyle);
        priceText.x = 120;
        priceText.y = 65;
        productContainer.addChild(priceText);

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

        const scanStyle = new PIXI.TextStyle({
            fontFamily: 'Inter, sans-serif',
            fontSize: 11,
            fill: '#ffffff',
            letterSpacing: 1
        });
        const scanLabel = new PIXI.Text('SCAN TO BUY', scanStyle);
        scanLabel.anchor.set(0.5);
        scanLabel.x = 50;
        scanLabel.y = -14;
        qrContainer.addChild(scanLabel);

        const sep = new PIXI.Graphics();
        sep.beginFill(0xffffff, 0.08);
        sep.drawRect(CARD_W - 118, 10, 1, CARD_H - 20);
        sep.endFill();
        productContainer.addChild(sep);

        container.addChild(productContainer);
    };

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

        tickerText = new PIXI.Text('', { fontFamily: 'Inter, sans-serif', fontSize: 14, fill: '#ffffff', letterSpacing: 1 });
        tickerText.y = 10;
        tickerText.x = screenWidth;
        tickerContainer.addChild(tickerText);
        container.addChild(tickerContainer);

        app!.ticker.add((dt) => {
            if (tickerText) {
                tickerText.x -= 2 * dt;
                if (tickerText.x < -tickerText.width) tickerText.x = app!.screen.width;
            }
        });
    };

    const initThinkingIndicator = () => {
        thinkingIndicator = new PIXI.Graphics();
        thinkingIndicator.beginFill(0x6366f1, 0.8);
        thinkingIndicator.drawCircle(0, 0, 6);
        thinkingIndicator.endFill();
        thinkingIndicator.x = (app?.screen.width || 1280) - 40;
        thinkingIndicator.y = 40;
        thinkingIndicator.alpha = 0;
        container.addChild(thinkingIndicator);

        app!.ticker.add((dt) => {
            if (isThinkingActive && thinkingIndicator) {
                thinkingIndicator.alpha = 0.5 + Math.sin(Date.now() / 150) * 0.5;
                thinkingIndicator.scale.set(1 + Math.sin(Date.now() / 150) * 0.2);
            } else if (thinkingIndicator) {
                thinkingIndicator.alpha = 0;
            }
        });
    };

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

        const label = new PIXI.Text('FLASH SALE ENDS IN', { fontFamily: 'Inter, sans-serif', fontSize: 10, fill: 0xFFD700, fontWeight: '900', letterSpacing: 2 });
        label.anchor.set(0.5);
        label.y = -10;
        flashSaleContainer.addChild(label);

        flashSaleTimerText = new PIXI.Text('00:00:00', { fontFamily: 'Inter, sans-serif', fontSize: 32, fill: 0xFFFFFF, fontWeight: '900' });
        flashSaleTimerText.anchor.set(0.5);
        flashSaleTimerText.y = 25;
        flashSaleContainer.addChild(flashSaleTimerText);
    };

    const initStatusHUD = () => {
        statusContainer = new PIXI.Container();
        statusContainer.position.set(20, 20);
        container.addChild(statusContainer);

        const bg = new PIXI.Graphics();
        bg.beginFill(0x000000, 0.6);
        bg.drawRoundedRect(0, 0, 180, 65, 16);
        bg.endFill();
        statusContainer.addChild(bg);

        viewerText = new PIXI.Text('👥 0', { fontFamily: 'Inter, sans-serif', fontSize: 18, fill: 0xffffff, fontWeight: 'bold' });
        viewerText.position.set(15, 10);
        statusContainer.addChild(viewerText);

        bitrateText = new PIXI.Text('OFFLINE', { fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fill: 0xffffff, fontWeight: 'bold' });
        bitrateText.alpha = 0.5;
        bitrateText.position.set(15, 35);
        statusContainer.addChild(bitrateText);
    };

    const createRevenueGoal = () => {
        revenueGoalContainer = new PIXI.Container();
        container.addChild(revenueGoalContainer);
        const bg = new PIXI.Graphics();
        bg.beginFill(0x000000, 0.6);
        bg.drawRoundedRect(0, 0, 220, 65, 16);
        bg.endFill();
        revenueGoalContainer.addChild(bg);
        const label = new PIXI.Text('REVENUE GOAL', { fontFamily: 'Inter, sans-serif', fontSize: 12, fill: 0xffffff, fontWeight: '900', letterSpacing: 1 });
        label.position.set(12, 10);
        label.alpha = 0.5;
        revenueGoalContainer.addChild(label);
        revenueGoalContainer.position.set(20, 100);
        revenueText = new PIXI.Text('$0 / $1000', { fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fill: 0xffffff, fontWeight: 'bold' });
        revenueText.position.set(12, 30);
        revenueGoalContainer.addChild(revenueText);
        const track = new PIXI.Graphics();
        track.beginFill(0xffffff, 0.1);
        track.drawRoundedRect(10, 32, 160, 3, 2);
        track.endFill();
        revenueGoalContainer.addChild(track);
        revenueProgressBar = new PIXI.Graphics();
        revenueGoalContainer.addChild(revenueProgressBar);
    };

    const initLowerThird = () => {
        lowerThirdContainer = new PIXI.Container();
        lowerThirdContainer.alpha = 0;
        lowerThirdContainer.x = 20;
        lowerThirdContainer.y = (app?.screen.height || 720) - 140;
        container.addChild(lowerThirdContainer);
        const bg = new PIXI.Graphics();
        bg.beginFill(0xef4444);
        bg.drawRoundedRect(0, 0, 300, 60, 8);
        bg.endFill();
        lowerThirdContainer.addChild(bg);
        const nameText = new PIXI.Text('', { fontFamily: 'Outfit, sans-serif', fontSize: 20, fontWeight: '900', fill: '#ffffff' });
        nameText.x = 20; nameText.y = 8; nameText.name = 'nameText';
        lowerThirdContainer.addChild(nameText);
        const titleText = new PIXI.Text('', { fontFamily: 'Inter, sans-serif', fontSize: 12, fill: '#ffffff', letterSpacing: 1 });
        titleText.alpha = 0.8;
        titleText.x = 20; titleText.y = 35; titleText.name = 'titleText';
        lowerThirdContainer.addChild(titleText);
    };

    const initFeaturedQuestion = () => {
        questionContainer = new PIXI.Container();
        questionContainer.alpha = 0;
        questionContainer.pivot.set(240, 50);
        questionContainer.x = (app?.screen.width || 1280) / 2;
        questionContainer.y = (app?.screen.height || 720) - 180;
        container.addChild(questionContainer);
        const bg = new PIXI.Graphics();
        bg.beginFill(0x000000, 0.7);
        bg.lineStyle(1, 0xffffff, 0.2);
        bg.drawRoundedRect(0, 0, 480, 100, 24);
        bg.endFill();
        questionContainer.addChild(bg);
        const userText = new PIXI.Text('', { fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: '900', fill: '#818cf8', letterSpacing: 2 });
        userText.x = 24; userText.y = 16; userText.name = 'userText';
        questionContainer.addChild(userText);
        const textText = new PIXI.Text('', { fontFamily: 'Outfit, sans-serif', fontSize: 18, fontWeight: 'bold', fill: '#ffffff', wordWrap: true, wordWrapWidth: 400 });
        textText.x = 24; textText.y = 35; textText.name = 'textText';
        questionContainer.addChild(textText);
    };

    const initPollHUD = () => {
        pollContainer = new PIXI.Container();
        pollContainer.alpha = 0;
        pollContainer.x = (app?.screen.width || 1280) - 320;
        pollContainer.y = 100;
        container.addChild(pollContainer);
        const bg = new PIXI.Graphics();
        bg.beginFill(0x000000, 0.8);
        bg.lineStyle(1, 0xffffff, 0.1);
        bg.drawRoundedRect(0, 0, 300, 200, 16);
        bg.endFill();
        pollContainer.addChild(bg);
        const qText = new PIXI.Text('', { fontFamily: 'Outfit, sans-serif', fontSize: 14, fontWeight: 'bold', fill: '#ffffff', wordWrap: true, wordWrapWidth: 260 });
        qText.x = 20; qText.y = 20; qText.name = 'questionText';
        pollContainer.addChild(qText);
        const optC = new PIXI.Container();
        optC.y = 50; optC.name = 'optionsContainer';
        pollContainer.addChild(optC);
    };

    const initMainTicker = () => {
        mainTickerContainer = new PIXI.Container();
        mainTickerContainer.alpha = 0;
        mainTickerContainer.y = 80;
        const bg = new PIXI.Graphics();
        bg.beginFill(0x000000, 0.4);
        bg.drawRect(0, 0, app?.screen.width || 1280, 30);
        bg.endFill();
        mainTickerContainer.addChild(bg);
        mainTickerText = new PIXI.Text('', { fontSize: 12, fill: 0xffffff, letterSpacing: 2 });
        mainTickerText.y = 8;
        mainTickerText.x = app?.screen.width || 1280;
        mainTickerContainer.addChild(mainTickerText);
        container.addChild(mainTickerContainer);
        app!.ticker.add((dt) => {
            if (mainTickerContainer!.alpha > 0 && mainTickerText) {
                mainTickerText.x -= 1.5 * dt;
                if (mainTickerText.x < -mainTickerText.width) mainTickerText.x = app!.screen.width;
            }
        });
    };

    // --- UPDATERS ---

    const updateProduct = async (product: any) => {
        if (!productContainer || !app) return;
        if (!product) { hideProduct(); updateQRCode(null); return; }
        if (titleText) titleText.text = product.name.toUpperCase();
        if (priceText) priceText.text = `${product.currency || 'đ'}${product.price.toLocaleString()}`;
        if (productImage && product.image) {
            const texture = await PIXI.Assets.load(getFileUrl(product.image));
            productImage.texture = texture;
            productImage.width = 80; productImage.height = 80;
        }
        showProduct();
        updateQRCode(`${window.location.origin}/p/${product._id || product.id}`);
    };

    const showProduct = () => {
        if (!productContainer || !app) return;
        productContainer.x = app.screen.width / 2;
        productContainer.y = app.screen.height + 20;
        productContainer.alpha = 0;
        const targetY = app.screen.height - 30;
        const animate = (dt: number) => {
            if (productContainer!.y > targetY) {
                productContainer!.y -= 14 * dt;
                productContainer!.alpha = Math.min(1, productContainer!.alpha + 0.1 * dt);
            } else {
                productContainer!.y = targetY; productContainer!.alpha = 1;
                app!.ticker.remove(animate);
            }
        };
        app.ticker.add(animate);
    };

    const hideProduct = () => {
        if (!productContainer || !app) return;
        const animate = (dt: number) => {
            productContainer!.y += 14 * dt;
            productContainer!.alpha = Math.max(0, productContainer!.alpha - 0.12 * dt);
            if (productContainer!.alpha <= 0) {
                productContainer!.alpha = 0; productContainer!.y = app!.screen.height + 20;
                app!.ticker.remove(animate);
            }
        };
        app.ticker.add(animate);
    };

    const updateQRCode = async (url: string | null) => {
        if (!qrContainer) return;
        if (!url) { qrContainer.alpha = 0; return; }
        try {
            const { QRCodeGenerator } = await import('@/utils/ai/QRCodeGenerator');
            const dataUrl = await QRCodeGenerator.getProductQR(url, 180);
            if (!dataUrl) return;
            const texture = await PIXI.Assets.load(dataUrl);
            [...qrContainer.children].filter(c => c instanceof PIXI.Sprite).forEach(c => c.destroy());
            const sprite = new PIXI.Sprite(texture);
            sprite.width = 80; sprite.height = 80; sprite.x = 10; sprite.y = 10;
            qrContainer.addChild(sprite); qrContainer.alpha = 1;
        } catch (e) { console.error('[SaleHUD] QR Code Load Failed:', e); }
    };

    const updateLowerThird = (visible: boolean, name: string = '', title: string = '') => {
        if (!lowerThirdContainer || !app) return;
        if (visible) {
            const nameT = lowerThirdContainer.getChildByName('nameText') as PIXI.Text;
            const titleT = lowerThirdContainer.getChildByName('titleText') as PIXI.Text;
            nameT.text = name.toUpperCase();
            titleT.text = title.toUpperCase();
            lowerThirdContainer.alpha = 1;
            lowerThirdContainer.x = -300;
            const animate = (dt: number) => {
                if (lowerThirdContainer!.x < 20) lowerThirdContainer!.x += 15 * dt;
                else { lowerThirdContainer!.x = 20; app!.ticker.remove(animate); }
            };
            app.ticker.add(animate);
        } else {
            const animate = (dt: number) => {
                lowerThirdContainer!.alpha -= 0.1 * dt;
                if (lowerThirdContainer!.alpha <= 0) {
                    lowerThirdContainer!.alpha = 0;
                    app!.ticker.remove(animate);
                }
            };
            app!.ticker.add(animate);
        }
    };

    const updateFeaturedQuestion = (visible: boolean, user: string = '', text: string = '') => {
        if (!questionContainer || !app) return;
        if (visible) {
            const uT = questionContainer.getChildByName('userText') as PIXI.Text;
            const tT = questionContainer.getChildByName('textText') as PIXI.Text;
            uT.text = `${user.toUpperCase()} ASKS`; tT.text = text;
            questionContainer.alpha = 0; questionContainer.y = app.screen.height - 160;
            const animate = (dt: number) => {
                questionContainer!.alpha = Math.min(1, questionContainer!.alpha + 0.1 * dt);
                if (questionContainer!.y > (app!.screen.height - 180)) questionContainer!.y -= 2 * dt;
                else app!.ticker.remove(animate);
            };
            app.ticker.add(animate);
        } else {
            const animate = (dt: number) => {
                questionContainer!.alpha -= 0.1 * dt;
                if (questionContainer!.alpha <= 0) {
                    questionContainer!.alpha = 0;
                    app!.ticker.remove(animate);
                }
            };
            app!.ticker.add(animate);
        }
    };

    const updatePoll = (poll: any) => {
        if (!pollContainer || !app) return;
        if (!poll) { pollContainer.alpha = 0; return; }
        pollContainer.alpha = 1;
        const qT = pollContainer.getChildByName('questionText') as PIXI.Text;
        qT.text = poll.question;
        const optC = pollContainer.getChildByName('optionsContainer') as PIXI.Container;
        optC.removeChildren();
        poll.options.forEach((opt: string, i: number) => {
            const bar = new PIXI.Graphics();
            bar.beginFill(0xffffff, 0.1);
            bar.drawRoundedRect(20, i * 35, 260, 30, 8);
            bar.endFill();
            const votes = poll.votes?.[i.toString()] || 0;
            const pct = poll.totalVotes > 0 ? votes / poll.totalVotes : 0;
            if (pct > 0) { bar.beginFill(0x6366f1, 0.4); bar.drawRoundedRect(20, i * 35, 260 * pct, 30, 8); bar.endFill(); }
            optC.addChild(bar);
            const txt = new PIXI.Text(opt, { fontSize: 12, fill: 0xffffff });
            txt.x = 35; txt.y = i * 35 + 8;
            optC.addChild(txt);
        });
    };

    const updateMainTicker = (visible: boolean, text: string = '') => {
        if (!mainTickerContainer) return;
        mainTickerContainer.alpha = visible ? 1 : 0;
        if (visible && mainTickerText) mainTickerText.text = (text + ' • ').repeat(5).toUpperCase();
    };

    const updateStatus = (viewers: number, bitrate: number, healthy: boolean) => {
        if (!statusContainer) return;
        viewerText.text = `👥 ${viewers.toLocaleString()}`;
        bitrateText.text = bitrate > 0 ? `${(bitrate / 1000).toFixed(1)} Mbps` : 'OFFLINE';
        bitrateText.style.fill = healthy ? 0x10b981 : 0xef4444;
    };

    const updateFlashSale = (active: boolean, remainingMs: number) => {
        if (!flashSaleContainer || !flashSaleTimerText) return;
        flashSaleContainer.alpha = active ? 1 : 0;
        if (active) {
            const h = Math.floor(remainingMs / 3600000), m = Math.floor((remainingMs % 3600000) / 60000), s = Math.floor((remainingMs % 60000) / 1000);
            flashSaleTimerText.text = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
    };

    const updateRevenueGoal = (current: number) => {
        if (!revenueProgressBar) return;
        const percent = Math.min(1, current / GOAL_TARGET);
        revenueText.text = `$${current.toLocaleString()} / $${GOAL_TARGET.toLocaleString()}`;
        revenueProgressBar.clear();
        if (percent > 0) { revenueProgressBar.beginFill(0xf97316); revenueProgressBar.drawRoundedRect(10, 32, 160 * percent, 3, 2); revenueProgressBar.endFill(); }
    };

    const addChatMessage = (msg: string) => {
        tickerMessages.push(msg);
        if (tickerMessages.length > 5) tickerMessages.shift();
        if (tickerText) tickerText.text = tickerMessages.join('  •  ').toUpperCase();
    };

    const spawnEmoji = (emoji: string) => {
        const text = new PIXI.Text(emoji, { fontSize: 32 });
        text.x = (app?.screen.width || 1280) * (0.2 + Math.random() * 0.6);
        text.y = (app?.screen.height || 720);
        text.alpha = 1; container.addChild(text);
        const vx = (Math.random() - 0.5) * 2, vy = -2 - Math.random() * 3;
        app!.ticker.add((dt) => {
            if (text.destroyed) return;
            text.x += vx * dt; text.y += vy * dt; text.alpha -= 0.01 * dt;
            if (text.alpha <= 0) text.destroy();
        });
    };

    const resize = () => {
        if (!app) return;
        const w = app.screen.width, h = app.screen.height;
        if (productContainer && productContainer.alpha > 0) { productContainer.x = w / 2; productContainer.y = h - 30; }
        if (tickerContainer) { tickerContainer.y = h - 60; const bg = tickerContainer.children[0] as PIXI.Graphics; bg.clear(); bg.beginFill(0x000000, 0.4); bg.drawRect(0, 0, w, 40); bg.endFill(); }
        if (flashSaleContainer) { flashSaleContainer.x = w / 2; flashSaleContainer.y = 60; }
        if (thinkingIndicator) { thinkingIndicator.x = w - 40; thinkingIndicator.y = 40; }
        if (lowerThirdContainer) { lowerThirdContainer.y = h - 140; }
        if (questionContainer) { questionContainer.x = w / 2; questionContainer.y = h - 180; }
        if (pollContainer) { pollContainer.x = w - 320; }
        if (mainTickerContainer) { 
            const bg = mainTickerContainer.children[0] as PIXI.Graphics; 
            bg.clear(); bg.beginFill(0x000000, 0.4); bg.drawRect(0, 0, w, 30); bg.endFill(); 
        }
        if (statusContainer) { statusContainer.x = 20; statusContainer.y = 20; }
    };

    // Initialize
    initProductSpotlight(); initChatTicker(); initThinkingIndicator(); initFlashSaleHUD(); createRevenueGoal(); initStatusHUD();
    initLowerThird(); initFeaturedQuestion(); initPollHUD(); initMainTicker();

    return {
        container,
        updateProductSpotlight: updateProduct,
        addChatMessage,
        setThinking: (a: boolean) => isThinkingActive = a,
        updateQRCode,
        updateFlashSale,
        updateRevenueGoal,
        updateStatus,
        spawnEmoji,
        updateLowerThird,
        updateFeaturedQuestion,
        updatePoll,
        updateMainTicker,
        resize
    };
}
