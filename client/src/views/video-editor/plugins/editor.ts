import { markRaw, ref, computed } from "vue"
import { nanoid } from "nanoid";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
import WebFont from "webfontloader";
import { checkForAudioInVideo } from "video-editor/lib/media";
import { cloneDeep } from 'lodash'
import { MP4Clip } from '@webav/av-cliper';

import { Canvas } from "./canvas";
import { Prompt } from "./prompt";
import { Recorder } from "./recorder";
import { fonts } from "video-editor/constants/fonts";
import { fabric } from "fabric";

import { convertBufferToWaveBlob } from "video-editor/lib/media";
import { createInstance } from "video-editor/lib/utils";
import { FabricUtils } from "video-editor/fabric/utils";
import { propertiesToInclude } from "video-editor/fabric/constants";
import { type EditorAudioElement, EditorTemplate, EditorTemplatePage } from "video-editor/types/editor";
import { Adapter } from "./adapter";
import { useEditorStore } from "video-editor/store/editor"
import { cat } from "@huggingface/transformers";
import { useProjectStore } from "@/stores/project";

export type ExportMode = "video" | "both";
export type EditorMode = "creator" | "adapter";
export type EditorStatus = "uninitialized" | "pending" | "complete" | "error";

export interface EditorProgress {
  capture: number;
  compile: number;
  upload: number;
}

export enum ExportProgress {
  None = 0,
  Error = 1,
  Completed = 2,
  CaptureAudio = 3,
  CaptureVideo = 4,
  CompileVideo = 5,
  UploadVideo = 6,
}

export interface Dimension {
  width: number;
  height: number;
}

export class Editor {
  public id: string;
  public name: string;
  public mode: EditorMode;
  public dimension: Dimension;

  public page: number;
  public pages: Canvas[];
  public status: EditorStatus;
  public markers: { id: string, time: number, label?: string }[] = [];

  public sidebarLeft: string | null;
  public sidebarRight: string | null;
  public timelineOpen: boolean = true;
  public timelineMode: 'compact' | 'layered' = 'compact';
  public timelineZoom: number = 1.0;

  public blob?: Blob;
  public frame?: string;

  public file: string;
  public fps: number;
  public codec: string;
  public width: number;
  public height: number;
  public scale: number;
  public format: string;

  public saving: boolean = false;
  public preview: boolean = false;

  public exports: ExportMode;
  public progress: EditorProgress;

  public prompter: Prompt;
  public recorder: Recorder;
  public adapter: Adapter;
  public isHeadless: boolean = false;
  public targetRatio: string | null = null;

  public ffmpeg: FFmpeg;
  public exporting: ExportProgress;
  public controller: AbortController;
  public onModified?: () => void;
  public onSaveRequested?: () => void;
  public onStatusChange?: (status: EditorStatus) => void;
  public onTick?: () => void;
  public onThumbnailUpdated?: () => void;
  private _isRenderingHeadless = false;
  public isRendering = false;

  constructor() {
    this.page = 0;
    this.id = nanoid();

    this.mode = "creator";
    this.name = "Untitled Template";
    this.status = "uninitialized";
    this.dimension = {
      width: 1920,
      height: 1080
    };

    this.pages = [createInstance(Canvas, this)];
    console.log("pages", this.pages);

    this.controller = markRaw(createInstance(AbortController));

    this.adapter = markRaw(createInstance(Adapter));
    this.prompter = markRaw(createInstance(Prompt, this));
    this.recorder = markRaw(createInstance(Recorder, this));

    this.saving = false;
    this.preview = false;

    this.exporting = ExportProgress.None;
    this.ffmpeg = markRaw(createInstance(FFmpeg));
    this.progress = { capture: 0, compile: 0, upload: 0 };

    this.file = "";
    this.fps = 30;
    this.codec = "MP4";
    this.exports = "both";
    this.width = 1920;
    this.height = 1080;
    this.format = "mp4";
    this.scale = 1;

    this.sidebarLeft = null;
    this.sidebarRight = null;
    this.timelineOpen = false;
    this.timelineZoom = 1.0;
  }

  get canvas(): Canvas {
    return this.pages[this.page];
  }

