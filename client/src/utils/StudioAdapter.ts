import type { EditorTemplate, EditorTemplatePage } from 'video-editor/types/editor';
import { nanoid } from 'nanoid';
import { defaultFont } from '@/views/video-editor/constants/fonts';
import fabric from 'fabric';

export interface StudioProject {
    _id: string;
    title: string;
    description?: string;
    category?: string;
    is_published: boolean;
    aspectRatio?: string;
    storyboard?: {
        segments: Array<{
            _id: string;
            title: string;
            description: string;
            duration: number;
            voiceover?: string; // narration text
            sceneImage?: string;
            generatedVideo?: {
                s3Key?: string;
            };
            order: number;
        }>;
    };
    musics?: Array<{
        s3Key?: string;
        volume?: number;
    }>;
    pages?: any;
}

export function convertFlowToStudio(project: StudioProject): EditorTemplate {
    if (project.pages) {
        return {
            id: project._id,
            name: project.title,
            description: project.description || '',
            category: project.category || 'general',
            is_published: project.is_published,
            pages: project.pages as Array<EditorTemplatePage>
        };
    }

    let width = project.aspectRatio === '9:16' ? 1080 : 1920;
    let height = project.aspectRatio === '9:16' ? 1920 : 1080;
    if (project.aspectRatio === '1:1') {
        width = 1080;
        height = 1080;
    }
    if (project.aspectRatio === '4:3') {
        width = 1280;
        height = 960;
    }

    const pages: EditorTemplatePage[] = [];
    const segments = project?.storyboard?.segments || [];
    
    // Process each segment into its own page
    segments.forEach((seg, idx) => {
        const videoUrl = seg.generatedVideo?.s3Key || seg.sceneImage || '';
        const isVideo = !!seg.generatedVideo?.s3Key;
        const pageId = nanoid();
        const blockId = seg._id; // Use segment ID as the block ID for sync

        const objects: any[] = [];
        
        // Background Media (Video or Image)
        objects.push({
            type: isVideo ? 'video' : 'image',
            version: '5.3.0',
            originX: 'left',
            originY: 'top',
            left: 0,
            top: 0,
            width: width,
            height: height,
            fill: 'rgb(0,0,0)',
            scaleX: 1,
            scaleY: 1,
            angle: 0,
            opacity: 1,
            visible: true,
            src: videoUrl || '',
            crossOrigin: (videoUrl && (videoUrl.startsWith('http') && !videoUrl.includes(window.location.host))) ? undefined : 'anonymous',
            meta: {
                id: nanoid(),
                offset: 0, // In multi-page mode, offset is relative to page start
                duration: (seg.duration || 5) * 1000,
                blocks: [{ id: blockId, start: 0, end: (seg.duration || 5) * 1000 }] // Tag object with block ID
            },
            anim: { in: { name: 'none', duration: 0, offset: 0 }, out: { name: 'none', duration: 0, offset: 0 }, scene: { name: 'none', duration: 0, offset: 0 }, state: { name: 'none', duration: 0, offset: 0 } },
            ...(isVideo ? {
                duration: seg.duration,
                trimStart: 0,
                trimEnd: seg.duration,
                crossOrigin: "anonymous",
            } : {}),
        });

        // Narration Text (Textbox)
        if (seg.voiceover) {
            objects.push({
                type: 'textbox',
                version: '5.3.0',
                originX: 'left',
                originY: 'top',
                left: 100,
                top: height - 200,
                width: width - 200,
                height: 100,
                fill: '#ffffff',
                stroke: '#000000',
                strokeWidth: 2,
                text: seg.voiceover,
                fontSize: 36,
                fontWeight: 'bold',
                fontFamily: 'Arial',
                textAlign: 'center',
                backgroundColor: 'rgba(0,0,0,0.4)',
                meta: {
                    id: nanoid(),
                    offset: 0,
                    duration: (seg.duration || 5) * 1000,
                    font: defaultFont,
                    blocks: [{ id: blockId, start: 0, end: (seg.duration || 5) * 1000 }]
                },
                anim: { in: { name: 'none', duration: 0, offset: 0 }, out: { name: 'none', duration: 0, offset: 0 }, scene: { name: 'none', duration: 0, offset: 0 }, state: { name: 'none', duration: 0, offset: 0 } },
            } as any);
        }

        // Background Music (Only on the first page, span across pages if supported by editor)
        const audios: any[] = [];
        if (idx === 0 && project.musics?.[0]?.s3Key) {
            const bgMusic = project.musics[0];
            const totalDuration = segments.reduce((acc, s) => acc + (s.duration || 5), 0);
            audios.push({
                id: nanoid(),
                url: bgMusic.s3Key,
                name: 'Background Music',
                volume: bgMusic.volume || 0.5,
                muted: false,
                duration: totalDuration,
                offset: 0,
                timeline: totalDuration,
                type: 'audio'
            });
        }

        pages.push({
            id: pageId,
            name: seg.title || `Segment ${seg.order}`,
            thumbnail: '',
            duration: (seg.duration || 5) * 1000,
            blocks: [{ id: blockId, start: 0, end: (seg.duration || 5) * 1000 }], // Tag page with block ID
            data: {
                scene: JSON.stringify({
                    version: '5.3.0',
                    objects: objects,
                    background: '#000000'
                }),
                audios: audios,
                fill: '#000000',
                width: width,
                height: height
            }
        });
    });

    return {
        id: project._id,
        name: project.title,
        description: project.description || '',
        category: 'general',
        is_published: false,
        pages: pages
    };
}

