import * as PIXI from 'pixi.js';
import { ChromakeyFilter } from '@/utils/webgl/PIXIFilters';
import { getFileUrl } from '@/utils/api';
import { syntheticGuestManager } from '@/utils/ai/SyntheticGuestManager';

/**
 * useSaleRenderer
 * Greenfield high-performance multi-character rendering engine.
 * Implements 1-frame direct texture swaps (Zero-Alpha fading) to eliminate V2 ghosting.
 */
export function useSaleRenderer(app: PIXI.Application | null, studioStore: any) {
    const bgContainer = new PIXI.Container();
    bgContainer.name = 'BackgroundLayer';

    const mainContainer = new PIXI.Container();
    mainContainer.name = 'MultiCharacterLayer';

    const mediaContainer = new PIXI.Container();
    mediaContainer.name = 'MediaLayer';

    const overlayContainer = new PIXI.Container();
    overlayContainer.name = 'OverlayLayer';

    // Character Instances: Map<uuid, CharacterObject>
    const characters = new Map<string, {
        container: PIXI.Container;
        sprite: PIXI.Sprite;
        activeVideo: HTMLVideoElement | null;
        initialized: boolean;
        currentState?: string;
        currentProductId?: string;
        currentTargetClipUrl?: string;
    }>();

    let currentOverlayProductId: string | null = null;
    let previousSceneId: string | null = null;
    let activeMediaVideo: HTMLVideoElement | null = null;
    let activeMediaTexture: PIXI.Texture | null = null;
    let currentMediaUrl: string | null = null;
    const lastProductModes = new Map<string, 'tvc' | 'aidol'>();

    /**
     * Blob Preload Pool — tải video về local blob URL trước khi live.
     * Key: original clip URL (relative/absolute)
     * Value: { blobUrl, video (preloaded, not playing), texture }
     */
    const clipPool = new Map<string, {
        blobUrl: string;
        video: HTMLVideoElement;
        texture: PIXI.Texture | null;
    }>();

    /**
     * Create/Retrieve a character instance with direct 1-sprite renderer.
     */
    const getOrCreateCharacter = (uuid: string) => {
        if (characters.has(uuid)) return characters.get(uuid)!;

        const container = new PIXI.Container();
        container.name = `Character_${uuid}`;
        
        const sprite = new PIXI.Sprite();
        const chromaFilter = new ChromakeyFilter([0, 1, 0], 0.35, 0.15);
        sprite.filters = [chromaFilter];
        sprite.anchor.set(0.5);

        container.addChild(sprite);
        mainContainer.addChild(container);

        const charObj = {
            container,
            sprite,
            activeVideo: null,
            initialized: false,
            currentState: '',
            currentProductId: '',
            currentTargetClipUrl: ''
        };
        characters.set(uuid, charObj);
        return charObj;
    };

    /**
     * Initialize/Add to Pixi Stage
     */
    const init = (parent: PIXI.Container) => {
        parent.addChild(bgContainer);
        parent.addChild(mediaContainer);
        parent.addChild(mainContainer);
        parent.addChild(overlayContainer);
    };

    /**
     * Preload tất cả aidolClips của persona, video TVC sản phẩm và background về blob URL trước khi bắt đầu live.
     * Sau khi gọi xong, transitionToClip và updateMedia sẽ dùng blob pool trực tiếp — không tốn network.
     */
    const preloadClips = async (persona?: any, products: any[] = []): Promise<void> => {
        const urlsToPreload = new Set<string>();

        if (persona) {
            const clips = persona.visual?.aidolClips || {};
            Object.values(clips).forEach((url: any) => {
                if (url && typeof url === 'string') urlsToPreload.add(url);
            });
        }

        // Add TVC / product videos
        products.forEach((p: any) => {
            if (p.video && typeof p.video === 'string') urlsToPreload.add(p.video);
            if (p.tvcUrl && typeof p.tvcUrl === 'string') urlsToPreload.add(p.tvcUrl);
            if (p.media && typeof p.media === 'string' && (p.media.endsWith('.mp4') || p.media.endsWith('.webm'))) {
                urlsToPreload.add(p.media);
            }
        });

        // Add background asset if video
        const bgUrl = studioStore.visualSettings?.background?.assetUrl;
        if (bgUrl && typeof bgUrl === 'string' && (bgUrl.endsWith('.mp4') || bgUrl.endsWith('.webm'))) {
            urlsToPreload.add(bgUrl);
        }

        const personaName = persona?.name || persona?.identity?.name || 'Studio';
        console.log(`[SaleRenderer] Preloading ${urlsToPreload.size} media items (aidol clips + product TVCs) for ${personaName}...`);

        await Promise.allSettled(Array.from(urlsToPreload).map(async (url) => {
            if (!url || clipPool.has(url)) return; // already loaded

            try {
                const fullUrl = getFileUrl(url);

                // Fetch to blob — store locally, network-independent during playback
                const res = await fetch(fullUrl);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const blob = await res.blob();
                const blobUrl = URL.createObjectURL(blob);

                // Create video element, set blob src, preload without playing
                const video = document.createElement('video');
                video.src = blobUrl;
                video.loop = true;
                video.muted = true;
                video.playsInline = true;
                video.preload = 'auto';

                await new Promise<void>((resolve) => {
                    const timer = setTimeout(() => {
                        console.warn(`[SaleRenderer] Preload timeout for ${url}`);
                        resolve();
                    }, 10000); // 10s failsafe timeout
                    video.oncanplay = () => {
                        clearTimeout(timer);
                        resolve();
                    };
                    video.onerror  = () => {
                        clearTimeout(timer);
                        resolve();
                    };
                    video.load();
                });

                clipPool.set(url, { blobUrl, video, texture: null });
                console.log(`[SaleRenderer] ✅ Preloaded & cached blob: ${url.split('/').pop()}`);
            } catch (e: any) {
                console.warn(`[SaleRenderer] ⚠️ Preload failed for ${url}: ${e.message}`);
            }
        }));

        console.log(`[SaleRenderer] Preload complete. Total cached blob pool size: ${clipPool.size}`);
    };

    /**
     * Giải phóng tất cả blob URLs khi kết thúc session.
     */
    const disposePool = () => {
        clipPool.forEach(({ blobUrl, video, texture }) => {
            try {
                if (video) {
                    video.pause();
                    video.src = '';
                    video.remove();
                }
                if (texture) texture.destroy(true);
                URL.revokeObjectURL(blobUrl);
            } catch (e) {}
        });
        clipPool.clear();
        console.log('[SaleRenderer] Clip pool destroyed.');
    };

    /**
     * Cập nhật khung media hiển thị (TVC video / hình ảnh sản phẩm)
     */
    const updateMedia = async (url: string | null): Promise<boolean> => {
        const targetUrl = url;
        currentMediaUrl = url;

        if (!url) {
            if (activeMediaVideo) {
                activeMediaVideo.pause();
                activeMediaVideo.src = '';
                activeMediaVideo.remove();
                activeMediaVideo = null;
            }
            if (activeMediaTexture) {
                activeMediaTexture.destroy(true);
                activeMediaTexture = null;
            }
            mediaContainer.removeChildren();
            mediaContainer.visible = false;
            return true;
        }

        const cached = clipPool.get(url);
        const srcToUse = cached ? cached.blobUrl : getFileUrl(url);

        if (cached) {
            console.log(`[SaleRenderer] 🚀 Using preloaded blob URL for media/TVC: ${url.split('/').pop()}`);
        }

        if (activeMediaVideo && (activeMediaVideo.src === srcToUse || activeMediaVideo.src === getFileUrl(url))) {
            return true;
        }

        if (activeMediaVideo) {
            activeMediaVideo.pause();
            activeMediaVideo.src = '';
            activeMediaVideo.remove();
            activeMediaVideo = null;
        }
        if (activeMediaTexture) {
            activeMediaTexture.destroy(true);
            activeMediaTexture = null;
        }
        mediaContainer.removeChildren();

        try {
            const video = document.createElement('video');
            video.src = srcToUse;
            video.autoplay = true;
            video.loop = true;
            video.muted = true;
            video.playsInline = true;

            let loadedSuccessfully = false;
            await new Promise<void>((resolve) => {
                const timer = setTimeout(() => {
                    console.warn(`[SaleRenderer] Media load timeout for ${url}`);
                    resolve();
                }, 5000);
                video.oncanplay = () => {
                    clearTimeout(timer);
                    loadedSuccessfully = true;
                    resolve();
                };
                video.onerror = () => {
                    clearTimeout(timer);
                    loadedSuccessfully = false;
                    resolve();
                };
                video.load();
            });

            if (!loadedSuccessfully) {
                video.pause();
                video.src = '';
                video.remove();
                return false;
            }

            if (currentMediaUrl !== targetUrl) {
                video.pause();
                video.src = '';
                video.remove();
                return false;
            }

            await video.play().catch(e => console.warn('[SaleRenderer] Media play failed:', e));
            
            if (currentMediaUrl !== targetUrl) {
                video.pause();
                video.src = '';
                video.remove();
                return false;
            }

            activeMediaVideo = video;
            activeMediaTexture = PIXI.Texture.from(video);
            
            const sprite = new PIXI.Sprite(activeMediaTexture);
            mediaContainer.addChild(sprite);
            mediaContainer.visible = true;
            
            if (app) {
                const scale = Math.max(app.screen.width / activeMediaTexture.width, app.screen.height / activeMediaTexture.height);
                sprite.scale.set(scale);
                sprite.anchor.set(0.5);
                sprite.x = app.screen.width / 2;
                sprite.y = app.screen.height / 2;
            }
            return true;
        } catch (e) {
            console.error("[SaleRenderer] Failed to play media video:", e);
            return false;
        }
    };

    /**
     * Play a specific state for a persona.
     * state có thể là:
     *   - ObjectId (24 hex) → clip riêng cho sản phẩm đó
     *   - "product"          → generic product intro (không có id cụ thể)
     *   - "speaking", "wave", "checkout", "victory", ... → gesture alias
     */
    const playState = async (uuid: string, state: string, persona: any, productId?: string) => {
        console.log(`[SaleRenderer] playState for ${uuid}: state=${state}, productId=${productId}`);
        const clips = persona.visual?.aidolClips || {};

        let clipUrl = '';

        const isProductId = /^[0-9a-fA-F]{24}$/.test(state);
        const isProductState = isProductId || state === 'product';

        if (isProductState) {
            const targetProductId = productId || (isProductId ? state : null);
            let productVideoUrl = '';
            let product = null;
            if (targetProductId) {
                product = studioStore.liveProducts?.find((p: any) => p._id === targetProductId || p.id === targetProductId)
                       || studioStore.featuredProducts?.find((p: any) => p._id === targetProductId || p.id === targetProductId);
                if (product && product.video) {
                    productVideoUrl = product.video;
                }
            }

            const aidolClipUrl = targetProductId ? clips[targetProductId] : (state === 'product' ? clips['product'] : '');

            // Determine mode if both exist, or fallbacks
            let chosenMode: 'tvc' | 'aidol' | 'fallback' = 'fallback';
            if (productVideoUrl && aidolClipUrl) {
                // Alternating mode
                if (targetProductId) {
                    const lastMode = lastProductModes.get(targetProductId);
                    if (lastMode === 'tvc') {
                        chosenMode = 'aidol';
                        lastProductModes.set(targetProductId, 'aidol');
                    } else {
                        chosenMode = 'tvc';
                        lastProductModes.set(targetProductId, 'tvc');
                    }
                } else {
                    chosenMode = 'tvc';
                }
            } else if (productVideoUrl) {
                chosenMode = 'tvc';
            } else if (aidolClipUrl) {
                chosenMode = 'aidol';
            }

            if (chosenMode === 'tvc') {
                console.log(`[SaleRenderer] Playing TVC video full screen: ${productVideoUrl}`);
                const mediaOk = await updateMedia(productVideoUrl);
                if (mediaOk) {
                    if (studioStore.activeScene?.id !== 'pip') {
                        previousSceneId = studioStore.activeScene?.id || 'standard';
                        studioStore.switchScene('pip');
                    }
                    clipUrl = clips['speaking'] || clips['idle'] || '';
                } else {
                    console.warn(`[SaleRenderer] ⚠️ TVC video failed to load (${productVideoUrl}). Falling back to character "product" / "speaking" state.`);
                    updateMedia(null);
                    if (studioStore.activeScene?.id === 'pip') {
                        studioStore.switchScene(previousSceneId || 'standard');
                        previousSceneId = null;
                    }
                    clipUrl = aidolClipUrl || clips['speaking'] || clips['product'] || clips['idle'] || '';
                }
            } else if (chosenMode === 'aidol') {
                console.log(`[SaleRenderer] Using green screen video for product: ${aidolClipUrl}`);
                clipUrl = aidolClipUrl;
                updateMedia(null);
                if (studioStore.activeScene?.id === 'pip') {
                    studioStore.switchScene(previousSceneId || 'standard');
                    previousSceneId = null;
                }
            } else {
                // Fallback to speaking state to prevent loop
                console.log(`[SaleRenderer] Neither TVC nor green screen video exists. Falling back to speaking.`);
                updateMedia(null);
                if (studioStore.activeScene?.id === 'pip') {
                    studioStore.switchScene(previousSceneId || 'standard');
                    previousSceneId = null;
                }
                clipUrl = clips['speaking'] || clips['idle'] || '';
            }
        } else {
            // Non-product state transition -> Clear TVC video and restore main view
            updateMedia(null);
            if (studioStore.activeScene?.id === 'pip') {
                studioStore.switchScene(previousSceneId || 'standard');
                previousSceneId = null;
            }

            // Gesture alias mapping (speaking, wave, checkout, ...)
            const normalizedMap: Record<string, string[]> = {
                speaking:      ['speaking', 'idle'],
                excited:       ['excited', 'hype', 'speaking', 'idle'],
                happy:         ['happy', 'speaking', 'idle'],
                victory:       ['victory', 'hype', 'speaking', 'idle'],
                product_intro: ['product', 'speaking', 'idle'],
                checkout:      ['checkout', 'speaking', 'idle'],
                wave:          ['wave', 'idle'],
                dance:         ['dance', 'idle'],
                hype:          ['hype', 'speaking', 'idle'],
                gift_react:    ['gift_react', 'hype', 'speaking', 'idle'],
                idle:          ['idle'],
            };

            const candidates = normalizedMap[state] || [state, 'speaking', 'idle'];
            for (const key of candidates) {
                if (clips[key]) { clipUrl = clips[key]; break; }
            }
            console.log(`[SaleRenderer] Resolved state as gesture: ${state}. Candidates: ${candidates.join(', ')}. Selected clipUrl: ${clipUrl}`);
        }

        if (clipUrl) {
            await transitionToClip(uuid, clipUrl);
        } else {
            console.warn(`[SaleRenderer] Could not resolve clipUrl for state: ${state}, productId: ${productId}`);
        }
    };

    /**
     * Swap clip — tra cứu từ blob pool trước (không tốn network),
     * fallback sang fetch on-demand nếu chưa preload.
     */
    const transitionToClip = async (uuid: string, videoUrl: string, chromaSettings?: any) => {
        const char = getOrCreateCharacter(uuid);
        char.currentTargetClipUrl = videoUrl;
        const targetUrl = videoUrl;
        const poolEntry = clipPool.get(videoUrl);

        if (poolEntry) {
            // ── Pool hit: pause/play only, no extra network fetch ──
            if (char.activeVideo === poolEntry.video) return; // already playing

            // Pause previous video (retained in pool, not destroyed)
            if (char.activeVideo) {
                char.activeVideo.pause();
            }

            // Create PIXI texture once for this video (cached)
            if (!poolEntry.texture) {
                poolEntry.texture = PIXI.Texture.from(poolEntry.video);
            }

            // Play new video from blob (instant, network independent)
            try {
                poolEntry.video.currentTime = 0; // Reset playhead to first frame
                await poolEntry.video.play();
            } catch (e) { /* autoplay policy */ }

            char.sprite.texture = poolEntry.texture;
            char.activeVideo = poolEntry.video;

        } else {
            // ── Pool miss: fallback double-buffer fetch on-demand ──
            console.warn(`[SaleRenderer] Pool miss, fetching on-demand: ${videoUrl}`);

            if (char.activeVideo?.src?.includes(videoUrl)) return;
            const fullUrl = getFileUrl(videoUrl);

            const nextVideo = document.createElement('video');
            nextVideo.crossOrigin = 'anonymous';
            nextVideo.playsInline = true;
            nextVideo.muted = true;
            nextVideo.loop = true;
            nextVideo.preload = 'auto';
            nextVideo.src = fullUrl;

            await new Promise<void>((resolve) => {
                const timer = setTimeout(() => {
                    console.warn(`[SaleRenderer] Pool-miss fetch timeout for ${videoUrl}`);
                    resolve();
                }, 5000); // 5s failsafe timeout
                nextVideo.oncanplay = () => {
                    clearTimeout(timer);
                    resolve();
                };
                nextVideo.onerror  = () => {
                    clearTimeout(timer);
                    resolve();
                };
                nextVideo.load();
            });

            if (char.currentTargetClipUrl !== targetUrl) {
                nextVideo.pause();
                nextVideo.src = '';
                nextVideo.remove();
                return;
            }

            try {
                nextVideo.currentTime = 0; // Reset playhead to first frame
                await nextVideo.play();
            } catch (e) {
                console.error(`[SaleRenderer] Video play failed:`, e);
                nextVideo.remove();
                return;
            }

            if (char.currentTargetClipUrl !== targetUrl) {
                nextVideo.pause();
                nextVideo.src = '';
                nextVideo.remove();
                return;
            }

            const nextTexture = PIXI.Texture.from(nextVideo);
            const prevTexture = char.sprite.texture;
            char.sprite.texture = nextTexture;

            const oldVideo = char.activeVideo;
            char.activeVideo = nextVideo;

            if (oldVideo && oldVideo !== nextVideo) {
                oldVideo.pause();
                oldVideo.src = '';
                oldVideo.load();
                oldVideo.remove();
            }
            if (prevTexture && prevTexture !== PIXI.Texture.EMPTY && prevTexture !== nextTexture) {
                setTimeout(() => prevTexture.destroy(true), 100);
            }
        }

        if (chromaSettings) {
            const filter = char.sprite.filters![0] as ChromakeyFilter;
            filter.similarity = chromaSettings.similarity || 0.35;
            filter.smoothness = chromaSettings.smoothness || 0.15;
            if (chromaSettings.keyColor) {
                filter.keyColor = chromaSettings.keyColor.startsWith('#')
                    ? hexToRgb(chromaSettings.keyColor)
                    : [0, 1, 0];
            }
        }
    };

    const hexToRgb = (hex: string): [number, number, number] => {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        return [r, g, b];
    };

    const updateLayouts = (guests: any[], scene: any) => {
        if (!app) return;
        const { width, height } = app.screen;
        const regions = scene.layout.regions;

        guests.forEach((guest, idx) => {
            const char = getOrCreateCharacter(guest.uuid);
            const region = regions.find((r: any) => r.source === `guest${idx + 1}`) || regions[0];
            
            if (region) {
                const targetX = (region.x / 100) * width + (region.width / 200) * width;
                const targetY = (region.y / 100) * height + (region.height / 200) * height;
                const targetW = (region.width / 100) * width;
                const targetH = (region.height / 100) * height;

                char.container.position.set(targetX, targetY);
                
                let texW = 1080;
                let texH = 1920;
                if (char.sprite.texture && char.sprite.texture !== PIXI.Texture.EMPTY && char.sprite.texture.width > 1) {
                    texW = char.sprite.texture.width;
                    texH = char.sprite.texture.height;
                }
                
                const scale = Math.min(targetW / texW, targetH / texH);
                char.container.scale.set(scale);
                char.container.visible = true;

                if (!char.initialized) {
                    char.initialized = true;
                    playState(guest.uuid, 'idle', guest.persona || guest);
                }

                // Only swap clip when state ACTUALLY changes (not called every frame)
                // Priority: gesture (from FSM directive) > isSpeaking > idle
                const activeProductId = guest.activeProductId || guest.persona?.visual?.activePropId;
                const targetState = guest.gesture || (guest.isSpeaking ? 'speaking' : 'idle');

                if (char.currentState !== targetState || char.currentProductId !== activeProductId) {
                    char.currentState = targetState;
                    char.currentProductId = activeProductId;
                    // Do not await here to avoid blocking ticker - fire and forget
                    playState(guest.uuid, targetState, guest.persona || guest, activeProductId);
                }
            }
        });

        // Hide inactive users
        const guestIds = new Set(guests.map(g => g.uuid));
        characters.forEach((char, uuid) => {
            if (!guestIds.has(uuid)) {
                char.container.visible = false;
            }
        });
    };

    const disposeCharacter = (uuid: string) => {
        const char = characters.get(uuid);
        if (!char) return;

        if (char.activeVideo) {
            char.activeVideo.pause();
            char.activeVideo.src = '';
            char.activeVideo.remove();
        }
        char.sprite.texture?.destroy(true);
        char.container.destroy({ children: true });
        characters.delete(uuid);
    };

    const destroyAll = () => {
        const ids = Array.from(characters.keys());
        ids.forEach(id => disposeCharacter(id));
        disposePool();
        mainContainer.destroy({ children: true });
    };

    return {
        container: mainContainer,
        init,
        preloadClips,
        disposePool,
        playState,
        transitionToClip,
        disposeCharacter,
        destroyAll,
        updateLayouts,
        updateBackground: async (imgUrl: string | null) => {
            if (!imgUrl) {
                bgContainer.removeChildren();
                return;
            }
            try {
                const bgUrl = getFileUrl(imgUrl);
                const texture = await PIXI.Texture.fromURL(bgUrl);
                if (texture && app) {
                    const bgSprite = new PIXI.Sprite(texture);
                    bgContainer.removeChildren();
                    bgContainer.addChild(bgSprite);
                    
                    const { width, height } = app.screen;
                    const scale = Math.max(width / texture.width, height / texture.height);
                    bgSprite.scale.set(scale);
                    bgSprite.anchor.set(0.5);
                    bgSprite.x = width / 2;
                    bgSprite.y = height / 2;
                }
            } catch (e) {
                console.error("[SaleRenderer] Failed to apply background", e);
            }
        },
        updateMedia,
        updateProductOverlay: async (product: any) => {
            if (!app) return;

            const productId = product?._id || product?.id || null;

            if (!product) {
                overlayContainer.removeChildren();
                currentOverlayProductId = null;
                return;
            }

            // If same product is already rendered → skip rebuild to prevent flicker
            if (productId && currentOverlayProductId === productId) {
                return;
            }

            currentOverlayProductId = productId;

            console.log("[SaleRenderer] Drawing vertical product card for:", product.name);

            // ── Vertical layout: product image top -> info middle -> large QR bottom ──
            const cardW = 260;
            const qrSize = 180;
            const imgSize = 160;
            const infoH = 90;
            const cardH = imgSize + infoH + qrSize + 50; // ~480px
            const cardX = 50;
            const cardY = app.screen.height - cardH - 60;

            // Build complete card inside temporary container first → single atomic swap to prevent flicker
            const tempCard = new PIXI.Graphics();
            tempCard.beginFill(0x0a0a14, 0.92);
            tempCard.lineStyle(1.5, 0x6366f1, 0.3);
            tempCard.drawRoundedRect(0, 0, cardW, cardH, 28);
            tempCard.endFill();
            tempCard.position.set(cardX, cardY);

            // ── 2. Product image: await texture load ──
            try {
                const imgUrl = getFileUrl(product.image || product.thumbnail || product.imageUrl || '');
                if (imgUrl) {
                    const imgTexture = await PIXI.Texture.fromURL(imgUrl).catch(() => null);
                    if (imgTexture) {
                        const imgSprite = new PIXI.Sprite(imgTexture);
                        imgSprite.width = imgSize;
                        imgSprite.height = imgSize;
                        imgSprite.position.set((cardW - imgSize) / 2, 16);

                        const imgMask = new PIXI.Graphics();
                        imgMask.beginFill(0xffffff);
                        imgMask.drawRoundedRect(0, 0, imgSize, imgSize, 20);
                        imgMask.endFill();
                        imgMask.position.set((cardW - imgSize) / 2, 16);
                        imgSprite.mask = imgMask;

                        tempCard.addChild(imgMask);
                        tempCard.addChild(imgSprite);
                    }
                }
            } catch (e) {
                console.error("[SaleRenderer] Product image failed:", e);
            }

            // ── 3. Product name ──
            const nameText = new PIXI.Text(product.name.toUpperCase(), {
                fontFamily: 'Inter, Arial, sans-serif',
                fontSize: 14,
                fill: 0xffffff,
                fontWeight: 'bold',
                wordWrap: true,
                wordWrapWidth: cardW - 20,
                align: 'center'
            });
            nameText.anchor.set(0.5, 0);
            nameText.position.set(cardW / 2, imgSize + 22);
            tempCard.addChild(nameText);

            // ── 4. Price ──
            const currency = product.currency || 'USD';
            const priceStr = currency === 'VND'
                ? `${Number(product.price).toLocaleString('vi-VN')}đ`
                : `$${product.price}`;
            const priceText = new PIXI.Text(priceStr, {
                fontFamily: 'Inter, Arial, sans-serif',
                fontSize: 26,
                fill: 0xfbbf24,
                fontWeight: '900'
            });
            priceText.anchor.set(0.5, 0);
            priceText.position.set(cardW / 2, imgSize + 50);
            tempCard.addChild(priceText);

            // ── Divider ──
            const divider = new PIXI.Graphics();
            divider.lineStyle(1, 0x6366f1, 0.25);
            divider.moveTo(20, 0).lineTo(cardW - 20, 0);
            divider.position.set(0, imgSize + infoH + 4);
            tempCard.addChild(divider);

            // ── 5. QR code: await texture load ──
            try {
                const targetUrl = product.link || product.url || window.location.href;
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&color=ffffff&bgcolor=0a0a14&data=${encodeURIComponent(targetUrl)}`;
                const qrTexture = await PIXI.Texture.fromURL(qrUrl).catch(() => null);
                if (qrTexture) {
                    const qrSprite = new PIXI.Sprite(qrTexture);
                    qrSprite.width = qrSize;
                    qrSprite.height = qrSize;
                    const qrX = (cardW - qrSize) / 2;
                    const qrY = imgSize + infoH + 12;
                    qrSprite.position.set(qrX, qrY);

                    const qrMask = new PIXI.Graphics();
                    qrMask.beginFill(0xffffff);
                    qrMask.drawRoundedRect(0, 0, qrSize, qrSize, 12);
                    qrMask.endFill();
                    qrMask.position.set(qrX, qrY);
                    qrSprite.mask = qrMask;

                    tempCard.addChild(qrMask);
                    tempCard.addChild(qrSprite);

                    const scanText = new PIXI.Text('SCAN TO BUY', {
                        fontFamily: 'Inter, Arial, sans-serif',
                        fontSize: 10,
                        fill: 0xa5b4fc,
                        fontWeight: 'bold',
                        letterSpacing: 2,
                        align: 'center'
                    });
                    scanText.anchor.set(0.5, 0);
                    scanText.position.set(cardW / 2, imgSize + infoH + 12 + qrSize + 6);
                    tempCard.addChild(scanText);
                }
            } catch (e) {
                console.error("[SaleRenderer] QR code failed:", e);
            }

            // Swap entire overlay once after everything is loaded → no flicker
            overlayContainer.removeChildren();
            overlayContainer.addChild(tempCard);
        },
        getCharacter: (uuid: string) => characters.get(uuid)
    };
}
