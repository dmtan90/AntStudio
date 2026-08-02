import { MP4Clip } from '@webav/av-cliper';

/**
 * Generates a thumbnail Blob from a video File.
 * Prefers @webav/av-cliper (WebCodecs), falls back to native HTML5 video element rendering.
 */
export async function generateVideoThumbnail(file: File): Promise<Blob | null> {
    // 1. Try @webav/av-cliper first
    try {
        const clip = new MP4Clip(file.stream());
        await clip.ready;
        
        // Target 1s or half-duration, whichever is smaller (duration is in microseconds)
        const targetTime = Math.min(1000000, clip.meta.duration / 2);
        const tickResult = await clip.tick(targetTime);
        const videoFrame = tickResult.video;
        
        if (videoFrame) {
            const canvas = document.createElement('canvas');
            canvas.width = videoFrame.displayWidth;
            canvas.height = videoFrame.displayHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(videoFrame, 0, 0);
            }
            videoFrame.close();
            
            if (typeof (clip as any).destroy === 'function') {
                (clip as any).destroy();
            }
            
            return new Promise<Blob | null>((resolve) => {
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', 0.85);
            });
        }
        
        if (typeof (clip as any).destroy === 'function') {
            (clip as any).destroy();
        }
    } catch (err) {
        console.warn('[Thumbnail] @webav/av-cliper failed, falling back to native video extraction:', err);
    }

    // 2. Fallback to native HTML5 video canvas extraction
    return new Promise<Blob | null>((resolve) => {
        const video = document.createElement('video');
        const url = URL.createObjectURL(file);
        
        video.src = url;
        video.muted = true;
        video.playsInline = true;
        
        // Seek to 1s
        video.currentTime = 1;
        
        video.onseeked = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth || 640;
                canvas.height = video.videoHeight || 360;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                }
                
                canvas.toBlob((blob) => {
                    URL.revokeObjectURL(url);
                    resolve(blob);
                }, 'image/jpeg', 0.85);
            } catch (err) {
                console.error('[Thumbnail] Native fallback error:', err);
                URL.revokeObjectURL(url);
                resolve(null);
            }
        };

        video.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(null);
        };
    });
}