  _progressEvent({ progress, frame }: { progress: number; frame?: string }) {
    switch (this.exporting) {
      case ExportProgress.CaptureVideo:
        this.progress.capture = progress * 100;
        if (frame) this.frame = frame;
        break;
      case ExportProgress.CompileVideo:
        this.progress.compile = progress * 100;
        break;
    }
  }

  async initialize(mode: EditorMode = "creator") {
    console.log("[Editor] initialize", mode, this.status);
    
    if (this.status === "pending") return;
    if (this.status === "complete") {
      if (mode) this.mode = mode;
      if (this.isHeadless) {
        this.autoRenderAndExport();
      }
      return;
    }

    if (mode) this.mode = mode;
    this.status = "pending";
    this.onStatusChange?.("pending");

    try {
      await this.ffmpeg.load({
        coreURL: await toBlobURL("https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js", "text/javascript"),
        wasmURL: await toBlobURL("https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm", "application/wasm"),
      });
      this.ffmpeg.on("progress", this._progressEvent.bind(this));
      
      let fontFamilies: string[] = [];
      fonts.forEach(font => {
        fontFamilies.push(font.family);
      });

      WebFont.load({
        google: { families: fontFamilies },
        active: async () => {
          this.status = "complete";
          
          if (this.targetRatio) {
            console.log(`[Editor] Matching target ratio: ${this.targetRatio}`);
            this.matchTargetRatio(this.targetRatio);
          }

          this.onStatusChange?.("complete");

          if (this.isHeadless) {
            console.log("[Editor] Headless mode: Starting auto-render...");
            await this.autoRenderAndExport();
          }
        },
      });
    } catch (error) {
      console.error("[Editor] Initialization failed:", error);
      this.status = "error";
      this.onStatusChange?.("error");
    }
  }

  async autoRenderAndExport(): Promise<Blob | null> {
    if (this.status === "pending") {
      console.log("[Editor] autoRenderAndExport: Waiting for initialization...");
      await new Promise<void>((resolve) => {
        const check = () => {
          if (this.status === "complete") resolve();
          else if (this.status === "error") resolve();
          else setTimeout(check, 200);
        };
        check();
      });
    }

    if (this._isRenderingHeadless) {
      console.log("[Editor] Render already in progress, skipping.");
      return null;
    }

    this._isRenderingHeadless = true;
    try {
      this.onChangeExportStatus(ExportProgress.None);
      this.width = this.canvas?.artboard.width || 1920;
      this.height = this.canvas?.artboard.height || 1080;
      this.fps = this.canvas?.artboard.fps || 30;
      this.codec = this.canvas?.artboard.codec || "H264";
      this.format = this.canvas?.artboard.format || "mp4";
      const blob = await this.exportVideo(true, false);
      return blob;
    } catch (error) {
      console.error("[Editor] Headless render failed:", error);
      this.onChangeExportStatus(ExportProgress.Error);
    } finally {
      this._isRenderingHeadless = false;
    }
    return null;
  }

  // async exportVideoBatch(): Promise<Blob> {
  //   // This is a simplified batch render for headless mode
  //   // It captures all pages and compiles them
  //   await this.recorder.start();
  //   const frames = await this.recorder.capture(this.fps, {
  //     progress: (p) => {
  //       this._progressEvent({ progress: p.progress, frame: p.frame });
  //     }
  //   });

  //   this.onChangeExportStatus(ExportProgress.CaptureAudio);
  //   const audioBlob = await this.exportAudio();

  //   this.onChangeExportStatus(ExportProgress.CompileVideo);
  //   const videoBlob = await this.recorder.compile(frames, {
  //     ffmpeg: this.ffmpeg,
  //     fps: this.fps,
  //     codec: this.codec,
  //     audio: audioBlob,
  //     progress: (p) => {
  //       this._progressEvent({ progress: p.progress });
  //     }
  //   });

  //   await this.recorder.stop();
  //   return videoBlob;
  // }

