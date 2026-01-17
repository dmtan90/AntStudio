import { analyzeScript } from '../../services/scriptAnalyzer'
import { generateStoryboardIteratively } from '../../services/iterativeStoryboard'
import { connectDB } from '../../utils/db'
import { generateWithGemini } from '../../utils/gemini'

export default defineEventHandler(async (event) => {
    await connectDB()

    const user = event.context.user
    if (!user) {
        throw createError({
            statusCode: 401,
            message: 'Authentication required'
        })
    }

    const formData = await readMultipartFormData(event)
    if (!formData) {
        throw createError({ statusCode: 400, message: 'Missing form data' })
    }

    const topic = formData.find(f => f.name === 'topic')?.data.toString()
    const history = formData.find(f => f.name === 'history')?.data.toString() || '[]'
    const aspectRatio = formData.find(f => f.name === 'aspectRatio')?.data.toString()
    const videoStyle = formData.find(f => f.name === 'videoStyle')?.data.toString()
    const targetDuration = parseInt(formData.find(f => f.name === 'targetDuration')?.data.toString() || '60')
    const files = formData.filter(f => f.name === 'files')

    if (!topic) {
        throw createError({
            statusCode: 400,
            message: 'Topic/Prompt content is required'
        })
    }

    // Parse history for context
    let historyContext = ''
    try {
        const parsedHistory = JSON.parse(history)
        if (parsedHistory.length > 0) {
            historyContext = parsedHistory.map((m: any) => `${m.author.toUpperCase()}: ${m.content || (m.result ? 'AI Generated Result' : '')}`).join('\n')
        }
    } catch (e) { }

    // Prepare multimodal context description
    let fileContext = ''
    if (files.length > 0) {
        fileContext = `The user has attached ${files.length} files: ${files.map(f => f.filename).join(', ')}. 
        Use these files as context for character references, script content (if doc), or visual style.`
    }

    // 1. Detect language
    const langPrompt = `Detect the language of the following text. Respond with only the language name in English (e.g. Vietnamese, English, Chinese).\n\nText: ${topic.substring(0, 500)}`
    const detectedLanguage = await generateWithGemini(langPrompt)

    // 2. Perform detailed analysis
    // Refined prompt to match Flova.ai professional structure and language consistency
    const detailedAnalysisPrompt = `You are a professional Creative Director and Strategic Product Marketer. 
    Analyze the current user prompt, conversation history, and files to extract a comprehensive project vision.
    
    CRITICAL RULE: Be DECISIVE. Based on current market trends (2024-2026), automatically infer the best video title, project analysis, brief, characters, background, and storyboard segments. 
    Only ask follow-up questions if the input is extremely ambiguous. If a specific product like "iPhone 18" is mentioned, infer its futuristic features and market positioning automatically.
    
    STRICT RULE: All content in your JSON response (descriptions, summaries, names, titles) MUST be in ${detectedLanguage}.
    
    Conversation History:
    ${historyContext}

    Current User Input:
    ${topic}
    
    ${fileContext}
    
    Analysis Requirements:
    1. Project Status: "isComplete" should be true unless information is critically missing. 
    2. Detailed Analysis:
       - Overview (Thông tin Tổng quan): Genre (Thể loại), Duration (Thời lượng), Setting (Bối cảnh), Themes (Chủ đề chính).
       - Character System (Hệ thống Nhân vật): For each character, extract:
         * char_id (Unique ID like "CHAR_AVA"), name, description (visual-first). MUST use "char_id" as the primary reference in the storyboard description (e.g., "(CHAR_AVA) interacts with the device").
         * species, gender, age, body_build, face_shape, hair, skin_or_fur_color.
         * outfit_top, outfit_bottom, shoes_or_footwear, props.
         * color_spec: { primary_body: { hex, natural, coverage }, clothing_primary: { hex, natural, coverage }, clothing_accent: { hex, natural, coverage } }.
         * tts_config: { voice_id, base_pitch, style_category }.
       - Structure (Cấu trúc Truyện): 3-act narrative arc.
       - Visuals (Yếu tố Hình ảnh): Palette (Màu sắc), Characteristics (Hình ảnh đặc trưng), Camera (Góc quay).
       - Audio (Yếu tố Âm thanh): SoundFX (Tiếng động), Music (Âm nhạc).
    3. Creative Brief:
       - Title (Tên Phim), Video Type, Narrative Driver, Emotional Tone, Visual Style (detailed description), Pacing, Sound Design, Target Audience.
    
    Return in JSON format:
    {
      "isComplete": true/false,
      "followUpQuestions": ["question 1", "question 2"],
      "analysis": {
        "overview": { "genre": "", "duration": "", "setting": "", "themes": "" },
        "characters": [ { 
          "char_id": "", "name": "", "description": "", 
          "species": "", "gender": "", "age": "", "body_build": "", "face_shape": "", "hair": "", "skin_or_fur_color": "",
          "outfit_top": "", "outfit_bottom": "", "shoes_or_footwear": "", "props": "",
          "color_spec": { 
            "primary_body": { "hex": "", "natural": "", "coverage": "" }, 
            "clothing_primary": { "hex": "", "natural": "", "coverage": "" },
            "clothing_accent": { "hex": "", "natural": "", "coverage": "" } 
          },
          "tts_config": { "voice_id": "", "base_pitch": 0, "style_category": "" }
        } ],
        "structure": { "act1": "", "act2": "", "act3": "" },
        "visuals": { "palette": "", "characteristics": "", "camera": "" },
        "audio": { "sfx": "", "music": "" }
      },
      "creativeBrief": {
        "title": "",
        "videoType": "",
        "narrativeDriver": "",
        "tone": "",
        "visualStyle": "",
        "pacing": "",
        "soundDesign": "",
        "targetAudience": ""
      },
      "summary": "Professional narrative summary",
      "closingMessage": "A professional wrap-up message in HTML format (using <p>, <ol>, <li>, <b>) in ${detectedLanguage}. 
      Structure:
      - 1 <p> confirming the storyboard completion for '[Project Title]'.
      - 1 <p> introducing the next steps.
      - 1 <ol> with 3 <li> items, each starting with a <b> Title </b> (e.g., 1. <b>Visual Strategy</b>: ...) describing technical/artistic steps like Visual Strategy, Character Design, Soundscape.
      - A final <p> inviting sentence for the user to review or provide feedback."
    }`

    let finalAnalysis: any = {
        isComplete: true,
        followUpQuestions: [],
        analysis: {
            overview: { genre: 'Unknown', duration: 'Unknown', setting: 'Unknown', themes: 'None' },
            characters: [],
            structure: { act1: '', act2: '', act3: '' },
            visuals: { palette: '', characteristics: '', camera: '' },
            audio: { sfx: '', music: '' }
        },
        creativeBrief: {
            title: 'Untitled Project',
            videoType: 'Unknown',
            narrativeDriver: 'Unknown',
            tone: 'Unknown',
            visualStyle: 'Unknown',
            pacing: 'Unknown',
            soundDesign: 'Unknown',
            targetAudience: 'Unknown'
        },
        summary: 'Analysis pending or failed.',
        closingMessage: ''
    }

    try {
        const detailedAnalysis = await generateJSONWithGemini(detailedAnalysisPrompt, 'gemini-2.0-flash-exp')
        if (detailedAnalysis) {
            finalAnalysis = detailedAnalysis
        }
    } catch (e) {
        console.error('Detailed analysis failed', e)
    }

    // 4. Generate iterative storyboard (Only if analysis is complete)
    let storyboardSegments: any[] = []
    let totalDuration = 0

    if (finalAnalysis.isComplete) {
        const storyboard = await generateStoryboardIteratively(
            topic,
            finalAnalysis.analysis,
            targetDuration || 60,
            detectedLanguage
        )
        storyboardSegments = storyboard.segments
        totalDuration = storyboard.totalDuration
    }

    return {
        success: true,
        data: {
            language: detectedLanguage,
            isComplete: finalAnalysis.isComplete,
            followUpQuestions: finalAnalysis.followUpQuestions || [],
            analysis: finalAnalysis.analysis,
            creativeBrief: finalAnalysis.creativeBrief,
            summary: finalAnalysis.summary,
            closingMessage: finalAnalysis.closingMessage,
            storyboard: storyboardSegments,
            totalDuration: totalDuration
        }
    }
})
