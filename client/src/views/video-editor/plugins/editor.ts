import { markRaw, ref, computed } from "vue"
import { nanoid } from "nanoid";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
import WebFont from "webfontloader";
import { checkForAudioInVideo } from "video-editor/lib/media";
import { cloneDeep } from 'lodash'

import { Canvas } from "./canvas";
import { Prompt } from "./prompt";
import { Recorder } from "./recorder";
import { fonts } from "video-editor/constants/fonts";

import { convertBufferToWaveBlob } from "video-editor/lib/media";
import { createInstance } from "video-editor/lib/utils";
import { FabricUtils } from "video-editor/fabric/utils";
import { propertiesToInclude } from "video-editor/fabric/constants";
import { type EditorAudioElement, EditorTemplate, EditorTemplatePage } from "video-editor/types/editor";
import { Adapter } from "./adapter";
import { useEditorStore } from "video-editor/store/editor"
import { cat } from "@huggingface/transformers";

export type ExportMode = "video" | "both";
export type EditorMode = "creator" | "adapter";
export type EditorStatus = "uninitialized" | "pending" | "complete" | "error";

export interface EditorProgress {
  capture: number;
  compile: number;
}

export enum ExportProgress {
  None = 0,
  Error = 1,
  Completed = 2,
  CaptureAudio = 3,
  CaptureVideo = 4,
  CompileVideo = 5,
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

  public ffmpeg: FFmpeg;
  public exporting: ExportProgress;
  public controller: AbortController;
  public onModified?: () => void;
  public onSaveRequested?: () => void;
  public onStatusChange?: (status: EditorStatus) => void;

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
    this.progress = { capture: 0, compile: 0 };

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

  async initialize(mode?: EditorMode) {
    console.log("initialize", mode);
    if (mode) this.mode = mode;
    this.status = "pending";
    this.onStatusChange?.("pending");
    try {
      await this.ffmpeg.load({
        coreURL: await toBlobURL("https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js", "text/javascript"),
        wasmURL: await toBlobURL("https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm", "application/wasm"),
      });
      this.ffmpeg.on("progress", this._progressEvent.bind(this));
      // this.status = "complete";
      //load custom font before starting
      let fontFamilies = [];
      fonts.forEach(font => {
        fontFamilies.push(font.family);
      });
      WebFont.load({
        google: { families: fontFamilies },
        fontloading: (family) => {
          // console.debug("Loading font " + family);
        },
        active: () => {
          // console.debug("Fonts loaded!");
          this.status = "complete";
          this.onStatusChange?.("complete");
        },
      });
    } catch (error) {
      this.status = "error";
      this.onStatusChange?.("error");
    }
  }

