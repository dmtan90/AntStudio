import { ref } from 'vue';
import { useProjectStore } from '@/stores/project';
import { toast } from 'vue-sonner';
import { useI18n } from 'vue-i18n';
import { Combinator, MP4Clip, AudioClip, OffscreenSprite, ImgClip } from '@webav/av-cliper';
import { getFileUrl } from '@/utils/api';

export interface ExportOptions {
    format: 'mp4' | 'webm';
    codec: string;
    resolution: '720p' | '1080p' | '4k';
    fps: number;
    bitrate: 'low' | 'medium' | 'high';
    includeAudio: boolean;
    audioCodec?: string;
    sampleRate?: number;
}

async function convertMp4ToWebmMediabunny(mp4Blob: Blob, options: ExportOptions): Promise<Blob> {
    try {
        const { Input, Output, Conversion, BlobSource, BufferTarget, WebMOutputFormat, Mp4InputFormat, WebMInputFormat } = await import('mediabunny');

        const input = new Input({
            source: new BlobSource(mp4Blob),
            formats: [new Mp4InputFormat(), new WebMInputFormat()],
        });

        const target = new BufferTarget();
        const output = new Output({
            format: new WebMOutputFormat(),
            target,
        });

        const vCodec = (options.codec?.toLowerCase() === 'vp9' ? 'vp9' : 'vp8') as any;
        const aCodec = (options.audioCodec?.toLowerCase() === 'vorbis' ? 'vorbis' : 'opus') as any;

        let conversion = await Conversion.init({
            input,
            output,
            video: {
                codec: vCodec
            },
            audio: options.includeAudio === false ? false : {
                codec: aCodec
            }
        });

        if (!conversion.isValid) {
            console.warn('[Assembler] mediabunny specified track config invalid, running auto track conversion...');
            const targetAuto = new BufferTarget();
            const outputAuto = new Output({
                format: new WebMOutputFormat(),
                target: targetAuto,
            });
            conversion = await Conversion.init({
                input,
                output: outputAuto
            });
            await conversion.execute();
            if (targetAuto.buffer && targetAuto.buffer.byteLength > 0) {
                return new Blob([targetAuto.buffer], { type: 'video/webm' });
            }
        } else {
            await conversion.execute();
        }
        
        if (target.buffer && target.buffer.byteLength > 0) {
            console.log(`[Assembler] mediabunny WebM conversion (${vCodec}/${aCodec}) success! Size:`, target.buffer.byteLength);
            return new Blob([target.buffer], { type: 'video/webm' });
        }
        throw new Error('mediabunny output buffer is empty');
    } catch (err) {
        console.warn('[Assembler] mediabunny conversion warning, trying native fallback:', err);
        return convertMp4ToWebmNative(mp4Blob);
    }
}

function convertMp4ToWebmNative(mp4Blob: Blob): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.src = URL.createObjectURL(mp4Blob);
        video.crossOrigin = 'anonymous';
        video.playsInline = true;

        const chunks: Blob[] = [];
        let recorder: MediaRecorder | null = null;
        let audioCtx: AudioContext | null = null;

        video.onloadedmetadata = () => {
            try {
                // Route Audio via Web Audio API to prevent loud speaker playback while capturing perfect Opus PCM track
                const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
                audioCtx = new AudioCtxClass();
                const source = audioCtx.createMediaElementSource(video);
                const dest = audioCtx.createMediaStreamDestination();
                source.connect(dest);

                // Capture Video Stream
                const videoStream = (video as any).captureStream ? (video as any).captureStream() : (video as any).mozCaptureStream();
                const combinedStream = new MediaStream([
                    ...videoStream.getVideoTracks(),
                    ...dest.stream.getAudioTracks()
                ]);

                const options = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
                    ? { mimeType: 'video/webm;codecs=vp8,opus', videoBitsPerSecond: 6000000 }
                    : (MediaRecorder.isTypeSupported('video/webm') ? { mimeType: 'video/webm', videoBitsPerSecond: 6000000 } : undefined);

                recorder = new MediaRecorder(combinedStream, options);

                recorder.ondataavailable = (e) => {
                    if (e.data && e.data.size > 0) {
                        chunks.push(e.data);
                    }
                };

                recorder.onstop = () => {
                    URL.revokeObjectURL(video.src);
                    if (audioCtx) {
                        audioCtx.close().catch(() => {});
                    }
                    video.remove();
                    if (chunks.length > 0) {
                        resolve(new Blob(chunks, { type: 'video/webm' }));
                    } else {
                        reject(new Error('MediaRecorder produced empty chunks'));
                    }
                };

                video.playbackRate = 1.0; // 1:1 exact frame synchronization to prevent lag, frame drops, and duration mismatch
                recorder.start(100);
                video.play().catch(reject);
            } catch (err) {
                URL.revokeObjectURL(video.src);
                if (audioCtx) audioCtx.close().catch(() => {});
                video.remove();
                reject(err);
            }
        };

        video.onended = () => {
            if (recorder && recorder.state !== 'inactive') {
                recorder.stop();
            }
        };

        video.onerror = (e) => {
            URL.revokeObjectURL(video.src);
            if (audioCtx) audioCtx.close().catch(() => {});
            video.remove();
            reject(new Error('Video playback error during WebM conversion'));
        };
    });
}

