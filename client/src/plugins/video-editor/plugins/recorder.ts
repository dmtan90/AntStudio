// @ts-ignore
type BlurIntensity = number;
import { markRaw } from "vue";
import anime from "animejs";
import { fabric } from "fabric";
import { FFmpeg } from "@ffmpeg/ffmpeg";

import { FabricUtils } from "video-editor/fabric/utils";
import { createInstance, createPromise, createUint8Array, wait } from "video-editor/lib/utils";
// import { Editor } from "video-editor/plugins/editor";
import { propertiesToInclude } from "video-editor/fabric/constants";
import { convertBlobToFile, dataURLToUInt8Array } from "video-editor/lib/media";
import { fetchExtensionByCodec } from "video-editor/constants/recorder";
import { uploadAssetToS3 } from "video-editor/api/upload";
import { drawCssBackground } from "video-editor/lib/canvas-gradients";
import { CanvasAnimations } from "video-editor/plugins/animations";

import {
  Output,
  Mp4OutputFormat,
  WebMOutputFormat,
  MkvOutputFormat,
  MovOutputFormat,
  BufferTarget,
  CanvasSource,
  AudioBufferSource,
  QUALITY_LOW,
  QUALITY_MEDIUM,
  QUALITY_HIGH,
  QUALITY_VERY_HIGH,
} from "mediabunny";

export type ExportFormat = "mp4" | "webm" | "mov" | "mkv";
export type ExportQuality = "low" | "medium" | "high" | "very_high";

export interface ExportOptions {
  format: ExportFormat;
  quality: ExportQuality;
  fps?: number;
  includeAudio?: boolean;
  onProgress?: (progress: number) => void;
  onCancel?: () => boolean;
}

export interface ExportResult {
  success: boolean;
  buffer?: ArrayBuffer;
  error?: string;
  cancelled?: boolean;
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: "mp4",
  quality: "high",
  includeAudio: true,
};

const qualityMap = {
  low: QUALITY_LOW,
  medium: QUALITY_MEDIUM,
  high: QUALITY_HIGH,
  very_high: QUALITY_VERY_HIGH,
};

export function getExportMimeType(format: "mp4" | "webm"): string {
  return format === "webm" ? "video/webm" : "video/mp4";
}

export function getExportFileExtension(format: "mp4" | "webm" | "mov" | "mkv"): string {
  return `.${format}`;
}

// Custom Target for FileSystem API
class FileSystemTarget {
  private writable: FileSystemWritableFileStream;

  constructor(writable: FileSystemWritableFileStream) {
    this.writable = writable;
  }

  async add(chunk: Uint8Array) {
    await this.writable.write(new Blob([chunk as any]));
  }

  async finalize() { }
}

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  time: number;
  canvasWidth: number;
  canvasHeight: number;
  frame: Uint8Array;
  backgroundColor?: string;
  backgroundType?: "color" | "blur";
  blurIntensity?: BlurIntensity;
  projectCanvasSize?: { width: number; height: number };
}

export class Recorder {
  private editor: any;

  instance!: fabric.StaticCanvas;
  timeline!: anime.AnimeTimelineInstance | null;
  // animations!: CanvasAnimations | null;
  duration: number = 0;

  constructor(editor: any) {
    this.editor = editor;
    // this.animations = createInstance(CanvasAnimations, null);
    // this.timeline = createInstance(CanvasTimeline, null);
  }

  private get canvas() {
    return this.editor.canvas.instance!;
  }

  private get workspace() {
    return this.editor.canvas.workspace;
  }

  private get preview() {
    return this.editor.canvas.timeline;
  }

  private get artboard() {
    return this.editor.canvas.artboard!;
  }

  private get animations() {
    return this.editor.canvas.animations;
  }

  private get contents() {
    let canvas = [], timelines = [], animations = [], duration = 0;
    for(let i = 0; i < this.editor.pages.length; i++){
      let page = this.editor.pages[i];
      canvas.push(page.instance);
      timelines.push(page.timeline);
      animations.push(page.animations);
      duration += page.timeline.duration;
    }

    return {
      canvas: canvas,
      timelines: timelines,
      animations: animations,
      duration: duration,
      scenes: this.editor.pages.length
    };
  }

