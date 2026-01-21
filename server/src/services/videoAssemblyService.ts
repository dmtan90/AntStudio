import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { Project, IProject } from '../models/Project.js';
import { S3KeyGenerator, uploadToS3, getSignedS3Url } from '../utils/s3.js';
import { configService } from '../utils/configService.js';

// Configure ffmpeg with static binaries
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

interface AssembleResult {
    finalVideoKey: string;
    thumbnailKey: string;
    timelapseKey?: string;
    duration: number;
    fileSize: number;
}

export class VideoAssemblyService {

    /**
     * Download a file from a URL to a local path
     */
    /**
     * Resolve asset URL:
     * - If http/https: return as is
     * - If key: generate signed S3 URL
     */
    private static async resolveAssetUrl(urlOrKey: string): Promise<string> {
        if (!urlOrKey) return '';
        if (urlOrKey.startsWith('http://') || urlOrKey.startsWith('https://')) {
            return urlOrKey;
        }
        // Assume S3 Key
        try {
            return await getSignedS3Url(urlOrKey);
        } catch (error) {
            console.warn(`[VideoAssembly] Failed to sign URL for key ${urlOrKey}, falling back to public URL.`);
            return `https://${configService.aws.bucketName}.s3.${configService.aws.region}.amazonaws.com/${urlOrKey}`;
        }
    }

