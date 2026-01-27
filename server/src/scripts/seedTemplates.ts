
import mongoose from 'mongoose';
import config from '../utils/config.js';
import { Template } from '../models/Template.js';

const TEMPLATES = [
    {
        id: 'tpl_organic_1',
        name: 'Organic Review Style',
        category: 'ads',
        description: 'UGC-style product review with dynamic captions',
        thumbnail: 'https://cdn.antflow.ai/templates/organic_1.jpg',
        tags: ['ugc', 'review', 'tiktok'],
        is_published: true,
        pages: []
    },
    {
        id: 'tpl_cinematic_1',
        name: 'Cinematic Product Showcase',
        category: 'ads',
        description: 'High-end B-roll montage with elegant typography',
        thumbnail: 'https://cdn.antflow.ai/templates/cinematic_1.jpg',
        tags: ['luxury', 'cinematic', 'b-roll'],
        is_published: true,
        pages: []
    },
    {
        id: 'tpl_problem_solution_1',
        name: 'Problem/Solution Narrative',
        category: 'ads',
        description: 'Classic marketing hook -> problem -> solution flow',
        thumbnail: 'https://cdn.antflow.ai/templates/prob_sol_1.jpg',
        tags: ['marketing', 'storytelling'],
        is_published: true,
        pages: []
    },
    {
        id: 'tpl_avatar_explainer',
        name: 'AI Avatar Explainer',
        category: 'avatar',
        description: 'Professional presenter explaining a concept',
        thumbnail: 'https://cdn.antflow.ai/templates/avatar_1.jpg',
        tags: ['education', 'business'],
        is_published: true,
        pages: []
    }
];

const seed = async () => {
    try {
        await mongoose.connect(config.mongodbUri || '');
        console.log('Connected to DB');

        for (const t of TEMPLATES) {
            const exists = await Template.findOne({ id: t.id });
            if (!exists) {
                await Template.create(t);
                console.log(`Created template: ${t.name}`);
            } else {
                console.log(`Template exists: ${t.name}`);
            }
        }

        console.log('Seeding complete');
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
};

seed();
