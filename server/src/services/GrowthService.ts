import { Project } from '../models/Project.js';
import { MarketplaceAsset } from '../models/MarketplaceAsset.js';

export class GrowthService {
    /**
     * Generate tactical SEO metadata for a public project or asset.
     */
    static async getSEOMetadata(type: 'project' | 'asset', id: string) {
        let title = 'AntStudio | Autonomous AI Production';
        let description = 'Create, broadcast, and automate high-fidelity AI content at scale.';
        let image = 'https://antstudio.ai/splash.png';

        try {
            if (type === 'asset') {
                const asset = await MarketplaceAsset.findById(id);
                if (asset) {
                    title = `${asset.title} | AntStudio Marketplace`;
                    description = asset.description.substring(0, 160);
                    image = asset.previewUrl || image;
                }
            } else {
                const project = await Project.findById(id);
                if (project) {
                    title = `${project.title} | Created on AntStudio`;
                    description = `High-fidelity AI production: ${project.description.substring(0, 140)}`;
                }
            }
        } catch (e) {
            console.error('SEO Metadata generation failure:', e);
        }

        return {
            title,
            meta: [
                { name: 'description', content: description },
                { property: 'og:title', content: title },
                { property: 'og:description', content: description },
                { property: 'og:image', content: image },
                { name: 'twitter:card', content: 'summary_large_image' },
                { name: 'twitter:title', content: title },
                { name: 'twitter:description', content: description },
                { name: 'twitter:image', content: image }
            ]
        };
    }

    /**
     * Orchestrate A/B test variant assignment (Deterministic Hash based).
     */
    static getLandingVariant(visitorId: string): 'A' | 'B' {
        // Simple deterministic assignment based on string hash
        let hash = 0;
        for (let i = 0; i < visitorId.length; i++) {
            hash = ((hash << 5) - hash) + visitorId.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash) % 2 === 0 ? 'A' : 'B';
    }
}
