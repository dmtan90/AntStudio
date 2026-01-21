import type { EditorTemplate, EditorTemplatePage } from 'video-editor/types/editor';
import { nanoid } from 'nanoid';
import { defaultFont } from '@/views/video-editor/constants/fonts';
import fabric from 'fabric';

export interface StudioProject {
    _id: string;
    title: string;
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
    finalVideo?: {
        backgroundMusic?: {
            s3Key?: string;
            volume?: number;
        };
    };
    advancedEditorState?: any;
}

export function convertFlowToStudio(project: StudioProject): EditorTemplate {
    if (project.advancedEditorState) {
        // If we have a saved state, use it directly
        return project.advancedEditorState as EditorTemplate;
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

    let objects = [];
    let audios = [];
    let startSeconds = 0;
    let segments = project?.storyboard?.segments || [];
    let thumbnail = '';
    segments.map((seg) => {
        const videoUrl = seg.generatedVideo?.s3Key || seg.sceneImage || '';
        const isVideo = !!seg.generatedVideo?.s3Key;
        // if(isVideo){
        //     thumbnail = videoUrl;
        // }
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
            stroke: null,
            strokeWidth: 0,
            strokeDashArray: null,
            strokeLineCap: 'butt',
            strokeDashOffset: 0,
            strokeLineJoin: 'miter',
            strokeUniform: true,
            strokeMiterLimit: 4,
            scaleX: 1,
            scaleY: 1,
            angle: 0,
            flipX: false,
            flipY: false,
            opacity: 1,
            shadow: null,
            visible: true,
            backgroundColor: '',
            fillRule: 'nonzero',
            paintFirst: 'stroke',
            globalCompositeOperation: 'source-over',
            skewX: 0,
            skewY: 0,
            src: videoUrl || '',
            crossOrigin: (videoUrl && (videoUrl.startsWith('http') && !videoUrl.includes(window.location.host))) ? undefined : 'anonymous',
            filters: [],
            meta: {
                id: nanoid(),
                offset: startSeconds * 1000,
                duration: (seg.duration || 5) * 1000
            },
            anim: { in: { name: 'none', duration: 0, offset: 0 }, out: { name: 'none', duration: 0, offset: 0 }, scene: { name: 'none', duration: 0, offset: 0 }, state: { name: 'none', duration: 0, offset: 0 } },
            ...(isVideo ? {
                duration: seg.duration,
                trimStart: 0,
                trimEnd: seg.duration,
                // volume: 1,
                // muted: false,
                crossOrigin: "anonymous",
            } : {}),
        });
        // // Create a basic fabric scene JSON
        // const sceneObj = {
        //     version: '5.3.0',
        //     objects: [
        //         {
        //             type: isVideo ? 'video' : 'image',
        //             version: '5.3.0',
        //             originX: 'left',
        //             originY: 'top',
        //             left: 0,
        //             top: 0,
        //             width: width,
        //             height: height,
        //             fill: 'rgb(0,0,0)',
        //             stroke: null,
        //             strokeWidth: 0,
        //             strokeDashArray: null,
        //             strokeLineCap: 'butt',
        //             strokeDashOffset: 0,
        //             strokeLineJoin: 'miter',
        //             strokeUniform: true,
        //             strokeMiterLimit: 4,
        //             scaleX: 1,
        //             scaleY: 1,
        //             angle: 0,
        //             flipX: false,
        //             flipY: false,
        //             opacity: 1,
        //             shadow: null,
        //             visible: true,
        //             backgroundColor: '',
        //             fillRule: 'nonzero',
        //             paintFirst: 'stroke',
        //             globalCompositeOperation: 'source-over',
        //             skewX: 0,
        //             skewY: 0,
        //             src: videoUrl || '',
        //             crossOrigin: 'anonymous',
        //             filters: [],
        //             meta: {
        //                 id: nanoid(),
        //                 offset: 0,
        //                 duration: (seg.duration || 5) * 1000
        //             },
        //             anim: { in: { name: 'none', duration: 0, offset: 0 }, out: { name: 'none', duration: 0, offset: 0 }, scene: { name: 'none', duration: 0, offset: 0 }, state: { name: 'none', duration: 0, offset: 0 } },
        //             ...(isVideo ? { 
        //                 duration: seg.duration, 
        //                 trimStart: 0, 
        //                 trimEnd: seg.duration,
        //                 volume: 1,
        //                 muted: false,
        //                 crossOrigin: "anonymous", 
        //             } : {}),
        //         }
        //     ],
        //     background: '#000000'
        // };

        // Add text element for narration/subtitle
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
                styles: [],
                meta: {
                    id: nanoid(),
                    offset: startSeconds * 1000,
                    duration: (seg.duration || 5) * 1000,
                    font: defaultFont
                },
                anim: { in: { name: 'none', duration: 0, offset: 0 }, out: { name: 'none', duration: 0, offset: 0 }, scene: { name: 'none', duration: 0, offset: 0 }, state: { name: 'none', duration: 0, offset: 0 } },
            } as any);
        }
        startSeconds += seg.duration;
        // return {
        //     id: seg._id,
        //     name: seg.title || `Segment ${seg.order}`,
        //     thumbnail: '',
        //     duration: seg.duration || 5,
        //     data: {
        //         scene: JSON.stringify(sceneObj),
        //         audios: [],
        //         fill: '#000000',
        //         width: width,
        //         height: height
        //     }
        // };
    });

    // Handle background music if it exists
    if (project.finalVideo?.backgroundMusic?.s3Key) {
        const bgMusic = project.finalVideo.backgroundMusic;
        const audioUrl = bgMusic.s3Key || '';
        audios.push({
            id: nanoid(),
            url: audioUrl,
            name: 'Background Music',
            volume: bgMusic.volume || 0.5,
            muted: false,
            duration: startSeconds,
            offset: 0,
            playing: false,
            trimStart: 0,
            trimEnd: 0,
            trim: 0,
            timeline: startSeconds,
            visualEnabled: false,
            visible: false,
            visualType: 'bars',
            visualProps: {} as any,
            type: 'audio'
        });
        // pages[0].data.audios.push({
        //     id: nanoid(),
        //     url: audioUrl,
        //     name: 'Background Music',
        //     volume: bgMusic.volume || 0.5,
        //     muted: false,
        //     duration: pages.reduce((acc, p) => acc + p.duration, 0),
        //     offset: 0,
        //     playing: false,
        //     trimStart: 0,
        //     trimEnd: 0,
        //     trim: 0,
        //     timeline: p.duration,
        //     visualEnabled: false,
        //     visible: false,
        //     visualType: 'bars',
        //     visualProps: {} as any,
        //     type: 'audio'
        // });
    }

    //merge all segments to one page
    const page = {
        id: nanoid(),
        name: project.title,
        thumbnail: thumbnail,
        duration: startSeconds * 1000,
        data: {
            scene: JSON.stringify({
                version: fabric.version,
                objects: objects,
                background: '#000000'
            }),
            audios: audios,
            fill: '#000000',
            width: width,
            height: height
        }
    };

    return {
        id: project._id,
        name: project.title,
        is_pubished: false,
        pages: [page]
    };
}
