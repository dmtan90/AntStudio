/**
 * ProductKnowledgeService — Phase 11
 *
 * Scrapes `inventoryUrl` from a Product record, distills the content (HTML / PDF / plain text)
 * using Gemini Flash, and stores the compact summary back on the Product as `knowledgeBase`.
 *
 * This knowledge is later injected into the Gemini Live system instruction so the AI can
 * answer buyer questions about the product with 100% accuracy.
 */

import { Logger } from '~/utils/Logger.js';
import { Product, IProduct } from '~/models/Product.js';
import { generateText } from '~/utils/AIGenerator.js';
import { parseDocument } from '~/utils/DocumentParser.js';

const MAX_CONTENT_CHARS = 40_000;   // ~10k tokens
const DISTILL_MAX_CHARS = 3_000;     // Final summary fits comfortably in system prompt

export class ProductKnowledgeService {
    /**
     * Main entry point. Scrape and distill knowledge for a product.
     * Marks the product as 'processing' immediately, then updates to 'ready' or 'error'.
     */
    public async ingestProduct(productId: string): Promise<void> {
        const product = await Product.findById(productId);
        if (!product) throw new Error(`Product ${productId} not found`);

        if (!product.inventoryUrl) {
            Logger.warn(`[PKS] Product ${productId} has no inventoryUrl — skipping ingestion.`, 'PKS');
            return;
        }

        await Product.findByIdAndUpdate(productId, { knowledgeStatus: 'processing' });

        try {
            Logger.info(`[PKS] Starting knowledge ingestion for product: ${product.name} (${product.inventoryUrl})`, 'PKS');
            const rawContent = await this.fetchContent(product.inventoryUrl);
            const distilled = await this.distillWithGemini(product, rawContent);

            await Product.findByIdAndUpdate(productId, {
                knowledgeBase: distilled,
                knowledgeStatus: 'ready',
                knowledgeUpdatedAt: new Date()
            });

            Logger.info(`[PKS] Knowledge ready for product ${productId}. Length: ${distilled.length} chars.`, 'PKS');
        } catch (err: any) {
            Logger.error(`[PKS] Ingestion failed for product ${productId}: ${err.message}`, 'PKS', err);
            await Product.findByIdAndUpdate(productId, { knowledgeStatus: 'error' });
        }
    }

    /**
     * Rebuild knowledge for all products with an inventoryUrl.
     */
    public async ingestAll(userId: string): Promise<{ queued: number }> {
        const products = await Product.find({ userId, inventoryUrl: { $exists: true, $ne: '' } }).select('_id');
        for (const p of products) {
            // Fire-and-forget per product, errors are caught internally
            this.ingestProduct(p._id.toString()).catch(() => {});
        }
        return { queued: products.length };
    }

    /**
     * Returns the knowledge base for a product, suitable for injecting into a system prompt.
     */
    public async getKnowledgePrompt(productId: string): Promise<string | null> {
        const product = await Product.findById(productId).select('name knowledgeBase knowledgeStatus');
        if (!product || !product.knowledgeBase || product.knowledgeStatus !== 'ready') return null;
        return `## Product Knowledge: ${product.name}\n${product.knowledgeBase}`;
    }

    // ─────────────────────────────────────────────────────────────────────────

    private async fetchContent(url: string): Promise<string> {
        // Try cheerio-based HTML scraping first
        try {
            const response = await fetch(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AntStudio-Bot/1.0)' },
                signal: AbortSignal.timeout(15_000)
            });

            const contentType = response.headers.get('content-type') || '';

            if (contentType.includes('application/pdf')) {
                // PDF: read raw buffer and extract text
                const arrayBuffer = await response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                return await this.extractPdfText(buffer);
            }

            const html = await response.text();
            return this.extractTextFromHtml(html).substring(0, MAX_CONTENT_CHARS);
        } catch (err: any) {
            throw new Error(`Failed to fetch ${url}: ${err.message}`);
        }
    }

    private extractTextFromHtml(html: string): string {
        // Simple tag stripper — good enough for structured product pages
        return html
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style[\s\S]*?<\/style>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/\s{2,}/g, ' ')
            .trim();
    }

    private async extractPdfText(buffer: Buffer): Promise<string> {
        try {
            const data = await parseDocument(buffer, 'pdf');
            return data.text.substring(0, MAX_CONTENT_CHARS);
        } catch {
            Logger.warn('[PKS] pdf-parse not available or failed. Returning empty PDF text.', 'PKS');
            return '';
        }
    }

    private async distillWithGemini(product: IProduct, rawContent: string): Promise<string> {
        if (!rawContent.trim()) return 'No content available from inventory URL.';

        const prompt = `You are a product knowledge expert. Extract and summarize the most important information from the following product page content for the product: "${product.name}" (Price: ${product.price} ${product.currency}).

Focus on:
- Key features and specifications
- Usage instructions and how-to guides
- Customer reviews and ratings summary
- Common questions and answers
- Shipping, warranty, return policies

Be concise but comprehensive. Output in Vietnamese if the content is Vietnamese, otherwise English.
Limit your response to ${DISTILL_MAX_CHARS} characters.

--- PRODUCT PAGE CONTENT ---
${rawContent.substring(0, MAX_CONTENT_CHARS)}
--- END CONTENT ---`;

        const text = await generateText(prompt, undefined, {});
        return text.substring(0, DISTILL_MAX_CHARS);
    }
}

export const productKnowledgeService = new ProductKnowledgeService();
