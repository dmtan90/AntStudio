import { chromium } from 'playwright';
import { uploadToS3 } from '../utils/s3.js';
import axios from 'axios';
import { CapCutToFabricParser } from '../utils/parsers/CapCutToFabricParser.js';

// Simple CapCut template importer
export class CapCutImporter {
    async importTemplate(capcutUrl: string): Promise<any> {
        const templateId = this.extractTemplateId(capcutUrl);
        if (!templateId) {
            throw new Error('Invalid CapCut URL');
        }

        // Phase: Playwright Scraping with Network Interception
        // This is the most reliable way as it emulates a real browser and intercepts actual data packets
        console.log(`[CapCutImporter] 🕵️ Importing template ${templateId} via Playwright interception...`);

        // Strategy: If it's an editor-template, it might be private or dynamic. 
        // Try to scrape the public detail page first if we have the ID.
        let targetUrl = capcutUrl;
        if (capcutUrl.includes('editor-template')) {
            targetUrl = `https://www.capcut.com/template-detail/${templateId}`;
            console.log(`[CapCutImporter] 🔄 Detected editor-template, switching to public detail page: ${targetUrl}`);
        }

        let scraped: any;
        try {
            scraped = await this.scrapeViaPlaywright(targetUrl, templateId);

            // If we got nothing from the detail page and we weren't already on the original URL, try original URL
            if ((!scraped.internalData || !scraped.metadata.thumbnail) && targetUrl !== capcutUrl) {
                console.log(`[CapCutImporter] ⚠️ Public detail page gave limited results, trying original URL: ${capcutUrl}`);
                const originalScraped = await this.scrapeViaPlaywright(capcutUrl, templateId);
                // Merge results or pick better one
                if (originalScraped.internalData) {
                    scraped.internalData = originalScraped.internalData;
                }
                if (originalScraped.metadata.thumbnail) {
                    scraped.metadata = originalScraped.metadata;
                }
            }
        } catch (error: any) {
            console.error(`[CapCutImporter] ❌ Playwright scraping failed: ${error.message}`);
            throw new Error(`Failed to scrape CapCut template: ${error.message}`);
        }

        const internalData = scraped.internalData;
        const metadata = scraped.metadata;

        if (!metadata) {
            throw new Error('Failed to extract template metadata');
        }

        // If we have a thumbnail URL, download it and store in our S3
        let localThumbnail = metadata.thumbnail;
        // if (metadata.thumbnail) {
        //     try {
        //         // const response = await axios.get(metadata.thumbnail, { responseType: 'arraybuffer' });
        //         // const buffer = Buffer.from(response.data);
        //         // const uploadResult = await uploadToS3(`marketplace/thumbnails/capcut_${templateId}_${new Date().getTime()}.jpg`, buffer, 'image/jpeg');
        //         // localThumbnail = uploadResult.key;
        //         localThumbnail = metadata.thumbnail;
        //     } catch (e) {
        //         console.error('Failed to proxy thumbnail:', e);
        //     }
        // }

        const templateData = {
            id: templateId + '_capcut',
            name: metadata.title,
            description: metadata.description || 'Imported from CapCut Web',
            category: 'social-media',
            thumbnail: localThumbnail,
            pages: this.generatePages(metadata, internalData, localThumbnail),
            source: {
                platform: 'capcut' as const,
                originalId: templateId,
                importedAt: new Date(),
                originalUrl: capcutUrl
            },
            tags: ['capcut', 'external', 'vertical']
        };

        return templateData;
    }

    private generatePages(metadata: any, internalData: any, thumbnail: string): any[] {
        if (internalData) {
            const parser = new CapCutToFabricParser();
            const scene = parser.parse(internalData);
            const blocks = parser.extractBlocks(internalData);

            // Calculate total duration from blocks if metadata duration is missing/invalid
            let duration = metadata.duration;
            if (!duration || duration <= 0) {
                if (blocks && blocks.length > 0) {
                    duration = Math.max(...blocks.map((b: any) => b.end));
                } else {
                    duration = 15; // default fallback
                }
            }

            return [
                {
                    id: 'page_1',
                    name: metadata.title || 'Imported Scene',
                    thumbnail: thumbnail,
                    preview: (metadata as any).videoPreview || '',
                    duration: duration,
                    data: {
                        fill: '#000000',
                        height: 1920,
                        width: 1080,
                        format: 'vertical',
                        orientation: 'portrait',
                        audios: [],
                        scene: JSON.stringify(scene)
                    },
                    blocks: blocks
                }
            ];
        }

        // Fallback to basic structure if no internal data found
        return [
            {
                id: 'page_1',
                name: 'Imported Scene',
                thumbnail: thumbnail,
                preview: '',
                duration: metadata.duration,
                data: {
                    fill: '#000000',
                    height: 1920,
                    width: 1080,
                    format: 'vertical',
                    orientation: 'portrait',
                    audios: [],
                    scene: JSON.stringify({ version: '5.4.0', objects: [] })
                },
                blocks: this.generateDefaultSegments(metadata.duration).map((s: any, i: number) => ({
                    id: `block_${i}`,
                    start: i * 5,
                    end: (i + 1) * 5
                }))
            }
        ];
    }

