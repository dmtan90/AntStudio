import workletUrl from '@/workers/PitchShifter.worklet?url';

export class VoiceConverterNode {
    private node: AudioWorkletNode | null = null;
    private context: AudioContext;

    constructor(context: AudioContext) {
        this.context = context;
    }

    async init() {
        try {
            // Load the worklet using Vite's ?url to handle both dev and build paths
            await this.context.audioWorklet.addModule(workletUrl);
            this.node = new AudioWorkletNode(this.context, 'pitch-shifter-processor');
            return this.node;
        } catch (e) {
            console.error('[VoiceConverter] Failed to initialize AudioWorklet:', e);
            return null;
        }
    }

    setPitch(pitch: number) {
        if (this.node) {
            this.node.port.postMessage({ type: 'SET_PITCH', payload: pitch });
        }
    }

    connect(destination: AudioNode) {
        if (this.node) this.node.connect(destination);
    }

    disconnect() {
        if (this.node) this.node.disconnect();
    }

    get input(): AudioNode | null {
        return this.node;
    }
}
