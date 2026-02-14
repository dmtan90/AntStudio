import ytdl from '@distube/ytdl-core';
import path from 'path';
import fs from 'fs';
import { uploadToS3 } from '../../utils/s3.js';

export class AudioExtractionService {
    private static tempDir = path.join(process.cwd(), 'tmp/audio-extraction');

    private static ensureTempDir() {
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    /**
     * Extract audio from YouTube video
     * @param videoId YouTube video ID
     * @param userId User ID for S3 path
     */
    static async extractAudio(videoId: string, userId: string): Promise<{ url: string, key: string }> {
        this.ensureTempDir();
        const outputPath = path.join(this.tempDir, `${videoId}.mp3`);
        const url = `https://www.youtube.com/watch?v=${videoId}`;

        try {
            console.log(`Starting audio extraction for video: ${videoId}`);
            
            return new Promise((resolve, reject) => {
                const stream = ytdl(url, {
                    quality: 'highestaudio',
                    filter: 'audioonly'
                });
                
                const fileStream = fs.createWriteStream(outputPath);
                
                stream.on('error', (err) => {
                    console.error('[ytdl] Stream error:', err);
                    reject(new Error(`YouTube stream error: ${err.message}`));
                });

                fileStream.on('error', (err) => {
                    console.error('[fs] Write error:', err);
                    reject(new Error(`File system error: ${err.message}`));
                });

                fileStream.on('finish', async () => {
                    try {
                        if (!fs.existsSync(outputPath)) {
                            throw new Error('Extraction failed: MP3 file not found after stream finished');
                        }

                        console.log(`Extraction successful, uploading to S3: ${outputPath}`);

                        // Upload to S3
                        const s3Key = `media/${userId}/music/${videoId}.mp3`;
                        const fileBuffer = fs.readFileSync(outputPath);
                        const uploadResult = await uploadToS3(s3Key, fileBuffer, 'audio/mpeg');

                        // Cleanup
                        try {
                            fs.unlinkSync(outputPath);
                        } catch (cleanupError) {
                            console.warn('Failed to cleanup temp audio file:', cleanupError);
                        }

                        resolve(uploadResult);
                    } catch (err) {
                        reject(err);
                    }
                });

                stream.pipe(fileStream);
            });
        } catch (error: any) {
            console.error('Audio extraction error:', error);
            throw new Error(`Failed to extract audio: ${error.message}`);
        }
    }
}
