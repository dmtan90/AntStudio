
import { Combinator, MP4Clip, AudioClip, OffscreenSprite } from "@webav/av-cliper";

self.onmessage = async (event: MessageEvent<any>) => {
    const { project, options, token } = event.data;

    try {
        console.log("[Worker] Initializing Accelerated Video Assembly...");

        const segments = project.storyboard?.segments || [];
        if (segments.length === 0) throw new Error("No segments to assemble");

        const resolutionMap: Record<string, { w: number, h: number }> = {
            '720p': { w: 1280, h: 720 },
            '1080p': { w: 1920, h: 1080 },
            '2k': { w: 2560, h: 1440 },
            '4k': { w: 3840, h: 2160 }
        };
        const res = resolutionMap[options.resolution] || { w: 1920, h: 1080 };
        const width = res.w;
        const height = res.h;
        const fps = options.fps || 30;

        const totalProjectDuration = segments.reduce((acc: number, s: any) => acc + (s.duration || 0), 0);

        // Helper to fetch and cache data to avoid redundant network requests for two-pass rendering
        const segmentData: Array<{ blob: Blob, duration: number }> = [];

        console.log("[Worker] Fetching segments...");
        for (let i = 0; i < segments.length; i++) {
            const seg = segments[i];
            const s3Key = seg.generatedVideo?.s3Key || seg.s3Key;
            if (!s3Key) continue;

            self.postMessage({ type: 'progress', progress: (i / segments.length) * 0.1, status: `Downloading clip ${i + 1}...` });
            const videoUrl = s3Key.startsWith('http') ? s3Key : `/api/s3/${encodeURIComponent(s3Key)}`;
            const fetchOptions: RequestInit = {};
            if (token && !videoUrl.startsWith('http')) {
                fetchOptions.headers = { 'Authorization': `Bearer ${token}` };
            }
            const resp = await fetch(videoUrl, fetchOptions);
            if (!resp.ok) continue;

            const blob = await resp.blob();
            segmentData.push({
                blob,
                duration: seg.duration || 5
            });
        }

        let bgmBlob: Blob | null = null;
        const bgmKey = project.backgroundMusic?.s3Key;
        if (bgmKey) {
            const bgmUrl = bgmKey.startsWith('http') ? bgmKey : `/api/s3/${encodeURIComponent(bgmKey)}`;
            const fetchOptions: RequestInit = {};
            if (token && !bgmUrl.startsWith('http')) {
                fetchOptions.headers = { 'Authorization': `Bearer ${token}` };
            }
            const resp = await fetch(bgmUrl, fetchOptions);
            if (resp.ok) bgmBlob = await resp.blob();
        }

        // Function to run a combinator pass
        const runAssembly = async (maxDuration: number | null = null, isReview: boolean = false) => {
            const com = new Combinator({
                width,
                height,
                bgColor: '#000000',
                fps
            });

            let currentTime = 0;
            for (let i = 0; i < segmentData.length; i++) {
                const data = segmentData[i];
                const rawSeg = segments[i]; // Original segment data with transition info

                if (maxDuration && currentTime >= maxDuration) break;

                const clip = new MP4Clip(data.blob.stream());
                await clip.ready;

                const spr = new OffscreenSprite(clip);
                let clipDuration = Math.min(data.duration, maxDuration ? maxDuration - currentTime : data.duration);

                // Transition Logic: Overlap with next segment if applicable
                const transition = rawSeg.transition;
                const transitionDur = (rawSeg.transitionDuration || 1); // seconds

                spr.time = {
                    offset: currentTime * 1e6,
                    duration: clipDuration * 1e6
                };
                spr.rect.w = width;
                spr.rect.h = height;

                // Simple Fade-in effect for the second clip in a transition
                if (i > 0 && segments[i - 1].transition === 'fade') {
                    spr.setAnimation(
                        {
                            '0%': { opacity: 0 },
                            '100%': { opacity: 1 }
                        },
                        { duration: transitionDur * 1e6 }
                    );
                }

                await com.addSprite(spr);

                // If this segment has a transition to the NEXT one, overlap the start time
                if (transition === 'fade' && i < segmentData.length - 1) {
                    currentTime += (clipDuration - transitionDur);
                } else {
                    currentTime += clipDuration;
                }
            }

            let finalDuration = currentTime;
            if (bgmBlob) {
                const audioClip = new AudioClip(bgmBlob.stream(), {
                    volume: project.backgroundMusic.volume || 0.3,
                    loop: true
                });
                const spr = new OffscreenSprite(audioClip);
                spr.time = {
                    offset: 0,
                    duration: finalDuration * 1e6
                };
                await com.addSprite(spr);
            }

            if (!isReview) {
                com.on('OutputProgress', (p: number) => {
                    self.postMessage({
                        type: 'progress',
                        progress: 0.1 + (p * 0.8),
                        status: `Encoding video: ${Math.round(p * 100)}%`
                    });
                });
            }

            const outputStream = com.output();
            const reader = outputStream.getReader();
            const chunks: Uint8Array[] = [];
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
            }
            com.destroy();
            return {
                blob: new Blob(chunks, { type: `video/${options.format || 'mp4'}` }),
                duration: finalDuration
            };
        };

        // 1. Render Full Video
        console.log("[Worker] Rendering Full Video...");
        const mainResult = await runAssembly();

        // 2. Render 5s Review Clip (Faster than FFmpeg.wasm)
        console.log("[Worker] Rendering Review Clip...");
        self.postMessage({ type: 'progress', progress: 0.9, status: 'Generating review clip...' });
        const reviewResult = await runAssembly(5, true);

        self.postMessage({
            type: 'complete',
            blob: mainResult.blob,
            reviewBlob: reviewResult.blob,
            duration: mainResult.duration,
            progress: 1
        });

    } catch (error: any) {
        console.error("[Worker] Global Error:", error);
        self.postMessage({ type: 'error', error: error.message });
    }
};
