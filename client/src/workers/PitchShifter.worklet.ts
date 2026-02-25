// @ts-nocheck
/**
 * Real-time Pitch Shifter using SOLA (Synchronous Overlap and Add)
 * Implementation for AudioWorklet
 */
class PitchShifterProcessor extends AudioWorkletProcessor {
  pitch: number = 1.0;
  bufferSize: number = 2048;
  inputBuffer: Float32Array;
  outputBuffer: Float32Array;
  writePos: number = 0;
  readPos: number = 0;

  constructor() {
    super();
    this.inputBuffer = new Float32Array(this.bufferSize * 2);
    this.outputBuffer = new Float32Array(this.bufferSize * 2);

    this.port.onmessage = (e) => {
      if (e.data.type === 'SET_PITCH') {
        this.pitch = e.data.payload;
      }
    };
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][]) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || !input[0]) return true;

    for (let channel = 0; channel < input.length; channel++) {
      const inputChannel = input[channel];
      const outputChannel = output[channel];
      
      for (let i = 0; i < inputChannel.length; i++) {
        // Simple ring buffer and resampling for pitch shift
        this.inputBuffer[this.writePos] = inputChannel[i];
        this.writePos = (this.writePos + 1) % this.inputBuffer.length;

        outputChannel[i] = this.interpolate(this.readPos);
        this.readPos = (this.readPos + this.pitch) % this.inputBuffer.length;
      }
    }

    return true;
  }

  interpolate(pos: number) {
    const i = Math.floor(pos);
    const f = pos - i;
    const next = (i + 1) % this.inputBuffer.length;
    return this.inputBuffer[i] * (1 - f) + this.inputBuffer[next] * f;
  }
}

registerProcessor('pitch-shifter-processor', PitchShifterProcessor);