  private buildExportContent(){
    const contents = this.contents;
    console.log("buildExportContent", contents);
    let jsonObjects = [];
    let startDuration = 0;
    for(let i = 0; i < contents.scenes; i++){
      const canvas = contents.canvas[i];
      const timeline = contents.timelines[i];
      canvas.fire("recorder:start");
      const json = canvas.toDatalessJSON(propertiesToInclude);
      console.log("json", json);
      //meta: {duration: 4835, offset: 165, blocks: Array(1)}
      //anim: {in: {…}, scene: {…}, out: {…}, state: {…}}
      //should update duration and offset of the objects to match new timeline
      let offsetMs = startDuration;
      for(let j = 0; j < json.objects.length; j++){
        const object = json.objects[j];
        const anim = object.anim;
        if (anim && anim.in && anim.in.offset != undefined) {
          anim.in.offset = anim.in.offset + offsetMs
        }
        if (anim && anim.out && anim.out.offset != undefined) {
          anim.out.offset = anim.out.offset + offsetMs
        }
        if (anim && anim.scene && anim.scene.offset != undefined) {
          anim.scene.offset = anim.scene.offset + offsetMs
        }
        if (anim && anim.state && anim.state.offset != undefined) {
          anim.state.offset = anim.state.offset + offsetMs
        }

        const meta = object.meta;
        // meta.duration = meta.duration + offsetMs;
        meta.offset = meta.offset + offsetMs;

        jsonObjects.push(object);
      }

      // console.log(json);
      canvas.fire("recorder:stop");
      // jsonArray.push(json);
      startDuration += timeline.duration;
    }
    const fabricVersion = fabric.version;
    return {
      json: {objects: jsonObjects, version: fabricVersion },
      duration: contents.duration
    }
  }

  private async _toggleElement(object: fabric.Object, ms: number) {
    const hidden = object.meta!.offset > ms || object.meta!.offset + object.meta!.duration < ms;
    object.visible = FabricUtils.isTextboxElement(object) ? false : !hidden;
    if (object.clipPath) object.clipPath.visible = object.visible;
    if (FabricUtils.isVideoElement(object) && !object.meta!.placeholder && !hidden) {
      await object.seek((ms - object.meta!.offset) / 1000);
    }
  }

  private async _toggleElements(ms: number) {
    for (const object of this.instance._objects) {
      if (!object.excludeFromTimeline || FabricUtils.isAnimatedTextElement(object)) {
        this._toggleElement(object, ms);
      }
    }
    this.instance.requestRenderAll();
  }

  initialize(canvas: HTMLCanvasElement | OffscreenCanvas) {
    // const offscreen = canvas.transferControlToOffscreen();
    this.instance = markRaw(createInstance(fabric.StaticCanvas, canvas, { renderOnAddRemove: false }));
  }

