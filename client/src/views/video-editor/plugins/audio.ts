// @ts-ignore
import { fabric } from "fabric";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

import { FabricUtils } from "video-editor/fabric/utils";
import { createInstance } from "video-editor/lib/utils";
import { Canvas } from "video-editor/plugins/canvas";
import type { EditorAudioElement } from "video-editor/types/editor";
import { toast } from "vue-sonner";
import { getFileUrl } from "@/utils/api";

export class CanvasAudio {
  private _canvas: Canvas;
  private context: AudioContext;

  private _gainEndOffset = 0;
  private _gainStartOffset = 2;

  public elements: EditorAudioElement[];

  constructor(canvas: Canvas) {
    this._canvas = canvas;
    this.elements = [];
    this._reverbIR = this._createReverbIR(2.5, 2.0);
    this.context = createInstance(AudioContext);

    this._initEvents();
  }

  private get canvas() {
    return this._canvas.instance!;
  }

  private get selection() {
    return this._canvas.selection;
  }

  private get timeline() {
    return this._canvas.timeline;
  }

  private _timelineStartEvent() {
    this.play();
  }

  private _timelineStopEvent() {
    this.stop();
  }

  private _initEvents() {
    this.canvas.on("timeline:start", this._timelineStartEvent.bind(this));
    this.canvas.on("timeline:stop", this._timelineStopEvent.bind(this));
  }