/**
 * Convert an Advanced Studio template back to storyboard segments.
 * Reads the single merged page produced by convertFlowToStudio and extracts
 * per-segment data (url, duration, offset) so the storyboard can be updated.
 */
export function convertStudioToFlow(
    template: EditorTemplate,
    originalProject: StudioProject
): Partial<StudioProject> {
    if (!template?.pages?.length) return {}

    const segments = JSON.parse(JSON.stringify(originalProject?.storyboard?.segments || []))
    const updatedMusics: Array<{ s3Key: string; volume: number }> = []

    // Map each page back to a segment
    template.pages.forEach((page, pIdx) => {
        // Try to find the segment ID from the page's blocks
        const segmentId = page.blocks?.[0] || segments[pIdx]?._id;
        const seg = segments.find((s: any) => s._id === segmentId) || segments[pIdx];

        if (!seg) return;

        let sceneObjects: any[] = []
        try {
            const sceneData = typeof page.data.scene === 'string'
                ? JSON.parse(page.data.scene)
                : page.data.scene
            sceneObjects = (sceneData?.objects || []).filter(
                (o: any) => o.type === 'video' || o.type === 'image'
            )
            
            // Look for narration text updates
            const textObj = (sceneData?.objects || []).find((o: any) => o.type === 'textbox');
            if (textObj?.text) {
                seg.voiceover = textObj.text;
            }
        } catch (e) {
            console.warn('[StudioAdapter] Failed to parse scene objects for page', page.id, e)
        }

        // The background media is usually the first video/image object
        const mainObj = sceneObjects[0];
        if (mainObj?.src) {
            if (mainObj.type === 'video') {
                if (!seg.generatedVideo) seg.generatedVideo = {}
                seg.generatedVideo.s3Key = mainObj.src
                if (mainObj.duration) seg.duration = mainObj.duration
            } else {
                seg.sceneImage = mainObj.src
            }
        }

        // Sync duration from page (page duration in ms → segment duration in s)
        if (page.duration) {
            seg.duration = Math.round((page.duration / 1000) * 100) / 100;
        } else if (mainObj?.meta?.duration) {
            seg.duration = Math.round((mainObj.meta.duration / 1000) * 100) / 100;
        }

        // Extract music from each page (though usually it's only on the first page)
        const audios: any[] = page.data?.audios || []
        for (const audio of audios) {
            if (audio.url && !updatedMusics.find(m => m.s3Key === audio.url)) {
                updatedMusics.push({ s3Key: audio.url, volume: audio.volume ?? 0.5 })
            }
        }
    });

    const result: Partial<StudioProject> = {
        storyboard: {
            segments,
            totalDuration: segments.reduce((acc: number, s: any) => acc + (s.duration || 0), 0),
            createdAt: (originalProject?.storyboard as any)?.createdAt || new Date(),
            updatedAt: new Date()
        } as any
    }
    if (updatedMusics.length) result.musics = updatedMusics

    return result
}