  async compile(frames: Uint8Array[], { ffmpeg, fps = 60, codec = "H.264", audio, signal, progress }: { ffmpeg: FFmpeg; fps?: number; codec?: string; signal?: AbortSignal; audio?: Blob, progress?: (value: { progress: number }) => void; }) {
    if (!ffmpeg.loaded) throw createInstance(Error, "Ffmpeg is not loaded");

    let cleanup = 0;
    const { command, extension, mimetype } = fetchExtensionByCodec(codec);

    const music = "output_audio.wav";
    const pattern = "output_frame_%d.png";

    const temporary = "output_temporary." + extension;
    const output = audio ? "output_with_audio." + extension : "output_without_audio." + extension;

    try {
      for (let frame = 0; frame < frames.length; frame++) {
        signal?.throwIfAborted();
        const name = pattern.replace("%d", String(frame));
        await ffmpeg.writeFile(name, frames[frame], { signal });
        cleanup = frame;
        const videoProgress = audio
          ? 0.05 + (frame / frames.length) * 0.95
          : frame / frames.length;
        progress?.({ progress: videoProgress });
      }

      if (audio) {
        const buffer: ArrayBuffer = await audio.arrayBuffer();
        await ffmpeg.writeFile(music, createUint8Array(buffer), { signal });
        await ffmpeg.exec(["-framerate", fps + "", "-i", pattern, "-i", music, "-c:v", command, "-preset", "ultrafast", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", output], undefined, { signal });
        // @ts-expect-error
        const data: Uint8Array = await ffmpeg.readFile(output, undefined, { signal });
        return createInstance(Blob, [data.buffer], { type: mimetype });
      }

      await ffmpeg.exec(["-framerate", fps + "", "-i", pattern, "-c:v", command, "-preset", "ultrafast", "-pix_fmt", "yuv420p", output], undefined, { signal });
      // @ts-expect-error
      const data: Uint8Array = await ffmpeg.readFile(output, undefined, { signal });
      return createInstance(Blob, [data.buffer], { type: mimetype });
    } finally {
      try {
        for (let frame = 0; frame <= cleanup; frame++) {
          const name = pattern.replace("%d", String(frame));
          await ffmpeg.deleteFile(name);
        }
        await ffmpeg.deleteFile(output);
        if (audio) {
          await ffmpeg.deleteFile(music);
          await ffmpeg.deleteFile(temporary);
        }
      } catch (err) {
        console.warn("FFMPEG - Failed to perform cleanup", err);
      }
    }
  }

  async renderVideoFrame({
    ctx,
    time,
    canvasWidth,
    canvasHeight,
    frame,
    backgroundColor,
    backgroundType,
    blurIntensity,
    projectCanvasSize,
  }: RenderContext): Promise<void> {
    // Background
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    if (
      backgroundColor &&
      backgroundColor !== "transparent" &&
      !backgroundColor.includes("gradient")
    ) {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    // If backgroundColor is a CSS gradient string, draw it
    if (backgroundColor && backgroundColor.includes("gradient")) {
      drawCssBackground(ctx, canvasWidth, canvasHeight, backgroundColor);
    }

    const scaleX = projectCanvasSize ? canvasWidth / projectCanvasSize.width : 1;
    const scaleY = projectCanvasSize
      ? canvasHeight / projectCanvasSize.height
      : 1;

    //convert frame to image
    const img = new Image();
    const blob = new Blob([frame as any], { type: 'image/png' }); // Adjust type if needed
    const imageUrl = URL.createObjectURL(blob);
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = imageUrl;
    });
    URL.revokeObjectURL(imageUrl); // Clean up the object URL

    // If background is set to blur, draw the frame as a blurred cover layer first
    if (backgroundType === "blur") {
      const blurPx = Math.max(0, blurIntensity ?? 8);
      const mediaW = Math.max(
        1,
        img.naturalWidth || canvasWidth
      );
      const mediaH = Math.max(
        1,
        img.naturalHeight || canvasHeight
      );
      const coverScale = Math.max(
        canvasWidth / mediaW,
        canvasHeight / mediaH
      );
      const drawW = mediaW * coverScale;
      const drawH = mediaH * coverScale;
      const drawX = (canvasWidth - drawW) / 2;
      const drawY = (canvasHeight - drawH) / 2;
      ctx.save();
      ctx.filter = `blur(${blurPx}px)`;
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();
    }

    const mediaW = Math.max(
      1,
      img.naturalWidth || canvasWidth
    );
    const mediaH = Math.max(
      1,
      img.naturalHeight || canvasHeight
    );
    const containScale = Math.min(
      canvasWidth / mediaW,
      canvasHeight / mediaH
    );
    const drawW = mediaW * containScale;
    const drawH = mediaH * containScale;
    const drawX = (canvasWidth - drawW) / 2;
    const drawY = (canvasHeight - drawH) / 2;
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  }

  async createAudioBuffer(blob) {
    // Get Web Audio context
    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    try {
      // Decode audio file
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(
        arrayBuffer.slice(0)
      );

      return audioBuffer;
    } catch (error) {
      console.warn(`Failed to decode audio buffer:`, error);
    }
    return null;
  }

  // Custom Target for FileSystem API

  async mediaBunnyCompile(frames: Uint8Array[], { width = 1920, height = 1080, scale = 1, fps = 30, format = "mp4", duration = 0, audio, signal, progress, fileHandle }: { width?: number, height?: number, scale?: number; fps?: number; format?: string, duration?: number, signal?: AbortSignal; progress?: (value: { progress: number }) => void; audio?: Blob; fileHandle?: FileSystemFileHandle }) {
    // if (!ffmpeg.loaded) throw createInstance(Error, "Ffmpeg is not loaded");
    console.log("mediaBunnyCompile", width, height, scale, fps, format, duration, audio);

    let mimetype = "video/mp4";
    if (format == "mp4") mimetype = "video/mp4";
    else if (format == "webm") mimetype = "video/webm";

    try {
      if (duration === 0) throw new Error("Project is empty");

      const exportFps = fps;
      const canvasSize = { width, height };
      const quality = "medium";
      const backgroundType = "none";
      // const blurIntensity = 5;
      const backgroundColor = "#000000";

      const outputFormat = format === "webm" ? new WebMOutputFormat() : new Mp4OutputFormat();

      let target;
      let writableStream;

      if (fileHandle) {
        writableStream = await fileHandle.createWritable();
        target = new FileSystemTarget(writableStream);
      } else {
        target = new BufferTarget();
      }

      const output = new Output({
        format: outputFormat,
        target: target,
      });

      // Canvas for rendering
      const canvas = new OffscreenCanvas(canvasSize.width * scale, canvasSize.height * scale);
      const ctx = canvas.getContext("2d");

      if (!ctx) throw new Error("Failed to create canvas context");

      try {
        const videoSource = new CanvasSource(canvas, {
          codec: format === "webm" ? "vp9" : "avc",
          bitrate: qualityMap[quality],
        });

        output.addVideoTrack(videoSource, { frameRate: exportFps });

        // Add audio track if requested
        let audioSource: AudioBufferSource | null = null;
        let audioBuffer: AudioBuffer | null = null;

        if (audio) {
          progress?.({ progress: 0.05 });
          audioBuffer = await this.createAudioBuffer(audio);
          if (audioBuffer) {
            audioSource = new AudioBufferSource({
              codec: format === "webm" ? "opus" : "aac",
              bitrate: qualityMap[quality],
            });
            output.addAudioTrack(audioSource);
          }
        }

        // Start the output
        await output.start();

        // Now add audio data after starting
        if (audioSource && audioBuffer) {
          await audioSource.add(audioBuffer);
          audioSource.close();
        }

        const totalFrames = frames.length;

        // Render each frame
        for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
          signal?.throwIfAborted();

          const time = frameIndex / exportFps;
          await this.renderVideoFrame({
            ctx: ctx as any,
            time,
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
            frame: frames[frameIndex],
            backgroundType: backgroundType as any,
            blurIntensity: 5,
            backgroundColor: backgroundColor,
            projectCanvasSize: canvasSize,
          });

          const frameDuration = 1 / exportFps;
          await videoSource.add(time, frameDuration);

          const videoProgress = audio
            ? 0.05 + (frameIndex / totalFrames) * 0.95
            : frameIndex / totalFrames;
          progress?.({ progress: videoProgress });
        }

        videoSource.close();
        await output.finalize();

        if (writableStream) {
          await writableStream.close();
          return null; // File saved directly
        }

        return createInstance(Blob, [(output.target as any).buffer], { type: mimetype });
      } catch (error) {
        console.error("Mediabunny export error", error);
        // await output.cancel(); 
        if (writableStream) await writableStream.close();
        throw error;
      }
    } finally {
      // cleanup
    }
  }