  play() {
    const startTime = this.context.currentTime;
    const seekTime = this.timeline.seek / 1000;

    for (const audio of this.elements) {
      if (audio.muted) continue;

      // Calculate when to start and what part of the buffer to play
      const clipStartGlobal = audio.offset;
      const clipEndGlobal = audio.offset + audio.timeline;

      // Determine if clip is relevant to current playhead
      if (seekTime >= clipEndGlobal) continue;

      const scheduleStart = startTime + Math.max(0, clipStartGlobal - seekTime);
      const bufferOffset = Math.max(audio.trim, audio.trim + (seekTime - clipStartGlobal));
      const playDuration = audio.timeline - Math.max(0, seekTime - clipStartGlobal);

      const source = this.context.createBufferSource();
      source.buffer = audio.buffer;

      // 1. EQ & Effects (Existing logic)
      const lowFilter = this.context.createBiquadFilter();
      lowFilter.type = 'lowshelf';
      lowFilter.frequency.value = 200;
      lowFilter.gain.value = audio.effects?.eq.low || 0;

      const midFilter = this.context.createBiquadFilter();
      midFilter.type = 'peaking';
      midFilter.frequency.value = 1000;
      midFilter.Q.value = 1;
      midFilter.gain.value = audio.effects?.eq.mid || 0;

      const highFilter = this.context.createBiquadFilter();
      highFilter.type = 'highshelf';
      highFilter.frequency.value = 3000;
      highFilter.gain.value = audio.effects?.eq.high || 0;

      const compressor = this.context.createDynamicsCompressor();
      if (audio.effects?.compressor.enabled || audio.effects?.enhancement?.studio) {
        const threshold = audio.effects?.enhancement?.studio ? -24 : audio.effects.compressor.threshold;
        const ratio = audio.effects?.enhancement?.studio ? 12 : audio.effects.compressor.ratio;

        compressor.threshold.setValueAtTime(threshold, this.context.currentTime);
        compressor.ratio.setValueAtTime(ratio, this.context.currentTime);
        compressor.attack.setValueAtTime(audio.effects?.compressor.enabled ? audio.effects.compressor.attack : 0.003, this.context.currentTime);
        compressor.release.setValueAtTime(audio.effects?.compressor.enabled ? audio.effects.compressor.release : 0.25, this.context.currentTime);
      } else {
        compressor.threshold.setValueAtTime(0, this.context.currentTime);
        compressor.ratio.setValueAtTime(1, this.context.currentTime);
      }

      // 1.5 Studio Enhancement Nodes
      const deRumble = this.context.createBiquadFilter();
      deRumble.type = 'highpass';
      deRumble.frequency.value = 100;

      const clarity = this.context.createBiquadFilter();
      clarity.type = 'peaking';
      clarity.frequency.value = 3000;
      clarity.Q.value = 1;
      clarity.gain.value = audio.effects?.enhancement?.studio ? 6 : 0;

      const analyser = this.context.createAnalyser();
      analyser.fftSize = 256;
      audio.analyser = analyser;

      // 4. Gain (Automation + Fades)
      const gain = this.context.createGain();

      if (audio.automation && audio.automation.length > 0) {
        // --- Automation Keyframes Logic ---
        const sorted = [...audio.automation].sort((a, b) => a.time - b.time);

        // Find initial volume at the point we are starting to play
        let initialVolume = audio.volume;
        const clipSeekTime = Math.max(0, seekTime - clipStartGlobal) * 1000; // in ms

        const pastPoints = sorted.filter(p => p.time <= clipSeekTime);
        if (pastPoints.length > 0) {
          initialVolume = pastPoints[pastPoints.length - 1].value * audio.volume;
        }

        gain.gain.setValueAtTime(initialVolume, startTime);

        sorted.forEach(pt => {
          const ptGlobalTime = audio.offset + (pt.time / 1000);
          const ptContextTime = startTime + (ptGlobalTime - seekTime);

          if (ptContextTime > startTime) {
            if (pt.easing === 'step') {
              gain.gain.setValueAtTime(pt.value * audio.volume, ptContextTime);
            } else {
              gain.gain.linearRampToValueAtTime(pt.value * audio.volume, ptContextTime);
            }
          }
        });
      } else {
        // --- Classic Fades Logic ---
        const fadeInUntilTime = scheduleStart + Math.min(audio.fadeIn || 0, audio.timeline / 2);
        const fadeOutStartTime = scheduleStart + audio.timeline - Math.max(0, seekTime - clipStartGlobal) - (audio.fadeOut || 0);
        const clipEndTime = scheduleStart + playDuration;

        gain.gain.setValueAtTime(0, scheduleStart);
        gain.gain.linearRampToValueAtTime(audio.volume, fadeInUntilTime);
        gain.gain.setValueAtTime(audio.volume, Math.max(scheduleStart, fadeOutStartTime));
        gain.gain.linearRampToValueAtTime(0, clipEndTime);
      }

      const reverb = this.context.createConvolver();
      reverb.buffer = this._reverbIR;

      const reverbGain = this.context.createGain();
      reverbGain.gain.value = audio.effects?.reverb?.mix || 0;

      // 2. Echo (Delay) Node
      const delay = this.context.createDelay(5.0);
      const delayFeedback = this.context.createGain();
      const delayMix = this.context.createGain();

      if (audio.effects?.echo?.enabled) {
        delay.delayTime.value = audio.effects.echo.delayTime || 0.3;
        delayFeedback.gain.value = audio.effects.echo.feedback || 0.4;
        delayMix.gain.value = audio.effects.echo.mix || 0.5;

        delay.connect(delayFeedback);
        delayFeedback.connect(delay); // Feedback loop
      }

      // Connect Chain
      source.connect(deRumble);
      deRumble.connect(clarity);
      clarity.connect(lowFilter);
      lowFilter.connect(midFilter);
      midFilter.connect(highFilter);
      highFilter.connect(compressor);
      compressor.connect(analyser);

      // Reverb is parallel to the dry signal or serial? 
      // Usually "Mix" implies a blend. We'll use parallel routing for the reverb.
      analyser.connect(gain);

      if (audio.effects?.reverb?.enabled) {
        analyser.connect(reverb);
        reverb.connect(reverbGain);
        reverbGain.connect(gain);
      }

      if (audio.effects?.echo?.enabled) {
        analyser.connect(delay);
        delay.connect(delayMix);
        delayMix.connect(gain);
      }

      gain.connect(this.context.destination);

      audio.playing = true;
      audio.source = source;

      source.start(scheduleStart, bufferOffset, playDuration);
      audio.source.addEventListener("ended", () => (audio.playing = false));
    }
  }

