// Helpers shared by the project feature routers (moved from routes/projects.ts).
import multer from 'multer';
import { Logger } from '../../utils/Logger.js';
import { AuthRequest } from '../../middleware/auth.js';
import ffmpeg from 'fluent-ffmpeg';
import { EnvConfig } from '../../utils/ConfigService.js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';

ffmpeg.setFfmpegPath(EnvConfig.ffmpegPath);
ffmpeg.setFfprobePath(EnvConfig.ffprobePath);
export const writeFile = promisify(fs.writeFile);
export const mkdir = promisify(fs.mkdir);

// Helper for metadata extraction and preview generation
export async function processVideo(videoPath: string, projectId: string) {
    const tempDir = path.join(os.tmpdir(), `antflow_${projectId}_${Date.now()}`);
    if (!fs.existsSync(tempDir)) await mkdir(tempDir, { recursive: true });

    const thumbnailPath = path.join(tempDir, 'thumb.jpg');
    const previewPath = path.join(tempDir, 'preview.mp4');

    // 1. Get Metadata with timeout
    const metadata: any = await new Promise((resolve) => {
        const timer = setTimeout(() => {
            Logger.warn('[ProcessVideo] FFprobe timeout, using default metadata');
            resolve({ streams: [], format: { duration: 15 } });
        }, 8000);

        ffmpeg.ffprobe(videoPath, (err: any, data: any) => {
            clearTimeout(timer);
            if (err || !data) {
                Logger.warn('[ProcessVideo] FFprobe error/warning:', err);
                resolve({ streams: [], format: { duration: 15 } });
            } else {
                resolve(data);
            }
        });
    });

    const videoStream = metadata.streams?.find((s: any) => s.codec_type === 'video');
    const rawDuration = parseFloat(metadata.format?.duration);
    const duration = (!isNaN(rawDuration) && rawDuration > 0) ? rawDuration : 15;
    const previewDuration = Math.max(1, Math.min(5, duration));
    const resolution = videoStream ? `${videoStream.width}x${videoStream.height}` : '1920x1080';

    // 2. Generate Thumbnail safely if not exists
    if (!fs.existsSync(thumbnailPath)) {
        await new Promise<void>((resolve) => {
            let cmd: any = null;
            const timer = setTimeout(() => {
                Logger.warn('[ProcessVideo] Thumbnail generation timeout');
                try { cmd?.kill('SIGKILL'); } catch (e) {}
                resolve();
            }, 10000);

            cmd = ffmpeg(videoPath)
                .inputOptions(['-fflags', '+genpts+igndts', '-analyzeduration', '10000000', '-probesize', '10000000'])
                .outputOptions(['-y', '-vframes 1', '-vf scale=1280:-2'])
                .on('end', () => { clearTimeout(timer); resolve(); })
                .on('error', (err: any) => {
                    clearTimeout(timer);
                    Logger.warn('[ProcessVideo] Thumbnail generation warning:', err?.message || err);
                    resolve();
                });
            cmd.save(thumbnailPath);
        });
    }

    // 3. Generate Preview (MP4 H.264 / AAC) safely if not exists
    if (!fs.existsSync(previewPath)) {
        await new Promise<void>((resolve) => {
            let cmd: any = null;
            const timer = setTimeout(() => {
                Logger.warn('[ProcessVideo] Preview generation timeout');
                try { cmd?.kill('SIGKILL'); } catch (e) {}
                resolve();
            }, 35000);

            cmd = ffmpeg(videoPath)
                .inputOptions(['-fflags', '+genpts+igndts', '-analyzeduration', '10000000', '-probesize', '10000000'])
                .setStartTime(0)
                .setDuration(previewDuration)
                .outputOptions([
                    '-y',
                    '-c:v libx264',
                    '-pix_fmt yuv420p',
                    '-preset ultrafast',
                    '-c:a aac',
                    '-vf scale=640:-2'
                ])
                .on('end', () => { clearTimeout(timer); resolve(); })
                .on('error', (err: any) => {
                    clearTimeout(timer);
                    Logger.warn('[ProcessVideo] Preview generation warning:', err?.message || err);
                    resolve();
                });
            cmd.save(previewPath);
        });
    }

    // Fallbacks if files don't exist
    if (!fs.existsSync(thumbnailPath)) {
        try {
            // Write minimalist 1x1 solid dark JPEG
            const dummyJpgBase64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
            fs.writeFileSync(thumbnailPath, Buffer.from(dummyJpgBase64, 'base64'));
        } catch (e) {}
    }
    if (!fs.existsSync(previewPath)) {
        try {
            if (fs.existsSync(videoPath)) {
                fs.copyFileSync(videoPath, previewPath);
            }
        } catch (e) {}
    }

    return {
        duration,
        resolution,
        thumbnailPath,
        previewPath,
        tempDir
    };
}

// Define the file filter function to update the filename encoding
const fileFilter = (req: AuthRequest, file: any, callback: any) => {
    // Re-encode from latin1 (Multer's default behavior in older versions) to utf8
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    callback(null, true); // Accept the file
};


export const upload = multer({ fileFilter, storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });

// For routes that only store the file: written to a temp file and streamed to storage.
// Handlers must delete req.file.path when done.
export const diskUpload = multer({ fileFilter, storage: multer.diskStorage({ destination: os.tmpdir() }), limits: { fileSize: 500 * 1024 * 1024 } });
