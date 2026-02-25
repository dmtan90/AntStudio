import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from 'video-editor/store/canvas';
import { toast } from 'vue-sonner';
import { translateProject, checkTranslationStatus, extractHighlights, generateSocialMeta, analyzeAudioEmphasis, suggestMusicMatch, suggestBRoll, analyzeSceneTransitions, scoreEngagement, optimizeForPlatform, extractBrandKit, applyBrandKit, cloneVisualStyle, type BrandKit } from 'video-editor/api/ai';

export interface KeyframeData {
    timestamp: number;
    x: number;
    y: number;
    scale?: number;
}

export class AutoEditorService {
    /**
     * Applies auto-reframe keyframes to a specific timeline element.
     * This converts subject-tracking data into position/scale keyframes.
     */
    static async applyReframeToTimeline(elementId: string, keyframes: KeyframeData[]) {
        const editor = useEditorStore();
        const canvasStore = useCanvasStore();
        
        // Find the element in the current project
        let targetElement: any = null;
        let targetScene: any = null;

        for (const scene of editor.pages) {
            targetElement = scene.elements.find((el: any) => el.id === elementId);
            if (targetElement) {
                targetScene = scene;
                break;
            }
        }

        if (!targetElement) {
            console.error(`[AutoEditorService] Element ${elementId} not found`);
            return;
        }

        console.log(`[AutoEditorService] Applying ${keyframes.length} keyframes to ${targetElement.type}:${elementId}`);

        // In our engine, we typically use the canvas or specific element properties for keyframing
        // Depending on the implementation of 'keyframes' in the current project:
        // We'll assume the element has a .setKeyframe or similar method, 
        // OR we manually update its position data.

        if (!targetElement.anim) {
            targetElement.anim = {
                in: { name: "none", duration: 0 },
                scene: { name: "none" },
                out: { name: "none", duration: 0 },
                keyframes: []
            };
        }

        // Map AI keyframes to editor internal keyframe structure
        targetElement.anim.keyframes = keyframes.map(k => {
            const kf: any = { time: k.timestamp * 1000 };
            if (k.x !== undefined) kf.left = k.x;
            if (k.y !== undefined) kf.top = k.y;
            if (k.scale !== undefined) {
                kf.scaleX = k.scale;
                kf.scaleY = k.scale;
            }
            return kf;
        });

        toast.success("Auto-reframe keyframes applied to timeline!");
        editor.onModified();
    }

    /**
     * Automatically splits a video layer into multiple clips based on object detection.
     * Creates a new clip for every continuous segment where the object is detected.
     */
    static async extractObjectSegments(elementId: string, objectLabel: string, detectedObjects: any[]) {
        const editor = useEditorStore();
        
        // Find the source element
        let sourceElement: any = null;
        let sourceScene: any = null;

        for (const scene of editor.pages) {
            sourceElement = scene.elements.find((el: any) => el.id === elementId);
            if (sourceElement) {
                sourceScene = scene;
                break;
            }
        }

        if (!sourceElement) return;

        // Group detections for the specific object into continuous time ranges
        const relevantDetections = detectedObjects
            .filter(obj => obj.label.toLowerCase() === objectLabel.toLowerCase())
            .sort((a, b) => a.timestamp - b.timestamp);

        if (relevantDetections.length === 0) {
            toast.error(`No ${objectLabel} detected in this clip.`);
            return;
        }

        const segments: { start: number, end: number }[] = [];
        let currentSegment: any = null;
        const GAP_THRESHOLD = 1.0; // 1 second gap allowed

        relevantDetections.forEach(det => {
            if (!currentSegment) {
                currentSegment = { start: det.timestamp, end: det.timestamp };
            } else if (det.timestamp - currentSegment.end < GAP_THRESHOLD) {
                currentSegment.end = det.timestamp;
            } else {
                segments.push(currentSegment);
                currentSegment = { start: det.timestamp, end: det.timestamp };
            }
        });
        if (currentSegment) segments.push(currentSegment);

        console.log(`[AutoEditorService] Extracting ${segments.length} segments for ${objectLabel}`);

        // For each segment, create a new scene/page (or add to current)
        segments.forEach((seg, idx) => {
            editor.addPage();
            const newPageIdx = editor.pages.length - 1;
            const newPage = editor.pages[newPageIdx];
            
            const durationMs = (seg.end - seg.start) * 1000;
            newPage.timeline.duration = Math.max(durationMs, 500);

            // Copy properties from source but adjust trim
            if (typeof newPage.onAddVideoFromSource === 'function') {
                newPage.onAddVideoFromSource(sourceElement.key, {
                    trimStart: seg.start * 1000,
                    meta: {
                        name: `${objectLabel} Clip ${idx + 1}`
                    }
                });
            }
        });

        toast.success(`Extracted ${segments.length} clips of "${objectLabel}"!`);
        editor.setActiveSidebarLeft('scene');
    }