  matchTargetRatio(ratioStr: string) {
    const [targetW, targetH] = ratioStr.split(':').map(Number);
    const targetAspect = targetW / targetH;

    // 1. Find the best matching page
    let bestPage = 0;
    let minDiff = Infinity;

    this.pages.forEach((p, idx) => {
      const pageAspect = p.workspace ? p.workspace.width / p.workspace.height : 1;
      const diff = Math.abs(pageAspect - targetAspect);
      if (diff < minDiff) {
        minDiff = diff;
        bestPage = idx;
      }
    });

    console.log(`[Editor] Best match found at page ${bestPage} (diff: ${minDiff})`);
    this.onChangeActivePage(bestPage);

    // 2. Set dimensions for the output
    const outputDims = { width: 1080, height: 1080 }; // Default square base
    if (ratioStr === '9:16') { outputDims.width = 1080; outputDims.height = 1920; }
    else if (ratioStr === '16:9') { outputDims.width = 1920; outputDims.height = 1080; }

    // 3. Apply resize (without scaling elements yet)
    this.resize(outputDims, false);

    // 4. If mismatch is significant, apply Smart Fit (Blurred Background)
    if (minDiff > 0.05) {
      console.log("[Editor] Significant aspect mismatch. Applying Smart Fit...");
      this.applySmartFit(outputDims);
    } else {
      // If exact or close, just auto-scale elements to fit
      this.resize(outputDims, true);
    }
  }

  async applySmartFit(dims: Dimension) {
    const page = this.canvas;
    if (!page.instance) return;

    // 1. Snapshot the current content to use as background
    const snapshotUrl = page.instance.toDataURL({ format: 'png', quality: 0.5 });
    
    // 2. Add blurred background layer
    const bgImg = await new Promise<fabric.Image>((resolve) => {
      fabric.Image.fromURL(snapshotUrl, (img) => {
        const scale = Math.max(dims.width / img.width!, dims.height / img.height!);
        img.set({
          originX: 'center',
          originY: 'center',
          left: dims.width / 2,
          top: dims.height / 2,
          scaleX: scale,
          scaleY: scale,
          selectable: false,
          evented: false,
          name: 'smart-fit-background'
        });
        
        // Apply blur filter
        const blurEffect = new fabric.Image.filters.Blur({ blur: 0.5 });
        img.filters!.push(blurEffect);
        img.applyFilters();
        resolve(img);
      });
    });

    page.instance.insertAt(bgImg, 0, false);

    // 3. Scale and Center the original content (Group all non-bg objects)
    const objects = page.instance.getObjects().filter(o => o !== bgImg && o.name !== 'artboard');
    const group = new fabric.Group(objects);
    const contentScale = Math.min(dims.width / group.width!, dims.height / group.height!) * 0.9;
    
    group.set({
      originX: 'center',
      originY: 'center',
      left: dims.width / 2,
      top: dims.height / 2,
      scaleX: contentScale,
      scaleY: contentScale
    });

    // Ungroup to keep original element structure
    const items = group.getObjects();
    group._restoreObjectsState();
    page.instance.remove(group);
    items.forEach(obj => {
      page.instance.add(obj);
      obj.setCoords();
    });

    page.instance.requestRenderAll();
  }

  getExportDuration() {
    let offsetMs = 0;
    for (let i = 0; i < this.pages.length; i++) {
      const canvas = this.pages[i];
      offsetMs += canvas.duration;
    }
    return offsetMs;
  }

