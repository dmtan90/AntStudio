import { withBrowserContext } from '../../utils/browserPool.js';

import { Logger } from '../../utils/Logger.js';

// Simple Canva design importer
// Note: Requires Canva API access token
// This is a simplified version for MVP

export class CanvaImporter {
    private apiKey: string;

    constructor() {
        this.apiKey = process.env.CANVA_API_KEY || '';
    }

    async importDesign(canvaUrl: string): Promise<any> {
        const designId = this.extractDesignId(canvaUrl);

        // The page is rendered server-side, so only allow Canva's own hosts (SSRF)
        let host = '';
        try { host = new URL(canvaUrl).hostname; } catch { /* invalid URL */ }
        if (!designId || !(host === 'canva.com' || host.endsWith('.canva.com'))) {
            throw new Error('Invalid Canva URL');
        }

        Logger.info(`[CanvaImporter] 🕵️ Scoping Canva metadata for ${designId}...`);

        // Basic scraping via Playwright to get metadata
        let metadata = {
            title: `Canva Design ${designId}`,
            description: 'Imported from Canva',
            thumbnail: `https://via.placeholder.com/400x400?text=Canva+${designId}`
        };

        try {
            // Shared browser pool: the context is always closed, even if navigation fails
            const scraped = await withBrowserContext(async (context) => {
                const page = await context.newPage();
                await page.goto(canvaUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                return page.evaluate(() => {
                    const title = document.querySelector('h1')?.innerText ||
                        document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
                        document.title;
                    const description = document.querySelector('meta[name="description"]')?.getAttribute('content') ||
                        document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
                    const thumbnail = document.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
                        document.querySelector('link[rel="image_src"]')?.getAttribute('href') || '';

                    return { title, description, thumbnail };
                });
            }, {
                // Use a real user agent
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
            });

            if (scraped.title) metadata.title = scraped.title;
            if (scraped.description) metadata.description = scraped.description;
            if (scraped.thumbnail) metadata.thumbnail = scraped.thumbnail;
        } catch (e: any) {
            Logger.warn(`[CanvaImporter] Metadata scrape failed: ${e.message}`);
        }

        const templateData = {
            id: designId + '_canva',
            name: metadata.title,
            description: metadata.description,
            category: 'social-media',
            thumbnail: metadata.thumbnail,
            pages: [
                {
                    id: 'page_1',
                    name: metadata.title,
                    thumbnail: metadata.thumbnail,
                    preview: '',
                    duration: 10,
                    data: {
                        fill: '#FFFFFF',
                        height: 1080,
                        width: 1080,
                        format: 'post/feed',
                        orientation: 'square',
                        audios: [],
                        scene: JSON.stringify({
                            version: '5.4.0',
                            objects: [
                                {
                                    type: 'image',
                                    version: '5.4.0',
                                    originX: 'center',
                                    originY: 'center',
                                    left: 540,
                                    top: 540,
                                    width: 1080,
                                    height: 1080,
                                    scaleX: 1,
                                    scaleY: 1,
                                    angle: 0,
                                    flipX: false,
                                    flipY: false,
                                    opacity: 0.5,
                                    visible: true,
                                    src: metadata.thumbnail,
                                    crossOrigin: 'anonymous'
                                },
                                {
                                    type: 'textbox',
                                    version: '5.4.0',
                                    originX: 'center',
                                    originY: 'center',
                                    left: 540,
                                    top: 540,
                                    width: 800,
                                    height: 100,
                                    scaleX: 1,
                                    scaleY: 1,
                                    angle: 0,
                                    flipX: false,
                                    flipY: false,
                                    opacity: 1,
                                    visible: true,
                                    text: 'Canva Design Imported\n(Full layout parsing in development)',
                                    fontSize: 40,
                                    fontWeight: 'bold',
                                    fontFamily: 'Inter',
                                    fill: '#000000',
                                    textAlign: 'center',
                                    backgroundColor: '#ffffff'
                                }
                            ]
                        })
                    },
                    blocks: [
                        { id: 'block_0', start: 0, end: 5 },
                        { id: 'block_1', start: 5, end: 10 }
                    ]
                }
            ],
            source: {
                platform: 'canva' as const,
                originalId: designId,
                importedAt: new Date(),
                originalUrl: canvaUrl
            },
            tags: ['canva', 'social-media', 'design', 'professional']
        };

        return templateData;
    }

    private extractDesignId(url: string): string {
        // Extract ID from Canva URL
        // Example formats:
        // https://www.canva.com/design/ABC123/view
        // https://www.canva.com/design/ABC123/edit
        // https://www.canva.com/templates/EAFoBFfYbuo-green-brown-yellow-animated-collage-summer-camp-video/

        const match = url.match(/(?:design\/([^/?]+)|templates\/([^/?-]+))/);
        if (!match) return '';
        return match[1] || match[2] || '';
    }
}

export const canvaImporter = new CanvaImporter();