    /**
     * Localizes the entire project by translating scripts and swapping audio.
     */
    static async autoTranslateProject(targetLang: string, voiceCloning: boolean) {
        const editor = useEditorStore();
        
        // 1. Trigger the background translation job
        const res: any = await translateProject({
            projectId: editor.id,
            targetLang,
            voiceCloning
        });
        const jobId = res.jobId || res.data?.jobId;

        if (!jobId) throw new Error("Failed to start translation job.");

        // 2. Poll for completion
        let isDone = false;
        let result = null;
        let attempts = 0;
        const MAX_ATTEMPTS = 60; // 5 minutes approx

        while (!isDone && attempts < MAX_ATTEMPTS) {
            attempts++;
            const statusRes: any = await checkTranslationStatus(jobId);
            const status = statusRes.status || statusRes.data?.status;
            
            if (status === 'complete') {
                isDone = true;
                result = statusRes.result || statusRes.data?.result;
            } else if (status === 'failed') {
                throw new Error("Translation job failed on server.");
            } else {
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }

        if (!result) throw new Error("Translation timed out.");

        // 3. Apply the results to the timeline
        // Result is expected to be a mapping of originalAsset -> translatedAsset
        // OR a full scene-by-scene update list.
        
        for (const scene of editor.pages) {
            for (const el of scene.elements) {
                if (el.type === 'video' || el.type === 'audio') {
                    const translated = result.assets?.find((a: any) => a.originalId === el.id || a.key === el.key);
                    if (translated) {
                        el.src = translated.url;
                        if (translated.caption) {
                            // Update or add subtitle layer
                            scene.onAddSubtitle(translated.caption, { 
                                start: 0, 
                                duration: (el as any).duration || 5000 
                            });
                        }
                    }
                }
            }
        }

        editor.onModified();
    }

    /**
     * Synchronizes the color grade of multiple clips based on a reference palette.
     * Applies a SoftLightBlend filter with the dominant color to harmonize the look.
     */
    static async syncColorGrade(targetElementIds: string[], palette: string[]) {
        const editor = useEditorStore();
        if (!palette || palette.length === 0) return;

        const dominantColor = palette[0];
        // Convert hex to normalized RGB for the shader [0-1]
        const hex = dominantColor.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16) / 255;
        const g = parseInt(hex.substring(2, 4), 16) / 255;
        const b = parseInt(hex.substring(4, 6), 16) / 255;

        let syncCount = 0;

        for (const scene of editor.pages) {
            for (const el of scene.elements) {
                if (targetElementIds.includes(el.id)) {
                    // Initialize adjustments if needed
                    if (!el.adjustments) (el as any).adjustments = {};
                    if (!el.filters) (el as any).filters = [];

                    // Find or create SoftLightBlend filter
                    const filter = {
                        type: 'SoftLightBlend',
                        uColor: [r, g, b],
                        uAlpha: 0.4 // Subtle tint
                    };

                    const filters = (el as any).filters;
                    const existingIdx = filters.findIndex((f: any) => f.type === 'SoftLightBlend' && f._sync);
                    if (existingIdx !== -1) {
                        filters[existingIdx] = { ...filter, _sync: true };
                    } else {
                        filters.push({ ...filter, _sync: true });
                    }

                    syncCount++;
                }
            }
        }

        toast.success(`Synchronized color grade for ${syncCount} clips!`);
        editor.onModified();
    }

    /**
     * Extracts viral highlights from a project and creates new scenes for them.
     */
    static async extractHighlights(projectId: string, sensitivity: number = 0.5) {
        const editor = useEditorStore();
        
        const res: any = await extractHighlights({ projectId, sensitivity });
        const highlights = res.highlights || [];

        if (highlights.length === 0) {
            toast.info("No clear highlights detected with current sensitivity.");
            return;
        }

        for (const hl of highlights) {
            // Create a new scene for each highlight
            editor.addPage();
            const newPageIdx = editor.pages.length - 1;
            const newPage = editor.pages[newPageIdx];
            
            newPage.timeline.duration = (hl.end - hl.start) * 1000;
            
            // Generate metadata if requested (optional logic here)
            const metaRes: any = await generateSocialMeta({ text: hl.transcript });
            const meta = metaRes.data || metaRes;
            
            // Find representative elements to copy or use reference
            // Simplified: Add a subtitle with the meta title
            newPage.onAddSubtitle(meta.title || hl.label, { start: 0, duration: 2000 });
            
            // Add a clip from the original footage if mediaId is known
            if (hl.mediaKey) {
                newPage.onAddVideoFromSource(hl.mediaKey, {
                    trimStart: hl.start * 1000,
                    meta: { name: hl.label }
                });
            }
        }

        toast.success(`Extracted ${highlights.length} viral highlights!`);
        editor.setActiveSidebarLeft('scene');
    }