  getExportDuration() {
    let offsetMs = 0;
    for (let i = 0; i < this.pages.length; i++) {
      const canvas = this.pages[i];
      const timeline = canvas.timeline;
      offsetMs += timeline.duration;
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
      const timeline = canvas.timeline;

      const audios = canvas.audio.elements.filter((audio) => !audio.muted && !!audio.volume);
      const videos = canvas.instance._objects.filter(FabricUtils.isVideoElement) as any[];
      // const visuals = canvas.instance._objects.filter(FabricUtils.isAudioElement) as fabric.Audio[];
      // if(visuals && visuals.length > 0){
      //   visuals.forEach(visual => {
      //     audios.push(visual);
      //   });
      //   for(let i = 0; i < visuals.length; i++){
      //     let audio = 
      //   }
      // }

      audios.forEach(audio => {
        if (audio) {
          audio.offset += offsetMs / 1000;
        }
      })

      const tracks: EditorAudioElement[] = await canvas.audio.extract(videos, { ffmpeg: this.ffmpeg, signal: this.controller.signal });
      tracks.forEach(track => {
        if (track) {
          track.offset += offsetMs / 1000;
        }
      });

      if (audios.length > 0 || tracks.length > 0) {
        combined = combined.concat(audios, tracks);
      }
      offsetMs += timeline.duration;
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

  async exportVideo(): Promise<Blob> {
    return null;
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

  async exportTemplate(): Promise<EditorTemplatePage[]> {
    // console.log("exportTemplate");
    const templates: EditorTemplatePage[] = [];
    for (const page of this.pages) {
      const thumbnail: string = await this.recorder.screenshot(page.instance);
      const scene = JSON.stringify(page.instance.toDatalessJSON(propertiesToInclude));
      const audios: Omit<EditorAudioElement, "buffer" | "source">[] = page.audio.elements.map(({ buffer, source, ...audio }) => audio);
      const data = { fill: page.workspace.fill, height: page.workspace.height, width: page.workspace.width, audios: audios, scene: scene };
      templates.push({ thumbnail: thumbnail, data: data, id: page.id, name: page.name, duration: page.timeline.duration, transition: page.transition, transitionDuration: page.transitionDuration, transitionEasing: page.transitionEasing });
    }
    return templates;
  }

  async exportPageTemplate(index: number): Promise<EditorTemplatePage> {
    // console.log("exportTemplate");
    let template: EditorTemplatePage = null;
    const page = this.pages[index];
    if (page) {
      const thumbnail: string = await this.recorder.screenshot(page.instance);
      const scene = JSON.stringify(page.instance.toDatalessJSON(propertiesToInclude));
      const audios: Omit<EditorAudioElement, "buffer" | "source">[] = page.audio.elements.map(({ buffer, source, ...audio }) => audio);
      const data = { fill: page.workspace.fill, height: page.workspace.height, width: page.workspace.width, audios: audios, scene: scene };
      template = { thumbnail: thumbnail, data: data, id: page.id, name: page.name, duration: page.timeline.duration, transition: page.transition, transitionDuration: page.transitionDuration, transitionEasing: page.transitionEasing };
    }
    return template;
  }

  loadTemplate(template: EditorTemplate, mode: "replace" | "reset") {
    console.log("loadTemplate", template, mode);
    try {
      switch (mode) {
        case "reset":
          this.id = template.id;
          this.name = template.name;
          for (let index = 0; index < template.pages.length; index++) {
            const page = template.pages[index];
            const initialized = !!this.pages[index];
            if (!initialized) this.pages[index] = createInstance(Canvas, this);
            this.pages[index].transition = page.transition;
            this.pages[index].transitionDuration = page.transitionDuration;
            this.pages[index].transitionEasing = page.transitionEasing;
            this.pages[index].template.set(page);
            if (initialized && this.pages[index].initialized) this.pages[index].template.load();
          }
          if (this.pages.length <= template.pages.length || template.pages.length == 0) return;
          for (let index = template.pages.length; index < this.pages.length; index++) this.pages[index].destroy();
          this.pages.splice(template.pages.length);
          break;
        case "replace":
          for (let index = 0; index < template.pages.length; index++) {
            const offset = index + this.page;
            const page = template.pages[index];
            const initialized = !!this.pages[offset];
            if (!initialized) this.pages[offset] = createInstance(Canvas, this);
            this.pages[offset].transition = page.transition;
            this.pages[offset].transitionDuration = page.transitionDuration;
            this.pages[offset].transitionEasing = page.transitionEasing;
            this.pages[offset].template.set(page);
            if (initialized && this.pages[offset].initialized) this.pages[offset].template.load();
          }
          break;
      }
    } catch (e) {
      console.log(e);
    }

    console.log("pages", this.pages);
  }

  onResetProgress() {
    this.progress = { capture: 0, compile: 0 };
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

  addPage(template?: EditorTemplatePage) {
    const canvas = createInstance(Canvas, this);
    if (template) {
      canvas.template?.set(template);
    }
    this.pages.push(canvas);
    this.onChangeActivePage(this.pages.length - 1);
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
      this.addPage(template);
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
