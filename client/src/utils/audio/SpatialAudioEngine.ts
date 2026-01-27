/**
 * Engine for 3D spatial audio using Web Audio API.
 * Creates an immersive 360-degree soundscape for guests and effects.
 */
export class SpatialAudioEngine {
    private context: AudioContext;
    private listener: AudioListener;
    private sources: Map<string, { panner: PannerNode, sourceNode: AudioNode }> = new Map();

    constructor() {
        this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.listener = this.context.listener;

        // Default listener position (Center of the virtual crowd)
        if (this.listener.positionX) {
            this.listener.positionX.setTargetAtTime(0, this.context.currentTime, 0.1);
            this.listener.positionY.setTargetAtTime(1.6, this.context.currentTime, 0.1);
            this.listener.positionZ.setTargetAtTime(0, this.context.currentTime, 0.1);
        }
    }

    /**
     * Initializes a spatial source for a specific guest or object.
     */
    public createSpatialSource(id: string, stream: MediaStream) {
        const sourceNode = this.context.createMediaStreamSource(stream);
        const panner = this.context.createPanner();

        panner.panningModel = 'HRTF';
        panner.distanceModel = 'inverse';
        panner.refDistance = 1;
        panner.maxDistance = 10000;
        panner.rolloffFactor = 1;

        sourceNode.connect(panner);
        panner.connect(this.context.destination);

        this.sources.set(id, { panner, sourceNode });
        console.log(`🔊 [SpatialAudio] Source created for guest: ${id}`);
    }

    /**
     * Updates the speaker's position in 3D space.
     * @param x Left/Right (-1 to 1)
     * @param y Up/Down
     * @param z Front/Back
     */
    public updateSourcePosition(id: string, x: number, y: number, z: number) {
        const source = this.sources.get(id);
        if (source && source.panner.positionX) {
            source.panner.positionX.setTargetAtTime(x, this.context.currentTime, 0.1);
            source.panner.positionY.setTargetAtTime(y, this.context.currentTime, 0.1);
            source.panner.positionZ.setTargetAtTime(z, this.context.currentTime, 0.1);
        }
    }

    public resume() {
        if (this.context.state === 'suspended') this.context.resume();
    }
}

export const spatialAudioEngine = new SpatialAudioEngine();