    /**
     * Converts a 16:9 scene to 9:16 portrait by intelligently cropping to the subject.
     */
    static async smartSocialCrop(sceneIndex: number) {
        const editor = useEditorStore();
        const scene = editor.pages[sceneIndex];
        if (!scene) return;

        // Change aspect ratio logic (Simplified for this project)
        // In our engine, we might set a global ratio or just resize elements.
        // We'll assume we want to center-crop all video/image elements.
        
        const TARGET_WIDTH = 1080;
        const TARGET_HEIGHT = 1920;
        const RATIO = TARGET_WIDTH / TARGET_HEIGHT;

        let appliedCount = 0;
        for (const el of scene.elements) {
            if (el.type === 'video' || el.type === 'image') {
                // Adjust scale to cover the portrait frame
                const currentWidth = el.width * el.scaleX;
                const currentHeight = el.height * el.scaleY;
                const currentRatio = currentWidth / currentHeight;

                if (currentRatio > RATIO) {
                    // Wider than portrait: Scale to fit height, then center-crop horizontal
                    el.scaleY = TARGET_HEIGHT / el.height;
                    el.scaleX = el.scaleY;
                    el.left = (TARGET_WIDTH - (el.width * el.scaleX)) / 2;
                    el.top = 0;
                } else {
                    // Taller or equal: Scale to fit width, then center-crop vertical
                    el.scaleX = TARGET_WIDTH / el.width;
                    el.scaleY = el.scaleX;
                    el.top = (TARGET_HEIGHT - (el.height * el.scaleY)) / 2;
                    el.left = 0;
                }
                
                appliedCount++;
            }
        }

        toast.success(`Scene ${sceneIndex + 1} converted to Portrait!`);
        editor.onModified();
    }

    /**
     * Applies dynamic kinetic animations to subtitles based on audio emphasis.
     */
    static async applyKineticStyle(sceneIndex: number, style: string = 'pop') {
        const editor = useEditorStore();
        const scene = editor.pages[sceneIndex];
        if (!scene) return;

        // 1. Find the primary audio for analysis
        const audioEl = scene.elements.find(el => el.type === 'audio' || (el.type === 'video' && !el.muted));
        if (!audioEl) {
            toast.info("No audio track found in scene for kinetic sync.");
            return;
        }

        // 2. Fetch emphasis points
        const res: any = await analyzeAudioEmphasis({ mediaId: audioEl.id });
        const points = res.emphasisPoints || [];

        let appliedCount = 0;
        for (const el of scene.elements) {
            if (el.type === 'subtitle') {
                // In a real implementation, we would register anime.js keyframes
                // For now, we'll tag them with a meta property that our renderer understands
                el.meta = {
                    ...el.meta,
                    kineticStyle: style,
                    emphasisPoints: points.filter(p => p.timestamp >= el.start / 1000 && p.timestamp <= (el.start + el.duration) / 1000)
                };
                appliedCount++;
            }
        }

        toast.success(`Applied ${style} kinetic style to ${appliedCount} captions!`);
        editor.onModified();
    }

    /**
     * Pins a text/subtitle element to a tracked object's movement.
     */
    static async trackObjectToText(sceneIndex: number, textElementId: string, trackData: any[]) {
        const editor = useEditorStore();
        const scene = editor.pages[sceneIndex];
        if (!scene) return;

        const el = scene.elements.find(e => (e as any).id === textElementId || e.name === textElementId);
        if (!el) return;

        // Convert tracking points to element keyframes
        // Assuming trackData is [{ t: time, x: percentX, y: percentY }]
        const keyframes = trackData.map(p => ({
            timestamp: p.t * 1000,
            x: (p.x * 1920) / 100, // Normalized to 1080p canvas scale
            y: (p.y * 1080) / 100
        }));

        el.keyframes = keyframes;
        
        toast.success("Text element pinned to tracked subject!");
        editor.onModified();
    }

