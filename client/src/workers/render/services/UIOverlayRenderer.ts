import * as Shaders from '@/utils/webgl/WebGLShaders';
import { ShaderLibrary } from '@/utils/webgl/ShaderLibrary';

export class UIOverlayRenderer {
    private gl: WebGL2RenderingContext | WebGLRenderingContext | null = null;
    private shaderLib: ShaderLibrary | null = null;
    private canvasWidth: number = 0;
    private canvasHeight: number = 0;
    private compositeProgram: Shaders.ShaderProgram | null = null;

    // Canvas 2D Offscreen
    private lyricsCanvas: OffscreenCanvas | null = null;
    private lyricsCtx: any = null;
    private lyricsTexture: WebGLTexture | null = null;

    private subtitleCanvas: OffscreenCanvas | null = null;
    private subtitleCtx: any = null;
    private subtitleTexture: WebGLTexture | null = null;

    private graphicsCanvas: OffscreenCanvas | null = null;
    private graphicsCtx: any = null;
    private graphicsTexture: WebGLTexture | null = null;

    // CapCut Subtitle State
    private captionCanvas: OffscreenCanvas | null = null;
    private captionCtx: any = null;
    private captionTexture: WebGLTexture | null = null;
    private lastCaptionId: string = '';
    private captionStartTime: number = 0;

    // State
    private tickerOffset: number = 0;
    private targetRatio: '16:9' | '9:16' | 'both' = '16:9';

    init(
        gl: WebGL2RenderingContext | WebGLRenderingContext,
        width: number,
        height: number,
        shaderLib: ShaderLibrary
    ) {
        this.gl = gl;
        this.canvasWidth = width;
        this.canvasHeight = height;
        this.shaderLib = shaderLib;
        this.compositeProgram = shaderLib.getOrCompile('composite', Shaders.createCompositeShader);
    }

    resize(width: number, height: number) {
        this.canvasWidth = width;
        this.canvasHeight = height;
        // Recreate graphics canvas on resize
        if (this.graphicsCanvas) {
            this.graphicsCanvas.width = width;
            this.graphicsCanvas.height = height;
        }
    }

    setTargetRatio(ratio: '16:9' | '9:16' | 'both') {
        this.targetRatio = ratio;
    }

    private ensureGraphicsCanvas() {
        if (!this.graphicsCanvas) {
            this.graphicsCanvas = new OffscreenCanvas(this.canvasWidth, this.canvasHeight);
            this.graphicsCtx = this.graphicsCanvas.getContext('2d');
        }
        return this.graphicsCtx;
    }

    public clearGraphics() {
        const ctx = this.ensureGraphicsCanvas();
        if (ctx && this.graphicsCanvas) {
            ctx.clearRect(0, 0, this.graphicsCanvas.width, this.graphicsCanvas.height);
        }
    }

    public renderUI(state: any, time: number) {
        if (!this.gl) return;
        
        const ctx = this.ensureGraphicsCanvas();
        ctx.clearRect(0, 0, this.graphicsCanvas!.width, this.graphicsCanvas!.height);
        
        // Priority 4: Full Screen Overlays (Blocking)
        if (state.breakMode) {
            this.drawBreakOverlay(time, state.breakMessage);
            this.uploadAndRenderGraphics();
            return;
        }
        
        if (state.finalRecap) {
            this.drawFinalRecapCard(state.finalRecap, this.canvasWidth, this.canvasHeight);
            this.uploadAndRenderGraphics();
            return;
        }
        
        // Priority 1: Aura (Background Effect)
        if (state.hypeLevel && state.hypeLevel > 0.5) {
            this.drawSingularityAura(state.hypeLevel);
        }
        
        // Priority 2: Branding
        if (state.logoImage && state.branding) {
            this.drawBrandLogo(state.logoImage, state.branding);
        }
        
        if (state.sponsorName) {
            this.drawSponsorshipBadge(state.sponsorName);
        }
        
        if (state.tickerText) {
            this.drawTicker(state.tickerText);
        }
        
        if (state.activeScene && state.slotMap) {
            this.drawLowerThird(state.branding, state.activeScene, state.slotMap);
        }
        
        // Priority 4: Action/Interaction
        if (state.commerce) {
            this.drawCommerceOverlays(
                state.commerce.flashSale, 
                state.commerce.product, 
                state.commerce.qrCodeImage, 
                state.commerce.notifications, 
                time, 
                state.commerce.vibeScore ?? 85, 
                state.commerce.chatVelocity ?? 0
            );
        }
        
        if (state.quest) {
            this.drawQuestOverlay(state.quest, time);
        }
        
        if (state.facts) {
            this.drawFactCheckHub(state.facts, 40, 40);
        }
        
        // Category Specifics
        if (state.education) this.drawEducationOverlay(state.education);
        if (state.news) this.drawNewsOverlay(state.news);
        if (state.sport) this.drawSportOverlay(state.sport);
        if (state.sales) this.drawSalesOverlay(state.sales, state.commerce.qrCodeImage);
        if (state.gameShow) this.drawGameShowOverlay(state.gameShow);
        if (state.talkShow) this.drawTalkShowOverlay(state.talkShow);
        
        this.uploadAndRenderGraphics();
    }

    private wrapText(ctx: any, text: string, maxWidth: number) {
        if (!text) return [];
        const words = text.split(' ');
        const lines = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const width = ctx.measureText(currentLine + " " + word).width;
            if (width < maxWidth) {
                currentLine += " " + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);
        return lines;
    }

