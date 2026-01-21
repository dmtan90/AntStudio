import { generateJSON } from '../utils/AIGenerator.js'
import config from '../utils/config.js'

export interface ScriptAnalysisResult {
  summary: string
  genre: string
  mood: string
  characters: any[]
  locations: Array<{
    name: string
    description: string
  }>
  themes: string[]
  language: string
}

/**
 * Analyze script content using Gemini
 */
export const analyzeScript = async (scriptContent: string): Promise<ScriptAnalysisResult> => {
  const prompt = `You are a professional script analyst. Analyze the following script/story and extract key information.
  
Cần đảm bảo đồng nhất ngôn ngữ theo ngữ cảnh (Ensure language consistency based on context).

Script Content:
${scriptContent}

Please analyze and provide:
1. A concise summary (2-3 sentences)
2. The genre (e.g., drama, comedy, action, sci-fi, horror, etc.)
3. The overall mood/tone (e.g., dark, uplifting, mysterious, humorous, etc.)
4. List of main characters with HIGHLY DETAILED descriptions. If a character is human or animal, provide specific details including gender, age, physical appearance, and personality. Always include a "CHAR_NARRATOR" entry if the script has a narrator or off-screen voiceover.

For each character, follow this JSON schema: (Always use stable "char_id" like "CHAR_1", "CHAR_NARRATOR", etc.)
{
  "char_id": "CHAR_1",
  "name": "Character Name",
  "species": "Human/Animal/Other",
  "gender": "Male/Female/Other",
  "age": "Specific age or range",
  "description": "Visual-first summary description. This will be used as the source of truth for AI image generation.",
  "voice_personality": "Description of voice and personality",
  "body_build": "Tall, athletic, etc.",
  "face_shape": "Square, oval, etc.",
  "hair": "Color, style, texture",
  "skin_or_fur_color": "Color and texture notes",
  "signature_feature": "Unique trait or constant accessory",
  "outfit_top": "Detailed description of upper clothing",
  "outfit_bottom": "Detailed description of lower clothing",
  "helmet_or_hat": "Headwear description or 'None'",
  "shoes_or_footwear": "Footwear description",
  "props": "Fixed accessories ALWAYS carried",
  "body_metrics": "Posture/movement traits",
  "color_spec": {
    "primary_body": { "hex": "#HEX", "natural": "color name", "coverage": "area" },
    "clothing_primary": { "hex": "#HEX", "natural": "color name", "coverage": "area" },
    "clothing_accent": { "hex": "#HEX", "natural": "color name", "coverage": "area" }
  },
  "tts_config": {
    "voice_id": "Suggested appropriate voice ID",
    "base_speaking_rate": 1.0,
    "base_pitch": 0.0,
    "style_category": "Professional/Friendly/etc."
  }
}

5. List of key locations/settings with descriptions
6. Main themes
7. The language of the script

Return your analysis in the following JSON format:
{
  "summary": "Brief summary",
  "genre": "Genre",
  "mood": "Mood",
  "characters": [{...}],
  "locations": [{"name": "Location Name", "description": "Description"}],
  "themes": ["theme1", "theme2"],
  "language": "Detected Language"
}`

  return await generateJSON<ScriptAnalysisResult>(prompt, config.geminiModelTextAnalysis)
}
