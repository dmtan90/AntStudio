/**
 * Service to manage multi-track audio mixing for the Studio.
 * Handles inputs from Microphones, Remote Guests, and Media playback.
 */
export class AudioMixerService {
    private audioCtx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private tracks: Map<string, { gain: GainNode, analyzer: AnalyserNode, source: AudioNode | null }> = new Map();

    constructor() {
        // Deferred initialization to comply with browser autoplay policies
    }

    public init() {
        if (this.audioCtx) return;
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.masterGain = this.audioCtx.createGain();
        this.masterGain.connect(this.audioCtx.destination);
    }

    /**
     * Adds an audio source to the mixer.
     * @param id Unique track ID (e.g. 'mic', 'guest_1', 'bg_music')
     * @param stream MediaStream containing the audio
     */
    public addTrack(id: string, stream: MediaStream) {
        if (!this.audioCtx || !this.masterGain) this.init();
        const ctx = this.audioCtx!;

        const source = ctx.createMediaStreamSource(stream);
        const gain = ctx.createGain();
        const analyzer = ctx.createAnalyser();
        analyzer.fftSize = 256;

        source.connect(gain);
        gain.connect(analyzer);
        analyzer.connect(this.masterGain!);

        this.tracks.set(id, { gain, analyzer, source });
    }

    public setVolume(id: string, volume: number) {
        const track = this.tracks.get(id);
        if (track) {
            track.gain.gain.setTargetAtTime(volume, this.audioCtx!.currentTime, 0.01);
        }
    }

    /**
     * Returns the frequency/volume data for visual peak meters.
     */
    public getTrackLevel(id: string): number {
        const track = this.tracks.get(id);
        if (!track) return 0;

        const data = new Uint8Array(track.analyzer.frequencyBinCount);
        track.analyzer.getByteFrequencyData(data);

        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        return (sum / data.length) / 255;
    }

    public getDestinationStream(): MediaStream | null {
        if (!this.audioCtx) return null;
        const destination = this.audioCtx.createMediaStreamDestination();
        this.masterGain?.connect(destination);
        return destination.stream;
    }
}

export const audioMixerService = new AudioMixerService();