  async exportAudio(): Promise<Blob> {
    if (this.exports === "video") return null;
    this.controller = createInstance(AbortController);
    let combined: EditorAudioElement[] = [];
    let offsetMs = 0;
    for (let i = 0; i < this.pages.length; i++) {
      const canvas = this.pages[i];
      const duration = canvas.duration;

      const audios = canvas.audio.elements.filter((audio) => !audio.muted && !!audio.volume);
      
      let videos = [];
      if (canvas.instance) {
        videos = canvas.instance._objects.filter(FabricUtils.isVideoElement);
      } else if (canvas._jsonState && canvas._jsonState.objects) {
        videos = canvas._jsonState.objects.filter((obj: any) => obj.type === 'video' && obj.hasAudio);
      }

      audios.forEach(audio => {
        if (audio) {
          audio.offset += offsetMs / 1000;
        }
      })

      const tracks: EditorAudioElement[] = await canvas.audio.extract(videos as any, { ffmpeg: this.ffmpeg, signal: this.controller.signal });
      tracks.forEach(track => {
        if (track) {
          track.offset += offsetMs / 1000;
        }
      });

      if (audios.length > 0 || tracks.length > 0) {
        combined = combined.concat(audios, tracks);
      }
      offsetMs += duration;
    }

    // console.log("exportAudio", combined);
    if (!combined.length) return null;

    const sampleRate = combined[0].buffer.sampleRate;
    // const duration = combined.reduce((duration, audio) => (audio.timeline + audio.offset > duration ? audio.timeline + audio.offset : duration), 0);
    // const length = Math.min(duration, offsetMs / 1000) * sampleRate;
    const length = (offsetMs / 1000) * sampleRate;
    // console.log("exportAudio", combined, offsetMs, sampleRate, length);

    const context = createInstance(OfflineAudioContext, 2, length, sampleRate);
    this.canvas.audio.record(combined, context);
    const handler = () => this.canvas.audio.stop(combined);
    this.controller.signal.addEventListener("abort", handler);

    const buffer: AudioBuffer = await context.startRendering();
    this.controller.signal.throwIfAborted();
    this.controller.signal.removeEventListener("abort", handler);
    const blob = convertBufferToWaveBlob(buffer, buffer.length);
    console.log("exportAudio", blob);
    return blob;
  }

  async exportVideo(headless: boolean = false, upload: boolean = true): Promise<Blob> {
    this.isRendering = true;
    this.isHeadless = headless;
    this.blob = undefined;
    this.frame = undefined;
    this.onResetProgress();
    // const editor = useEditorStore();
    // console.log(editor.dimension);

    try {
      // const canvas = new OffscreenCanvas(this.width, this.height);
      // this.recorder.initialize(canvas);
      this.onChangeExportStatus(ExportProgress.CaptureAudio);
      const audio: Blob = await this.exportAudio();
      this.controller = createInstance(AbortController);
      await this.recorder.start();
      this.onChangeExportStatus(ExportProgress.CaptureVideo);
      const frames: Uint8Array[] = await this.recorder.capture(+this.fps, { signal: this.controller.signal, progress: this._progressEvent.bind(this) });
      this.recorder.stop();
      this.onChangeExportStatus(ExportProgress.CompileVideo);
      let nowMs = (new Date()).getTime();
      let blob: Blob = await this.recorder.mediaBunnyCompile(frames, { width: this.width, height: this.height, scale: this.scale, fps: this.fps, format: this.format, duration: this.getExportDuration(), signal: this.controller.signal, progress: this._progressEvent.bind(this), audio });
      console.log("Media Bunny cost:", (new Date()).getTime() - nowMs);
      // nowMs = (new Date()).getTime();
      // blob: Blob = await this.recorder.compile(frames, { ffmpeg: this.ffmpeg, codec: this.codec, fps: this.fps, signal: this.controller.signal, audio, progress: this._progressEvent.bind(this) });
      // console.log("FFMPEG cost:", (new Date()).getTime() - nowMs);
      this.blob = blob;

      //upload video to S3
      try{
        if(this.id && upload){
          const projectStore = useProjectStore();
          // Use FormData for direct multipart upload
          const formData = new FormData();
          formData.append('video', blob, `${this.name || 'Untitled'}.${this.format}`);
          // Upload directly to project endpoint via store
          await projectStore.publishProject(this.id, formData, (percent) => {
              this.progress.upload = percent;
              // toast.info(`Uploading: ${percent}%`);
          });
          toast.success('Video exported and saved successfully!');

          // Refresh project data
          await projectStore.fetchProject(this.id);
        }
      }catch(err){
        console.log("Upload error", err);
        toast.error("Failed to upload video");
      }
      
      this.onChangeExportStatus(ExportProgress.Completed);
      
      return blob;
    } catch (error) {
      this.onChangeExportStatus(ExportProgress.Error);
      this.recorder.stop();
      throw error;
    } finally {
      this.recorder.stop();
      this.isRendering = false;
    }
  }