  async capture(fps: number, { progress, signal }: { progress?: (value: { progress: number; frame: string }) => void; signal?: AbortSignal }) {
    const interval = 1000 / fps;
    const frames: Uint8Array[] = [];
    const duration = this.duration;//this.preview.duration
    const count = duration / interval;

    for (let frame = 0; frame < count; frame++) {
      const seek = frame === count - 1 ? duration : (frame / count) * duration;
      this.timeline!.seek(seek);
      await Promise.all([this._toggleElements(seek), wait(0.1)]);

      const base64 = this.instance.toDataURL({ format: "image/png" });
      const buffer = dataURLToUInt8Array(base64);
      frames.push(buffer);

      progress?.({ progress: (frame + 1) / count, frame: base64 });
      signal?.throwIfAborted();
    }

    return frames;
  }

  async capturePage(pageIndex: number, fps: number, { progress, signal }: { progress?: (value: { progress: number; frame: string }) => void; signal?: AbortSignal } = {}) {
    const page = this.editor.pages[pageIndex];
    if (!page) throw new Error("Page not found");

    const interval = 1000 / fps;
    const frames: Uint8Array[] = [];
    const duration = page.timeline.duration;
    const count = Math.ceil(duration / interval);

    // Prepare recorder for this page
    this.instance.setDimensions({ height: this.workspace.height, width: this.workspace.width });
    this.instance.clear();
    const data = await this.editor.exportPageTemplate(pageIndex);
    await createPromise<void>((resolve) => this.instance.loadFromJSON(data.data.scene, resolve));

    const artboard: fabric.Object = await createPromise<fabric.Object>((resolve) => this.artboard.clone((clone: fabric.Object) => resolve(clone), propertiesToInclude));
    this.instance.insertAt(artboard, 0, false);
    this.instance.clipPath = artboard;
    FabricUtils.applyTransformationsAfterLoad(this.instance);
    this.instance.renderAll();

    // Re-initialize animations for this specific duration
    const timeline = anime.timeline({ duration: duration, loop: false, autoplay: false, update: this.instance.renderAll.bind(this.instance) });
    this.animations.initialize(this.instance, timeline, duration);

    for (let frame = 0; frame < count; frame++) {
      const seek = frame === count - 1 ? duration : (frame / count) * duration;
      timeline.seek(seek);
      await Promise.all([this._toggleElements(seek), wait(0.05)]); // Smaller wait?

      const base64 = this.instance.toDataURL({ format: "image/png" });
      const buffer = dataURLToUInt8Array(base64);
      frames.push(buffer);

      progress?.({ progress: (frame + 1) / count, frame: base64 });
      signal?.throwIfAborted();
    }

    return frames;
  }