export function useVideoAssembler() {
    const projectStore = useProjectStore();
    const { t } = useI18n()
    const isAssembling = ref(false);
    const progress = ref(0);
    const status = ref('');
    const error = ref<string | null>(null);
    const result = ref<{ blob: Blob; url: string; reviewBlob: Blob; duration: number } | null>(null);

    let worker: Worker | null = null;

    const runMainThreadAssembly = async (options: ExportOptions, project: any, onProgress: (prog: number, msg: string) => void) => {
        const segments = project.pages || project.storyboard?.segments || [];
        const ratioStr = project.aspectRatio || '16:9';
        const [rw, rh] = ratioStr.split(':').map(Number);
        
        const baseHeights: Record<string, number> = {
            '720p': 720,
            '1080p': 1080,
            '2k': 1440,
            '4k': 2160
        };
        const height = baseHeights[options.resolution] || 1080;
        const width = Math.round(height * (rw / rh));
        const fps = options.fps || 30;

        const getDuration = (s: any) => !!s.data ? (s.duration || 5000) / 1000 : (s.duration || 5);

        const segmentData: Array<{
            blob: Blob,
            voiceBlob?: Blob,
            duration: number,
            type: 'video' | 'image'
        }> = [];

        onProgress(0.05, 'Processing segments on main thread...');
        const token = localStorage.getItem('auth-token');

        for (let i = 0; i < segments.length; i++) {
            const seg = segments[i];
            const duration = getDuration(seg);

            if (seg.blob) {
                segmentData.push({
                    blob: seg.blob,
                    duration: duration,
                    type: seg.type || 'video'
                });
                onProgress((i / segments.length) * 0.1, `Processing segment ${i + 1}...`);
                continue;
            }

            const videoKey = seg.url || seg.generatedVideo?.s3Key;
            const imageKey = seg.sceneImage;
            const s3Key = videoKey || imageKey;
            const voiceKey = seg.voiceUrl || seg.generatedAudio?.s3Key;

            if (!s3Key) continue;

            const type = videoKey ? 'video' : 'image';
            onProgress((i / segments.length) * 0.1, `Downloading ${type} ${i + 1}...`);

            const mediaUrl = getFileUrl(s3Key);
            const fetchOptions: RequestInit = {};
            if (token) {
                fetchOptions.headers = { 'Authorization': `Bearer ${token}` };
            }

            const voiceUrl = voiceKey ? getFileUrl(voiceKey) : null;
            console.log(`[MainThread] Fetching segment ${i + 1}:`, { mediaUrl, voiceUrl });

            const [mediaResp, audioResp] = await Promise.all([
                fetch(mediaUrl, fetchOptions),
                voiceUrl ? fetch(voiceUrl, fetchOptions) : Promise.resolve(null)
            ]);

            if (!mediaResp.ok) {
                console.warn(`[MainThread] Media fetch failed for segment ${i + 1}:`, mediaResp.status);
                continue;
            }
            const blob = await mediaResp.blob();
            let voiceBlob: Blob | undefined = undefined;

            if (audioResp && audioResp.ok) {
                try {
                    voiceBlob = await audioResp.blob();
                    console.log(`[MainThread] Voice audio blob fetched successfully for segment ${i + 1}, size:`, voiceBlob.size);
                } catch (e) {
                    console.warn(`[MainThread] Audio fetch error for segment ${i + 1}:`, e);
                }
            } else if (voiceUrl) {
                console.warn(`[MainThread] Audio fetch failed for segment ${i + 1}:`, audioResp?.status);
            }

            segmentData.push({
                blob,
                voiceBlob,
                duration: seg.duration || 5,
                type
            });
        }

        let bgmBlob: Blob | null = null;
        const primaryMusic = project.musics?.[0];
        const bgmKey = primaryMusic?.s3Key || primaryMusic?.url;
        if (bgmKey) {
            const bgmUrl = getFileUrl(bgmKey);
            const fetchOptions: RequestInit = {};
            if (token) {
                fetchOptions.headers = { 'Authorization': `Bearer ${token}` };
            }
            console.log('[MainThread] Fetching BGM:', bgmUrl);
            const resp = await fetch(bgmUrl, fetchOptions);
            if (resp.ok) {
                try {
                    bgmBlob = await resp.blob();
                    console.log('[MainThread] BGM audio blob fetched successfully, size:', bgmBlob.size);
                } catch (e) {
                    console.warn('[MainThread] BGM audio fetch error:', e);
                }
            } else {
                console.warn('[MainThread] BGM fetch failed:', resp.status);
            }
        }

        const bitrateNumericMap: Record<string, number> = {
            low: 1500000,
            medium: 4000000,
            high: 8000000
        };
        const bitrateNum = bitrateNumericMap[options.bitrate] || 4000000;

        const mp4VideoCodecMap: Record<string, string> = {
            H264: 'avc1.4d402a',
            H265: 'hev1.1.6.L120.B0',
            AV1: 'av01.0.08M.08'
        };

        const selectedCodec = (options.format === 'mp4' && options.codec && mp4VideoCodecMap[options.codec])
            ? mp4VideoCodecMap[options.codec]
            : 'avc1.4d402a';

        const combinatorOpts: any = {
            width,
            height,
            bgColor: '#000000',
            fps,
            bitrate: bitrateNum,
            videoCodec: selectedCodec
        };

        if (options.includeAudio === false) {
            combinatorOpts.audio = false;
        }

        const com = new Combinator(combinatorOpts);

        let currentTime = 0;
        for (let i = 0; i < segmentData.length; i++) {
            const data = segmentData[i];
            const rawSeg = segments[i];

            let clip;
            const videoVol = typeof rawSeg.volume === 'number' ? rawSeg.volume : 1.0;
            const videoSpeed = typeof rawSeg.speed === 'number' && rawSeg.speed > 0 ? rawSeg.speed : 1.0;

            const freshVisualStream = data.blob.slice(0, data.blob.size, data.blob.type).stream();
            if (data.type === 'video') {
                clip = new MP4Clip(freshVisualStream, {
                    audio: videoVol > 0 ? { volume: videoVol } : false
                });
            } else {
                clip = new (ImgClip as any)(freshVisualStream, { duration: (data.duration / videoSpeed) * 1e6 });
            }

            await clip.ready;

            const spr = new OffscreenSprite(clip);
            let clipDuration = data.duration / videoSpeed;

            spr.time = {
                offset: currentTime * 1e6,
                duration: clipDuration * 1e6
            };
            spr.rect.w = width;
            spr.rect.h = height;

            await com.addSprite(spr);

            // Segment Voice
            if (data.voiceBlob && (options.includeAudio !== false)) {
                try {
                    const voiceVol = typeof rawSeg.voiceVolume === 'number' ? rawSeg.voiceVolume : 1.0;
                    console.log("[MainThread] Adding Voice Audio stream, Volume:", voiceVol);
                    const freshVoiceStream = data.voiceBlob.slice(0, data.voiceBlob.size).stream();
                    const audioClip = new AudioClip(freshVoiceStream, {
                        volume: voiceVol
                    });
                    await audioClip.ready;
                    const aSpr = new OffscreenSprite(audioClip);
                    aSpr.time = {
                        offset: currentTime * 1e6,
                        duration: clipDuration * 1e6
                    };
                    await com.addSprite(aSpr);
                } catch (err) {
                    console.warn('[MainThread] Segment audio error:', err);
                }
            }

            currentTime += clipDuration;
        }

        let finalDuration = currentTime;

        // BGM
        const userBgmVolume = typeof primaryMusic?.volume === 'number' ? primaryMusic.volume : 0.8;
        if (bgmBlob && (options.includeAudio !== false) && userBgmVolume > 0) {
            try {
                console.log("[MainThread] Adding BGM Audio stream, Volume:", userBgmVolume);
                const freshBgmStream = bgmBlob.slice(0, bgmBlob.size).stream();
                const audioClip = new AudioClip(freshBgmStream, {
                    volume: userBgmVolume,
                    loop: true
                });
                await audioClip.ready;
                const spr = new OffscreenSprite(audioClip);
                spr.time = {
                    offset: 0,
                    duration: finalDuration * 1e6
                };
                await com.addSprite(spr);
            } catch (err) {
                console.warn('[MainThread] BGM error:', err);
            }
        }

        com.on('OutputProgress', (p: number) => {
            onProgress(0.1 + (p * 0.8), `Encoding video: ${Math.round(p * 100)}%`);
        });

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
            blob: new Blob(chunks as any, { type: 'video/mp4' }),
            duration: finalDuration
        };
    };

    const assemble = async (options: ExportOptions, projectOverride?: any) => {
        const projectData = projectOverride || projectStore.currentProject;

        if (!projectData) {
            toast.error(t('projects.editor.video.noProject'));
            return;
        }

        isAssembling.value = true;
        progress.value = 0;
        status.value = t('projects.editor.video.initializing');
        error.value = null;
        result.value = null;

        try {
            console.log("[Assembler] Running assembly on Main Thread...");
            const res = await runMainThreadAssembly(options, projectData, (prog, msg) => {
                progress.value = prog * 100;
                status.value = msg;
            });
            handleComplete(res, options);
        } catch (e: any) {
            handleError(e.message);
        }
    };

    const handleError = (msg: string) => {
        console.error('[Assembler] Error:', msg);
        error.value = msg;
        isAssembling.value = false;
        toast.error(t('projects.editor.video.errorTitle', { msg }));
        if (worker) {
            worker.terminate();
            worker = null;
        }
    };

    const handleComplete = async (data: any, options: ExportOptions) => {
        status.value = t('projects.editor.video.complete');
        progress.value = 90;

        let finalBlob = data.blob;

        if (options.format === 'webm' && finalBlob.type !== 'video/webm') {
            status.value = 'Converting video to WebM...';
            try {
                finalBlob = await convertMp4ToWebmMediabunny(finalBlob, options);
                console.log('[Assembler] mediabunny WebM conversion success! Blob size:', finalBlob.size);
            } catch (mediabunnyErr) {
                console.warn('[Assembler] mediabunny conversion failed, trying FFmpeg WASM fallback:', mediabunnyErr);
                const requestedVCodec = options.codec?.toLowerCase() === 'vp9' ? 'libvpx-vp9' : (options.codec?.toLowerCase() === 'vp8' ? 'vp8' : 'vp8');
                const requestedACodec = options.audioCodec === 'opus' ? 'libopus' : (options.audioCodec === 'vorbis' ? 'libvorbis' : 'libopus');
                const bitrateMap: Record<string, string> = { low: '1.5M', medium: '4M', high: '8M' };
                const vBitrate = bitrateMap[options.bitrate] || '4M';
                const sampleRate = (options.audioCodec === 'opus' || options.format === 'webm') ? '48000' : (options.sampleRate || 44100).toString();

                try {
                    const { loadFFmpeg, getFFmpeg } = await import('@/plugins/video-editor/plugins/editor');
                    const { fetchFile } = await import('@ffmpeg/util');
                    await loadFFmpeg();
                    const ffmpeg = getFFmpeg();
                    ffmpeg.on('log', ({ message }) => {
                        console.log('[FFmpeg WASM Log]', message);
                    });

                    const inputData = await fetchFile(finalBlob);
                    await ffmpeg.writeFile('input_master.mp4', inputData);
                    
                    try {
                        // Realtime low-memory VP8 encoding for 32-bit WebAssembly
                        await ffmpeg.exec([
                            '-y',
                            '-i', 'input_master.mp4',
                            '-f', 'webm',
                            '-c:v', 'vp8',
                            '-deadline', 'realtime',
                            '-cpu-used', '8',
                            '-b:v', vBitrate,
                            '-c:a', 'libopus',
                            '-ar', sampleRate,
                            'output_master.webm'
                        ]);
                    } catch (vErr) {
                        console.warn('[Assembler] VP8 1080p WASM memory limit reached, retrying with 720p scaling:', vErr);
                        await ffmpeg.exec([
                            '-y',
                            '-i', 'input_master.mp4',
                            '-f', 'webm',
                            '-c:v', 'vp8',
                            '-deadline', 'realtime',
                            '-cpu-used', '8',
                            '-vf', 'scale=1280:-2',
                            '-b:v', '2M',
                            '-c:a', 'libopus',
                            '-ar', sampleRate,
                            'output_master.webm'
                        ]);
                    }

                    const webmBytes = await ffmpeg.readFile('output_master.webm');
                    try { await ffmpeg.deleteFile('input_master.mp4'); } catch (e) {}
                    try { await ffmpeg.deleteFile('output_master.webm'); } catch (e) {}
                    const len = typeof webmBytes === 'string' ? webmBytes.length : (webmBytes as Uint8Array)?.byteLength || 0;
                    if (webmBytes && len > 0) {
                        finalBlob = new Blob([webmBytes as any], { type: 'video/webm' });
                    } else {
                        finalBlob = data.blob;
                    }
                } catch (err) {
                    console.warn('[Assembler] FFmpeg WebM conversion warning, falling back to master blob:', err);
                    finalBlob = data.blob;
                }
            }
        }

        if(result?.value?.url){
            URL.revokeObjectURL(result.value.url);
        }

        result.value = {
            blob: finalBlob,
            url: URL.createObjectURL(finalBlob),
            reviewBlob: data.reviewBlob,
            duration: data.duration
        };

        try {
            const projectId = projectStore.currentProject?._id;
            if (!projectId) throw new Error(t('projects.editor.video.noProject'));

            // Use FormData for direct multipart upload
            const formData = new FormData();
            formData.append('video', finalBlob, `${projectStore.currentProject?.title ?? t('projects.editor.header.untitled')}.${options.format || 'mp4'}`);

            // Generate instant client-side thumbnail to bypass server-side FFmpeg processing delays
            try {
                const video = document.createElement('video');
                video.src = URL.createObjectURL(finalBlob);
                video.muted = true;
                video.playsInline = true;
                await new Promise((res) => {
                    video.onloadeddata = res;
                    video.onerror = res;
                    setTimeout(res, 1000);
                });
                const canvas = document.createElement('canvas');
                canvas.width = 1280;
                canvas.height = 720;
                const ctx = canvas.getContext('2d');
                if (ctx && video.videoWidth > 0) {
                    ctx.drawImage(video, 0, 0, 1280, 720);
                    const thumbBlob: Blob | null = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.85));
                    if (thumbBlob) {
                        formData.append('thumbnail', thumbBlob, 'thumb.jpg');
                        console.log('[Assembler] Instant client thumbnail attached to upload FormData');
                    }
                }
                URL.revokeObjectURL(video.src);
                video.remove();
            } catch (e) {
                console.warn('[Assembler] Client thumbnail generation skipped:', e);
            }

            // Upload directly to project endpoint via store
            await projectStore.publishProject(projectId, formData, (percent) => {
                progress.value = 95 + (percent * 0.05); // Last 5% for upload
                status.value = t('projects.editor.video.uploading', { percent: percent.toString() });
            });

            status.value = t('projects.editor.video.done');
            progress.value = 100;
            isAssembling.value = false;
            toast.success(t('projects.editor.video.success'));

            // Refresh project data
            await projectStore.fetchProject(projectId);

        } catch (e: any) {
            handleError(`${t('projects.editor.video.error')}: ${e.message}`);
        } finally {
            if (worker) {
                worker.terminate();
                worker = null;
            }
        }
    };

    const cancel = () => {
        if (worker) {
            worker.terminate();
            worker = null;
        }
        isAssembling.value = false;
        status.value = t('projects.editor.video.cancelled');
    };

    return {
        isAssembling,
        progress,
        status,
        error,
        result,
        assemble,
        cancel
    };
}