    renderLyricsInRegion(
        x: number, y: number, w: number, h: number,
        performanceLyrics: any[], currentTime: number, style: string
    ) {
        const gl = this.gl;
        if (!gl || !this.compositeProgram || !this.shaderLib) return;

        const currentLine = performanceLyrics.find(l => currentTime >= l.startTime && currentTime <= l.endTime);
        if (!currentLine) return;

        if (!this.lyricsCanvas) {
            this.lyricsCanvas = new OffscreenCanvas(512, 256);
            this.lyricsCtx = this.lyricsCanvas.getContext('2d');
        }
        const ctx = this.lyricsCtx!;
        ctx.clearRect(0, 0, this.lyricsCanvas.width, this.lyricsCanvas.height);

        let fontSize = 42;
        let fontWeight = 'bold';
        
        if (style === 'minimal') {
            fontSize = 28;
            fontWeight = '600';
        } else if (style === 'kinetic') {
            fontSize = 48;
        }

        const maxTextW = this.lyricsCanvas.width * 0.9;
        ctx.font = `${fontWeight} ${fontSize}px "Inter", sans-serif`;
        
        let lines = this.wrapText(ctx, currentLine.text, maxTextW);
        
        if (lines.length > 3 || (lines[0] && ctx.measureText(lines[0]).width > maxTextW)) {
            fontSize = Math.max(16, fontSize * 0.7);
            ctx.font = `${fontWeight} ${fontSize}px "Inter", sans-serif`;
            lines = this.wrapText(ctx, currentLine.text, maxTextW);
        }

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const textX = this.lyricsCanvas.width / 2;
        const lineHeight = fontSize * 1.2;
        const totalHeight = lines.length * lineHeight;
        const startY = (this.lyricsCanvas.height - totalHeight) / 2 + lineHeight / 2;

        ctx.save();
        
        if (style === 'minimal') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.beginPath();
            ctx.roundRect(maxTextW * 0.05, startY - lineHeight * 0.6, maxTextW, totalHeight + lineHeight * 0.2, 8);
            ctx.fill();
        } else if (style === 'kinetic') {
            ctx.transform(1, 0, 0.1, 0.95, 0, 0); 
        }

        lines.forEach((line: string, i: number) => {
            const textY = startY + i * lineHeight;
            
            if (style === 'neon') {
                ctx.shadowBlur = 12;
                ctx.shadowColor = 'rgba(0, 242, 255, 0.8)';
                ctx.lineWidth = 4;
                ctx.strokeStyle = '#00f2ff';
                ctx.strokeText(line, textX, textY);
                
                ctx.shadowBlur = 4;
                ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
                ctx.lineWidth = 2;
                ctx.strokeText(line, textX, textY);
            } else if (style === 'kinetic') {
                ctx.shadowBlur = 0;
                ctx.lineWidth = 4;
                ctx.strokeStyle = 'rgba(0,0,0,0.7)';
                ctx.strokeText(line, textX, textY);
            } else if (style !== 'minimal') {
                ctx.shadowBlur = 4;
                ctx.shadowColor = 'rgba(0,0,0,0.8)';
                ctx.lineWidth = 6;
                ctx.strokeStyle = '#000000';
                ctx.strokeText(line, textX, textY);
            }

            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(line, textX, textY);
        });
        
        ctx.restore();

