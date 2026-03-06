export class UIOverlayRenderer {
    private gl: WebGL2RenderingContext | WebGLRenderingContext | null = null;
    private canvasWidth: number = 0;
    private canvasHeight: number = 0;
    private compositeProgram: WebGLProgram | null = null;
    private unitQuad: any = null;
    private fullScreenQuad: any = null;

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

    // Uniform Locs
    private uTranslationLoc: WebGLUniformLocation | null = null;
    private uScaleLoc: WebGLUniformLocation | null = null;
    private uTexScaleLoc: WebGLUniformLocation | null = null;
    private uTexOffsetLoc: WebGLUniformLocation | null = null;
    private uFlipHorizontalLoc: WebGLUniformLocation | null = null;
    private uFlipVerticalLoc: WebGLUniformLocation | null = null;
    private uFlipYLoc: WebGLUniformLocation | null = null;
    private uImageLoc: WebGLUniformLocation | null = null;

    // State
    private tickerOffset: number = 0;
    private targetRatio: '16:9' | '9:16' | 'both' = '16:9';

    init(
        gl: WebGL2RenderingContext | WebGLRenderingContext,
        width: number,
        height: number,
        compositeProgram: WebGLProgram,
        unitQuad: any,
        fullScreenQuad: any
    ) {
        this.gl = gl;
        this.canvasWidth = width;
        this.canvasHeight = height;
        this.compositeProgram = compositeProgram;
        this.unitQuad = unitQuad;
        this.fullScreenQuad = fullScreenQuad;

        this.uTranslationLoc = gl.getUniformLocation(compositeProgram, 'u_translation');
        this.uScaleLoc = gl.getUniformLocation(compositeProgram, 'u_scale');
        this.uTexScaleLoc = gl.getUniformLocation(compositeProgram, 'u_texScale');
        this.uTexOffsetLoc = gl.getUniformLocation(compositeProgram, 'u_texOffset');
        this.uFlipHorizontalLoc = gl.getUniformLocation(compositeProgram, 'u_flipHorizontal');
        this.uFlipVerticalLoc = gl.getUniformLocation(compositeProgram, 'u_flipVertical');
        this.uFlipYLoc = gl.getUniformLocation(compositeProgram, 'u_flipY');
        this.uImageLoc = gl.getUniformLocation(compositeProgram, 'u_image');
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
        if (!gl || !this.compositeProgram || !this.unitQuad) return;

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

        gl.useProgram(this.compositeProgram);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        const lyricsW = w * 0.9;
        const lyricsH = (lyricsW * this.canvasWidth) / (2 * this.canvasHeight);
        const lyricsX = x + (w - lyricsW) / 2;
        const lyricsY = y + (h * 0.75) - lyricsH; 

        gl.uniform2f(this.uTranslationLoc, lyricsX, lyricsY);
        gl.uniform2f(this.uScaleLoc, lyricsW, lyricsH);
        gl.uniform2f(this.uTexScaleLoc, 1, 1);
        gl.uniform2f(this.uTexOffsetLoc, 0, 0);
        gl.uniform1i(this.uFlipHorizontalLoc, 0);
        gl.uniform1i(this.uFlipVerticalLoc, 0);
        gl.uniform1i(this.uFlipYLoc, 1);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.lyricsTexture);
        gl.uniform1i(this.uImageLoc, 0);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
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

        gl.useProgram(this.compositeProgram);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        const subW = w * 0.8;
        const subH = (subW * this.subtitleCanvas.height) / this.subtitleCanvas.width;
        const subX = x + (w - subW) / 2;
        const subY = y + (h * 0.9) - subH;

        gl.uniform2f(this.uTranslationLoc, subX, subY);
        gl.uniform2f(this.uScaleLoc, subW, subH);
        gl.uniform2f(this.uTexScaleLoc, 1, 1);
        gl.uniform2f(this.uTexOffsetLoc, 0, 0);
        gl.uniform1i(this.uFlipHorizontalLoc, 0);
        gl.uniform1i(this.uFlipVerticalLoc, 0);
        gl.uniform1i(this.uFlipYLoc, 1);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.subtitleTexture);
        gl.uniform1i(this.uImageLoc, 0);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
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

        gl.useProgram(this.compositeProgram);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        // Position: Bottom center, slightly dynamic
        const subW = w * 0.85;
        const subH = (subW * this.captionCanvas.height) / this.captionCanvas.width;
        const subX = x + (w - subW) / 2;
        const subY = y + (h * 0.88) - subH;

        gl.uniform2f(this.uTranslationLoc, subX, subY);
        gl.uniform2f(this.uScaleLoc, subW, subH);
        gl.uniform2f(this.uTexScaleLoc, 1, 1);
        gl.uniform2f(this.uTexOffsetLoc, 0, 0);
        gl.uniform1i(this.uFlipHorizontalLoc, 0);
        gl.uniform1i(this.uFlipVerticalLoc, 0);
        gl.uniform1i(this.uFlipYLoc, 1);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.captionTexture);
        gl.uniform1i(this.uImageLoc, 0);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.disable(gl.BLEND);
    }

    renderBrandLogo(logoImage: ImageBitmap, branding: any) {
        if (!this.gl || !branding?.logoUrl || !logoImage) return;
        
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
        
        if (!this.graphicsCanvas) {
            this.graphicsCanvas = new OffscreenCanvas(this.canvasWidth, this.canvasHeight);
            this.graphicsCtx = this.graphicsCanvas.getContext('2d');
        }
        
        const ctx = this.graphicsCtx!;
        ctx.clearRect(0, 0, this.graphicsCanvas.width, this.graphicsCanvas.height);
        
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.drawImage(logoImage, x, y, logoSize, logoSize);
        ctx.restore();
        
        this.uploadAndRenderGraphics();
    }

    renderBreakOverlay(time: number, message: string) {
        if (!this.gl) return;
        
        if (!this.graphicsCanvas) {
            this.graphicsCanvas = new OffscreenCanvas(this.canvasWidth, this.canvasHeight);
            this.graphicsCtx = this.graphicsCanvas.getContext('2d');
        }
        
        const ctx = this.graphicsCtx!;
        ctx.clearRect(0, 0, this.graphicsCanvas.width, this.graphicsCanvas.height);
        
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
        
        this.uploadAndRenderGraphics();
    }

    renderLowerThird(branding: any, activeScene: any, slotMap: Map<string, any>) {
        if (!this.gl || !activeScene) return;
        
        if (!this.graphicsCanvas) {
            this.graphicsCanvas = new OffscreenCanvas(this.canvasWidth, this.canvasHeight);
            this.graphicsCtx = this.graphicsCanvas.getContext('2d');
        }
        
        const ctx = this.graphicsCtx!;
        ctx.clearRect(0, 0, this.graphicsCanvas.width, this.graphicsCanvas.height);
        
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
        
        this.uploadAndRenderGraphics();
    }

    renderTicker(tickerText: string) {
        if (!this.gl) return;
        
        if (!this.graphicsCanvas) {
            this.graphicsCanvas = new OffscreenCanvas(this.canvasWidth, this.canvasHeight);
            this.graphicsCtx = this.graphicsCanvas.getContext('2d');
        }
        
        const ctx = this.graphicsCtx!;
        ctx.clearRect(0, 0, this.graphicsCanvas.width, this.graphicsCanvas.height);
        
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
        
        this.uploadAndRenderGraphics();
    }

    renderSponsorshipBadge(sponsorName: string) {
        if (!this.gl) return;
        
        if (!this.graphicsCanvas) {
            this.graphicsCanvas = new OffscreenCanvas(this.canvasWidth, this.canvasHeight);
            this.graphicsCtx = this.graphicsCanvas.getContext('2d');
        }
        
        const ctx = this.graphicsCtx!;
        ctx.clearRect(0, 0, this.graphicsCanvas.width, this.graphicsCanvas.height);
        
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
        
        this.uploadAndRenderGraphics();
    }

    public renderCommerceOverlays(flashSale: boolean, product: any, qrCodeImage: ImageBitmap | null, notifications: any[], time: number, vibeScore: number = 85, chatVelocity: number = 0) {
        if (!this.gl || (!flashSale && !product && (!notifications || notifications.length === 0))) return;
        
        if (!this.graphicsCanvas) {
            this.graphicsCanvas = new OffscreenCanvas(this.canvasWidth, this.canvasHeight);
            this.graphicsCtx = this.graphicsCanvas.getContext('2d');
        }
        
        const ctx = this.graphicsCtx!;
        ctx.clearRect(0, 0, this.graphicsCanvas.width, this.graphicsCanvas.height);
        
        let hasDrawn = false;

        // Flash Sale Banner
        if (flashSale) {
            const bannerH = 40;
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(0, 0, this.canvasWidth, bannerH);
            ctx.fillStyle = 'white';
            ctx.font = '900 14px "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🔥 FLASH SALE ACTIVE: GET -30% OFF NOW! 🔥', this.canvasWidth / 2, bannerH / 2 + 2);
            hasDrawn = true;
        }

        // Product Card & QR Automation
        if (product) {
            const isVertical = this.targetRatio === '9:16';
            const cardW = 180;
            const cardH = 60;
            const padding = 20;
            
            let x = this.canvasWidth - cardW - padding;
            let y = padding + 60;

            if (isVertical) {
                // Adaptive position for vertical platforms (TikTok/Reels)
                // Center-right or slightly above bottom-right to avoid comments
                x = (this.canvasWidth - cardW) / 2; // Center horizontally
                y = this.canvasHeight - 220; // Above the comments area
            }

            // Automation: QR Visibility based on intent or flag
            const showQR = product.showQR ?? true; 
            const qrAnimProgress = showQR ? Math.min(1, (time % 1000) / 1000) : 0; // Simple placeholder for transition logic

            ctx.save();
            // Subtle entrance animation if needed, but let's focus on glassmorphism
            ctx.fillStyle = 'rgba(15, 15, 25, 0.7)';
            ctx.beginPath();
            ctx.roundRect(x, y, cardW, cardH, 12);
            ctx.fill();
            
            // Premium Gradient Border
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

            // Dynamic QR Section
            if (showQR) {
                const qrSize = cardH - 10;
                const qrX = x + cardW - qrSize - 5;
                const qrY = y + 5;

                // QR Entrance animation: Slide in or Fade
                const qrAlpha = 1.0; 
                ctx.globalAlpha = qrAlpha;

                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.roundRect(qrX - 2, qrY - 2, qrSize + 4, qrSize + 4, 4);
                ctx.fill();

                if (qrCodeImage) {
                    ctx.drawImage(qrCodeImage, qrX, qrY, qrSize, qrSize);
                } else {
                    ctx.fillStyle = '#111';
                    ctx.fillRect(qrX, qrY, qrSize, qrSize);
                }

                // High-Intent Label
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.font = '900 7px "Inter", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('SCAN TO BUY', qrX + qrSize / 2, qrY + qrSize + 8);

                // High-Intent Label
                if (product.intentScore && product.intentScore > 0.8) {
                    ctx.fillStyle = '#fef08a';
                    ctx.font = '900 8px "Inter", sans-serif';
                    ctx.textAlign = 'right';
                    ctx.fillText('HIGH INTEREST 🔥', qrX + qrSize, qrY + qrSize + 12);
                }
            }

            // Scarcity Warning (Autonomous)
            const stock = product.stock ?? 100;
            const isHighVibe = vibeScore > 90 || chatVelocity > 10;
            if (stock < 10 || (product.intentScore && product.intentScore > 0.9) || isHighVibe) {
                const pulse = (Math.sin(time / 200) + 1) / 2;
                ctx.fillStyle = `rgba(239, 68, 68, ${0.6 + pulse * 0.4})`;
                ctx.font = '900 9px "Inter", sans-serif';
                ctx.textAlign = 'left';
                const label = stock < 10 ? `ONLY ${stock} LEFT!` : isHighVibe ? '🔥 PEAK INTEREST 🔥' : 'SELLING FAST!';
                ctx.fillText(label, x + 10, y + cardH - 12);
            }
            
            ctx.restore();
            hasDrawn = true;
        }

        // Purchase Notifications
        if (notifications && notifications.length > 0) {
            notifications.forEach((notification: any, index: number) => {
                const elapsed = time - notification.startTime;
                let opacity = 0;
                if (elapsed < 500) opacity = elapsed / 500;
                else if (elapsed > 4500) opacity = Math.max(0, 1 - (elapsed - 4500) / 500);
                else opacity = 1;

                if (opacity <= 0) return;

                const yOffset = Math.max(0, 40 - (elapsed / 100));
                const isVertical = this.targetRatio === '9:16';
                const x = isVertical ? (this.canvasWidth - 200) / 2 : 40; // Center in vertical
                const y = isVertical 
                    ? this.canvasHeight - 350 - (index * 45) - yOffset // Stack higher in vertical
                    : this.canvasHeight - 150 - (index * 40) - yOffset;

                ctx.save();
                ctx.globalAlpha = opacity;
                ctx.fillStyle = 'rgba(59, 130, 246, 0.9)';
                const textPad = 15;
                ctx.font = '900 10px "Inter", sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                const textWidth = ctx.measureText(notification.text).width;

                ctx.beginPath();
                ctx.roundRect(x, y, textWidth + textPad * 2, 30, 15);
                ctx.fill();

                ctx.fillStyle = 'white';
                ctx.fillText(notification.text, x + textPad, y + 15);
                ctx.restore();
                hasDrawn = true;
            });
        }

        if (hasDrawn) {
            this.uploadAndRenderGraphics();
        }
    }

    private uploadAndRenderGraphics() {
        const gl = this.gl!;
        if (!this.graphicsTexture) {
            this.graphicsTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, this.graphicsTexture!);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        } else {
            gl.bindTexture(gl.TEXTURE_2D, this.graphicsTexture);
        }
        
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.graphicsCanvas as any);

        // Render to screen
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.useProgram(this.compositeProgram);
        
        if (this.fullScreenQuad) {
            const positionLoc = gl.getAttribLocation(this.compositeProgram!, 'a_position');
            const texCoordLoc = gl.getAttribLocation(this.compositeProgram!, 'a_texCoord');
            
            gl.bindBuffer(gl.ARRAY_BUFFER, this.fullScreenQuad.positionBuffer);
            gl.enableVertexAttribArray(positionLoc);
            gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
            
            gl.bindBuffer(gl.ARRAY_BUFFER, this.fullScreenQuad.texCoordBuffer);
            gl.enableVertexAttribArray(texCoordLoc);
            gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);
        }
        
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.graphicsTexture);
        
        if (this.uImageLoc) gl.uniform1i(this.uImageLoc, 0);
        if (this.uTranslationLoc) gl.uniform2f(this.uTranslationLoc, 0.0, 0.0);
        if (this.uScaleLoc) gl.uniform2f(this.uScaleLoc, 1.0, 1.0);
        if (this.uTexScaleLoc) gl.uniform2f(this.uTexScaleLoc, 1.0, 1.0);
        if (this.uTexOffsetLoc) gl.uniform2f(this.uTexOffsetLoc, 0.0, 0.0);
        if (this.uFlipHorizontalLoc) gl.uniform1i(this.uFlipHorizontalLoc, 0);
        if (this.uFlipVerticalLoc) gl.uniform1i(this.uFlipVerticalLoc, 0);
        if (this.uFlipYLoc) gl.uniform1i(this.uFlipYLoc, 1); // Flip Y to match coordinate system for canvas 2d
        
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.disable(gl.BLEND);
    }
}
