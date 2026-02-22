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
    "IMPORTANT - Content-Type rule": "ALWAYS include Content-Type based on how the API sends data:",
    "  - If docs show '--form' or 'multipart/form-data'": "set Content-Type to 'multipart/form-data'",
    "  - If docs show 'x-www-form-urlencoded' or URL-encoded form": "set Content-Type to 'application/x-www-form-urlencoded'",
    "  - Default (JSON body, -d with braces, etc.)": "set Content-Type to 'application/json'",
    "x-api-key": "{{apiKey}} (or Authorization: Bearer {{apiKey}}, depending on docs)"
  },
  "payloadTemplate": "The request body as a JSON-serialized string. For multipart/form-data or form-urlencoded, still represent the fields as a flat JSON object e.g. '{\"prompt\": \"{{prompt}}\", \"model\": \"{{model}}\"}'. The adapter will convert to FormData or URLEncoded automatically based on Content-Type.",
  "models": ["list of available model IDs for this task (e.g. nano-banana-pro, gpt-4o)"],
  "responseMapping": {
    "text": "JSON path to text result (if applicable, omit otherwise)",
    "url": "JSON path to media URL (if applicable, omit otherwise)",
    "b64": "JSON path to base64 data (if applicable, omit otherwise)",
    "jobId": "JSON path to the async job/task ID (ONLY if the API is async and returns a job ID to poll later)"
  },
  "pollConfig": {
    "NOTE": "ONLY include this field if the API returns a job ID and requires polling. Omit entirely for synchronous APIs.",
    "endpoint": "poll URL with {{jobId}} placeholder e.g. 'https://api.example.com/history/{{jobId}}'",
    "method": "GET or POST",
    "headers": { "x-api-key": "{{apiKey}}" },
    "intervalMs": 3000,
    "timeoutMs": 120000,
    "statusPath": "JSON dot-path to status field e.g. 'status_desc'",
    "successValues": ["values that mean done e.g. 'completed'"],
    "failureValues": ["values that mean failed e.g. 'failed'"],
    "responseMapping": {
      "url": "JSON path to final media URL in poll response",
      "b64": "JSON path to base64 data (if applicable)",
      "text": "JSON path to text (if applicable)"
    }
  }
}

Rules (follow strictly):
1. ALWAYS detect and include Content-Type in headers:
   - curl example uses --form or --multipart → use "multipart/form-data"
   - docs say x-www-form-urlencoded → use "application/x-www-form-urlencoded"
   - default → use "application/json"
2. Use placeholders like {{prompt}}, {{model}}, {{apiKey}}, {{voice}}, {{aspectRatio}}, {{style}}, etc. for variable parts
3. payloadTemplate must be a flat JSON object string (the adapter handles Content-Type conversion)
4. For responseMapping, use dot notation for nested paths (e.g. "data.url", "generate_result")
5. CRITICAL - Sync vs Async detection:
   - If the example response shows the FINAL URL/data fields (e.g. "generate_result", "url", "audio_url") WITH a success status in the SAME response → this is a SYNCHRONOUS API. Use responseMapping.url (or .text/.b64) to extract the result. Do NOT use jobId or pollConfig.
   - ONLY use responseMapping.jobId and pollConfig if the initial response contains ONLY a job identifier with NO final media/text data yet, and the user must poll a separate endpoint to get the result.
   - Having a field named "uuid", "id", or "task_id" alone does NOT mean async — check whether the response also contains the actual result data.
6. Only include relevant responseMapping fields, omit the rest
7. Only include pollConfig if the API is truly async (returns ONLY a job ID, no final data). Remove the "NOTE" key from the output.
8. Return ONLY valid JSON with no extra text, explanations, or comment keys

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