        if (!this.lyricsTexture) {
            this.lyricsTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, this.lyricsTexture!);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }
        gl.bindTexture(gl.TEXTURE_2D, this.lyricsTexture!);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.lyricsCanvas as any);

        gl.bindTexture(gl.TEXTURE_2D, this.lyricsTexture!);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.lyricsCanvas as any);

        const lyricsW = w * 0.9;
        const lyricsH = (lyricsW * this.canvasWidth) / (2 * this.canvasHeight);
        const lyricsX = x + (w - lyricsW) / 2;
        const lyricsY = y + (h * 0.75) - lyricsH; 

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        if (this.shaderLib && this.compositeProgram) {
            this.shaderLib.renderQuad(this.compositeProgram, this.lyricsTexture!, {
                translation: [lyricsX, lyricsY],
                scale: [lyricsW, lyricsH],
                flipY: false
            });
        }

        gl.disable(gl.BLEND);
    }

    renderSubtitles(x: number, y: number, w: number, h: number, currentSubtitle: string) {
        if (!currentSubtitle || !this.gl || !this.compositeProgram) return;
        const gl = this.gl;

        if (!this.subtitleCanvas) {
            this.subtitleCanvas = new OffscreenCanvas(1024, 256);
            this.subtitleCtx = this.subtitleCanvas.getContext('2d');
        }

        const ctx = this.subtitleCtx;
        ctx.clearRect(0, 0, this.subtitleCanvas.width, this.subtitleCanvas.height);
        
        ctx.font = '900 48px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const textX = this.subtitleCanvas.width / 2;
        const textY = this.subtitleCanvas.height / 2;

        ctx.shadowBlur = 4;
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#000000';
        ctx.strokeText(currentSubtitle, textX, textY);

        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(currentSubtitle, textX, textY);

        if (!this.subtitleTexture) {
            this.subtitleTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, this.subtitleTexture!);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }
        gl.bindTexture(gl.TEXTURE_2D, this.subtitleTexture!);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.subtitleCanvas as any);

        gl.bindTexture(gl.TEXTURE_2D, this.subtitleTexture!);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.subtitleCanvas as any);

        const subW = w * 0.8;
        const subH = (subW * this.subtitleCanvas.height) / this.subtitleCanvas.width;
        const subX = x + (w - subW) / 2;
        const subY = y + (h * 0.9) - subH;

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        if (this.shaderLib && this.compositeProgram) {
            this.shaderLib.renderQuad(this.compositeProgram, this.subtitleTexture!, {
                translation: [subX, subY],
                scale: [subW, subH],
                flipY: false
            });
        }

        gl.disable(gl.BLEND);
    }

    renderCapCutSubtitle(x: number, y: number, w: number, h: number, caption: any, currentTime: number) {
        if (!caption || !this.gl || !this.compositeProgram) return;
        const gl = this.gl;

        if (this.lastCaptionId !== caption.id) {
            this.lastCaptionId = caption.id;
            this.captionStartTime = currentTime;
        }

        if (!this.captionCanvas) {
            this.captionCanvas = new OffscreenCanvas(1024, 256);
            this.captionCtx = this.captionCanvas.getContext('2d');
        }

        const ctx = this.captionCtx;
        ctx.clearRect(0, 0, this.captionCanvas.width, this.captionCanvas.height);
        
        const padding = 20;
        const fontSize = 56;
        ctx.font = `900 ${fontSize}px "Inter", "Arial Black", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const textX = this.captionCanvas.width / 2;
        const textY = this.captionCanvas.height / 2;

        // Animation: Pop-in scale
        const elapsed = currentTime - this.captionStartTime;
        const popDuration = 300;
        const scale = elapsed < popDuration 
            ? 0.8 + Math.sin((elapsed / popDuration) * Math.PI / 2) * 0.3 
            : 1.0;

        ctx.save();
        ctx.translate(textX, textY);
        ctx.scale(scale, scale);
        ctx.translate(-textX, -textY);

        // Word-level highlighting
        const words = caption.words || [];
        if (words.length > 0) {
            const totalWidth = ctx.measureText(caption.text).width;
            let currentX = textX - totalWidth / 2;

            words.forEach((word: any) => {
                const wordWidth = ctx.measureText(word.text).width;
                const spaceWidth = ctx.measureText(' ').width;
                const wordMidX = currentX + wordWidth / 2;
                
                // Highlight if active
                const isActive = currentTime >= word.start && currentTime <= word.end;
                
                // CapCut Style: Yellow highlight with black outline
                ctx.shadowBlur = 0;
                ctx.lineWidth = 10;
                ctx.strokeStyle = '#000000';
                ctx.lineJoin = 'round';
                ctx.strokeText(word.text, wordMidX, textY);

                if (isActive) {
                    ctx.fillStyle = '#FBFF00'; // Vibrant yellow
                    // Add a little extra pop to the active word
                    ctx.save();
                    ctx.translate(wordMidX, textY);
                    ctx.scale(1.1, 1.1);
                    ctx.translate(-wordMidX, -textY);
                    ctx.fillText(word.text, wordMidX, textY);
                    ctx.restore();
                } else {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillText(word.text, wordMidX, textY);
                }

                currentX += wordWidth + spaceWidth;
            });
        } else {
            // Fallback for full text
            ctx.shadowBlur = 0;
            ctx.lineWidth = 10;
            ctx.strokeStyle = '#000000';
            ctx.lineJoin = 'round';
            ctx.strokeText(caption.text, textX, textY);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(caption.text, textX, textY);
        }

        ctx.restore();

        if (!this.captionTexture) {
            this.captionTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, this.captionTexture!);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }
        gl.bindTexture(gl.TEXTURE_2D, this.captionTexture!);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.captionCanvas as any);

        gl.bindTexture(gl.TEXTURE_2D, this.captionTexture!);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.captionCanvas as any);

        const subW = w * 0.85;
        const subH = (subW * this.captionCanvas.height) / this.captionCanvas.width;
        const subX = x + (w - subW) / 2;
        const subY = y + (h * 0.88) - subH;

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        if (this.shaderLib && this.compositeProgram) {
            this.shaderLib.renderQuad(this.compositeProgram, this.captionTexture!, {
                translation: [subX, subY],
                scale: [subW, subH],
                flipY: false
            });
        }

        gl.disable(gl.BLEND);
    }

    drawBrandLogo(logoImage: ImageBitmap, branding: any) {
        if (!this.gl || !branding?.logoUrl || !logoImage) return;
        const ctx = this.ensureGraphicsCanvas();
        if (!ctx) return;
        
        const { logoPosition, logoScale } = branding;
        const logoSize = 80 * (logoScale || 1.0);
        const margin = 20;
        
        let x = 0, y = 0;
        switch (logoPosition || 'top-left') {
            case 'top-left': x = margin; y = margin; break;
            case 'top-right': x = this.canvasWidth - logoSize - margin; y = margin; break;
            case 'bottom-left': x = margin; y = this.canvasHeight - logoSize - margin; break;
            case 'bottom-right': x = this.canvasWidth - logoSize - margin; y = this.canvasHeight - logoSize - margin; break;
        }
        
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.drawImage(logoImage, x, y, logoSize, logoSize);
        ctx.restore();
    }

    drawBreakOverlay(time: number, message: string) {
        if (!this.gl) return;
        
        const ctx = this.ensureGraphicsCanvas();
        if (!ctx) return;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, this.graphicsCanvas.width, this.graphicsCanvas.height);
        
        const msg = message || 'We\'ll be right back!';
        ctx.font = 'bold 48px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const pulse = (Math.sin(time / 500) + 1) * 0.5;
        ctx.shadowBlur = 20 + pulse * 10;
        ctx.shadowColor = 'rgba(59, 130, 246, 0.8)';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(msg, this.graphicsCanvas.width / 2, this.graphicsCanvas.height / 2);
    }

    drawLowerThird(branding: any, activeScene: any, slotMap: Map<string, any>) {
        if (!this.gl || !activeScene) return;
        
        const ctx = this.ensureGraphicsCanvas();
        if (!ctx) return;

        const regions = activeScene.layout?.regions || [];
        
        regions.forEach((region: any) => {
            let identity = null;
            
            if (region.source === 'host') {
                identity = { ...branding };
                if (!identity.name) identity.name = 'Host';
            } else if (region.source.startsWith('guest')) {
                const guestData = slotMap.get(region.source);
                if (guestData) {
                    identity = {
                        name: guestData.name,
                        title: guestData.title,
                        color: branding.color
                    };
                }
            }
            
            if (identity && identity.name) {
                 const rx = (region.x / 100) * this.canvasWidth;
                 const ry = (region.y / 100) * this.canvasHeight;
                 const rw = (region.width / 100) * this.canvasWidth;
                 const rh = (region.height / 100) * this.canvasHeight;

                 const barHeight = 60; 
                 const lx = rx + 20;
                 const ly = ry + rh - barHeight - 20;
                 const lw = Math.min(rw - 40, 400); 
                 
                 const gradient = ctx.createLinearGradient(lx, ly, lx + lw, ly);
                 gradient.addColorStop(0, identity.color || '#3b82f6');
                 gradient.addColorStop(0.6, 'rgba(0, 0, 0, 0.8)');
                 gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                 
                 ctx.fillStyle = gradient;
                 ctx.fillRect(lx, ly, lw, barHeight);
                 
                 ctx.font = 'bold 24px "Inter", sans-serif';
                 ctx.fillStyle = '#ffffff';
                 ctx.textAlign = 'left';
                 ctx.textBaseline = 'top';
                 ctx.fillText(identity.name, lx + 20, ly + 15);
                 
                 if (identity.title) {
                    ctx.font = '14px "Inter", sans-serif';
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                    ctx.fillText(identity.title, lx + 20, ly + 45);
                 }
            }
        });
    }

    drawTicker(tickerText: string) {
        if (!this.gl) return;
        const ctx = this.ensureGraphicsCanvas();
        if (!ctx) return;
        const barHeight = 50;
        const y = this.canvasHeight - barHeight;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, y, this.canvasWidth, barHeight);
        
        ctx.font = 'bold 24px "Inter", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        
        const text = tickerText || 'Breaking News • Latest Updates • ';
        const textWidth = ctx.measureText(text).width;
        
        this.tickerOffset -= 2;
        if (this.tickerOffset < -textWidth) {
            this.tickerOffset += textWidth; 
        }
        
        const repeatCount = Math.ceil(this.canvasWidth / textWidth) + 2;
        for (let i = 0; i < repeatCount; i++) {
            ctx.fillText(text, this.tickerOffset + (textWidth * i), y + barHeight / 2);
        }
    }

    drawSponsorshipBadge(sponsorName: string) {
        if (!this.gl) return;
        const ctx = this.ensureGraphicsCanvas();
        if (!ctx) return;
        const badgeSize = 150;
        const x = this.canvasWidth - badgeSize - 20;
        const y = 20;
        
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + badgeSize, y);
        ctx.lineTo(x + badgeSize - 20, y + badgeSize / 2);
        ctx.lineTo(x + badgeSize, y + badgeSize);
        ctx.lineTo(x, y + badgeSize);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sponsorName || 'SPONSORED', x + badgeSize / 2, y + badgeSize / 2);
        ctx.restore();
    }

    drawFlashSaleTimer(timerStr: string) {
        if (!this.gl) return;
        const ctx = this.ensureGraphicsCanvas();
        if (!ctx) return;

        const bannerH = 40;
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(0, 0, this.canvasWidth, bannerH);
        ctx.fillStyle = 'white';
        ctx.font = '900 14px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`🔥 FLASH SALE ENDS IN: ${timerStr} 🔥`, this.canvasWidth / 2, bannerH / 2 + 2);
    }

    drawCommerceOverlays(flashSale: any, product: any, qrCodeImage: ImageBitmap | null, notifications: any[], time: number, vibeScore: number = 85, chatVelocity: number = 0) {
        console.log("drawCommerceOverlays", flashSale, product, qrCodeImage, notifications, time, vibeScore, chatVelocity);
        if (!this.gl || (!flashSale && !product && (!notifications || notifications.length === 0))) return;
        const ctx = this.ensureGraphicsCanvas();
        if (!ctx) return;
        let hasDrawn = false;

        // Flash Sale Banner/Timer
        if (flashSale) {
            let timerStr = '00:00:00';
            const fs = typeof flashSale === 'object' ? flashSale : null;
            if (fs) {
                const durationMs = (Number(fs.durationMinutes) || 0) * 60000;
                const startTime = Number(fs.startTime) || 0;
                const endTime = startTime + durationMs;
                const diff = Math.max(0, endTime - Date.now());
                
                if (!isNaN(diff)) {
                    const h = Math.floor(diff / 3600000);
                    const m = Math.floor((diff % 3600000) / 60000);
                    const s = Math.floor((diff % 60000) / 1000);
                    timerStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                }
            }
            this.drawFlashSaleTimer(timerStr);
            hasDrawn = true;
        }

        // Product Card (Mini Spotlight)
        if (product) {
            const isVertical = this.targetRatio === '9:16';
            const cardW = 180;
            const cardH = 60;
            const padding = 20;
            
            let x = this.canvasWidth - cardW - padding;
            let y = padding + 60;

            if (isVertical) {
                x = (this.canvasWidth - cardW) / 2;
                y = this.canvasHeight - 220;
            }

            const showQR = product.showQR ?? true; 
            
            ctx.save();
            ctx.fillStyle = 'rgba(15, 15, 25, 0.7)';
            ctx.beginPath();
            ctx.roundRect(x, y, cardW, cardH, 12);
            ctx.fill();
            
            const borderGrd = ctx.createLinearGradient(x, y, x + cardW, y + cardH);
            borderGrd.addColorStop(0, '#f97316');
            borderGrd.addColorStop(1, '#6366f1');
            ctx.strokeStyle = borderGrd;
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = 'white';
            ctx.font = 'bold 10px "Inter", sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText((product.name || '').toUpperCase(), x + 10, y + 10);

            ctx.fillStyle = '#f97316';
            ctx.font = '900 14px "Inter", sans-serif';
            ctx.fillText(`$${product.price || 0}`, x + 10, y + 32);

            if (showQR && qrCodeImage) {
                const qrSize = cardH - 10;
                const qrX = x + cardW - qrSize - 5;
                const qrY = y + 5;

                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.roundRect(qrX - 2, qrY - 2, qrSize + 4, qrSize + 4, 4);
                ctx.fill();

                ctx.drawImage(qrCodeImage, qrX, qrY, qrSize, qrSize);

                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.font = '900 7px "Inter", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('SCAN TO BUY', qrX + qrSize / 2, qrY + qrSize + 8);
            }
            
            ctx.restore();
            hasDrawn = true;
        }

        // Purchase Notifications
        if (notifications && notifications.length > 0) {
            notifications.forEach((notification: any, index: number) => {
                const elapsed = time - notification.startTime;
                let opacity = elapsed < 500 ? elapsed / 500 : (elapsed > 4500 ? Math.max(0, 1 - (elapsed - 4500) / 500) : 1);
                if (opacity <= 0) return;

                const yOffset = Math.max(0, 40 - (elapsed / 100));
                const isVertical = this.targetRatio === '9:16';
                const nx = isVertical ? (this.canvasWidth - 200) / 2 : 40;
                const ny = isVertical ? this.canvasHeight - 350 - (index * 45) - yOffset : this.canvasHeight - 150 - (index * 40) - yOffset;

                ctx.save();
                ctx.globalAlpha = opacity;
                ctx.fillStyle = 'rgba(59, 130, 246, 0.9)';
                const textPad = 15;
                ctx.font = '900 10px "Inter", sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                const textWidth = ctx.measureText(notification.text).width;

                ctx.beginPath();
                ctx.roundRect(nx, ny, textWidth + textPad * 2, 30, 15);
                ctx.fill();

                ctx.fillStyle = 'white';
                ctx.fillText(notification.text, nx + textPad, ny + 15);
                ctx.restore();
                hasDrawn = true;
            });
        }
    }

    drawQuestOverlay(quest: any, time: number) {
        if (!this.gl || !quest) return;
        const ctx = this.graphicsCtx!;
        const cardW = 380;
        const cardH = 180;
        const margin = 40;
        const x = this.canvasWidth - cardW - margin;
        const y = margin;

        const isSuccess = quest.completed;
        const progress = Math.min(100, Math.round((quest.current / quest.target) * 100));

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 45;
        ctx.shadowOffsetY = 15;

        ctx.fillStyle = 'rgba(10, 15, 30, 0.4)';
        ctx.beginPath();
        ctx.roundRect(x, y, cardW, cardH, 20);
        ctx.fill();
        
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        const borderGrd = ctx.createLinearGradient(x, y, x + cardW, y + cardH);
        borderGrd.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
        borderGrd.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
        borderGrd.addColorStop(1, 'rgba(255, 255, 255, 0.15)');
        ctx.strokeStyle = borderGrd;
        ctx.lineWidth = 1;
        ctx.stroke();

        const shimmerPos = ((time / 4000) % 2) - 1; 
        const shimmerGrd = ctx.createLinearGradient(x + cardW * shimmerPos, y, x + cardW * (shimmerPos + 0.5), y + cardH);
        shimmerGrd.addColorStop(0, 'rgba(255, 255, 255, 0)');
        shimmerGrd.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
        shimmerGrd.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = shimmerGrd;
        ctx.fill();

        const iconX = x - 20;
        const iconY = y - 20;
        const iconSize = 76;
        
        ctx.save();
        ctx.translate(iconX + iconSize/2, iconY + iconSize/2);
        ctx.rotate(-10 * Math.PI / 180);
        ctx.shadowColor = 'rgba(147, 51, 234, 0.6)';
        ctx.shadowBlur = 40;
        
        const iconGrd = ctx.createLinearGradient(-iconSize/2, -iconSize/2, iconSize/2, iconSize/2);
        iconGrd.addColorStop(0, '#4f46e5');
        iconGrd.addColorStop(1, '#9333ea');
        ctx.fillStyle = iconGrd;
        ctx.beginPath();
        ctx.roundRect(-iconSize/2, -iconSize/2, iconSize, iconSize, 20);
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.font = '40px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
        
        if (!isSuccess) {
            const pulse = (Math.sin(time / 500) + 1) * 0.04;
            ctx.scale(1 + pulse, 1 + pulse);
        }
        
        ctx.fillText(quest.icon || '🔥', 0, 0);
        ctx.restore();

        const textMargin = 60;
        ctx.font = '950 11px sans-serif';
        ctx.fillStyle = '#818cf8';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.shadowColor = 'rgba(129, 140, 248, 0.6)';
        ctx.shadowBlur = 15;
        ctx.fillText(quest.localized?.label || 'ACTIVE MISSION', x + textMargin, y + 24);
        ctx.shadowBlur = 0;

        if (!isSuccess) {
            ctx.font = '700 11px sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.textAlign = 'right';
            ctx.fillText(quest.localized?.timer || '59s', x + cardW - 24, y + 24);
        }

        ctx.font = '900 24px sans-serif';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'left';
        ctx.fillText(quest.title || 'Unknown Quest', x + textMargin, y + 44);

        ctx.font = '13px sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        const descLines = this.wrapText(ctx, quest.description || '', cardW - textMargin - 24);
        descLines.forEach((line: string, i: number) => {
            ctx.fillText(line, x + textMargin, y + 78 + (i * 18));
        });

        const progGap = 24;
        const progY = y + cardH - 64;
        const progW = cardW - progGap * 2;
        const progH = 12;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.roundRect(x + progGap, progY, progW, progH + 32, 16);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.beginPath();
        ctx.roundRect(x + progGap + 16, progY + 16, progW - 32, 12, 100);
        ctx.fill();

        const fillW = (progW - 32) * (progress / 100);
        if (fillW > 0) {
            const fillGrd = ctx.createLinearGradient(x + progGap + 16, 0, x + progGap + 16 + fillW, 0);
            if (quest.type === 'hype') { fillGrd.addColorStop(0, '#f97316'); fillGrd.addColorStop(0.5, '#ef4444'); fillGrd.addColorStop(1, '#f97316'); }
            else if (quest.type === 'intent') { fillGrd.addColorStop(0, '#10b981'); fillGrd.addColorStop(0.5, '#3b82f6'); fillGrd.addColorStop(1, '#10b981'); }
            else if (quest.type === 'likes') { fillGrd.addColorStop(0, '#f59e0b'); fillGrd.addColorStop(0.5, '#facc15'); fillGrd.addColorStop(1, '#f59e0b'); }
            else { fillGrd.addColorStop(0, '#a855f7'); fillGrd.addColorStop(0.5, '#ec4899'); fillGrd.addColorStop(1, '#a855f7'); }
            
            ctx.fillStyle = fillGrd;
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(x + progGap + 16, progY + 16, fillW, 12, 100);
            ctx.clip(); 
            ctx.fillRect(x + progGap + 16, progY + 16, fillW, 12);
            
            const flowOffset = (time % 3000) / 3000;
            const flowX = x + progGap + 16 + (fillW * 3 * flowOffset) - fillW;
            const energyGrd = ctx.createLinearGradient(flowX, 0, flowX + 50, 0);
            energyGrd.addColorStop(0, 'rgba(255, 255, 255, 0)');
            energyGrd.addColorStop(0.5, 'rgba(255, 255, 255, 0.6)');
            energyGrd.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = energyGrd;
            ctx.globalCompositeOperation = 'overlay';
            ctx.fillRect(flowX, progY + 16, 50, 12);
            ctx.restore();
        }

        ctx.font = '800 11px sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.textAlign = 'left';
        ctx.fillText(quest.localized?.progress || 'PROGRESS', x + progGap + 16, progY + progH + 24);
        ctx.textAlign = 'right';
        ctx.fillText(`${progress}%`, x + cardW - progGap - 16, progY + progH + 24);

        if (isSuccess) {
            ctx.fillStyle = 'rgba(16, 185, 129, 0.95)';
            ctx.beginPath();
            ctx.roundRect(x, y, cardW, cardH, 20);
            ctx.fill();
            
            ctx.font = '80px serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🏆', x + cardW/2, y + cardH/2 - 20);
            
            ctx.font = '900 28px sans-serif';
            ctx.fillStyle = 'white';
            ctx.fillText(quest.localized?.success || 'COMPLETED!', x + cardW/2, y + cardH/2 + 40);
        }

        ctx.restore();
    }

    public uploadAndRenderGraphics() {
        const gl = this.gl;
        if (!gl || !this.shaderLib || !this.compositeProgram || !this.graphicsCanvas) return;

        if (!this.graphicsTexture) {
            this.graphicsTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, this.graphicsTexture!);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }
        
        gl.bindTexture(gl.TEXTURE_2D, this.graphicsTexture!);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.graphicsCanvas as any);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        this.shaderLib.renderQuad(this.compositeProgram, this.graphicsTexture!, {
            flipY: true, // Correct for Canvas 2D vs WebGL Y-axis mismatch
            useUnitQuad: false
        });

        gl.disable(gl.BLEND);
    }

    /**
     * Phase 32: Renders a sleek real-time Data Visualization widget.
     */
    drawDataVizWidget(data: any[], title: string, x: number, y: number) {
        if (!this.gl || !data || data.length < 2) return;
        const ctx = this.graphicsCtx!;
        const w = 300;
        const h = 180;

        this.drawGlassPanel(ctx, x, y, w, h, 24);

        ctx.font = '900 12px sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(title.toUpperCase(), x + 20, y + 20);

        const chartX = x + 20;
        const chartY = y + 43; 
        const chartW = w - 40;
        const chartH = h - 73;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const gy = chartY + (i * chartH / 4);
            ctx.beginPath();
            ctx.moveTo(chartX, gy);
            ctx.lineTo(chartX + chartW, gy);
            ctx.stroke();
        }

        const max = Math.max(...data.map(d => d.value), 10);
        ctx.beginPath();
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';

        data.forEach((d, i) => {
            const px = chartX + (i * chartW / (data.length - 1));
            const py = chartY + chartH - (d.value / max * chartH);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        });
        ctx.stroke();

        ctx.lineTo(chartX + chartW, chartY + chartH);
        ctx.lineTo(chartX, chartY + chartH);
        const areaGrd = ctx.createLinearGradient(0, chartY, 0, chartY + chartH);
        areaGrd.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
        areaGrd.addColorStop(1, 'rgba(59, 130, 246, 0)');
        ctx.fillStyle = areaGrd;
        ctx.fill();

        const lastVal = data[data.length - 1].value;
        ctx.font = '800 24px sans-serif';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'right';
        ctx.fillText(lastVal.toString(), x + w - 20, y + h - 20);
    }

    /**
     * Phase 32: News-style Fact Checking Hub.
     */
    drawFactCheckHub(facts: any[], x: number, y: number) {
        if (!this.gl || !facts || facts.length === 0) return;

        const ctx = this.graphicsCtx!;
        const w = 380;
        const itemH = 60;
        const h = 40 + (facts.length * itemH);

        this.drawGlassPanel(ctx, x, y, w, h, 20);

        ctx.font = '900 12px sans-serif';
        ctx.fillStyle = '#10b981';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('LIVE NEURAL VALIDATION', x + 20, y + 20);

        facts.forEach((fact, i) => {
            const iy = y + 45 + (i * itemH);
            
            // Icon
            ctx.font = '18px serif';
            ctx.fillText(fact.isValid ? '✓' : '⚠', x + 20, iy + 25);

            // Claim snippet
            ctx.font = '700 13px sans-serif';
            ctx.fillStyle = 'white';
            ctx.fillText(this.truncate(fact.claim, 45), x + 50, iy + 18);

            // Source/Status
            ctx.font = '11px sans-serif';
            ctx.fillStyle = fact.isValid ? 'rgba(16, 185, 129, 0.7)' : 'rgba(239, 68, 68, 0.7)';
            ctx.fillText(fact.isValid ? `Source: ${fact.source || 'Verified Agent'}` : `Correction: ${fact.correction || 'Inaccurate'}`, x + 50, iy + 34);

            if (i < facts.length - 1) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
                ctx.beginPath();
                ctx.moveTo(x + 50, iy + 45);
                ctx.lineTo(x + w - 20, iy + 45);
                ctx.stroke();
            }
        });
    }

    /**
     * Phase 32: Premium end-of-stream recap card.
     */
    drawFinalRecapCard(recap: any, canvasW: number, canvasH: number) {
        if (!this.gl || !recap) return;
        const ctx = this.graphicsCtx!;
        const w = 600;
        const h = 400;
        const x = (canvasW - w) / 2;
        const y = (canvasH - h) / 2;

        this.drawGlassPanel(ctx, x, y, w, h, 40);

        ctx.font = '900 42px sans-serif';
        const titleGrd = ctx.createLinearGradient(x, 0, x + w, 0);
        titleGrd.addColorStop(0, '#818cf8');
        titleGrd.addColorStop(1, '#c084fc');
        ctx.fillStyle = titleGrd;
        ctx.textAlign = 'center';
        ctx.fillText('STREAM COMPLETED', x + w / 2, y + 80);

        ctx.font = '700 18px sans-serif';
        ctx.fillStyle = 'white';
        const summaryLines = this.wrapText(ctx, recap.summary || '', w - 100);
        summaryLines.forEach((line: string, i: number) => {
            ctx.fillText(line, x + w / 2, y + 130 + (i * 24));
        });

        const statW = 140;
        const statGap = 30;
        const stats = [
            { label: 'Neural Score', value: `${recap.performanceScore || 0}%` },
            { label: 'Moments', value: recap.highlights?.length || 0 },
            { label: 'Viewers', value: recap.contextMetrics?.['Viewers'] || '---' }
        ];

        stats.forEach((stat, i) => {
            const sx = x + (w / 2) - ((stats.length * statW + (stats.length - 1) * statGap) / 2) + (i * (statW + statGap));
            const sy = y + 280;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.beginPath();
            ctx.roundRect(sx, sy, statW, 80, 16);
            ctx.fill();
            ctx.font = '900 24px sans-serif';
            ctx.fillStyle = 'white';
            ctx.fillText(stat.value, sx + statW / 2, sy + 40);
            ctx.font = '700 11px sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.fillText(stat.label.toUpperCase(), sx + statW / 2, sy + 60);
        });

        ctx.font = 'italic 12px serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillText('Verified by Antigravity Neural Engine', x + w / 2, y + h - 30);
    }

    private drawGlassPanel(ctx: any, x: number, y: number, w: number, h: number, r: number) {
        
        ctx.save();
        // Shadow
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 40;
        ctx.shadowOffsetY = 10;

        // Background
        ctx.fillStyle = 'rgba(15, 15, 20, 0.7)';
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, r);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // Border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Inner highlight
        const innerGrd = ctx.createLinearGradient(x, y, x + w, y + h);
        innerGrd.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
        innerGrd.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
        innerGrd.addColorStop(1, 'rgba(255, 255, 255, 0.02)');
        ctx.strokeStyle = innerGrd;
        ctx.stroke();
        
        ctx.restore();
    }

    /**
     * Phase 33: Neural Singularity Aura.
     * A cinematic post-processing effect (chromatic aberration & bloom pulse)
     * that intensifies with hype levels.
     */
    drawSingularityAura(hypeLevel: number) {
        if (!this.graphicsCtx || !this.graphicsCanvas || hypeLevel < 0.5) return;
        const ctx = this.graphicsCtx;
        const w = this.graphicsCanvas.width;
        const h = this.graphicsCanvas.height;
        const intensity = Math.min(1, (hypeLevel - 0.5) * 1.5);
        const time = Date.now() / 1000;

        ctx.save();
        const offset = 10 * intensity;
        ctx.globalCompositeOperation = 'screen';
        
        ctx.fillStyle = `rgba(255, 0, 0, ${0.1 * intensity})`;
        ctx.fillRect(-offset, -offset, w + offset * 2, h + offset * 2);
        
        ctx.fillStyle = `rgba(0, 0, 255, ${0.1 * intensity})`;
        ctx.fillRect(offset, offset, w + offset * 2, h + offset * 2);

        const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.8);
        const pulse = Math.sin(time * 3) * 0.05;
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        gradient.addColorStop(0.7, 'rgba(0, 242, 255, 0)');
        gradient.addColorStop(1, `rgba(0, 242, 255, ${ (0.2 + pulse) * intensity })`);

        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);

        if (Math.random() > 0.95) {
            ctx.fillStyle = `rgba(255, 255, 255, ${0.3 * intensity})`;
            ctx.fillRect(0, Math.random() * h, w, 1);
        }
        ctx.restore();
    }

    drawEducationOverlay(data: any) {
        if (!this.gl || !data || !data.slides || data.slides.length === 0) return;
        const slide = data.slides[data.activeSlide || 0];
        const slideNum = (data.activeSlide || 0) + 1;
        const totalSlides = data.slides.length;
        const ctx = this.graphicsCtx!;
        const padding = 120;
        const w = this.canvasWidth - padding * 2;
        const h = w * (9 / 16);
        const x = (this.canvasWidth - w) / 2;
        const y = (this.canvasHeight - h) / 2;

        this.drawGlassPanel(ctx, x, y, w, h, 40);
        ctx.font = '900 12px "Inter", sans-serif';
        ctx.fillStyle = '#3b82f6';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`SLIDE ${slideNum} / ${totalSlides}`, x + w / 2, y + 40);

        ctx.font = '900 48px "Inter", sans-serif';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'left';
        const titleWords = this.wrapText(ctx, (slide.title || '').toUpperCase(), w - 160);
        titleWords.forEach((line: string, i: number) => {
            ctx.fillText(line, x + 80, y + 120 + (i * 60));
        });

        const startY = y + 120 + (titleWords.length * 60) + 40;
        ctx.font = '600 24px "Inter", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        (slide.bullets || []).forEach((bullet: string, i: number) => {
            const by = startY + (i * 45);
            ctx.fillStyle = '#3b82f6';
            ctx.beginPath();
            ctx.arc(x + 90, by + 12, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillText(bullet, x + 115, by + 20);
        });

        ctx.font = '900 10px "Inter", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.textAlign = 'right';
        ctx.fillText('AI SYNTHESIS VERIFIED', x + w - 40, y + h - 40);
    }

    drawNewsOverlay(data: any) {
        if (!this.gl || !data) return;
        const ctx = this.graphicsCtx!;
        const margin = 40;
        ctx.font = '900 32px "Inter", sans-serif';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('LiveStudio', margin, margin);
        ctx.fillText('News', margin, margin + 35);

        const bw = 60, bh = 24;
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.roundRect(margin, margin + 85, bw, bh, 12);
        ctx.fill();
        ctx.font = '900 10px "Inter", sans-serif';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('LIVE', margin + bw/2, margin + 85 + bh/2);

        if (data.location) {
            ctx.textAlign = 'right';
            ctx.font = '900 12px "Inter", sans-serif';
            ctx.fillStyle = 'white';
            ctx.fillText(data.location.toUpperCase(), this.canvasWidth - margin, margin);
            ctx.font = '500 10px "Inter", sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.fillText(new Date().toLocaleTimeString(), this.canvasWidth - margin, margin + 20);
        }

        if (data.breaking) {
            const by = this.canvasHeight - 120;
            const barH = 40;
            ctx.fillStyle = 'rgba(124, 45, 18, 0.8)';
            ctx.fillRect(0, by, this.canvasWidth, barH);
            ctx.fillStyle = '#ea580c';
            ctx.fillRect(0, by, 150, barH);
            ctx.font = '900 10px "Inter", sans-serif';
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.fillText('BREAKING:', 75, by + barH/2);
            ctx.font = '700 14px "Inter", sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(data.breaking, 170, by + barH/2);
        }
    }

    drawSportOverlay(data: any) {
        if (!this.gl || !data) return;
        const ctx = this.graphicsCtx!;
        const margin = 40;
        const sbW = 400, sbH = 60;
        const sbX = (this.canvasWidth - sbW) / 2;
        const sbY = margin;

        this.drawGlassPanel(ctx, sbX, sbY, sbW, sbH, 12);
        ctx.font = '900 24px "Inter", sans-serif';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(data.homeTeam || 'HOME', sbX + 140, sbY + sbH/2);
        ctx.textAlign = 'center';
        ctx.font = '900 32px "Inter", sans-serif';
        ctx.fillText(`${data.homeScore ?? 0} : ${data.awayScore ?? 0}`, sbX + sbW/2, sbY + sbH/2);
        ctx.textAlign = 'left';
        ctx.font = '900 24px "Inter", sans-serif';
        ctx.fillText(data.awayTeam || 'AWAY', sbX + 260, sbY + sbH/2);
        ctx.font = '700 12px "Inter", sans-serif';
        ctx.fillStyle = '#fbbf24';
        ctx.textAlign = 'center';
        ctx.fillText(`${data.period || '1st'} | ${data.time || '00:00'}`, sbX + sbW/2, sbY + sbH + 20);
    }

    drawSalesOverlay(data: any, qrCodeImage: ImageBitmap | null = null) {
        if (!this.gl || !data) return;
        const ctx = this.graphicsCtx!;
        const margin = 40;
        
        // 1. Dynamic Timer (Top Overlay)
        if (data.flashSale) {
            let timerStr = '00:00:00';
            const fs = typeof data.flashSale === 'object' ? data.flashSale : null;
            if (fs) {
                const start = Number(fs.startTime) || Date.now();
                const durationMs = (Number(fs.durationMinutes) || 0) * 60000;
                const end = start + durationMs;
                const diff = Math.max(0, end - Date.now());
                const h = Math.floor(diff / 3600000);
                const m = Math.floor((diff % 3600000) / 60000);
                const s = Math.floor((diff % 60000) / 1000);
                timerStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            }
            this.drawFlashSaleTimer(timerStr);
        }

        // 2. Product Spotlight Card
        if (data.activeProduct) {
            const sw = 280, sh = 380;
            const sx = this.canvasWidth - sw - margin;
            const sy = 120;
            this.drawGlassPanel(ctx, sx, sy, sw, sh, 25);
            
            ctx.font = '900 14px "Inter", sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.textAlign = 'left';
            ctx.fillText('PRODUCT SPOTLIGHT', sx + 30, sy + 40);
            
            ctx.font = '700 24px "Inter", sans-serif';
            ctx.fillStyle = 'white';
            const title = this.truncate(data.activeProduct.name || 'Sample Product', 20);
            ctx.fillText(title.toUpperCase(), sx + 30, sy + 80);
            
            ctx.font = '900 32px "Inter", sans-serif';
            ctx.fillStyle = '#ec4899';
            ctx.fillText(`$${data.activeProduct.price || '0.00'}`, sx + 30, sy + 130);
            
            ctx.font = '500 14px "Inter", sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            (data.activeProduct.features || []).slice(0, 3).forEach((f: string, i: number) => {
                ctx.fillText(`• ${f}`, sx + 30, sy + 170 + (i * 25));
            });

            // Draw QR Code if provided
            if (qrCodeImage) {
                const qrSize = 100;
                const qrX = sx + sw - qrSize - 30;
                const qrY = sy + sh - qrSize - 30;
                
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.roundRect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 10, 10);
                ctx.fill();
                
                ctx.drawImage(qrCodeImage, qrX, qrY, qrSize, qrSize);
                
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.font = '900 10px "Inter", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('SCAN TO BUY', qrX + qrSize / 2, qrY + qrSize + 15);
            }
        }
    }

    drawGameShowOverlay(data: any) {
        if (!this.gl || !data) return;
        const ctx = this.graphicsCtx!;
        const margin = 40;
        const pw = 220, ph = 80;
        const px = this.canvasWidth - pw - margin;
        this.drawGlassPanel(ctx, px, margin, pw, ph, 20);
        ctx.font = '900 10px "Inter", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.textAlign = 'center';
        ctx.fillText('TOTAL PRIZE POOL', px + pw/2, margin + 25);
        ctx.font = '900 32px "Inter", sans-serif';
        ctx.fillStyle = '#22c55e';
        ctx.fillText(`$${(data.prize || 0).toLocaleString()}`, px + pw/2, margin + 60);

        if (data.players?.length > 0) {
            const lw = 300, lh = 240;
            const lx = margin;
            const ly = this.canvasHeight - lh - margin;
            this.drawGlassPanel(ctx, lx, ly, lw, lh, 30);
            ctx.font = '900 12px "Inter", sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.textAlign = 'left';
            ctx.fillText('CURRENT LEADERBOARD', lx + 30, ly + 40);
            data.players.slice(0, 5).forEach((p: any, i: number) => {
                const py = ly + 80 + (i * 30);
                ctx.font = '900 14px "Inter", sans-serif';
                ctx.fillStyle = i === 0 ? '#eab308' : 'rgba(255, 255, 255, 0.3)';
                ctx.fillText(`#${i+1}`, lx + 30, py);
                ctx.fillStyle = 'white';
                ctx.fillText(p.name, lx + 70, py);
                ctx.textAlign = 'right';
                ctx.fillStyle = '#22c55e';
                ctx.fillText(`${p.score}pts`, lx + lw - 30, py);
                ctx.textAlign = 'left';
            });
        }
    }

    drawTalkShowOverlay(data: any) {
        if (!this.gl || !data) return;
        const ctx = this.graphicsCtx!;
        const margin = 40;
        if (data.activeGuest) {
            const lw = 500, lh = 80;
            const lx = (this.canvasWidth - lw) / 2;
            const ly = this.canvasHeight - lh - margin;
            this.drawGlassPanel(ctx, lx, ly, lw, lh, 12);
            ctx.font = '900 24px "Inter", sans-serif';
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.fillText((data.activeGuest.name || '').toUpperCase(), lx + lw/2, ly + 40);
            ctx.font = '700 12px "Inter", sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.fillText((data.activeGuest.role || 'Guest').toUpperCase(), lx + lw/2, ly + 65);
        }
    }

    private truncate(str: string, n: number) {
        return (str.length > n) ? str.slice(0, n - 1) + '...' : str;
    }
}
