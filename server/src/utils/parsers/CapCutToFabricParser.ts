/**
 * CapCutToFabricParser
 * 
 * This utility converts CapCut's internal template JSON (tracks/clips/materials)
 * into a Fabric.js compatible JSON structure for AntStudio.
 */

export interface CapCutTimeline {
    tracks: Array<{
        type: 'video' | 'audio' | 'text' | 'sticker' | 'effect';
        clips: any[];
    }>;
    canvas_config?: {
        width: number;
        height: number;
    };
}

export class CapCutToFabricParser {
    private width: number = 1080;
    private height: number = 1920;

    constructor(canvasWidth?: number, canvasHeight?: number) {
        this.width = canvasWidth || 1080;
        this.height = canvasHeight || 1920;
    }

    /**
     * Parse CapCut JSON into Fabric.js objects
     */
    parse(capcutData: any): any {
        const fabricObjects: any[] = [];

        if (!capcutData || !Array.isArray(capcutData.tracks)) {
            return { version: '5.4.0', objects: [] };
        }

        // Processing order: Background -> Video -> Image -> Text -> Sticker
        // CapCut tracks are usually ordered by Z-index already
        capcutData.tracks.forEach((track: any) => {
            const items = track.segments || track.clips || [];
            items.forEach((item: any) => {
                const object = this.mapClipToFabric(item, track.type, capcutData);
                if (object) {
                    fabricObjects.push(object);
                }
            });
        });

        return {
            version: '5.4.0',
            objects: fabricObjects
        };
    }

    private mapClipToFabric(clip: any, type: string, capcutData: any): any {
        // Detect timing units: microseconds vs milliseconds
        const durationRaw = clip.target_timerange?.duration || 0;
        const startRaw = clip.target_timerange?.start || 0;

        // HEURISTIC: CapCut uses microseconds (1,000,000/s) or milliseconds (1,000/s).
        // If start/duration is very large, or we see 6 or more digits, it's likely microseconds.
        // Also, if the template total duration in metadata is huge compared to these clips, we might be misaligning.
        const isMicro = durationRaw > 500000 || startRaw > 500000;
        const divisor = isMicro ? 1000000 : 1000;

        const base = {
            originX: 'center',
            originY: 'center',
            left: (clip.transform?.x || 0) + (this.width / 2),
            top: (clip.transform?.y || 0) + (this.height / 2),
            angle: clip.transform?.rotation || 0,
            scaleX: clip.transform?.scale_x || 1,
            scaleY: clip.transform?.scale_y || 1,
            opacity: clip.opacity !== undefined ? clip.opacity : 1,
            visible: true,
            meta: {
                duration: durationRaw / divisor,
                offset: startRaw / divisor
            }
        };

        // Normalize type to string
        let normalizedType = String(type).toLowerCase();

        // Map numeric types if needed (CapCut enums: 0=video/image, 1=audio, 2=text, etc. vary by version)
        // But more commonly, they appear as "video", "text", etc. or numeric IDs.
        // If it looks like a number, try to guess or use material contents.
        if (!isNaN(Number(normalizedType))) {
            const hasText = clip.content?.text !== undefined;
            const hasUrl = clip.content?.url || clip.content?.file_url;
            if (hasText) normalizedType = 'text';
            else if (hasUrl) {
                const url = String(hasUrl).toLowerCase();
                if (url.includes('.mp4') || url.includes('.mov')) normalizedType = 'video';
                else normalizedType = 'image';
            } else {
                // Heuristic based on track indexing or surrounding data
                // For now, assume video/image as default for unknown numeric types in media tracks
                normalizedType = 'video';
            }
        }

        switch (normalizedType) {
            case 'text':
                return {
                    ...base,
                    type: 'textbox',
                    text: clip.content?.text || 'Text',
                    fontFamily: clip.content?.font_name || 'Lato',
                    fontSize: clip.content?.font_size || 40,
                    fill: clip.content?.color || '#ffffff',
                    textAlign: clip.content?.align || 'center'
                };

            case 'video':
            case 'image':
            case 'media': // Some versions use 'media'
                const source = this.resolveSource(clip, capcutData);
                return {
                    ...base,
                    type: source.type,
                    src: source.url,
                    width: source.width || clip.content?.width || 100,
                    height: source.height || clip.content?.height || 100,
                    crossOrigin: 'anonymous'
                };

            default:
                // Handle complex types like stickers as images if they have a URL
                if (clip.content?.url || clip.content?.file_url) {
                    const source = this.resolveSource(clip, capcutData);
                    return {
                        ...base,
                        type: 'image',
                        src: source.url,
                        width: source.width || 100,
                        height: source.height || 100,
                        crossOrigin: 'anonymous'
                    };
                }
                return null;
        }
    }

