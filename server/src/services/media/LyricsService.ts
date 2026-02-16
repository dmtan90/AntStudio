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
    static async searchLyrics(songTitle: string, artist?: string, youtubeUrl?: string): Promise<string> {
        try {
            const modelName = "gemini-2.5-flash";
            const { client: ai, key } = await geminiPool.getOptimalClient(modelName);

            const prompt = `
            Generate the full lyrics for the song '${songTitle}' by '${artist || 'unknown artist'}'.
            Reference URL: ${youtubeUrl || 'N/A'}

            Return ONLY the lyrics text. 
            Do not include conversational filler (e.g. "Here are the lyrics").
            Do not include the title or artist header unless it's part of the lyrics structure.
            If the song is instrumental, return '[Instrumental]'.
            If the song is completely unknown and you cannot generate lyrics, return empty string.
            `;

            const result = await (ai as any).models.generateContent({
                model: modelName,
                contents: [{
                    parts: [
                        { text: prompt }
                    ]
                }]
            });

            const response = result.response || result;
            let text = '';
            if (typeof response.text === 'function') {
                text = response.text().trim();
            } else if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
                text = response.candidates[0].content.parts[0].text.trim();
            }

            // Record usage
            await geminiPool.recordUsage(key, modelName);

            return text;
        } catch (error: any) {
            console.error('Lyrics generation error:', error);
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
            console.log('[LyricsService] Detected VTT format, using precise parser');
            return this.parseVTT(lyrics);
        }

        // If it looks like LRC, use LRC parser
        if (lyrics.trim().startsWith('[00:')) {
            console.log('[LyricsService] Detected LRC format, using LRC parser');
            return this.parseLRC(lyrics);
        }

        const lines = lyrics.split('\n').filter(line => line.trim());
        const timePerLine = audioDuration / lines.length;

        console.log(`[LyricsService] Basic sync: ${lines.length} lines for ${audioDuration}s`);

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
