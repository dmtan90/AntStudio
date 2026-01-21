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
  public timelineOpen: boolean;

  public blob?: Blob;
  public frame?: string;

  public file: string;
  public fps: number;
  public codec: string;
  public width: number;
  public height: number;
  public scale: number;
  public format: string;

  public saving: boolean;
  public preview: boolean;

  public exports: ExportMode;
  public progress: EditorProgress;

  public prompter: Prompt;
  public recorder: Recorder;
  public adapter: Adapter;

  public ffmpeg: FFmpeg;
  public exporting: ExportProgress;
  public controller: AbortController;

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
        },
      });
    } catch (error) {
      this.status = "error";
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
    this.blob = undefined;
    this.frame = undefined;
    this.onResetProgress();
    const editor = useEditorStore();
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
      this.onChangeExportStatus(ExportProgress.Completed);
      this.blob = blob;
      return blob;
    } catch (error) {
      this.onChangeExportStatus(ExportProgress.Error);
      this.recorder.stop();
      throw error;
    }
  }

  async exportTemplate(): Promise<EditorTemplatePage[]> {
    // console.log("exportTemplate");
    const templates: EditorTemplatePage[] = [];
    for (const page of this.pages) {
      const thumbnail: string = await this.recorder.screenshot(page.instance);
      const scene = JSON.stringify(page.instance.toDatalessJSON(propertiesToInclude));
      const audios: Omit<EditorAudioElement, "buffer" | "source">[] = page.audio.elements.map(({ buffer, source, ...audio }) => audio);
      const data = { fill: page.workspace.fill, height: page.workspace.height, width: page.workspace.width, audios: audios, scene: scene };
      templates.push({ thumbnail: thumbnail, data: data, id: page.id, name: page.name, duration: page.timeline.duration });
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
      template = { thumbnail: thumbnail, data: data, id: page.id, name: page.name, duration: page.timeline.duration };
    }
    return template;
  }

  loadTemplate(template: EditorTemplate, mode: "replace" | "reset") {
    console.log("loadTemplate", template, mode);
    switch (mode) {
      case "reset":
        this.id = template.id;
        this.name = template.name;
        for (let index = 0; index < template.pages.length; index++) {
          const page = template.pages[index];
          const initialized = !!this.pages[index];
          if (!initialized) this.pages[index] = createInstance(Canvas, this);
          this.pages[index].template.set(page);
          if (initialized && this.pages[index].initialized) this.pages[index].template.load();
        }
        // console.log("pages", this.pages);
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
          this.pages[offset].template.set(page);
          if (initialized && this.pages[offset].initialized) this.pages[offset].template.load();
        }
        break;
    }
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
  }

  deleteActivePage() {
    const length = this.pages.length;
    if (length > 1) {
      const index = this.page;
      if (this.page >= length - 1) this.page = this.page - 1;
      this.pages[index].destroy();
      this.pages.splice(index, 1);
    }
  }

  deletePage(index: number) {
    const length = this.pages.length;
    if (index < length) {
      if (index <= this.page) {
        this.page = this.page - 1;
      }
      this.pages[index].destroy();
      this.pages.splice(index, 1);
    }
  }

  async copyPage(index: number) {
    const length = this.pages.length;
    if (index < length) {
      const template = await this.exportPageTemplate(index);
      this.addPage(template);
    }
  }

  swapPage(oldIndex: number, newIndex: number) {
    const pages = [...this.pages];
    [pages[oldIndex], pages[newIndex]] = [pages[newIndex], pages[oldIndex]];
    this.pages = pages;
    // const oldPage = cloneDeep(this.pages[oldIndex]);
    // const newPage = cloneDeep(this.pages[newIndex]);
    // this.pages[newIndex] = oldPage;
    // this.pages[oldIndex] = newPage;
    if (this.page == oldIndex) {
      this.onChangeActivePage(newIndex);
    }
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

  resize(dimension: { width: number; height: number }, changeArtboards: boolean = false) {
    this.dimension = dimension;
    if (changeArtboards) {
      this.pages.forEach(page => {
        page.workspace?.resizeArtboard(dimension);
      });
    }
  }
}