  async exportProjectToStream(fileHandle: FileSystemFileHandle, progress?: (p: number, status: string) => void): Promise<void> {
    const totalDuration = this.pages.reduce((acc, p) => acc + p.timeline.duration, 0) / 1000;

    // Create Frame Generator
    async function* frameGenerator(pages: Canvas[], recorder: Recorder, fps: number) {
      for (let i = 0; i < pages.length; i++) {
        // Capture page frames
        // Note: We need a way to capture frames lazily or largely in chunks
        // recorder.capturePage returns ALL frames for the page.
        // For extremely long scenes, we might need to chunk this too. 
        // But for now, chunking by Scene is a huge improvement over chunking by Project.
        const frames = await recorder.capturePage(i, fps, {
          progress: (p) => {
            // Pass through progress if needed (handled in outer loop somewhat)
          }
        });

        for (const frame of frames) {
          yield frame;
        }
      }
    }

    try {
      if (progress) progress(0, "Starting Export Stream...");

      // Combine Audio?
      // Simple approach: Extract audio from all pages first (might be large, but audio is smaller than video)
      const audioBlob = await this.exportAudio(); // Re-use existing method

      await this.recorder.mediaBunnyCompile(frameGenerator(this.pages, this.recorder, this.fps) as any, {
        width: this.width,
        height: this.height,
        scale: this.scale,
        fps: this.fps,
        format: this.format as any,
        duration: totalDuration,
        audio: audioBlob,
        fileHandle: fileHandle,
        progress: (p) => {
          if (progress) progress(p.progress, `Exporting: ${Math.round(p.progress * 100)}%`);
        }
      });

      if (progress) progress(1, "Export Complete!");
    } catch (e) {
      console.error("Export Stream Failed", e);
      throw e;
    }
  }

  async getAssemblyProject(progress?: (p: number, status: string) => void): Promise<any> {
    const segments = [];

    for (let i = 0; i < this.pages.length; i++) {
      const page = this.pages[i];

      if (progress) progress((i / this.pages.length), `Rendering Scene ${i + 1}/${this.pages.length}...`);

      // 1. Capture Frames
      const frames = await this.recorder.capturePage(i, this.fps, {
        progress: (p) => {
          if (progress) {
            const totalP = (i / this.pages.length) + (p.progress * (1 / this.pages.length));
            progress(totalP, `Capturing Scene ${i + 1}: ${Math.round(p.progress * 100)}%`);
          }
        }
      });

      // 2. Compile Scene to Video Blob (Silent for now, joining later via worker)
      // We use mediaBunnyCompile just to get a valid video container for the worker
      const blob = await this.recorder.mediaBunnyCompile(frames, {
        width: this.width,
        height: this.height,
        scale: this.scale,
        fps: this.fps,
        format: this.format as any,
        duration: page.timeline.duration / 1000
      });

      // 3. Audio Extraction for this page
      // (Wait, we might want to just pass the raw audio elements or a merged page audio)
      // For simplicity, let's extract the page audio
      const audioBlob = await page.audio.extract([], { ffmpeg: this.ffmpeg }); // Simplistic, ignoring video audios for a moment
      // Actually, let's just use the existing exportAudio logic or similar if needed.
      // But the worker can mix audio too.

      segments.push({
        id: page.id,
        name: page.name,
        duration: page.timeline.duration / 1000,
        transition: page.transition,
        transitionDuration: page.transitionDuration,
        blob: blob,
        audioBlob: audioBlob,
        type: 'video'
      });
    }

    if (progress) progress(1, "Ready for assembly!");

    return {
      _id: this.id,
      name: this.name,
      storyboard: {
        segments: segments
      }
    };
  }

  async exportTemplate(sanitize: boolean = true): Promise<EditorTemplatePage[]> {
    // console.log("exportTemplate");
    const templates: EditorTemplatePage[] = [];
    for (let i = 0; i < this.pages.length; i++) {
      const t = await this.exportPageTemplate(i, sanitize);
      if (t) templates.push(t);
    }
    return templates;
  }

