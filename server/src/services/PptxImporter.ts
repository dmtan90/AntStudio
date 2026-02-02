import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pptxParser = require('pptx-parser');
import { PptxToFabricParser } from '../utils/parsers/PptxToFabricParser.js';
import { uploadToS3 } from '../utils/s3.js';
import { Template } from '../models/Template.js';
import mongoose from 'mongoose';

export class PptxImporter {
    private parser: PptxToFabricParser;

    constructor() {
        this.parser = new PptxToFabricParser();
    }

    async importPptx(file: Express.Multer.File, userId: string): Promise<any> {
        console.log(`[PptxImporter] 📦 Importing PPTX: ${file.originalname}`);

        const result = await pptxParser.parse(file.buffer);
        if (!result || !result.slides) {
            throw new Error('Failed to parse PPTX or file is empty');
        }

        const pages: any[] = [];
        const templateId = `pptx_${Date.now()}`;

        // Process slides into pages
        for (let i = 0; i < result.slides.length; i++) {
            const slide = result.slides[i];

            // 1. Convert elements to Fabric.js objects
            const scene = this.parser.parseSlide(slide);

            // 2. Identify and upload images in this slide
            if (slide.elements) {
                for (const el of slide.elements) {
                    if ((el.type === 'image' || el.type === 'picture') && el.data) {
                        // If el.data is present (binary), upload to S3
                        const s3Key = `marketplace/templates/${templateId}/slide_${i + 1}_${el.id || Date.now()}.png`;
                        try {
                            const upload = await uploadToS3(s3Key, el.data, 'image/png');
                            // Update the src in the scene's objects
                            const fabricObj = scene.objects.find((obj: any) => obj.id === el.id);
                            if (fabricObj) fabricObj.src = upload.url || upload.key;
                        } catch (e) {
                            console.error(`[PptxImporter] Failed to upload image for slide ${i + 1}`, e);
                        }
                    }
                }
            }

            pages.push({
                id: `page_${i + 1}`,
                name: `Slide ${i + 1}`,
                thumbnail: '', // Generatable later
                preview: '',
                duration: 5, // Default 5s per slide
                data: {
                    fill: '#ffffff',
                    height: 1080,
                    width: 1920,
                    format: 'landscape',
                    orientation: 'landscape',
                    audios: [],
                    scene: JSON.stringify(scene)
                },
                blocks: [{
                    id: `block_${i + 1}`,
                    start: 0,
                    end: 5
                }]
            });
        }

        const templateData = {
            name: file.originalname.replace('.pptx', ''),
            description: `Imported from ${file.originalname}`,
            category: 'tutorial',
            thumbnail: pages[0]?.thumbnail || '',
            pages: pages,
            source: {
                platform: 'private',
                importedAt: new Date()
            },
            pricing: { type: 'free' },
            author: new mongoose.Types.ObjectId(userId),
            authorName: 'System Import',
            tags: ['pptx', 'imported'],
            is_published: false
        };

        return templateData;
    }
}

export const pptxImporter = new PptxImporter();
