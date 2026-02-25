import fs from 'fs';
import path from 'path';

/**
 * ProjectContext Utility
 * Handles loading of grounding files like actor_background.json, analysis.json,
 * film_script.txt, and scene.txt to provide rich context to AI generation tasks.
 */
export class ProjectContext {
    private static instance: ProjectContext;
    private rootPath: string;

    private constructor() {
        this.rootPath = process.cwd();
    }

    public static getInstance() {
        if (!ProjectContext.instance) {
            ProjectContext.instance = new ProjectContext();
        }
        return ProjectContext.instance;
    }

    /**
     * Get grounding data from local files
     */
    public async getGroundingData(): Promise<{ 
        characters: any, 
        backgrounds: any, 
        style: string, 
        technicalScript: string, 
        technicalAnalysis: any, 
        technicalStoryboard: string 
    }> {
        const result = {
            characters: {},
            backgrounds: {},
            style: '',
            technicalScript: '',
            technicalAnalysis: null,
            technicalStoryboard: ''
        };

        try {
            // 1. actor_background.json
            const actorPath = path.join(this.rootPath, 'actor_background.json');
            if (fs.existsSync(actorPath)) {
                const data = JSON.parse(fs.readFileSync(actorPath, 'utf8'));
                result.characters = data.character_lock || {};
                result.backgrounds = data.background_lock || {};
                result.style = data.visual_style || '';
            }

            // 2. film_script.txt
            const scriptPath = path.join(this.rootPath, 'film_script.txt');
            if (fs.existsSync(scriptPath)) {
                result.technicalScript = fs.readFileSync(scriptPath, 'utf8');
            }

            // 3. analysis.json
            const analysisPath = path.join(this.rootPath, 'analysis.json');
            if (fs.existsSync(analysisPath)) {
                result.technicalAnalysis = JSON.parse(fs.readFileSync(analysisPath, 'utf8'));
            }

            // 4. scene.txt (Storyboard Gold Standard)
            const storyboardPath = path.join(this.rootPath, 'scene.txt');
            if (fs.existsSync(storyboardPath)) {
                result.technicalStoryboard = fs.readFileSync(storyboardPath, 'utf8');
            }

        } catch (error) {
            console.warn('[ProjectContext] Failed to load grounding files:', error);
        }

        return result;
    }

    /**
     * Format technical grounding as a reference prompt.
     * Use this ONLY for Stage 2 (Analysis) and Stage 3 (Storyboard) to define DEPTH and FORMAT.
     */
    public async getTechnicalGroundingPrompt(): Promise<string> {
        const data = await this.getGroundingData();
        
        return `
### GOLD-STANDARD TECHNICAL REFERENCE (STRUCTURE ONLY) ###
IMPORTANT: The following content (Script, Analysis, and Storyboard) is provided ONLY as a "Gold Standard" benchmark for technical depth, cinematic vocabulary, and JSON structure.

1. **DO NOT REUSE** any characters (Ông Chính, Bà Chính), plots (Cờ tướng), or locations (Mekong) from this reference in your output.
2. **MATCH THE DEPTH** of the visual and audio descriptions. Notice how characters have 3D PBR material properties, exact hex colors, and specific voice/TTS parameters.
3. **FOLLOW THE GRANULAR MAPPING** shown in the analysis and storyboard examples.

**REFERENCE SCRIPT (Sample)**:
${data.technicalScript.substring(0, 1000)}... (truncated)

**REFERENCE ANALYSIS (Standard Structure)**:
${JSON.stringify(data.technicalAnalysis?.analysis || data.technicalAnalysis || {}, null, 2).substring(0, 1500)}... (truncated)

**REFERENCE STORYBOARD (High-Fidelity Segment)**:
${data.technicalStoryboard.substring(0, 2000)}... (truncated)
`.trim();
    }

    /**
     * Get grounding prompt from a live MongoDB project
     */
    public getProjectGroundingPrompt(project: any): string {
        const analysis = project.scriptAnalysis || {};
        const characters = analysis.characters || [];
        const locations = analysis.locations || [];
        const visuals = analysis.visuals || {};
        const brief = project.creativeBrief || {};

        if (!characters.length && !locations.length) {
            return '';
        }

        const charSection = characters.map((c: any) => {
            const pt = c.physical_traits || {};
            const traits = [
                c.species, c.gender, c.age,
                pt.body, pt.hair, pt.eyes, pt.skin,
                c.clothing, c.signature_feature
            ].filter(Boolean).join(', ');
            return `- [CHAR: ${c.char_id || c.name.toUpperCase()}] ${c.name}: ${c.description}. Traits: ${traits}.`
        }).join('\n');

        const locSection = locations.map((l: any) => {
            return `- [LOC: ${l.name?.toUpperCase()}] ${l.name}: ${l.description || l.atmosphere}.`
        }).join('\n');

        const worldRules = visuals.visualWorldRules || {};
        const lighting = worldRules.lighting || 'Cinematic';
        const physics = worldRules.physics || 'Realistic';

        return `
### PROJECT VISUAL CONTEXT & GROUNDING ###
Use the following character and location definitions to ensure visual and narrative consistency. 

**STRICT ADHERENCE TO THESE DESCRIPTIONS IS REQUIRED.**

**CHARACTERS**:
${charSection}

**LOCATIONS**:
${locSection}

**VISUAL STYLE CONTEXT**:
- Core Style: ${brief.visualStyle || visuals.visualStyle?.label || 'Cinematic'}
- Lighting: ${lighting}
- Physics/Vibe: ${physics}
`.trim();
    }
}

export const projectContext = ProjectContext.getInstance();