  record(audios: EditorAudioElement[], context: OfflineAudioContext) {
    for (const audio of audios) {
      if (audio.muted) continue;

      const source = context.createBufferSource();
      source.buffer = audio.buffer;

      // Replicate the effects chain for recording/exporting
      const lowFilter = context.createBiquadFilter();
      lowFilter.type = 'lowshelf';
      lowFilter.frequency.value = 200;
      lowFilter.gain.value = audio.effects?.eq.low || 0;

      const midFilter = context.createBiquadFilter();
      midFilter.type = 'peaking';
      midFilter.frequency.value = 1000;
      midFilter.gain.value = audio.effects?.eq.mid || 0;

      const highFilter = context.createBiquadFilter();
      highFilter.type = 'highshelf';
      highFilter.frequency.value = 3000;
      highFilter.gain.value = audio.effects?.eq.high || 0;

      const compressor = context.createDynamicsCompressor();
      if (audio.effects?.compressor.enabled || audio.effects?.enhancement?.studio) {
        const threshold = audio.effects?.enhancement?.studio ? -24 : audio.effects.compressor.threshold;
        const ratio = audio.effects?.enhancement?.studio ? 12 : audio.effects.compressor.ratio;

        compressor.threshold.setValueAtTime(threshold, context.currentTime);
        compressor.ratio.setValueAtTime(ratio, context.currentTime);
        compressor.attack.setValueAtTime(audio.effects?.compressor.enabled ? audio.effects.compressor.attack : 0.003, context.currentTime);
        compressor.release.setValueAtTime(audio.effects?.compressor.enabled ? audio.effects.compressor.release : 0.25, context.currentTime);
      }

      const deRumble = context.createBiquadFilter();
      deRumble.type = 'highpass';
      deRumble.frequency.value = 100;

      const clarity = context.createBiquadFilter();
      clarity.type = 'peaking';
      clarity.frequency.value = 3000;
      clarity.Q.value = 1;
      clarity.gain.value = audio.effects?.enhancement?.studio ? 6 : 0;

      const gain = context.createGain();

      if (audio.automation && audio.automation.length > 0) {
        const sorted = [...audio.automation].sort((a, b) => a.time - b.time);

        // Initial volume
        let initialVolume = audio.volume;
        if (sorted[0].time > 0) {
          gain.gain.setValueAtTime(audio.volume, context.currentTime + audio.offset);
        }

        sorted.forEach(pt => {
          const ptContextTime = context.currentTime + audio.offset + (pt.time / 1000);
          if (pt.easing === 'step') {
            gain.gain.setValueAtTime(pt.value * audio.volume, ptContextTime);
          } else {
            gain.gain.linearRampToValueAtTime(pt.value * audio.volume, ptContextTime);
          }
        });
      } else {
        gain.gain.setValueAtTime(0, context.currentTime + audio.offset);
        gain.gain.linearRampToValueAtTime(audio.volume, context.currentTime + audio.offset + Math.min(audio.fadeIn || 0, audio.timeline / 2));
        gain.gain.setValueAtTime(audio.volume, context.currentTime + audio.offset + audio.timeline - (audio.fadeOut || 0));
        gain.gain.linearRampToValueAtTime(0, context.currentTime + audio.offset + audio.timeline);
      }

      const reverb = context.createConvolver();
      reverb.buffer = this._reverbIR;
      const reverbGain = context.createGain();
      reverbGain.gain.value = audio.effects?.reverb?.mix || 0;

      // Echo (Delay) for record
      const delay = context.createDelay(5.0);
      const delayFeedback = context.createGain();
      const delayMix = context.createGain();

      if (audio.effects?.echo?.enabled) {
        delay.delayTime.value = audio.effects.echo.delayTime || 0.3;
        delayFeedback.gain.value = audio.effects.echo.feedback || 0.4;
        delayMix.gain.value = audio.effects.echo.mix || 0.5;

        delay.connect(delayFeedback);
        delayFeedback.connect(delay);
      }

      source.connect(deRumble);
      deRumble.connect(clarity);
      clarity.connect(lowFilter);
      lowFilter.connect(midFilter);
      midFilter.connect(highFilter);
      highFilter.connect(compressor);

      compressor.connect(gain);

      if (audio.effects?.reverb?.enabled) {
        compressor.connect(reverb);
        reverb.connect(reverbGain);
        reverbGain.connect(gain);
      }

      if (audio.effects?.echo?.enabled) {
        compressor.connect(delay);
        delay.connect(delayMix);
        delayMix.connect(gain);
      }

      gain.connect(context.destination);

      audio.source = source;
      source.start(context.currentTime + audio.offset, audio.trim, audio.timeline);
    }
  }

  stop(audios = this.elements) {
    for (const audio of audios) {
      if (!audio.playing) continue;
      audio.playing = false;
      try {
        audio.source.stop();
      } catch (e) {
        // Source might not have started yet if seek was at 0
      }
    }
  }

  get(id: string) {
    // console.log("get", id, this.elements);
    const index = this.elements.findIndex((audio) => audio.id === id);
    if (index === -1) return null;

    const audio = this.elements[index];
    return audio;
  }

  getAudioVisual(id: string): fabric.Object {
    const object = this.canvas.getItemByName(id);
    return object;
  }

  delete(id: string) {
    console.log("delete", id);
    const index = this.elements.findIndex((audio) => audio.id === id);
    if (index === -1) return;

    const audio = this.elements[index];
    this.elements.splice(index, 1);

    //delete audio visual object
    const object = this.getAudioVisual(id);
    if (object) {
      this._canvas.onDeleteObject(object);
    }

    if (this.selection.active?.id === audio.id) this.selection.active = null;
    if (this._canvas.trimmer.active?.object.id === audio.id) this._canvas.trimmer.active = null;
  }