    private generateDefaultSegments(totalDuration: number): any[] {
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
        try {
            const urlObj = new URL(url);
            const templateIdParam = urlObj.searchParams.get('templateId');
            if (templateIdParam) return templateIdParam;

            const patterns = [
                /templates?\/([^/?]+)/,
                /template-detail\/([^/?]+)/,
                /editor-template\/([^/?]+)/,
                /\/t\/([^/?]+)/
            ];

            for (const pattern of patterns) {
                const match = url.match(pattern);
                if (match) return match[1];
            }
        } catch (e) {
            const match = url.match(/templates?\/([^/?&]+)/);
            if (match) return match[1];
        }
        return '';
    }

    private async scrapeViaPlaywright(capcutUrl: string, templateId: string): Promise<any> {
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
        });

        let interceptedData: any = null;

        try {
            const page = await context.newPage();

            // Intercept network requests to catch any JSON containing project data
            page.on('response', async response => {
                const url = response.url();
                const status = response.status();
                const headers = response.headers();
                const contentType = headers['content-type'] || '';

                if (status >= 200 && status < 300 && (contentType.includes('json') || url.includes('.json'))) {
                    try {
                        console.log(`[CapCutImporter] 📦 Intercepted JSON/API: ${url.substring(0, 100)}${url.length > 100 ? '...' : ''}`);
                        const textSource = await response.text();

                        // Look for project data signatures
                        if (textSource.includes('"tracks"') || textSource.includes('"canvas_config"') || textSource.includes('"materials"')) {
                            console.log(`[CapCutImporter] 🎯 POTENTIAL DATA FOUND in: ${url}`);
                            const data = JSON.parse(textSource);
                            // Some APIs wrap data in a 'data' field
                            const extracted = data.data || data;
                            if (extracted.tracks && Array.isArray(extracted.tracks)) {
                                console.log(`[CapCutImporter] ✅ VALIDated template tracks found in response!`);
                                interceptedData = extracted;
                            }
                        }
                    } catch (e) {
                        // Silent fail for non-readable responses
                    }
                }
            });

            // Comprehensive stealth and JSBridge fix
            await page.addInitScript(() => {
                // Fix for __name is not defined error in dev mode (tsx/esbuild)
                (window as any).__name = (fn: any) => fn;

                // Fix for CapCut JSBridge read-only error
                try {
                    const win = window as any;

                    // Forcefully redefine JSBridge before any script can set it as read-only
                    let bridgeValue: any = win.JSBridge;
                    try {
                        Object.defineProperty(win, 'JSBridge', {
                            get: () => bridgeValue,
                            set: (val) => { bridgeValue = val; },
                            configurable: true,
                            enumerable: true
                        });
                    } catch (e) {
                        // If defineProperty fails, try simple assignment if it's not too late
                        console.log('Stealth: defineProperty failed, attempting bypass');
                        win.JSBridge = win.JSBridge || {};
                    }
                } catch (e) {
                    console.error('Stealth: Critical JSBridge failure', e);
                }

                // Standard stealth hacks
                Object.defineProperty(navigator, 'webdriver', { get: () => false });
                Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
                Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
                (window as any).chrome = { runtime: {} };
            });

            // Pipe page console
            page.on('console', msg => console.log(`[CapCutImporter Page] ${msg.text()}`));

            console.log(`[CapCutImporter] 🌐 Navigating to: ${capcutUrl}`);
            try {
                // Use networkidle to ensure hydration scripts have run and potentially fetched data
                await page.goto(capcutUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

                // Wait for any initial transitions or client-side routing
                await page.waitForTimeout(2000);

                // Strategy: Instead of clicking (which often redirects to login), 
                // we just wait for the page to naturally fetch its data.
                try {
                    await page.waitForLoadState('networkidle', { timeout: 10000 });
                } catch (e) {
                    console.log('[CapCutImporter] ⏳ Network did not settle, proceeding anyway');
                }

                // Check for bot detection or landing page redirect
                const isGeneric = await page.evaluate(() => {
                    const title = document.title.toLowerCase();
                    return title.includes('trending templates') || title === 'capcut';
                });

                if (isGeneric) {
                    console.warn(`[CapCutImporter] ⚠️ Detected generic landing page, template content might be blocked.`);
                }
            } catch (gotoError: any) {
                console.warn(`[CapCutImporter] ⚠️ Navigation error: ${gotoError.message}`);
            }

            const metadata = await page.evaluate(() => {
                const title = document.querySelector('h1')?.innerText ||
                    document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
                    document.title || 'CapCut Template';
                const description = document.querySelector('meta[name="description"]')?.getAttribute('content') ||
                    document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
                const thumbnail = document.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
                    document.querySelector('link[rel="image_src"]')?.getAttribute('href') ||
                    document.querySelector('img[src*="cover"]')?.getAttribute('src') || '';

                const durationEl = document.querySelector('.duration-info, [class*="duration"], .template-duration');
                let duration = 0;

                if (durationEl) {
                    const match = durationEl.textContent?.match(/(\d+):(\d+)/);
                    if (match) {
                        duration = parseInt(match[1]) * 60 + parseInt(match[2]);
                    }
                }

                // Fallback: If still 0, try a more specific regex that looks for typical durations (avoiding 24h clock)
                if (duration === 0) {
                    const matches = document.body.innerText.match(/\d+:\d+/g) || [];
                    for (const m of matches) {
                        const [min, sec] = m.split(':').map(Number);
                        // Heuristic: Templates are usually < 10 mins, and seconds < 60
                        if (min < 10 && sec < 60) {
                            duration = min * 60 + sec;
                            break;
                        }
                    }
                }

                return { title, description, thumbnail, duration: duration || 15 };
            });

            let internalData = null;

            // Always run the page search to enrich data and find templateDetail
            console.log(`[CapCutImporter] 🔍 Searching for internal data in page context...`);
            const fullData = await page.evaluate(() => {
                // Re-declare __name in case initScript didn't catch this execution context
                (window as any).__name = (fn: any) => fn;

                const results: any = {
                    project: null,
                    templateDetail: null
                };

                const searchRecursive = (obj: any) => {
                    if (!obj || typeof obj !== 'object') return;

                    // Look for project data
                    if (!results.project && (obj.tracks || obj.segments)) {
                        if (Array.isArray(obj.tracks) || Array.isArray(obj.segments)) {
                            results.project = obj;
                        }
                    }

                    // Look for template detail
                    if (!results.templateDetail && obj.initTemplateDetail) {
                        results.templateDetail = obj.initTemplateDetail;
                    }

                    // Search all keys and parse stringified children in-place
                    for (const key in obj) {
                        if (Object.prototype.hasOwnProperty.call(obj, key)) {
                            let val = obj[key];
                            // If child is a string, try to parse it and replace in-place
                            if (typeof val === 'string' && val.length > 20 && (val.trim().startsWith('{') || val.trim().startsWith('['))) {
                                try {
                                    const parsed = JSON.parse(val);
                                    obj[key] = parsed;
                                    val = parsed;
                                } catch (e) { }
                            }
                            searchRecursive(val);
                        }
                    }
                };

                // Priority script IDs
                const targetIds = ['__MODERN_ROUTER_DATA__', '__MODERN_SSR_DATA__', '__NEXT_DATA__'];
                for (const id of targetIds) {
                    const el = document.getElementById(id);
                    if (el) {
                        try {
                            const data = JSON.parse(el.innerText);
                            searchRecursive(data);
                        } catch (e) { }
                    }
                }

                if (!results.project || !results.templateDetail) {
                    // Fallback: Check all script tags
                    const scripts = Array.from(document.querySelectorAll('script'));
                    for (const script of scripts) {
                        if (script.innerText.length > 100) {
                            try {
                                const data = JSON.parse(script.innerText);
                                searchRecursive(data);
                            } catch (e) { }
                        }
                    }
                }

                return results;
            });

            // Reconcile intercepted data with page data
            if (interceptedData) {
                // If intercepted data is just an array, wrap it
                if (Array.isArray(interceptedData)) {
                    internalData = { tracks: interceptedData };
                } else if (interceptedData.tracks || interceptedData.segments) {
                    internalData = interceptedData;
                }
            }

            // If we found project data in the page, it takes priority or fills gaps
            if (fullData.project && (!internalData || !internalData.tracks)) {
                internalData = fullData.project;
            }

            // ALWAYS attach templateDetail if found
            if (fullData.templateDetail) {
                if (!internalData) internalData = {};
                internalData.templateDetail = fullData.templateDetail;

                // Update metadata from templateDetail if available (high priority)
                if (fullData.templateDetail.title) metadata.title = fullData.templateDetail.title;
                if (fullData.templateDetail.description) metadata.description = fullData.templateDetail.description;
                if (fullData.templateDetail.cover_url) metadata.thumbnail = fullData.templateDetail.cover_url;
                if (fullData.templateDetail.video_url) (metadata as any).videoPreview = fullData.templateDetail.video_url;
            }

            if (internalData) {
                console.log(`[CapCutImporter] ✅ Successfully extracted internalData from ${capcutUrl}`);
            } else {
                console.log(`[CapCutImporter] ❌ Failed to find internalData on ${capcutUrl}`);
            }

            return { metadata, internalData };
        } finally {
            await browser.close();
        }
    }
}

export const capcutImporter = new CapCutImporter();
