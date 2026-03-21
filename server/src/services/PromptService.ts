import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Logger } from '../utils/Logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Service to load and process AI prompt templates from markdown files.
 */
export class PromptService {
    private static instance: PromptService;
    private templateDir: string;
    private cache: Map<string, string> = new Map();

    private constructor() {
        this.templateDir = path.resolve(__dirname, '../prompts');
    }

    public static getInstance(): PromptService {
        if (!PromptService.instance) {
            PromptService.instance = new PromptService();
        }
        return PromptService.instance;
    }

    /**
     * Loads a prompt template and replaces variables.
     * @param templatePath Relative path under server/src/prompts (e.g., 'video_creation/script_gen')
     * @param variables Key-value pairs to replace in the template {{key}}
     */
    public async get(templatePath: string, variables: Record<string, any> = {}): Promise<string> {
        let template = this.cache.get(templatePath);

        if (!template) {
            const fullPath = path.join(this.templateDir, `${templatePath}.md`);
            try {
                template = await fs.readFile(fullPath, 'utf8');
                this.cache.set(templatePath, template);
            } catch (error: any) {
                Logger.error(`[PromptService] Failed to load template: ${templatePath}`, 'PromptService', error);
                throw new Error(`Prompt template not found: ${templatePath}`);
            }
        }

        return this.processTemplate(template, variables);
    }

    private processTemplate(template: string, variables: Record<string, any>): string {
        let processed = template;
        for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            processed = processed.replace(regex, value !== undefined ? String(value) : '');
        }
        return processed;
    }

    /**
     * Clears the template cache (useful for development).
     */
    public clearCache() {
        this.cache.clear();
    }
}

export const promptService = PromptService.getInstance();