    /**
     * Suggests and optionally inserts B-Roll clips based on scene content.
     */
    static async suggestBRollSegments(sceneIndex: number) {
        const editor = useEditorStore();
        const scene = editor.pages[sceneIndex];
        if (!scene) return;

        // 1. Get transcript/context
        const res: any = await suggestBRoll({ sceneId: scene.id });
        const suggestions = res.suggestions || [];

        if (suggestions.length === 0) {
            toast.info("No matching B-Roll suggested for this scene's context.");
            return;
        }

        // 2. Insert top suggested B-Roll as an overlay
        for (const sug of suggestions.slice(0, 2)) {
            scene.onAddVideoFromSource(sug.mediaKey, {
                start: sug.start * 1000,
                duration: sug.duration * 1000,
                meta: { broll: true, matchReason: sug.reason }
            });
        }

        toast.success(`Inserted ${Math.min(suggestions.length, 2)} AI-matched B-Roll segments!`);
        editor.onModified();
    }

    /**
     * Automatically applies AI-chosen transitions between project scenes.
     */
    static async applyAutoTransitions(projectId: string) {
        const editor = useEditorStore();
        
        const res: any = await analyzeSceneTransitions({ projectId });
        const transitions = res.transitions || [];

        if (transitions.length === 0) {
            toast.info("No transitions suggested for this project structure.");
            return;
        }

        for (const trans of transitions) {
            const page = editor.pages.find(p => p.id === trans.fromId);
            if (page) {
                // In our model, transition is part of the scene's exit properties
                page.transition = trans.type as any;
                page.transitionDuration = 1000;
            }
        }

        toast.success(`Applied ${transitions.length} smart transitions project-wide!`);
        editor.onModified();
    }

    /**
     * Runs a full engagement analysis on the project and returns a scorecard.
     */
    static async analyzeProjectEngagement(projectId: string) {
        const res: any = await scoreEngagement({ projectId });
        return res;
    }

    /**
     * Adjusts canvas/export settings for a target social platform.
     */
    static async optimizeExportSettings(projectId: string, platform: 'youtube' | 'tiktok' | 'instagram' | 'linkedin') {
        const editor = useEditorStore();

        const platformDefaults: Record<string, { width: number; height: number }> = {
            youtube:   { width: 1920, height: 1080 },
            tiktok:    { width: 1080, height: 1920 },
            instagram: { width: 1080, height: 1080 },
            linkedin:  { width: 1920, height: 1080 },
        };

        const size = platformDefaults[platform] ?? platformDefaults.youtube;

        // Resize canvas to target dimensions
        editor.resize(size);

        // Optionally fetch AI-tuned bitrate/codec from API
        const res: any = await optimizeForPlatform({ projectId, platform });
        const { codec, bitrate, fps } = res;

        toast.success(`Canvas optimised for ${platform} (${size.width}×${size.height}${codec ? `, ${codec}` : ''})!`);
        editor.onModified();

        return { ...size, codec, bitrate, fps };
    }

    /**
     * Detects brand colors and logo from project assets.
     */
    static async detectBrandKit(projectId: string): Promise<BrandKit | null> {
        const res: any = await extractBrandKit({ projectId });
        return res ?? null;
    }

    /**
     * Applies a brand kit (colors, logo, font) across all scenes in the project.
     */
    static async applyBrandKitToProject(projectId: string, brandKit: BrandKit) {
        const editor = useEditorStore();

        // Call server to get per-element overrides
        await applyBrandKit({ projectId, brandKit });

        // Apply locally to all scenes
        for (const page of editor.pages) {
            for (const el of page.elements) {
                // Apply brand color to text fills
                if (el.type === 'text' || el.type === 'subtitle') {
                    el.fill = brandKit.primaryColor;
                }
                // Apply font family if specified
                if (brandKit.fontFamily && (el.type === 'text' || el.type === 'subtitle')) {
                    el.fontFamily = brandKit.fontFamily;
                }
            }

            // Insert logo watermark if provided
            if (brandKit.logoUrl) {
                const pos = brandKit.logoPosition ?? 'bottom-right';
                const { width: W, height: H } = editor.dimension ?? { width: 1920, height: 1080 };
                const posMap: Record<string, { left: number; top: number }> = {
                    'top-left':     { left: 24, top: 24 },
                    'top-right':    { left: W - 124, top: 24 },
                    'bottom-left':  { left: 24, top: H - 124 },
                    'bottom-right': { left: W - 124, top: H - 124 },
                };
                page.onAddImageFromSource(brandKit.logoUrl, {
                    ...posMap[pos],
                    width: 100, height: 100,
                    meta: { brandLogo: true }
                });
            }
        }

        const count = editor.pages.length;
        toast.success(`Brand kit applied to ${count} scene${count !== 1 ? 's' : ''}!`);
        editor.onModified();
    }

    /**
     * Clones the visual style (palette + filter) from a reference URL.
     */
    static async cloneVisualStyleFromReference(referenceUrl: string) {
        const res: any = await cloneVisualStyle({ referenceUrl });
        return res as { palette: string[]; filterPreset: string } | null;
    }
}