  async exportPageTemplate(index: number, sanitize: boolean = true): Promise<EditorTemplatePage> {
    // console.log("exportTemplate");
    let template: EditorTemplatePage = null;
    const page = this.pages[index];
    if (page) {
      let sceneJSON: any;
      let thumbnail: string;

      if (page.instance) {
        // MOUNTED: Capture from live canvas
        thumbnail = await this.recorder.screenshot(page.instance);

        // Re-check instance existence after async operation (race condition fix)
        if (page.instance) {
          sceneJSON = page.instance.toDatalessJSON(propertiesToInclude);
        } else {
          // If unmounted during screenshot, fallback to saved state
          sceneJSON = page._jsonState;
        }
      } else {
        // UNMOUNTED: Use persisted state
        thumbnail = page.thumbnail || "";
        sceneJSON = page._jsonState;
      }

      // SANITIZE: Swap originalSrc back to src
      if (sanitize && sceneJSON && sceneJSON.objects) {
        // Clone to avoid mutating the live state if it came from _jsonState reference
        sceneJSON = JSON.parse(JSON.stringify(sceneJSON));
        sceneJSON.objects.forEach((obj: any) => {
          if (obj.originalSrc) {
            obj.src = obj.originalSrc;
            delete obj.originalSrc;
          }
        });
      }

      const scene = JSON.stringify(sceneJSON);
      const audios: Omit<EditorAudioElement, "buffer" | "source">[] = page.audio.elements.map(({ buffer, source, ...audio }) => audio);
      const data = { fill: page.workspace?.fill || "#000000", height: page.workspace?.height || 1080, width: page.workspace?.width || 1080, audios: audios, scene: scene };
      template = { thumbnail: thumbnail, data: data, id: page.id, name: page.name, duration: page.timeline.duration, transition: page.transition, transitionDirection: page.transitionDirection, transitionDuration: page.transitionDuration, transitionEasing: page.transitionEasing };
    }
    return template;
  }

  async loadTemplate(template: EditorTemplate, mode: "replace" | "reset") {
    console.log("loadTemplate", template, mode);
    try {
      const pageSize = template?.pages?.length ?? 0;
      switch (mode) {
        case "reset":
          // this.id = template.id;
          // this.name = template.name;
          for (let index = 0; index < pageSize; index++) {
            const page = template.pages[index];
            let canvas = this.pages[index];
            const initialized = !!canvas;
            if (!initialized){
              canvas = createInstance(Canvas, this);
              // this.pages[index] = canvas;
            }
            
            canvas.transition = page.transition;
            canvas.transitionDirection = page.transitionDirection;
            canvas.transitionDuration = page.transitionDuration;
            canvas.transitionEasing = page.transitionEasing;
            canvas.template.set(page);
            if (initialized && canvas.initialized) await canvas.template.load();
          }
          if (this.pages.length <= pageSize || pageSize == 0) return;
          for (let index = pageSize; index < this.pages.length; index++) this.pages[index].destroy();
          this.pages.splice(pageSize);
          break;
        case "replace":
          for (let index = 0; index < pageSize; index++) {
            const offset = index + this.page;
            const page = template.pages[index];
            let canvas = this.pages[offset];
            const initialized = !!canvas;
            if (!initialized){
              canvas = createInstance(Canvas, this);
              // this.pages[offset] = canvas;
            }
            canvas.transition = page.transition;
            canvas.transitionDirection = page.transitionDirection;
            canvas.transitionDuration = page.transitionDuration;
            canvas.transitionEasing = page.transitionEasing;
            canvas.template.set(page);
            if (initialized && canvas.initialized) await canvas.template.load();
          }
          break;
      }
    } catch (e) {
      console.log(e);
    }

    console.log("pages", this.pages);
  }

  onResetProgress() {
    this.progress = { capture: 0, compile: 0, upload: 0 };
  }

  onChangeExportStatus(status: ExportProgress) {
    this.exporting = status;
  }

  onChangeExportCodec(codec: string) {
    this.codec = codec;
  }

  onChangeExportFPS(fps: number) {
    this.fps = fps;
  }

  onChangeExportMode(mode: ExportMode) {
    this.exports = mode;
  }

  onChangeFileName(name: string) {
    this.file = name;
  }

  onChangeName(name: string) {
    this.name = name;
    this.onModified?.();
  }

  onChangeWidth(width: number) {
    this.width = width;
  }

  onChangeHeight(height: number) {
    this.height = height;
  }

  onChangeScale(scale: number) {
    this.scale = scale;
  }

  onChangeFormat(format: string) {
    this.format = format;
  }

  setActiveSidebarLeft(sidebar: string | null) {
    this.sidebarLeft = sidebar;
  }

