
import { Combinator, MP4Clip, AudioClip, OffscreenSprite, ImgClip } from "@webav/av-cliper";

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
        const segmentData: Array<{
            blob: Blob,
            audioBlob?: Blob,
            duration: number,
            type: 'video' | 'image'
        }> = [];

        console.log("[Worker] Processing segments...");
        for (let i = 0; i < segments.length; i++) {
            const seg = segments[i];

            // Priority: Direct Blob > S3 Key
            if (seg.blob) {
                segmentData.push({
                    blob: seg.blob,
                    audioBlob: seg.audioBlob,
                    duration: seg.duration || 5, // ms or s? usually s in editor
                    type: seg.type || 'video'
                });
                self.postMessage({ type: 'progress', progress: (i / segments.length) * 0.1, status: `Processing segment ${i + 1}...` });
                continue;
            }

            const videoKey = seg.generatedVideo?.s3Key;
            const imageKey = seg.sceneImage;
            const s3Key = videoKey || imageKey;

            if (!s3Key) continue;
            // ... (rest of fetch logic)

            const type = videoKey ? 'video' : 'image';
            self.postMessage({ type: 'progress', progress: (i / segments.length) * 0.1, status: `Downloading ${type} ${i + 1}...` });

            // 1. Fetch Visual Data
            const mediaUrl = s3Key.startsWith('http') ? s3Key : `/api/s3/${encodeURIComponent(s3Key)}`;
            const fetchOptions: RequestInit = {};
            if (token && !mediaUrl.startsWith('http')) {
                fetchOptions.headers = { 'Authorization': `Bearer ${token}` };
            }

            const [mediaResp, audioResp] = await Promise.all([
                fetch(mediaUrl, fetchOptions),
                // Try to fetch segment-specific voice track if it exists
                (seg.generatedAudio?.s3Key || seg.voiceAudioKey) ? fetch((seg.generatedAudio?.s3Key || seg.voiceAudioKey).startsWith('http') ? (seg.generatedAudio?.s3Key || seg.voiceAudioKey) : `/api/s3/${encodeURIComponent(seg.generatedAudio?.s3Key || seg.voiceAudioKey)}`, fetchOptions) : Promise.resolve(null)
            ]);

            if (!mediaResp.ok) continue;
            const blob = await mediaResp.blob();
            const audioBlob = (audioResp && audioResp.ok) ? await audioResp.blob() : undefined;

            segmentData.push({
                blob,
                audioBlob,
                duration: seg.duration || 5,
                type
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
                const rawSeg = segments[i];

                if (maxDuration && currentTime >= maxDuration) break;

                let clip;
                if (data.type === 'video') {
                    clip = new MP4Clip(data.blob.stream());
                } else {
                    clip = new (ImgClip as any)(data.blob, { duration: data.duration * 1e6 });
                }

                await clip.ready;

                const spr = new OffscreenSprite(clip);
                let clipDuration = Math.min(data.duration, maxDuration ? maxDuration - currentTime : data.duration);

                // Transition Logic: Support fade, wipe
                const transition = (i > 0) ? segments[i - 1].transition : null;
                const transitionDur = (segments[i - 1]?.transitionDuration || 1);
                const easing = segments[i - 1]?.transitionEasing || 'linear';

                spr.time = {
                    offset: currentTime * 1e6,
                    duration: clipDuration * 1e6
                };
                spr.rect.w = width;
                spr.rect.h = height;

                const animationOptions = {
                    duration: transitionDur * 1e6,
                    easing // Assuming AV-Cliper eventually supports this or we map it to keyframes
                };

                if (transition === 'fade') {
                    (spr as any).setAnimation({
                        '0%': { opacity: 0 },
                        '100%': { opacity: 1 }
                    }, animationOptions);
                } else if (transition === 'wipe') {
                    (spr as any).setAnimation({
                        '0%': { x: width },
                        '100%': { x: 0 }
                    }, animationOptions);
                } else if (transition === 'slide-left') {
                    (spr as any).setAnimation({
                        '0%': { x: width },
                        '100%': { x: 0 }
                    }, animationOptions);
                } else if (transition === 'slide-right') {
                    (spr as any).setAnimation({
                        '0%': { x: -width },
                        '100%': { x: 0 }
                    }, animationOptions);
                } else if (transition === 'slide-up') {
                    (spr as any).setAnimation({
                        '0%': { y: height },
                        '100%': { y: 0 }
                    }, animationOptions);
                } else if (transition === 'slide-down') {
                    (spr as any).setAnimation({
                        '0%': { y: -height },
                        '100%': { y: 0 }
                    }, animationOptions);
                } else if (transition === 'zoom-in') {
                    (spr as any).setAnimation({
                        '0%': { scaleX: 0, scaleY: 0, opacity: 0 },
                        '100%': { scaleX: 1, scaleY: 1, opacity: 1 }
                    }, animationOptions);
                } else if (transition === 'zoom-out') {
                    (spr as any).setAnimation({
                        '0%': { scaleX: 2, scaleY: 2, opacity: 0 },
                        '100%': { scaleX: 1, scaleY: 1, opacity: 1 }
                    }, animationOptions);
                } else if (transition === 'dip-to-black') {
                    (spr as any).setAnimation({
                        '0%': { opacity: 0 },
                        '50%': { opacity: 0 },
                        '100%': { opacity: 1 }
                    }, animationOptions);
                } else if (transition === 'dip-to-white') {
                    // Dip to white is harder without a white background sprite, 
                    // but we can simulate it with a very high brightness if supported, 
                    // or just stick to opacity if we have a white bg. 
                    // For now, let's treat it as a fade from 0.
                    (spr as any).setAnimation({
                        '0%': { opacity: 0 },
                        '100%': { opacity: 1 }
                    }, animationOptions);
                }

                await com.addSprite(spr);

                // Mix Segment Audio if present
                if (data.audioBlob && !isReview) {
                    const audioClip = new AudioClip(data.audioBlob.stream(), {
                        volume: rawSeg.volume || 1
                    });
                    const aSpr = new OffscreenSprite(audioClip);
                    aSpr.time = {
                        offset: currentTime * 1e6,
                        duration: clipDuration * 1e6
                    };
                    await com.addSprite(aSpr);
                }

                // If this segment has a transition to the NEXT one, overlap the start time
                const nextTransition = rawSeg.transition;
                const nextTransitionDur = (rawSeg.transitionDuration || 1);

                if (nextTransition && nextTransition !== 'none' && i < segmentData.length - 1) {
                    currentTime += (clipDuration - nextTransitionDur);
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
                blob: new Blob(chunks as any, { type: `video/${options.format || 'mp4'}` }),
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