  update(id: string, value: Partial<EditorAudioElement>) {
    const index = this.elements.findIndex((audio) => audio.id === id);
    const audio = this.elements[index];

    const updated = { ...audio, ...value };
    this.elements[index] = updated;

    //update audio visual object
    const object = this.getAudioVisual(id);
    if (object) {
      this._canvas.onChangeAudioProperties(object, value);
    }
    // if (this.selection) this.selection.active = Object.assign({ type: "audio" }, updated) as unknown as fabric.Object;
  }

  async add(url: string, name: string, visual = false, _id?: string) {
    const resolvedUrl = await getFileUrl(url, { cached: true });
    const response: Response = await fetch(resolvedUrl);
    const data: ArrayBuffer = await response.arrayBuffer();
    const buffer: AudioBuffer = await this.context.decodeAudioData(data);

    const id = _id || FabricUtils.elementID("audio");
    const duration = buffer.duration;
    const timeline = Math.min(duration, this.timeline.duration / 1000);

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.context.destination);

    const audio: EditorAudioElement = { id, buffer, url, timeline, name, duration, source, muted: false, playing: false, trim: 0, offset: 0, volume: 1, fadeIn: 0, fadeOut: 0, trimStart: 0, trimEnd: 0, visible: true, visualEnabled: false, visualType: 'bars', visualProps: {}, type: 'audio' };
    this.elements.push(audio);

    //add visual audio object
    if (visual) {
      this.addAudioVisual(audio);
    }

    return audio;
  }

  addAudioVisual(audio: EditorAudioElement) {
    this._canvas.onAddAudioFromElement(audio);
  }

  async initialize(audios: Omit<EditorAudioElement, "buffer" | "source">[]) {
    for (const audio of audios) {
      try {
        const resolvedUrl = await getFileUrl(audio.url, { cached: true });
        const response: Response = await fetch(resolvedUrl);
        const data: ArrayBuffer = await response.arrayBuffer();
        const buffer: AudioBuffer = await this.context.decodeAudioData(data);

        const source = this.context.createBufferSource();
        source.buffer = buffer;
        source.connect(this.context.destination);

        const element: EditorAudioElement = Object.assign({ buffer, source }, audio);
        this.elements.push(element);
      } catch {
        toast.dismiss(audio.id);
        toast.error(`Ran into an error initializing audio - ${audio.name}`, { id: audio.id });
      }
    }
    console.log("initialize", this.elements, this._canvas);
  }

  async extract(videos: fabric.Video[], { ffmpeg, signal }: { ffmpeg: FFmpeg; signal?: AbortSignal }) {
    if (!ffmpeg.loaded) throw createInstance(Error, "FFmpeg is not loaded");
    const result: EditorAudioElement[] = [];

    for (const video of videos) {
      if (!FabricUtils.isVideoElement(video) || !video.hasAudio) continue;
      signal?.throwIfAborted();

      const input = video.name!;
      const output = video.name! + ".wav";

      const file: Uint8Array = await fetchFile(video.getSrc());
      await ffmpeg.writeFile(input, file);
      await ffmpeg.exec(["-i", input, "-q:a", "0", "-map", "a", output], undefined, { signal });

      // @ts-expect-error
      const data: Uint8Array = await ffmpeg.readFile(output);
      const buffer: AudioBuffer = await this.context.decodeAudioData(data.buffer as ArrayBuffer);

      const id = FabricUtils.elementID("audio");
      const duration = buffer.duration;

      const muted = video._muted();
      const volume = video._volume();

      const trim = video.trimStart / 1000;
      const offset = video.meta!.offset / 1000;
      const timeline = video.meta!.duration / 1000 - video.trimStart / 1000 - video.trimEnd / 1000;

      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.connect(this.context.destination);
      result.push({ id, buffer, duration, muted, volume, source, offset, timeline, trim, name: output, playing: false, url: "", fadeIn: 0, fadeOut: 0, trimStart: video.trimStart / 1000, trimEnd: video.trimEnd / 1000, visible: true, visualEnabled: false, visualType: 'bars', visualProps: {}, type: 'audio' });
    }

    return result;
  }

  private _reverbIR: AudioBuffer | null = null;
  private _createReverbIR(duration: number, decay: number) {
    const ctx = new AudioContext();
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * duration;
    const impulse = ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = i / length;
      const envelope = Math.pow(1 - n, decay);
      left[i] = (Math.random() * 2 - 1) * envelope;
      right[i] = (Math.random() * 2 - 1) * envelope;
    }
    return impulse;
  }
}