  setActiveSidebarRight(sidebar: string | null) {
    this.sidebarRight = sidebar;
  }

  getPageById(id: string) {
    let page = null;
    for (let i = 0; i < this.pages.length; i++) {
      if (this.pages[i].id == id) {
        page = this.pages[i];
        break;
      }
    }
    // console.log("getPageById", id, page);
    return page;
  }

  addPage(template?: EditorTemplatePage, index?: number) {
    const canvas = createInstance(Canvas, this);
    if (template) {
      canvas.template?.set(template);
    }

    if (typeof index === 'number') {
      this.pages.splice(index, 0, canvas);
      this.onChangeActivePage(index);
    } else {
      this.pages.push(canvas);
      this.onChangeActivePage(this.pages.length - 1);
    }

    this.onModified?.();
  }

  deleteActivePage() {
    const length = this.pages.length;
    if (length > 1) {
      const index = this.page;
      if (this.page >= length - 1) this.page = this.page - 1;
      this.pages[index].destroy();
      this.pages.splice(index, 1);
      this.onModified?.();
    }
  }

  deletePage(index: number) {
    const length = this.pages.length;
    if (index < length) {
      if (index <= this.page) {
        this.page = Math.max(0, this.page - 1);
      }
      this.pages[index].destroy();
      this.pages.splice(index, 1);
      this.onModified?.();
    }
  }

  async copyPage(index: number) {
    const length = this.pages.length;
    if (index < length) {
      const template = await this.exportPageTemplate(index);
      this.addPage(template, index + 1);
    }
  }

  reorderPages(newPages: Canvas[]) {
    const activePage = this.pages[this.page];
    this.pages = newPages;

    // Find new index of active page
    const newIndex = this.pages.findIndex(p => p.id === activePage?.id);
    if (newIndex !== -1) {
      this.page = newIndex;
    }
    this.onModified?.();
  }

  swapPage(oldIndex: number, newIndex: number) {
    const pages = [...this.pages];
    [pages[oldIndex], pages[newIndex]] = [pages[newIndex], pages[oldIndex]];
    this.reorderPages(pages);
  }

  onChangeActivePage(index: number) {
    this.page = index;
  }

  onTogglePreviewModal(mode: "open" | "close") {
    switch (mode) {
      case "open":
        this.preview = true;
        break;
      case "close":
        this.preview = false;
        if (this.exporting > 2) this.controller.abort({ message: "Export process cancelled by user" });
        break;
    }
  }

  onToggleMode(mode?: EditorMode) {
    switch (mode) {
      case "adapter":
        this.mode = "adapter";
        break;
      case "creator":
        this.mode = "creator";
        break;
      default:
        this.mode = this.mode === "creator" ? "adapter" : "creator";
        break;
    }
  }

  addMarker(time: number, label?: string) {
    this.markers.push({ id: nanoid(), time, label });
    this.markers.sort((a, b) => a.time - b.time);
    this.onModified?.();
  }

  removeMarker(id: string) {
    const index = this.markers.findIndex(m => m.id === id);
    if (index !== -1) {
      this.markers.splice(index, 1);
      this.onModified?.();
    }
  }

