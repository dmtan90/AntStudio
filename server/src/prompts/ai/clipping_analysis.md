Analyze this video recording.
Identify 1-3 distinct "viral" or highly engaging segments suitable for TikTok/Shorts (15-60 seconds each).
Look for:
- High energy moments
- Funny interactions
- Key insights or "mic drop" moments
- Intense gameplay or action (if applicable)

Return a JSON array ONLY:
[{
    "start": number (seconds from start),
    "duration": number (seconds),
    "title": string (catchy title),
    "description": string (why this is viral),
    "score": number (0-10 predictability of virality)
}]