    /**
     * Download a file from a URL to a local path
     */
    private static async downloadFile(url: string, localPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const client = url.startsWith('https') ? https : http;

            const file = fs.createWriteStream(localPath);

            file.on('error', (err) => {
                fs.unlink(localPath, () => { });
                reject(err);
            });

            const request = client.get(url, function (response: any) {
                if (response.statusCode >= 400) {
                    fs.unlink(localPath, () => { });
                    reject(new Error(`Failed to download file: ${response.statusCode}`));
                    return;
                }
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve();
                });
            }).on('error', (err: any) => {
                file.close();
                fs.unlink(localPath, () => { });
                reject(err.message);
            });
        });
    }

    /**
     * Assemble project videos, audio, and transitions
     */
    public static async assembleProject(project: IProject): Promise<AssembleResult> {
        const workDir = path.join(process.cwd(), 'temp', `assemble_${project._id}`);

        // Ensure work dir
        if (!fs.existsSync(workDir)) {
            fs.mkdirSync(workDir, { recursive: true });
        }

        try {
            console.log(`[Assemble] Starting for project ${project._id}`);
            const segments = project.storyboard?.segments || [];
            if (segments.length === 0) throw new Error('No segments to assemble');

            // 1. Download Assets (Segments + BGM)
            const segmentFiles: {
                path: string,
                duration: number,
                hasAudio: boolean,
                transition?: string,
                transitionDuration?: number,
                trimOffset: number
            }[] = [];

            // Download Segments
            for (let i = 0; i < segments.length; i++) {
                const seg = segments[i] as any;
                const cleanKey = seg.generatedVideo?.s3Key || seg.generatedVideo?.s3Url;
                if (!cleanKey) continue;

                const url = await VideoAssemblyService.resolveAssetUrl(cleanKey);
                const ext = path.extname(cleanKey.split('?')[0]) || '.mp4';
                const localPath = path.join(workDir, `seg_${i}${ext}`);

                await this.downloadFile(url, localPath);

                const meta = await new Promise<ffmpeg.FfprobeData>((resolve, reject) => {
                    ffmpeg.ffprobe(localPath, (err: any, data: any) => {
                        if (err) reject(err);
                        else resolve(data);
                    });
                });

                const hasAudio = meta.streams.some((s: any) => s.codec_type === 'audio');
                const formatDuration = meta.format.duration || 5;

                segmentFiles.push({
                    path: localPath,
                    duration: seg.duration || formatDuration,
                    hasAudio,
                    transition: seg.transition || null,
                    transitionDuration: seg.transitionDuration || 1,
                    trimOffset: seg.trimOffset || 0
                });
            }

            if (segmentFiles.length === 0) throw new Error('No valid video segments found');

            // Download BGM
            let bgmPath = '';
            let bgmVolume = 0.5;
            if (project.finalVideo?.backgroundMusic?.s3Key || project.finalVideo?.backgroundMusic?.s3Url) {
                const bgmKey = project.finalVideo.backgroundMusic.s3Key || project.finalVideo.backgroundMusic.s3Url;
                if (bgmKey) {
                    const bgmUrl = await VideoAssemblyService.resolveAssetUrl(bgmKey);
                    bgmPath = path.join(workDir, 'bgm.mp3'); // Assume mp3 or detect ext
                    await this.downloadFile(bgmUrl, bgmPath);
                    bgmVolume = project.finalVideo.backgroundMusic.volume || 0.5;
                }
            }

            // Add Global Silence Input (infinite)
            // We use this as a source for all silent segments to avoid 'anullsrc' filter syntax issues in complex filter string
            // We'll add this LAST after segments? No, index matters.
            // Let's add it AFTER all segment inputs.
            const silenceInputIdx = segmentFiles.length + (bgmPath ? 1 : 0);
            // Wait, we add inputs sequentially.
            // video inputs are [0..N-1].
            // If BGM exists, it will be [N].
            // Silence will be [N] or [N+1].

            // Re-order logical flow:
            // 1. Inputs: Segments
            // 2. Input: BGM (if any)
            // 3. Input: Silence (lavfi)

            const command = ffmpeg();

            // Add Segment Inputs
            segmentFiles.forEach((seg) => {
                command.input(seg.path);
            });

            // Add BGM Input
            let bgmInputIdx = -1;
            if (bgmPath) {
                bgmInputIdx = segmentFiles.length;
                command.input(bgmPath);
            }

            // Add Silence Input
            const silenceInputIdxReal = segmentFiles.length + (bgmPath ? 1 : 0);
            // Use simplest silence source, let aformat handle the rest
            command.input('aevalsrc=0').inputFormat('lavfi');

            // 2. Build Filter Complex
            const complexFilters: string[] = [];
            const videoInputs: string[] = [];
            const audioInputs: string[] = [];

            segmentFiles.forEach((seg, idx) => {
                // Video Trim
                const vOut = `[v${idx}]`;
                const vEnd = seg.trimOffset + seg.duration;

                // Force even dimensions using -2 in scale (essential for yuv420p pad)
                // Logic: IF aspect > 16/9 (wider), fit to width (1920), height auto-even (-2).
                //        ELSE (taller/standard), fit to height (1080), width auto-even (-2).
                const scaleFilter = `scale='w=if(gt(a,1920/1080),1920,-2):h=if(gt(a,1920/1080),-2,1080)'`;

                complexFilters.push(`[${idx}:v]trim=start=${seg.trimOffset}:end=${vEnd},setpts=PTS-STARTPTS,${scaleFilter},pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p${vOut};`);
                videoInputs.push(vOut);

                // Audio
                const aOut = `[a${idx}]`;
                if (seg.hasAudio) {
                    complexFilters.push(`[${idx}:a]atrim=start=${seg.trimOffset}:end=${vEnd},asetpts=PTS-STARTPTS,aformat=sample_rates=44100:channel_layouts=stereo${aOut};`);
                } else {
                    // Slice from the global silence input
                    // Use end logic here too for consistency (start=0, end=duration)
                    complexFilters.push(`[${silenceInputIdxReal}:a]atrim=start=0:end=${seg.duration},asetpts=PTS-STARTPTS,aformat=sample_rates=44100:channel_layouts=stereo${aOut};`);
                }
                audioInputs.push(aOut);
            });

            // Video & Audio Concatenation Loop
            let lastV = videoInputs[0];
            let lastA = audioInputs[0];
            let accumulatedDuration = segmentFiles[0].duration;

            for (let i = 1; i < segmentFiles.length; i++) {
                const prev = segmentFiles[i - 1];
                const curr = segmentFiles[i];

                const nextV = videoInputs[i];
                const nextA = audioInputs[i];

                const outV = `[v_joined_${i}]`;
                const outA = `[a_joined_${i}]`;

                const transDur = prev.transition ? (prev.transitionDuration || 1) : 0;

                if (transDur > 0 && prev.transition) {
                    // Video XFade
                    const offset = accumulatedDuration - transDur;
                    complexFilters.push(`${lastV}${nextV}xfade=transition=${prev.transition}:duration=${transDur}:offset=${offset}${outV};`);

                    // Audio Crossfade
                    complexFilters.push(`${lastA}${nextA}acrossfade=d=${transDur}:c1=tri:c2=tri${outA};`);

                    accumulatedDuration = accumulatedDuration + curr.duration - transDur;
                } else {
                    // Hard cut (approximate with fast fade for safety/consistency)
                    const fakeDur = 0.1;
                    const offset = accumulatedDuration - fakeDur;
                    complexFilters.push(`${lastV}${nextV}xfade=transition=fade:duration=${fakeDur}:offset=${offset}${outV};`);
                    complexFilters.push(`${lastA}${nextA}acrossfade=d=${fakeDur}:c1=tri:c2=tri${outA};`);
                    accumulatedDuration = accumulatedDuration + curr.duration - fakeDur;
                }

                lastV = outV;
                lastA = outA;
            }

            // Final Video Map
            const finalV = lastV;

            // Audio Mixing with BGM
            let finalA = lastA;

            if (bgmPath) {
                // Add BGM Input
                const bgmInputIdx = segmentFiles.length; // inputs 0..N-1 are segments.
                command.input(bgmPath);

                const bgmTag = `[bgm_processed]`;

                // BGM: loop, adjust volume, trim to match video length
                complexFilters.push(`[${bgmInputIdx}:a]aloop=loop=-1:size=2e+09,volume=${bgmVolume},atrim=duration=${accumulatedDuration}[${bgmTag}];`);

                // Mix: [speech][bgm]amix
                const mixOut = `[a_mixed]`;
                complexFilters.push(`${finalA}[${bgmTag}]amix=inputs=2:duration=first:dropout_transition=2${mixOut};`);
                finalA = mixOut;
            }

            const outputPath = path.join(workDir, 'output.mp4');
            const thumbPath = path.join(workDir, 'thumbnail.jpg');
            const timelapsePath = path.join(workDir, 'timelapse.mp4');

            // Clean up filter string (remove last semicolon)
            const filterStr = complexFilters.join('').replace(/;$/, '');
            console.log('[Assemble] Filter String:', filterStr);

            // Output
            command.complexFilter(filterStr)
                .map(finalV)
                .map(finalA)
                .output(outputPath)
                .outputOptions([
                    '-c:v', 'libx264',
                    '-pix_fmt', 'yuv420p',
                    '-preset', 'fast',
                    '-c:a', 'aac',
                    '-b:a', '128k',
                    '-shortest' // Stop when video ends (if audio is longer)
                ]);

            await new Promise<void>((resolve, reject) => {
                command.on('end', () => resolve())
                    .on('error', (err) => {
                        console.error('FFmpeg Error:', err);
                        reject(err);
                    })
                    .run();
            });

            // --- THUMBNAIL ---
            const thumbKey = S3KeyGenerator.projectThumbnail(project._id?.toString() || 'temp');
            // Re-run ffmpeg on output.mp4 for thumbnail
            await new Promise<void>((resolve, reject) => {
                ffmpeg(outputPath)
                    .screenshots({
                        timestamps: ['50%'],
                        filename: 'thumbnail.jpg',
                        folder: workDir,
                        size: '640x360'
                    })
                    .on('end', () => resolve())
                    .on('error', reject);
            });

            // --- TIMELAPSE (5s) ---
            const factor = accumulatedDuration / 5;

            await new Promise<void>((resolve, reject) => {
                ffmpeg(outputPath)
                    .videoFilters(`setpts=PTS/${factor}`)
                    .output(timelapsePath)
                    .noAudio()
                    .duration(5)
                    .on('end', () => resolve())
                    .on('error', reject)
                    .run();
            });

            // Upload results to S3
            const finalKey = S3KeyGenerator.finalVideo(project._id!.toString());
            const fileBuffer = fs.readFileSync(outputPath);
            await uploadToS3(finalKey, fileBuffer, 'video/mp4');

            let uploadedThumbKey = '';
            if (fs.existsSync(thumbPath)) {
                uploadedThumbKey = S3KeyGenerator.projectThumbnail(project._id!.toString());
                const thumbBuffer = fs.readFileSync(thumbPath);
                await uploadToS3(uploadedThumbKey, thumbBuffer, 'image/jpeg');
            }

            let uploadedTimelapseKey = '';
            if (fs.existsSync(timelapsePath)) {
                uploadedTimelapseKey = S3KeyGenerator.timelapse(project._id!.toString());
                const tlBuffer = fs.readFileSync(timelapsePath);
                await uploadToS3(uploadedTimelapseKey, tlBuffer, 'video/mp4');
            }

            return {
                finalVideoKey: finalKey,
                thumbnailKey: uploadedThumbKey,
                timelapseKey: uploadedTimelapseKey,
                duration: accumulatedDuration,
                fileSize: fs.statSync(outputPath).size
            }

        } catch (error) {
            console.error('[VideoAssemblyService] Error:', error);
            throw error;
        } finally {
            // Cleanup workDir
            try {
                fs.rmSync(workDir, { recursive: true, force: true });
            } catch (e) { console.error('Cleanup error', e) }
        }
    }
}
