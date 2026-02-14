import axios from 'axios';
import * as cheerio from 'cheerio';

export interface LyricsLine {
    text: string;
    startTime: number; // seconds
    endTime: number;
}

export class LyricsService {
    private static geniusApiKey: string = process.env.GENIUS_API_KEY || '';

    /**
     * Search for lyrics on Genius
     */
    static async searchLyrics(songTitle: string, artist?: string): Promise<string> {
        try {
            if (!this.geniusApiKey) {
                console.warn('Genius API key not configured, lyrics search disabled');
                return '';
            }

            const query = artist ? `${songTitle} ${artist}` : songTitle;
            
            // Search for song on Genius
            const searchResponse = await axios.get('https://api.genius.com/search', {
                params: { q: query },
                headers: { 'Authorization': `Bearer ${this.geniusApiKey}` }
            });

            const firstHit = searchResponse.data.response.hits[0];
            if (!firstHit) {
                throw new Error('Lyrics not found');
            }

            const songUrl = firstHit.result.url;
            
            // Scrape lyrics from Genius page
            const pageResponse = await axios.get(songUrl);
            const $ = cheerio.load(pageResponse.data);
            
            // Extract lyrics (Genius uses specific div structure)
            let lyrics = '';
            $('[data-lyrics-container="true"]').each((i, elem) => {
                lyrics += $(elem).text() + '\n';
            });

            return lyrics.trim();
        } catch (error: any) {
            console.error('Lyrics fetch error:', error);
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

        const lines = lyrics.split('\n').filter(line => line.trim());
        const timePerLine = audioDuration / lines.length;

        return lines.map((text, index) => ({
            text: text.trim(),
            startTime: index * timePerLine,
            endTime: (index + 1) * timePerLine
        }));
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

                lines.push({ text, startTime, endTime });
            }
        }

        return lines;
    }
}
