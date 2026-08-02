import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Logger } from '../../utils/Logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Service to load and process AI prompt templates from markdown files.
 */
export class PromptService {
    private static instance: PromptService;
    private cache: Map<string, string> = new Map();

    private constructor() {}

    public static getInstance(): PromptService {
        if (!PromptService.instance) {
            PromptService.instance = new PromptService();
        }
        return PromptService.instance;
    }

    /**
     * Resolves the candidate full path for a prompt template.
     */
    private resolveFullPath(templatePath: string): string {
        const fileName = templatePath.endsWith('.md') ? templatePath : `${templatePath}.md`;

        const candidatePaths = [
            path.resolve(__dirname, 'prompts', fileName),
            path.resolve(__dirname, '../prompts', fileName),
            path.resolve(__dirname, '../../prompts', fileName),
            path.resolve(process.cwd(), 'server/dist/prompts', fileName),
            path.resolve(process.cwd(), 'server/src/prompts', fileName),
            path.resolve(process.cwd(), 'prompts', fileName)
        ];

        for (const candidate of candidatePaths) {
            if (fsSync.existsSync(candidate)) {
                return candidate;
            }
        }

        return path.resolve(__dirname, '../../prompts', fileName);
    }

    /**
     * Loads a prompt template and replaces variables.
     * @param templatePath Relative path under server/src/prompts (e.g., 'video_creation/script_gen')
     * @param variables Key-value pairs to replace in the template {{key}}
     */
    public async get(templatePath: string, variables: Record<string, any> = {}): Promise<string> {
        let template = this.cache.get(templatePath);

        if (!template) {
            const fullPath = this.resolveFullPath(templatePath);
            try {
                template = await fs.readFile(fullPath, 'utf8');
                this.cache.set(templatePath, template);
            } catch (error: any) {
                Logger.error(`[PromptService] Failed to load template: ${templatePath} from ${fullPath}`, 'PromptService', error);
                throw new Error(`Prompt template not found: ${templatePath} (tried path: ${fullPath})`);
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
