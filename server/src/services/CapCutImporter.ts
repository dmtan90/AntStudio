import { chromium } from 'playwright';
import { uploadToS3 } from '../utils/s3.js';
import axios from 'axios';

// Simple CapCut template importer
// Note: CapCut doesn't have public API, so this is a simplified version
// In production, you would need web scraping with Playwright

export class CapCutImporter {
    async importTemplate(capcutUrl: string): Promise<any> {
        const templateId = this.extractTemplateId(capcutUrl);
        if (!templateId) {
            throw new Error('Invalid CapCut URL');
        }

        console.log(`[CapCutImporter] 🕵️ Scraping template ${templateId} via Playwright...`);

        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
        });

        try {
            const page = await context.newPage();
            await page.goto(capcutUrl, { waitUntil: 'networkidle', timeout: 30000 });

            // Extract metadata from the page
            const metadata = await page.evaluate(() => {
                const title = document.querySelector('h1')?.innerText || 'CapCut Template';
                const description = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
                const thumbnail = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';

                // Try to find duration or clip count if visible
                const durationText = document.querySelector('.duration-info')?.innerHTML || '00:15';
                const durationMatch = durationText.match(/(\d+):(\d+)/);
                const duration = durationMatch ? parseInt(durationMatch[1]) * 60 + parseInt(durationMatch[2]) : 15;

                return { title, description, thumbnail, duration };
            });

            // If we have a thumbnail URL, download it and store in our S3
            let localThumbnail = metadata.thumbnail;
            if (metadata.thumbnail) {
                try {
                    const response = await axios.get(metadata.thumbnail, { responseType: 'arraybuffer' });
                    const buffer = Buffer.from(response.data);
                    const uploadResult = await uploadToS3(`marketplace/thumbnails/capcut_${templateId}.jpg`, buffer, 'image/jpeg');
                    localThumbnail = uploadResult.url;
                } catch (e) {
                    console.error('Failed to proxy thumbnail:', e);
                }
            }

            const templateData = {
                name: metadata.title,
                description: metadata.description || 'Imported from CapCut Web',
                category: 'social-media',
                thumbnail: localThumbnail,
                structure: {
                    segments: this.generateDefaultSegments(metadata.duration),
                    duration: metadata.duration,
                    aspectRatio: '9:16' as const,
                    customizableFields: ['title', 'description', 'voiceover', 'colors'],
                    requiredAssets: [
                        { type: 'video' as const, placeholder: 'main_clip', description: 'Main Segment Content' }
                    ]
                },
                source: {
                    platform: 'capcut' as const,
                    originalId: templateId,
                    importedAt: new Date(),
                    originalUrl: capcutUrl
                },
                tags: ['capcut', 'external', 'vertical']
            };

            return templateData;
        } finally {
            await browser.close();
        }
    }

    private generateDefaultSegments(totalDuration: number): any[] {
        // Logic to split total duration into logical segments if we can't scrape them individually
        const segmentCount = Math.max(1, Math.floor(totalDuration / 5));
        const segments = [];
        for (let i = 0; i < segmentCount; i++) {
            segments.push({
                order: i,
                title: `Segment ${i + 1}`,
                description: 'Imported from template structure',
                duration: totalDuration / segmentCount,
                voiceover: '',
                cameraAngle: 'medium',
                mood: 'dynamic',
                style: 'cinematic',
                characters: [],
                location: ''
            });
        }
        return segments;
    }

    private extractTemplateId(url: string): string {
        const patterns = [
            /template-detail\/([^/?]+)/,
            /\/t\/([^/?]+)/,
            /template\/([^/?]+)/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }

        return '';
    }
}

export const capcutImporter = new CapCutImporter();
