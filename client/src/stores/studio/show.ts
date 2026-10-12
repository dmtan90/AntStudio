// Show runner, commerce, highlights and analytics (moved verbatim from the studio store setup function).
import api from '@/utils/api';
import { ActionSyncService } from '@/utils/ai/ActionSyncService';
import { VisualConceptService } from '@/utils/ai/VisualConceptService';
import { toast } from 'vue-sonner';
import { EngagementMetrics } from './types';
import type { StudioContext } from './context';

export function createShowActions(ctx: StudioContext) {
    const { highlightedProduct, v2cMatch, activeScene, visualSettings, featuredProducts, liveProducts, activeProductId, activeFlashSale, showPostStreamSynthesis, viewerCount, engagement, sessionInfra, clientHighlightBuffer, MAX_HIGHLIGHT_BUFFER_MS, viralMoments, isInfiniteMode, autoDirectorSettings, currentSpeakerId, studioVibe, vibeScore, chatVelocity, intentScore, autoCameraEnabled, activeGraphicContent, activeScript, scriptIndex, isRemoteUpdate, demoMode, shadowStats } = ctx.state;
    const broadcastCurrentState = (...args: any[]) => ctx.fns.broadcastCurrentState(...args);

    function toggleDemoMode() {
        demoMode.value = !demoMode.value;
    }

    function setSpeakerFocus(id: string | null) {
        currentSpeakerId.value = id;
    }

    function updateStudioVibe(vibe: string, force = false) {
        if (studioVibe.value === vibe && !force) return;
        studioVibe.value = vibe;

        if (!autoDirectorSettings.value.enabled || !autoDirectorSettings.value.autoAtmosphereEnabled) return;

        console.log(`[Studio] Applying Atmosphere Preset: ${vibe}`);
        
        switch (vibe) {
            case 'hype':
                visualSettings.value.background.blurLevel = 'high';
                visualSettings.value.beauty.brightness = 0.7; // Bright
                visualSettings.value.beauty.saturation = 1.2; // Vivid (mock property, assuming visualSettings handles it or just brightness)
                // In a real implementation we would map significantly more properties
                break;
            case 'chill':
                visualSettings.value.background.blurLevel = 'medium';
                visualSettings.value.beauty.brightness = 0.5; // Normal
                break;
            case 'tense':
                visualSettings.value.background.blurLevel = 'low';
                visualSettings.value.beauty.brightness = 0.4; // Dim
                break;
            case 'professional':
                visualSettings.value.background.blurLevel = 'low';
                visualSettings.value.beauty.brightness = 0.6; // Clean
                break;
        }
        broadcastCurrentState();
    }

    function setAutoCamera(enabled: boolean) {
        autoCameraEnabled.value = enabled;
    }

    function updateGraphicContent(title: string, subtitle: string) {
        activeGraphicContent.value = { title, subtitle };
    }

    // ShowRunner Actions
    async function createShowScript(profileId: string, inputs: Record<string, string>) {
        const res: any = await api.post('/show/generate', { profileId, inputs, isInfiniteMode: isInfiniteMode.value });
        activeScript.value = res.data;
        scriptIndex.value = -1;
    }

    function castVote(optionIndex: number) {
        ActionSyncService.getSocket()?.emit('hive:vote', { optionIndex });
    }

    async function startShow() {
        await api.post('/show/start');
        // Socket will update state
    }

    async function nextShowStep() {
        await api.post('/show/next');
    }

    function updateIntentScore(score: number) {
        intentScore.value = score;
    }

    function updateMetrics(metrics: { chatVelocity?: number, vibeScore?: number }) {
        if (metrics.chatVelocity !== undefined) chatVelocity.value = metrics.chatVelocity;
        if (metrics.vibeScore !== undefined) vibeScore.value = metrics.vibeScore;
    }

    function updateV2CMatch(match: any) {
        v2cMatch.value = match;
    }

    function updateScriptState(script: any) {
        activeScript.value = script;
        scriptIndex.value = script.currentIndex;
    }

    async function executeShowStep(step: any) {
        if (!step) return;

        console.log('[StudioStore] Executing Show Step:', step);

        // 1. Handle Dialogue
        if (step.dialogue && step.agentId) {
            console.log(`[StudioStore] Agent ${step.agentId} says:`, step.dialogue);

            // Map agentId ('host', 'guest_1', etc.) to an actual entityId in the studio
            // We assume 'host' is the main AI (or real person).
            // For now, let's emit a global event that SyntheticGuestManager can pick up
            // or directly set a 'speaking' state if the main influencer is active.
            window.dispatchEvent(new CustomEvent('showrunner:dialogue', {
                detail: {
                    agentId: step.agentId,
                    text: step.dialogue,
                    emotion: step.emotion
                }
            }));

            // Real-time B-Roll Trigger
            VisualConceptService.processDialogue(step.dialogue, studioVibe.value)
                .catch(err => console.warn('[ShowRunner] B-roll trigger failed:', err));
        }

        // 2. Handle Actions
        if (step.action) {
            const params = step.actionParams || {};
            switch (step.action) {
                case 'switch_scene':
                    if (params.actionPayload && activeScene.value) {
                        activeScene.value.layout = params.actionPayload;
                        broadcastCurrentState();
                    }
                    break;
                case 'set_camera_transform':
                    // This is meant for 2D/3D camera. We can trigger an event that VideoViewer/VRMViewer listens to
                    window.dispatchEvent(new CustomEvent('director:camera_motion', { detail: params }));
                    break;
                case 'trigger_visual_fx':
                    if (params.type) {
                        // Dispatch event for existing particle/aura managers
                        window.dispatchEvent(new CustomEvent('show:event', {
                            detail: { type: `visual_${params.type}` }
                        }));
                    }
                    break;
                case 'show_product':
                    if (params.id) {
                        showcaseProduct({ id: params.id });
                    }
                    break;
                case 'trigger_sponsorship':
                    // overlay
                    activeGraphicContent.value = {
                        title: params.sponsorName || 'Sponsored',
                        subtitle: params.slogan || ''
                    };
                    break;
                case 'trigger_data_overlay':
                    // dynamic data overlay
                    window.dispatchEvent(new CustomEvent('show:event', {
                        detail: { type: 'data_overlay', payload: params }
                    }));
                    break;
                case 'assemble_highlights':
                    void import('vue-sonner').then(({ toast }) => {
                        toast.info("ShowRunner is assembling live highlights!");
                    });
                    break;
                case 'trigger_ad_break':
                    activeGraphicContent.value = {
                        title: "We'll be right back!",
                        subtitle: "Commercial Break"
                    };
                    break;
                default:
                    console.log('[StudioStore] Unhandled ShowRunner Action:', step.action);
                    break;
            }
        }
    }

    async function fetchCommerceProducts(syncToFeatured: boolean = true) {
        try {
            const res: any = await api.get('/commerce/products');
            liveProducts.value = res.data;
            if (syncToFeatured) {
                featuredProducts.value = res.data; // Sync to ensure overlays have data
            }
            return res.data;
        } catch (error) {
            console.error('[StudioStore] Failed to fetch products:', error);
            throw error;
        }
    }

    async function fetchCommerceReport(sessionId: string) {
        try {
             // Use type assertion if necessary or just return data
             const res: any = await api.get(`/commerce/reports/${sessionId}`)
             return res.data
        } catch (error: any) {
             console.warn('Failed to fetch commerce report:', error)
             // Return null or throw depending on desired behavior. LiveStudio just logs error.
             throw error
        }
    }

    function showcaseProduct(product: any) {
        highlightedProduct.value = product;
        if (!isRemoteUpdate.value) {
            broadcastCurrentState();
        }
    }

    function removeProduct(productId: string) {
        if (!productId) return;
        // Compare against both string forms to handle MongoDB _id vs synthetic id
        const current = activeProductId.value ? String(activeProductId.value) : null;
        if (current === String(productId)) {
            highlightedProduct.value = null;
            if (!isRemoteUpdate.value) {
                broadcastCurrentState();
            }
        }
    }

    function updateProductScarcity(productId: string, stock: number) {
        const product = liveProducts.value.find(p => p.id === productId || p._id === productId);
        if (product) {
            product.stock = stock;
            toast.warning(`Limited Stock: Only ${stock} units left for ${product.name}!`, {
                description: "AI identified high demand."
            });
        }
    }

    function setTranslationMode(enabled: boolean, source: string, target: string) {
        visualSettings.value.accessibility.translationEnabled = enabled;
        visualSettings.value.accessibility.sourceLang = source;
        visualSettings.value.accessibility.targetLang = target;
        
        if (enabled) {
            toast.success(`Influencer Dubbing Active: ${source} → ${target}`);
        } else {
            toast.info("Real-time translation disabled");
        }
    }

    function triggerStreamSummary() {
        showPostStreamSynthesis.value = true;
        toast.info("AI is generating your stream performance report...");
    }

    function appendHighlightChunk(blob: Blob) {
        const now = Date.now();
        clientHighlightBuffer.value.push({ data: blob, timestamp: now });

        // Cleanup old chunks (older than 30s)
        const cutoff = now - MAX_HIGHLIGHT_BUFFER_MS;
        while (clientHighlightBuffer.value.length > 0 && clientHighlightBuffer.value[0].timestamp < cutoff) {
            clientHighlightBuffer.value.shift();
        }
    }

    async function captureHighlight(sessionId: string, metadata?: { description?: string, importance?: number }) {
        // High-level Logic:
        // 1. If we have a local buffer (AMS mode), process it locally for zero-latency capture
        // 2. If not, fallback to server-side capture (Relay mode)

        if (clientHighlightBuffer.value.length > 0) {
            try {
                const now = Date.now();
                const durationMs = 15000; // Last 15 seconds
                const cutoff = now - durationMs;
                const relevantChunks = clientHighlightBuffer.value.filter(c => c.timestamp >= cutoff);

                if (relevantChunks.length === 0) {
                    toast.error('Highlight buffer is still warming up...');
                    return null;
                }

                const blob = new Blob(relevantChunks.map(c => c.data), { type: 'video/webm' });
                const fileName = `highlights/${sessionId}/${Math.random().toString(36).substring(7)}.webm`;

                // Upload directly to S3 via projects endpoint or generic S3 helper
                const formData = new FormData();
                formData.append('file', blob, 'highlight.webm');
                formData.append('path', fileName);
                formData.append('contentType', 'video/webm');
                if (metadata) {
                    formData.append('metadata', JSON.stringify(metadata));
                }

                const res: any = await api.post('/s3/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                toast.success('Viral moment captured locally!');
                return res.data;
            } catch (error: any) {
                console.error('[StudioStore] Local highlight capture failed:', error);
                // Fallback to backend anyway just in case
            }
        }

        try {
            const res: any = await api.post(`/streaming/status/${sessionId}/highlight`, metadata);
            
            if (res.data) {
                viralMoments.value.unshift({
                    ...res.data,
                    timestamp: Date.now(),
                    reason: metadata?.description || 'Manual Highlight'
                });
            }

            toast.success('Viral moment captured via Cloud!');
            return res.data;
        } catch (error: any) {
            console.error('[StudioStore] Highlight capture failed:', error);
            toast.error('Failed to capture highlight');
            return null;
        }
    }

    async function fetchShadowStats(sessionId: string) {
        try {
            const res: any = await api.get(`/streaming/status/${sessionId}/shadow`);
            shadowStats.value = res.data;
            return res.data;
        } catch (error) {
            console.error('[StudioStore] Failed to fetch shadow stats:', error);
            return [];
        }
    }

    async function fetchSessionInfra(sessionId: string) {
        try {
            const res: any = await api.get(`/streaming/status/${sessionId}/infra`);
            sessionInfra.value = res.data;
            return res.data;
        } catch (error) {
            console.error('[StudioStore] Failed to fetch session infra:', error);
            return null;
        }
    }

    async function startFlashSale(saleData: any) {
        try {
            // Standardize sale data
            const startTime = saleData.startTime || Date.now();
            const durationMinutes = Number(saleData.durationMinutes || Math.round(saleData.duration / 60) || 5);
            const expiresAt = new Date(startTime + durationMinutes * 60000).toISOString();

            const standardizedData = {
                ...saleData,
                startTime,
                durationMinutes,
                expiresAt
            };

            // Forward to API to trigger global notification (Host only)
            if (!isRemoteUpdate.value) {
                await api.post('/commerce/flash-sale', standardizedData);
            }
            activeFlashSale.value = standardizedData;

            if (!isRemoteUpdate.value) {
                broadcastCurrentState();
            }
            return true;
        } catch (error) {
            console.error('[StudioStore] Flash sale failed:', error);
            return false;
        }
    }

    function endFlashSale() {
        activeFlashSale.value = null;
        if (!isRemoteUpdate.value) {
            broadcastCurrentState();
        }
    }

    async function fetchAnalytics(projectId: string) {
        try {
            const res: any = await api.get(`/projects/${projectId}/analytics`);
            const metrics = res.data.metrics;
            updateEngagement({
                viewerCount: metrics.viewCount,
                peakViewers: metrics.peakViewers,
                likes: metrics.likeCount,
                shares: metrics.shareCount
            });
            return res.data;
        } catch (error) {
            console.error('[StudioStore] Failed to fetch analytics:', error);
            throw error;
        }
    }

    function updateEngagement(metrics: Partial<EngagementMetrics>) {
        Object.assign(engagement.value, metrics);
        if (metrics.viewerCount !== undefined) {
            viewerCount.value = metrics.viewerCount;
            if (metrics.viewerCount > engagement.value.peakViewers) {
                engagement.value.peakViewers = metrics.viewerCount;
            }
        }
    }

    return {
        toggleDemoMode,
        setSpeakerFocus,
        updateStudioVibe,
        setAutoCamera,
        updateGraphicContent,
        createShowScript,
        castVote,
        startShow,
        nextShowStep,
        updateIntentScore,
        updateMetrics,
        updateV2CMatch,
        updateScriptState,
        executeShowStep,
        fetchCommerceProducts,
        fetchCommerceReport,
        showcaseProduct,
        removeProduct,
        updateProductScarcity,
        setTranslationMode,
        triggerStreamSummary,
        appendHighlightChunk,
        captureHighlight,
        fetchShadowStats,
        fetchSessionInfra,
        startFlashSale,
        endFlashSale,
        fetchAnalytics,
        updateEngagement,
    };
}
