import { Logger } from '../../utils/Logger.js';
import { geminiPool } from '../../utils/gemini.js';


export interface LyricsLine {
    text: string;
    startTime: number; // seconds
    endTime: number;
}

export class LyricsService {
    // Offset in seconds to compensate for YouTube auto-subtitle lag
    // Negative means "show earlier"
    private static readonly LYRICS_LAG_COMPENSATION = -1.2;
    /**
     * Search for lyrics using Gemini AI
     * @param songTitle Title of the song
     * @param artist Artist name (optional)
     * @param youtubeUrl Reference YouTube URL for context (optional)
     */
    static async searchLyrics(songTitle: string, artist?: string, youtubeUrl?: string, preferredLang?: string): Promise<string> {
        try {
            const modelName = "gemini-2.5-pro";
            const { client: ai, key } = await geminiPool.getOptimalClient(modelName);

            // const songInfo = `Title: ${songTitle}, Artist: ${artist}, YouTube URL: ${youtubeUrl}`;
            const prompt = `
            Search the full lyrics for the song: '${youtubeUrl}' by language: '${preferredLang || 'en'}' and format: 'webvtt'.

            Return ONLY the lyrics webvtt format.
            Do not include conversational filler (e.g. "Here are the lyrics").
            Do not include the title or artist header unless it's part of the lyrics structure.
            If the song is instrumental, return '[Instrumental]'.
            If the song is completely unknown and you cannot generate lyrics, return empty string.
            If you can't find the exact lyrics for the song, return empty string.
            `;

            // const prompt =
            // `Task: Access the video content at the following URL: ${youtubeUrl}.
            // Requirements:
            // Extract the lyrics and convert them into a valid WebVTT (.vtt) format with accurate timestamps.
            // Strict Output Control: Your response must contain ONLY the WebVTT code.
            // Do NOT include any introductory text, explanations, or closing remarks (e.g., no "Here is the file," no "I have processed the link" and video link).
            // The output must start with the header WEBVTT at the very first line.
            // Preserve the original language of the lyrics.
            // Start the WebVTT output immediately:`

            Logger.info(`[LyricsService] Prompt: ${prompt}`);

            const result = await (ai as any).models.generateContent({
                model: modelName,
                contents: [{
                    role: "user",
                    parts: [
                        { text: prompt }
                    ]
                }],
                tools: [
                    {
                        googleSearchRetrieval: {}
                    }
                ],
                generationConfig: {
                    // Temperature = 0 giúp kết quả ổn định và chính xác về kỹ thuật
                    temperature: 0,
                    topP: 1,
                    // Ép trả về text thuần, không bọc trong code block ```
                    responseMimeType: "text/plain",
                }
            });

            const response = result.response || result;
            let text = '';
            if (typeof response.text === 'function') {
                text = response.text().trim();
            } else if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
                text = response.candidates[0].content.parts[0].text.trim();
            }

            Logger.info(`[LyricsService] Response: ${text}`);

            // Cleanup any markdown code blocks if the AI ignored the "ONLY WebVTT" rule
            if (text.includes('```')) {
                text = text.replace(/```[a-z]*\n?/g, '').replace(/```/g, '').trim();
            }

            Logger.info(`[LyricsService] Response (length: ${text.length})`);

            // Record usage
            await geminiPool.recordUsage(key, modelName);

            return text;
        } catch (error: any) {
            Logger.error('Lyrics generation error:', error);
            // Return empty string instead of throwing to allow graceful degradation
            return '';
        }
    }

    /**
     * Sync lyrics with audio timing (basic implementation)
     * For better results, use LRC files or manual timing
     */
    static async syncLyrics(lyrics: string, audioDuration: number): Promise<LyricsLine[]> {
        if (!lyrics) return [];

        // If it looks like a VTT file, use the VTT parser for high precision
        if (lyrics.trim().startsWith('WEBVTT')) {
            Logger.info('[LyricsService] Detected VTT format, using precise parser');
            return this.parseVTT(lyrics);
        }

        // If it looks like LRC, use LRC parser
        if (lyrics.trim().startsWith('[00:')) {
            Logger.info('[LyricsService] Detected LRC format, using LRC parser');
            return this.parseLRC(lyrics);
        }

        const lines = lyrics.split('\n').filter(line => line.trim());
        const timePerLine = audioDuration / lines.length;

        Logger.info(`[LyricsService] Basic sync: ${lines.length} lines for ${audioDuration}s`);

        return lines.map((text, index) => ({
            text: text.trim(),
            startTime: index * timePerLine,
            endTime: (index + 1) * timePerLine
        }));
    }

    /**
     * Parse WebVTT format lyrics
     * Format: 
     * 00:00:12.000 --> 00:00:15.000
     * Lyrics line
     */
    static parseVTT(content: string): LyricsLine[] {
        const lines: LyricsLine[] = [];
        // Regex to match VTT timestamp blocks and following text
        // Note: Global matches with groups can be tricky, we'll split or use a loop
        const blocks = content.split('\n\n');

        for (const block of blocks) {
            const linesInBlock = block.split('\n');
            const timeMatch = linesInBlock.find(l => l.includes('-->'))?.match(/(\d{2}:)?(\d{2}):(\d{2})\.(\d{3}) --> (\d{2}:)?(\d{2}):(\d{2})\.(\d{3})/);
            
            if (timeMatch) {
                // Parse Start Time
                const startHours = parseInt(timeMatch[1]?.replace(':', '') || '0');
                const startMins = parseInt(timeMatch[2]);
                const startSecs = parseInt(timeMatch[3]);
                const startMillis = parseInt(timeMatch[4]);
                const startTime = startHours * 3600 + startMins * 60 + startSecs + startMillis / 1000;

                // Parse End Time
                const endHours = parseInt(timeMatch[5]?.replace(':', '') || '0');
                const endMins = parseInt(timeMatch[6]);
                const endSecs = parseInt(timeMatch[7]);
                const endMillis = parseInt(timeMatch[8]);
                const endTime = endHours * 3600 + endMins * 60 + endSecs + endMillis / 1000;

                // Extract text from the lines following the timestamp
                const textLines = linesInBlock.filter(l => 
                    !l.startsWith('WEBVTT') && 
                    !l.includes('-->') && 
                    !l.startsWith('NOTE') &&
                    l.trim() !== ''
                );
                
                let text = textLines.join(' ')
                    .replace(/<[^>]+>/g, '') // remove tags
                    .trim();

                if (text) {
                    // Apply lag compensation
                    const adjustedStart = Math.max(0, startTime + LyricsService.LYRICS_LAG_COMPENSATION);
                    const adjustedEnd = Math.max(0, endTime + LyricsService.LYRICS_LAG_COMPENSATION);
                    
                    lines.push({ 
                        text, 
                        startTime: adjustedStart, 
                        endTime: adjustedEnd 
                    });
                }
            }
        }

        return lines;
    }

    /**
     * Parse LRC format lyrics (if available)
     * Format: [00:12.00]Lyrics line
     */
    static parseLRC(lrcContent: string): LyricsLine[] {
        const lines: LyricsLine[] = [];
        const lrcLines = lrcContent.split('\n');

        for (let i = 0; i < lrcLines.length; i++) {
            const match = lrcLines[i].match(/\[(\d{2}):(\d{2})\.(\d{2})\](.*)/);
            if (match) {
                const minutes = parseInt(match[1]);
                const seconds = parseInt(match[2]);
                const centiseconds = parseInt(match[3]);
                const text = match[4].trim();

                const startTime = minutes * 60 + seconds + centiseconds / 100;
                
                // End time is start of next line (or +3 seconds if last line)
                const nextMatch = lrcLines[i + 1]?.match(/\[(\d{2}):(\d{2})\.(\d{2})\]/);
                let endTime = startTime + 3;
                if (nextMatch) {
                    const nextMinutes = parseInt(nextMatch[1]);
                    const nextSeconds = parseInt(nextMatch[2]);
                    const nextCentiseconds = parseInt(nextMatch[3]);
                    endTime = nextMinutes * 60 + nextSeconds + nextCentiseconds / 100;
                }

                // Apply lag compensation
                const adjustedStart = Math.max(0, startTime + LyricsService.LYRICS_LAG_COMPENSATION);
                const adjustedEnd = Math.max(0, endTime + LyricsService.LYRICS_LAG_COMPENSATION);

                lines.push({ 
                    text, 
                    startTime: adjustedStart, 
                    endTime: adjustedEnd 
                });
            }
        }

        return lines;
    }
}
