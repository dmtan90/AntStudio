
// Web Worker for audio waveform generation

self.onmessage = (e: MessageEvent) => {
    const { channelData, samples } = e.data;
    if (!channelData || !samples) return;

    const blockSize = Math.floor(channelData.length / samples);
    const waveform = new Float32Array(samples);

    for (let i = 0; i < samples; i++) {
        const start = i * blockSize;
        let max = 0;
        for (let j = 0; j < blockSize; j++) {
            const abs = Math.abs(channelData[start + j]);
            if (abs > max) max = abs;
        }
        waveform[i] = max;
    }

    self.postMessage({ waveform }, [waveform.buffer] as any);
};