    private resolveSource(clip: any, capcutData: any): { url: string; type: string; width?: number; height?: number } {
        // Safe helper to ensure we have an object/array from potentially stringified data
        const safeParse = (val: any) => {
            if (typeof val === 'string') {
                try { return JSON.parse(val); } catch (e) { return val; }
            }
            return val;
        };

        const templateDetail = capcutData.templateDetail;
        const draftParseInfo = templateDetail?.draft_parse_info;
        const FileInfo = safeParse(draftParseInfo?.FileInfo);
        const extra = safeParse(templateDetail?.extra);
        const LocalDraftInfo = safeParse(extra?.LocalDraftInfo);

        // 1. Check direct content URL
        let url = clip.content?.url || clip.content?.file_url || '';
        let type = 'image'; // default
        let width = undefined;
        let height = undefined;

        // 2. Resolve via material_id if URL is missing
        if (!url && clip.material_id && capcutData.materials) {
            // Check videos
            const videoMat = capcutData.materials.videos?.find((v: any) => v.id === clip.material_id);
            if (videoMat) {
                url = videoMat.material_url || videoMat.path || '';
                type = 'video';
                width = videoMat.width;
                height = videoMat.height;
                if (!url && videoMat.material_id && Array.isArray(FileInfo)) {
                    // Try to find in FileInfo using material_id or id
                    const fileInfo = FileInfo.find((f: any) =>
                        (f.material_id && f.material_id === videoMat.material_id) ||
                        (f.id && f.id === videoMat.material_id) ||
                        (f.materialId && f.materialId === videoMat.material_id)
                    );
                    if (fileInfo) url = fileInfo.EncryptURL || fileInfo.url || '';
                }
            }

            // Check images
            if (!url) {
                const imageMat = capcutData.materials.images?.find((img: any) => img.id === clip.material_id);
                if (imageMat) {
                    url = imageMat.material_url || imageMat.path || '';
                    type = 'image';
                    width = imageMat.width;
                    height = imageMat.height;
                    if (!url && imageMat.material_id && Array.isArray(FileInfo)) {
                        const fileInfo = FileInfo.find((f: any) =>
                            (f.material_id && f.material_id === imageMat.material_id) ||
                            (f.id && f.id === imageMat.material_id) ||
                            (f.materialId && f.materialId === imageMat.material_id)
                        );
                        if (fileInfo) url = fileInfo.EncryptURL || fileInfo.url || '';
                    }
                }
            }
        }

        // 3. Last resort fallbacks from templateDetail info if we still have no URL
        if (!url && templateDetail) {
            // Check FileInfo via segment/clip ID
            if (Array.isArray(FileInfo)) {
                const fileInfo = FileInfo.find((f: any) => (f.id && f.id === clip.id) || (f.material_id && f.material_id === clip.material_id));
                if (fileInfo) {
                    url = fileInfo.EncryptURL || fileInfo.url || '';
                    // Try to guess type/dims if still missing
                    if (fileInfo.Width) width = fileInfo.Width;
                    if (fileInfo.Height) height = fileInfo.Height;
                }
            }

            // Check VideoSegments cover paths
            if (!url && LocalDraftInfo?.VideoSegments) {
                const videoSeg = LocalDraftInfo.VideoSegments.find((s: any) => s.id === clip.id || s.id === clip.material_id);
                if (videoSeg && videoSeg.CoverPath && Array.isArray(FileInfo)) {
                    // Try to map CoverPath to an EncryptURL in FileInfo
                    const coverFileInfo = FileInfo.find((f: any) => f.Path === videoSeg.CoverPath);
                    if (coverFileInfo) {
                        url = coverFileInfo.EncryptURL || coverFileInfo.url || '';
                        if (coverFileInfo.Width) width = coverFileInfo.Width;
                        if (coverFileInfo.Height) height = coverFileInfo.Height;
                    }
                }
            }
        }

        // Final fallback: use template thumbnail if it's a video/image and we are desperate
        if (!url && templateDetail?.cover_url) {
            url = templateDetail.cover_url;
        }

        // Fix relative URLs
        if (url && url.startsWith('/')) {
            url = `https://www.capcut.com${url}`;
        }

        // Determine real type strictly based on extension/content
        const lowerUrl = String(url).toLowerCase();
        if (lowerUrl.includes('.mp4') || lowerUrl.includes('.mov') || lowerUrl.includes('.webm') || lowerUrl.includes('mime_type=video')) {
            type = 'video';
        } else if (lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg') || lowerUrl.includes('.png') || lowerUrl.includes('.webp') || lowerUrl.includes('.gif') || lowerUrl.includes('.image')) {
            type = 'image';
        }

        return { url, type, width, height };
    }

    /**
     * Extract clips into the AntStudio block format
     */
    extractBlocks(capcutData: any): any[] {
        const blocks: any[] = [];
        // Typically use the primary video track to determine blocks
        const videoTrack = capcutData.tracks.find((t: any) => t.type === 'video' || t.type === 'media' || !isNaN(Number(t.type)));
        if (videoTrack) {
            const items = videoTrack.segments || videoTrack.clips || [];
            items.forEach((item: any, index: number) => {
                const durationRaw = item.target_timerange?.duration || 0;
                const startRaw = item.target_timerange?.start || 0;
                const isMicro = durationRaw > 500000 || startRaw > 500000;
                const divisor = isMicro ? 1000000 : 1000;

                blocks.push({
                    id: `block_${index}`,
                    start: startRaw / divisor,
                    end: (startRaw + durationRaw) / divisor
                });
            });
        }
        return blocks;
    }
}
