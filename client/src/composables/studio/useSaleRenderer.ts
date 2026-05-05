import * as PIXI from 'pixi.js';
import { ChromakeyFilter } from '@/utils/webgl/PIXIFilters';
import { getFileUrl } from '@/utils/api';

/**
 * useSaleRenderer
 * High-performance multi-character rendering engine for SaleStudioV2.
 * Manages multiple character instances with independent dual-video cross-fading.
 */
export function useSaleRenderer(app: PIXI.Application | null, studioStore: any) {
    const bgContainer = new PIXI.Container();
    bgContainer.name = 'BackgroundLayer';

    const mainContainer = new PIXI.Container();
    mainContainer.name = 'MultiCharacterLayer';

    const mediaContainer = new PIXI.Container();
    mediaContainer.name = 'MediaLayer';

    // Character Instances: Map<uuid, CharacterObject>
    const characters = new Map<string, {
        container: PIXI.Container;
        spriteA: PIXI.Sprite;
        spriteB: PIXI.Sprite;
        activeVideo: HTMLVideoElement | null;
        isTransitioning: boolean;
        activeSprite: PIXI.Sprite;
        inactiveSprite: PIXI.Sprite;
        initialized: boolean;
    }>();

    const FADE_SPEED = 0.05;

    /**
     * Create/Retrieve a character instance
     */
    const getOrCreateCharacter = (uuid: string) => {
        if (characters.has(uuid)) return characters.get(uuid)!;

        const container = new PIXI.Container();
        container.name = `Character_${uuid}`;
        
        const spriteA = new PIXI.Sprite();
        const spriteB = new PIXI.Sprite();
        spriteB.alpha = 0;

        const chromaFilterA = new ChromakeyFilter([0, 1, 0], 0.35, 0.15);
        const chromaFilterB = new ChromakeyFilter([0, 1, 0], 0.35, 0.15);
        spriteA.filters = [chromaFilterA];
        spriteB.filters = [chromaFilterB];

        container.addChild(spriteA);
        container.addChild(spriteB);
        mainContainer.addChild(container);

        const charObj = {
            container,
            spriteA,
            spriteB,
            activeVideo: null,
            isTransitioning: false,
            activeSprite: spriteA,
            inactiveSprite: spriteB,
            initialized: false
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
    };

    /**
     * Play a specific state for a persona
     */
    const playState = async (uuid: string, state: string, persona: any, productId?: string) => {
        console.log(`[SaleRenderer] playState for ${uuid}:`, state);
        // Normalize incoming gesture string to canonical aidolClip keys.
        // SaleRunner sends emotion-type states (e.g. 'speaking', 'excited', 'happy', 'victory')
        // that map to standard aidol animation categories.
        const clips = persona.visual?.aidolClips || {};
        // console.log("clips", clips);

        let clipUrl = '';

        // 1. Direct product clip override
        if (state === 'product' || productId) {
            if(productId && clips[productId]){
                clipUrl = clips[productId];
            }else{
                clipUrl = clips['product'];
            }
            // console.log("clipUrl", clipUrl);
        }

        // 2. Exact and alias mapping
        if (!clipUrl) {
            const normalizedMap: Record<string, string[]> = {
                speaking: ['speaking', 'idle'],
                excited:  ['excited', 'hype', 'speaking', 'idle'],
                happy:    ['happy', 'speaking', 'idle'],
                victory:  ['victory', 'hype', 'speaking', 'idle'],
                product_intro: ['product', 'speaking', 'idle'],
                checkout: ['checkout', 'speaking', 'idle'],
                wave:     ['wave', 'idle'],
                dance:    ['dance', 'idle'],
                hype:     ['hype', 'speaking', 'idle'],
                gift_react: ['gift_react', 'hype', 'speaking', 'idle'],
                idle:     ['idle'],
            };

            const candidates = normalizedMap[state] || [state, 'speaking', 'idle'];
            for (const key of candidates) {
                if (clips[key]) { 
                    // console.log("clipUrl", clips[key]);
                    clipUrl = clips[key]; 
                    break; 
                }
            }
        }
        
        if (clipUrl) {
            await transitionToClip(uuid, clipUrl);
        }
    };

    /**
     * Crossfade to a new video clip
     */
    const transitionToClip = async (uuid: string, videoUrl: string, chromaSettings?: any) => {
        // console.log("transitionToClip uuid", uuid, videoUrl, chromaSettings);
        const char = getOrCreateCharacter(uuid);
        if (char.isTransitioning) return;
        
        if (char.activeVideo?.src?.includes(videoUrl)) return;
        char.isTransitioning = true;
        // console.log("transitionToClip videoUrl", videoUrl);
        const fullUrl = getFileUrl(videoUrl);
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.playsInline = true;
        video.muted = true;
        video.loop = true;
        video.src = fullUrl;

        try {
            await video.play();
        } catch (e) {
            console.error(`[SaleRenderer] Video play failed for ${uuid}:`, e);
            char.isTransitioning = false;
            return;
        }

        const texture = PIXI.Texture.from(video);
        char.inactiveSprite.texture = texture;
        char.inactiveSprite.anchor.set(0.5);

        // Update Chroma Filters with latest store values if provided
        const filterA = char.spriteA.filters![0] as ChromakeyFilter;
        const filterB = char.spriteB.filters![0] as ChromakeyFilter;
        
        const applySettings = (f: ChromakeyFilter, s: any) => {
            if (s.keyColor) f.keyColor = s.keyColor.startsWith('#') ? hexToRgb(s.keyColor) : [0, 1, 0];
            f.similarity = s.similarity || 0.35;
            f.smoothness = s.smoothness || 0.15;
        };

        if (chromaSettings) {
            applySettings(filterA, chromaSettings);
            applySettings(filterB, chromaSettings);
        }

        const ticker = (dt: number) => {
             if (char.inactiveSprite.alpha < 1) {
                 char.inactiveSprite.alpha += FADE_SPEED * dt;
                 char.activeSprite.alpha -= FADE_SPEED * dt;
             } else {
                 char.inactiveSprite.alpha = 1;
                 char.activeSprite.alpha = 0;
                 
                 const temp = char.activeSprite;
                 char.activeSprite = char.inactiveSprite;
                 char.inactiveSprite = temp;
                 
                 if (char.activeVideo) {
                     char.activeVideo.pause();
                     char.activeVideo.src = '';
                     char.activeVideo.remove();
                 }

                 if (char.inactiveSprite.texture && char.inactiveSprite.texture !== PIXI.Texture.EMPTY) {
                     char.inactiveSprite.texture.destroy(true);
                 }

                 char.activeVideo = video;
                 char.isTransitioning = false;
                 app!.ticker.remove(ticker);
             }
        };

        app!.ticker.add(ticker);
    };

    /**
     * Helper: Convert Hex to RGB [0, 1]
     */
    const hexToRgb = (hex: string): [number, number, number] => {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        return [r, g, b];
    };

    /**
     * Update Character Layouts based on Scene
     */
    const updateLayouts = (guests: any[], scene: any) => {
        if (!app) return;
        const { width, height } = app.screen;
        const regions = scene.layout.regions;

        // 1. Host Layout (Main Region)
        const hostRegion = regions.find((r: any) => r.source === 'host');
        if (hostRegion) {
             // Host isn't a "guest" in the characters map if they are the local user, 
             // but if they are an AI Host, they might be.
             // For SaleStudioV2, we treat all AI personas as "guests" in the renderer.
        }

        // 2. Map guests to guest regions
        guests.forEach((guest, idx) => {
            const char = getOrCreateCharacter(guest.uuid);
            const region = regions.find((r: any) => r.source === `guest${idx + 1}`) || regions[0];
            
            if (region) {
                const targetX = (region.x / 100) * width + (region.width / 200) * width;
                const targetY = (region.y / 100) * height + (region.height / 200) * height;
                const targetW = (region.width / 100) * width;
                const targetH = (region.height / 100) * height;

                char.container.position.set(targetX, targetY);
                
                // Scale to perfectly cover the region, evaluating true video texture dimensions
                let texW = 1080;
                let texH = 1920;
                if (char.activeSprite.texture && char.activeSprite.texture !== PIXI.Texture.EMPTY && char.activeSprite.texture.width > 1) {
                    texW = char.activeSprite.texture.width;
                    texH = char.activeSprite.texture.height;
                } else if (char.inactiveSprite.texture && char.inactiveSprite.texture !== PIXI.Texture.EMPTY && char.inactiveSprite.texture.width > 1) {
                    texW = char.inactiveSprite.texture.width;
                    texH = char.inactiveSprite.texture.height;
                }
                
                const scale = Math.min(targetW / texW, targetH / texH);
                char.container.scale.set(scale);
                
                char.container.visible = true;

                // Auto-Idle if new
                const internalChar = characters.get(guest.uuid);
                if (internalChar && !internalChar.initialized) {
                    internalChar.initialized = true;
                    playState(guest.uuid, 'idle', guest.persona || guest);
                }
            }
        });

        // Hide characters not in current guests
        const guestIds = new Set(guests.map(g => g.uuid));
        characters.forEach((char, uuid) => {
            if (!guestIds.has(uuid)) {
                char.container.visible = false;
            }
        });
    };

    /**
     * Batch Disposal
     */
    const disposeCharacter = (uuid: string) => {
        const char = characters.get(uuid);
        if (!char) return;

        if (char.activeVideo) {
            char.activeVideo.pause();
            char.activeVideo.src = '';
            char.activeVideo.remove();
        }
        
        // Final video cleanup for inactive sprite if it's a video texture
        if (char.spriteA.texture?.baseTexture.resource instanceof PIXI.VideoResource) {
            const v = char.spriteA.texture.baseTexture.resource.source as HTMLVideoElement;
            v.pause(); v.src = ''; v.remove();
        }
        if (char.spriteB.texture?.baseTexture.resource instanceof PIXI.VideoResource) {
            const v = char.spriteB.texture.baseTexture.resource.source as HTMLVideoElement;
            v.pause(); v.src = ''; v.remove();
        }

        char.spriteA.texture?.destroy(true);
        char.spriteB.texture?.destroy(true);
        char.container.destroy({ children: true });
        characters.delete(uuid);
    };

    const destroyAll = () => {
        const ids = Array.from(characters.keys());
        ids.forEach(id => disposeCharacter(id));
        mainContainer.destroy({ children: true });
    };

    return {
        container: mainContainer,
        init,
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
        updateMedia: async (url: string | null) => {
            // Media Layer Logic (Background TVC)
            if (!url) {
                mediaContainer.visible = false;
                return;
            }
            const fullUrl = getFileUrl(url);
            const video = document.createElement('video');
            video.src = fullUrl;
            video.autoplay = true;
            video.loop = true;
            video.muted = true;
            video.playsInline = true;
            await video.play();
            
            const texture = PIXI.Texture.from(video);
            const sprite = new PIXI.Sprite(texture);
            mediaContainer.removeChildren();
            mediaContainer.addChild(sprite);
            mediaContainer.visible = true;
            
            const scale = Math.max(app!.screen.width / texture.width, app!.screen.height / texture.height);
            sprite.scale.set(scale);
            sprite.anchor.set(0.5);
            sprite.x = app!.screen.width / 2;
            sprite.y = app!.screen.height / 2;
        },
        getCharacter: (uuid: string) => characters.get(uuid)
    };
}