  async splitPage(index: number, timeMs: number) {
    const page = this.pages[index];
    if (!page) return;
    const originalDuration = page.timeline.duration;
    if (timeMs <= 100 || timeMs >= originalDuration - 100) return;

    // 1. Export current page template
    const template = await this.exportPageTemplate(index);

    // 2. Adjust first page duration and elements
    page.timeline.set("duration", timeMs / 1000);
    const objects1 = page.instance.getObjects();
    objects1.forEach(obj => {
      if (obj.name === 'artboard') return;
      const offset = obj.meta?.offset || 0;
      const duration = obj.meta?.duration || 0;
      if (offset >= timeMs) {
        page.instance.remove(obj);
      } else if (offset + duration > timeMs) {
        page.onChangeObjectTimelineProperty(obj, "duration", timeMs - offset);
      }
    });

    // Handle audio for page 1
    page.audio.elements.forEach(audio => {
      const offset = (audio.offset || 0) * 1000;
      const duration = (audio.timeline || 0) * 1000;
      if (offset >= timeMs) {
        page.audio.delete(audio.id);
      } else if (offset + duration > timeMs) {
        page.audio.update(audio.id, { timeline: (timeMs - offset) / 1000 });
      }
    });

    // 3. Manipulate template for Page 2
    const sceneData2 = JSON.parse(template.data.scene);
    const audios2 = [...(template.data.audios || [])];

    // Adjust scene elements for Page 2
    sceneData2.objects = sceneData2.objects.filter((obj: any) => {
      if (obj.name === 'artboard') return true;
      const offset = obj.meta?.offset || 0;
      const duration = obj.meta?.duration || 0;
      return offset + duration > timeMs;
    }).map((obj: any) => {
      if (obj.name === 'artboard') return obj;
      const offset = obj.meta?.offset || 0;
      const duration = obj.meta?.duration || 0;
      if (offset < timeMs) {
        // Spanning element: trim and shift offset to 0
        const cutAmount = timeMs - offset;
        obj.meta.offset = 0;
        obj.meta.duration = duration - cutAmount;
        if (obj.type === 'video' || obj.is_video) {
          obj.trimStart = (obj.trimStart || 0) + cutAmount;
        }
      } else {
        // Future element: just shift offset
        obj.meta.offset = offset - timeMs;
      }
      return obj;
    });

    // Adjust audios for Page 2
    const filteredAudios2 = audios2.filter((audio: any) => {
      const offset = (audio.offset || 0) * 1000;
      const duration = (audio.timeline || 0) * 1000;
      return offset + duration > timeMs;
    }).map((audio: any) => {
      const offset = (audio.offset || 0) * 1000;
      const duration = (audio.timeline || 0) * 1000;
      if (offset < timeMs) {
        const cutAmount = timeMs - offset;
        audio.offset = 0;
        audio.timeline = (duration - cutAmount) / 1000;
        audio.trim = (audio.trim || 0) + (cutAmount / 1000);
      } else {
        audio.offset = (offset - timeMs) / 1000;
      }
      return audio;
    });

    template.data.scene = JSON.stringify(sceneData2);
    template.data.audios = filteredAudios2;
    template.duration = originalDuration - timeMs;
    template.id = undefined; // Generate a new ID

    // 4. Insert new page after current
    this.addPage(template, index + 1);

    this.onModified?.();
  }

  onToggleTimeline(mode?: "open" | "close") {
    switch (mode) {
      case "close":
        this.timelineOpen = false;
        break;
      case "open":
        this.timelineOpen = true;
        break;
      default:
        this.timelineOpen = !this.timelineOpen;
        break;
    }
  }

  changeStatus(status: EditorStatus) {
    this.status = status;
  }

  onChangeTimelineMode(mode: 'compact' | 'layered') {
    this.timelineMode = mode;
  }

  resize(dimension: { width: number; height: number }, changeArtboards: boolean = true) {
    const oldWidth = this.dimension.width;
    const oldHeight = this.dimension.height;

    this.dimension = dimension;
    this.width = dimension.width;
    this.height = dimension.height;

    if (changeArtboards) {
      const scaleX = dimension.width / oldWidth;
      const scaleY = dimension.height / oldHeight;
      const scale = Math.min(scaleX, scaleY); // Uniform scale if preferred, but for AR switch we usually want to fit

      this.pages.forEach(page => {
        // Resize the artboard
        page.workspace?.resizeArtboard(dimension);

        // Scale and reposition all elements
        if (page.instance) {
          page.instance.getObjects().forEach(obj => {
            if (obj.name === "artboard") return;

            // Calculate new position
            const left = obj.left! * scaleX;
            const top = obj.top! * scaleY;

            // Update object properties
            obj.set({
              left,
              top,
              scaleX: obj.scaleX! * scaleX,
              scaleY: obj.scaleY! * scaleY
            });

            // Special handling for textboxes to prevent unwanted wrapping changes
            // if (obj.type === 'textbox') {
            //   (obj as any).width *= scaleX;
            // }

            obj.setCoords();
          });

          page.instance.requestRenderAll();
        }
      });
      this.onModified?.();
    }
  }

  setTimelineZoom(zoom: number) {
    this.timelineZoom = Math.max(0.2, Math.min(zoom, 4)); // Clamp between 0.5x and 4x
  }
}
