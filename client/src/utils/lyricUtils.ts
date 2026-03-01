/**
 * Shared utility for VTuber lip-sync synchronization
 */

export interface LyricLine {
    text: string;
    startTime: number;
    endTime: number;
}

/**
 * Determines if the character should be lip-syncing at the given time
 * based on the provided lyrics.
 * 
 * @param lyrics List of lyric lines with timestamps
 * @param currentTime Current playback time in seconds
 * @param buffer Buffer in seconds to allow for pre-emptive opening/trailing closure (default 0.1s)
 * @returns boolean
 */
export function isSingingAtTime(
    lyrics: LyricLine[] | undefined | null,
    currentTime: number | undefined | null,
    buffer: number = 0.2
): boolean {
    // Default to true if no lyrics are provided (fallback to standard audio reactivity)
    if (!lyrics || lyrics.length === 0 || currentTime === undefined || currentTime === null) {
        return true;
    }

    // Find if current time is within any lyric line (with buffer)
    const activeLine = lyrics.find(line => 
        currentTime >= (line.startTime - buffer) && currentTime <= (line.endTime + buffer)
    );

    if (!activeLine) {
        return false;
    }

    // Check if the current line is actually vocal or just an instrumental marker
    const text = activeLine.text.toLowerCase().trim();
    
    // List of common non-vocal indicators
    const instrumentalMarkers = [
        'music', 
        'instrumental',
        'intro', 
        'outro', 
        'solo',
        'break'
    ];

    const isInstrumental = instrumentalMarkers.some(marker => text.includes(marker)) || 
                          /^[\[\(\{\<].*[\]\)\}\>]$/.test(text);

    return !isInstrumental;
}
