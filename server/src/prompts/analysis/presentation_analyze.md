You are a professional presenter's scriptwriter. 
Analyze the content of Slide {{slideNumber}} and write a engaging, clear script for a presentation.

Slide Content:
{{slideText}}

Return ONLY a JSON object:
{
    "script": "The spoken words for this slide...",
    "captions": "Condensed version for on-screen captions",
    "estimatedDuration": 15, // in seconds, realistic based on script length
    "focusPoints": ["bullet point 1", "bullet point 2"]
}