  async screenshot(canvas = this.canvas) {
    let ms = (new Date()).getTime();
    this.instance.setDimensions({ height: this.workspace.height, width: this.workspace.width });
    this.instance.clear();

    const json = canvas.toDatalessJSON(propertiesToInclude);
    await createPromise<void>((resolve) => this.instance.loadFromJSON(json, resolve));

    const artboard: fabric.Object = await createPromise<fabric.Object>((resolve) => this.artboard.clone((clone: fabric.Object) => resolve(clone), propertiesToInclude));
    this.instance.insertAt(artboard, 0, false);
    this.instance.clipPath = artboard;
    this.instance.renderAll();

    FabricUtils.applyTransformationsAfterLoad(this.instance);
    this.instance.renderAll();

    const blob: Blob = await createPromise((resolve) => this.instance.getElement().toBlob((blob) => resolve(blob), "image/png"));
    const source: string = await uploadAssetToS3(convertBlobToFile(blob, this.editor.canvas.id + ".png"), "thumbnail")
      .then((response) => response.thumbnail)
      .catch(() => this.instance.toDataURL({ format: "image/png" }));
    this.instance.clear();
    console.log("screenshot cost", (new Date()).getTime() - ms);

    return source;
  }

  async start() {
    console.log("start");
    // this.canvas.fire("recorder:start");
    // this.instance.setDimensions({ height: this.workspace.height, width: this.workspace.width });
    // this.instance.clear();

    // const json = this.canvas.toDatalessJSON(propertiesToInclude);
    // await createPromise<void>((resolve) => this.instance.loadFromJSON(json, resolve));

    // const artboard: fabric.Object = await createPromise<fabric.Object>((resolve) => this.artboard.clone((clone: fabric.Object) => resolve(clone), propertiesToInclude));
    // this.instance.insertAt(artboard, 0, false);
    // this.instance.clipPath = artboard;

    // FabricUtils.applyTransformationsAfterLoad(this.instance);
    // this.instance.renderAll();

    // this.timeline = anime.timeline({ duration: this.preview.duration, loop: false, autoplay: false, update: this.instance.renderAll.bind(this.instance) });
    // this.animations.initialize(this.instance, this.timeline, this.preview.duration);
    console.log("[Recorder] Starting capture...");
    
    // Safety check: In headless mode, if the UI hasn't initialized the recorder yet,
    // we create an autonomous OffscreenCanvas to proceed.
    if (!this.instance) {
      console.log("[Recorder] Headless mode: Creating autonomous OffscreenCanvas for rendering");
      try {
        const width = this.workspace?.width || this.editor.dimension.width || 1920;
        const height = this.workspace?.height || this.editor.dimension.height || 1080;
        const canvas = new OffscreenCanvas(width, height);
        this.initialize(canvas as any);
      } catch (e) {
        console.error("[Recorder] Failed to create OffscreenCanvas:", e);
        // Fallback or rethrow if strictly required
      }
    }

    if (!this.instance) {
      throw new Error("[Recorder] Cannot start: Canvas instance is not initialized.");
    }

    const data = this.buildExportContent();
    
    // Ensure we use the editor dimensions if workspace isn't available
    const width = this.workspace?.width || this.editor.dimension.width || 1920;
    const height = this.workspace?.height || this.editor.dimension.height || 1080;

    this.instance.setDimensions({ height, width });
    this.instance.clear();
    await createPromise<void>((resolve) => this.instance.loadFromJSON(data.json, resolve));
    
    const artboard: fabric.Object = await createPromise<fabric.Object>((resolve) => this.artboard.clone((clone: fabric.Object) => resolve(clone), propertiesToInclude));
    this.instance.insertAt(artboard, 0, false);
    this.instance.clipPath = artboard;

    FabricUtils.applyTransformationsAfterLoad(this.instance);
    this.instance.renderAll();
    this.duration = data.duration;

    this.timeline = anime.timeline({ 
      duration: this.duration, 
      loop: false, 
      autoplay: false, 
      update: this.instance.renderAll.bind(this.instance) 
    }) as any;
    this.animations.initialize(this.instance, this.timeline, this.duration);
  }

  stop() {
    if(this.canvas){
      this.canvas.fire("recorder:stop");
    }

    if(this.timeline){
      anime.remove(this.timeline);
    }

    if(this.instance){
      this.instance.clear();
      this.timeline = null;
    }
  }

  destroy() {
    try {
      this.instance?.dispose();
    } catch (error) {
      console.log(error);
    }

    this.instance = null;
  }
}
