import { Router } from 'express';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth.js';
import { generateText } from '../utils/AIGenerator.js';
import axios from 'axios';
import * as cheerio from 'cheerio';

const router = Router();

// All routes require authentication and admin role
router.use(authMiddleware, adminMiddleware);

/**
 * POST /api/ai-config/generate-template
 * Generate API task config from documentation URL using AI
 */
router.post('/generate-template', async (req: AuthRequest, res) => {
    try {
        const { docUrl, taskType } = req.body;

        if (!docUrl || !taskType) {
            return res.status(400).json({
                success: false,
                error: 'docUrl and taskType are required'
            });
        }

        // Fetch the documentation page
        console.log(`[AI Config] Fetching documentation from: ${docUrl}`);
        // const response = await axios.get(docUrl, {
        //     headers: {
        //         'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        //     },
        //     timeout: 10000
        // });

        // // Extract text content from HTML
        // const $ = cheerio.load(response.data);

        // // Remove script and style tags
        // $('script, style, nav, footer, header').remove();

        // // Get main content (try common selectors)
        // let content = $('main').text() || $('article').text() || $('body').text();

        // // Clean up whitespace
        // content = content.replace(/\s+/g, ' ').trim();

        // // Limit content length (Gemini has token limits)
        // if (content.length > 15000) {
        //     content = content.substring(0, 15000) + '...';
        // }

        // console.log(`[AI Config] Extracted ${content.length} characters from documentation`);

        // // Check if we got meaningful content
        // if (content.length < 100) {
        //     return res.status(400).json({
        //         success: false,
        //         error: 'Unable to extract meaningful content from the documentation page.',
        //         hint: 'The page may be a Single Page Application (SPA) that loads content dynamically. Try using a different documentation URL or manually create the template using the pre-defined templates as a reference.'
        //     });
        // }

        // Construct AI prompt
        const prompt = `You are an API integration expert. Analyze the following API documentation and generate a JSON configuration for a ${taskType} task.

API Documentation URL or Content: 
${docUrl}

Generate a JSON object with the following structure:
{
  "endpoint": "full API endpoint URL",
  "method": "POST or GET",
  "headers": {
    "header-name": "header-value (use {{apiKey}} placeholder for API key)"
  },
  "payloadTemplate": "JSON string with placeholders like {{prompt}}, {{model}}, etc.",
  "responseMapping": {
    "text": "JSON path to text result (if applicable)",
    "url": "JSON path to media URL (if applicable)",
    "b64": "JSON path to base64 data (if applicable)",
    "jobId": "JSON path to job/task ID (if applicable)"
  }
}

Important:
- Use placeholders like {{prompt}}, {{model}}, {{apiKey}}, {{voice}}, {{aspectRatio}}, etc.
- For payloadTemplate, provide the actual JSON structure as a string
- For responseMapping, use dot notation or array notation for nested paths (e.g., "data.url" or "choices[0].message.content")
- Only include responseMapping fields that are relevant for this task type
- Return ONLY the JSON object, no additional text or explanation

Task Type: ${taskType}`;

        // Call Gemini AI
        console.log('[AI Config] Calling Gemini AI to generate template...');
        const aiResponse = await generateText(prompt);

        // Parse AI response
        let templateConfig;
        try {
            // Extract JSON from response (in case AI adds extra text)
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                templateConfig = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No JSON found in AI response');
            }
        } catch (parseError) {
            // console.error('[AI Config] Failed to parse AI response:', aiResponse);
            return res.status(500).json({
                success: false,
                error: 'Failed to parse AI-generated template',
                details: aiResponse
            });
        }

        // console.log('[AI Config] Successfully generated template:', templateConfig);

        res.status(201).json({
            success: true,
            data: templateConfig
        });

    } catch (error: any) {
        // console.error('[AI Config] Error generating template:', error);

        let errorMessage = 'Failed to generate template';

        if (error.response?.status === 404) {
            errorMessage = 'Documentation page not found (404). Please check the URL and try again.';
        } else if (error.response?.status === 403) {
            errorMessage = 'Access forbidden (403). The website may be blocking automated requests.';
        } else if (error.code === 'ENOTFOUND') {
            errorMessage = 'Website not found. Please check the URL.';
        } else if (error.code === 'ETIMEDOUT') {
            errorMessage = 'Request timed out. The website may be slow or unreachable.';
        } else if (error.message) {
            errorMessage = error.message;
        }

        res.status(500).json({
            success: false,
            error: errorMessage,
            hint: 'Try using a direct API documentation page URL, not a SPA route. For SPAs, you may need to manually create the template.'
        });
    }
});

export default router;
