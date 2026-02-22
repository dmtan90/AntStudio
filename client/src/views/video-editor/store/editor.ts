import { toRaw, markRaw } from "vue"
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { defineStore } from 'pinia';
import { throttle } from 'lodash';
import { useProjectStore } from '@/stores/project';
import { useUIStore } from '@/stores/ui';

import { Editor, ExportProgress, type EditorStatus, type EditorMode, type ExportMode } from "video-editor/plugins/editor";
import { Canvas } from "video-editor/plugins/canvas";
import { Prompt } from "video-editor/plugins/prompt";
import { Recorder } from "video-editor/plugins/recorder";
import { createInstance } from "video-editor/lib/utils";
import type { EditorTemplate, EditorTemplatePage } from "video-editor/types/editor";

export { EditorMode };
export type { EditorTemplate, EditorTemplatePage, EditorStatus, ExportProgress, ExportMode };

export interface EditorStoreState {
  _editor: Editor;
  tick: number;
  thumbnailTick: number;
  isHeadless: boolean;
  targetRatio: string | null;
}

export const useEditorStore = defineStore('editor', {
  state: (): EditorStoreState => ({
    _editor: createInstance(Editor) as Editor,
    tick: 0,
    thumbnailTick: 0,
    isHeadless: false,
    targetRatio: null,
  }),

  getters: {
    instance(state): Editor {
      return state._editor as any;
    },
    page(state): number {
      return (state._editor as any).page;
    },
    id(state): string {
      return (state._editor as any).id;
    },
    mode(state): EditorMode {
      return (state._editor as any).mode;
    },
    name(state): string {
      return (state._editor as any).name;
    },
    status(state): EditorStatus {
      return (state._editor as any).status;
    },
    pages(state): Canvas[] {
      return (state._editor as any).pages as Canvas[];
    },
    controller(state) {
      return (state._editor as any).controller;
    },
    adapter(state) {
      return (state._editor as any).adapter;
    },
    prompter(state) {
      return (state._editor as any).prompter;
    },
    recorder(state) {
      return (state._editor as any).recorder;
    },
    saving(state): boolean {
      return (state._editor as any).saving;
    },
    preview(state): boolean {
      return (state._editor as any).preview;
    },
    exporting(state): ExportProgress {
      return (state._editor as any).exporting;
    },
    ffmpeg(state): FFmpeg {
      return (toRaw(state._editor) as any).ffmpeg;
    },
    progress(state) {
      const editor = state._editor as any;
      const exporting = editor.exporting as ExportProgress;
      const progress = editor.progress;

      if (exporting === ExportProgress.None || exporting === ExportProgress.Completed) return 0;
      else if (exporting === ExportProgress.Error) return 0;

      // Simple weighted progress
      else if (exporting === ExportProgress.CaptureAudio) {
        return 0.1; // Audio is usually fast
      }
      else if (exporting === ExportProgress.CaptureVideo) {
        return 0.1 + (progress.capture / 100) * 0.6; // 60% for capture video
      }
      else if (exporting === ExportProgress.CompileVideo) {
        return 0.7 + (progress.compile / 100) * 0.2; // Last 25% for compile
      }
      else if(exporting == ExportProgress.UploadVideo){
        return 0.95 + (progress.upload / 100) * 0.05; // Last 5% for upload
      }
      return 0;
    },
    exportStatusText(state): string {
      const exporting = (state._editor as any).exporting as ExportProgress;
      switch (exporting) {
        case ExportProgress.CaptureVideo: return "Extracting Frames...";
        case ExportProgress.CaptureAudio: return "Processing Audio...";
        case ExportProgress.CompileVideo: return "Compiling Video...";
        case ExportProgress.Completed: return "Completed";
        case ExportProgress.Error: return "Error during export";
        case ExportProgress.UploadVideo: return "Uploading video...";
        default: return "Idle";
      }
    },
    blob(state) {
      return (state._editor as any).blob;
    },
    frame(state) {
      return (state._editor as any).frame;
    },
    file(state): string {
      return (state._editor as any).file;
    },
    fps(state): number {
      return (state._editor as any).fps;
    },
    codec(state): string {
      return (state._editor as any).codec;
    },
    exports(state): ExportMode {
      return (state._editor as any).exports;
    },
    sidebarLeft(state): string | null {
      return (state._editor as any).sidebarLeft;
    },
    sidebarRight(state): string | null {
      return (state._editor as any).sidebarRight;
    },
    timelineOpen(state): boolean {
      return (state._editor as any).timelineOpen;
    },
    timelineMode(state): 'compact' | 'layered' {
      return (state._editor as any).timelineMode;
    },
    canvas(state): Canvas {
      return (state._editor as any)?.canvas as Canvas;
    },
    dimension(state) {
      return (state._editor as any)?.dimension;
    },
    timelineZoom(state): number {
      const _ = state.tick;
      return (state._editor as any)?.timelineZoom || 1;
    },
    totalDuration(state): number {
      const _ = state.tick;
      const pages = (state._editor as any).pages as Canvas[];
      return pages.reduce((acc, page) => acc + (page.timeline?.duration || 5000), 0);
    },
    markers(state) {
      return (state._editor as any).markers || [];
    },
    currentTime(state): number {
      const editor = state._editor as any;
      const pages = editor.pages as Canvas[];
      const activeIndex = editor.page;

      let acc = 0;
      for (let i = 0; i < activeIndex; i++) {
        acc += (pages[i].timeline?.duration || 5000);
      }

      const _ = state.tick; // Trigger reactivity on every playback tick
      const localSeek = (pages[activeIndex]?.timeline?.seek || 0);
      return acc + localSeek;
    },
    getCanvasPreviewUrl: (state) => (index: number) => {
      const _ = state.thumbnailTick; // Separate reactive trigger
      const page = state._editor.pages[index] as Canvas;
      return (page as any)?.thumbnail || (page as any)?.template?.page?.thumbnail || null;
    },
    headless(state): boolean {
      return state.isHeadless;
    }
  },

  actions: {
    updateTick() {
      this.tick++;
    },
    updateThumbnailTick() {
      this.thumbnailTick++;
    },
    _progressEvent({ progress, frame }: { progress: number; frame?: string }) {
      this._editor._progressEvent({ progress, frame });
    },

    async initialize(mode: EditorMode = "creator") {
      console.log('initialize editor', mode);
      this._editor.onModified = () => {
        console.log("Editor modified, triggering autoSave");
        this.autoSave();
      };
      this._editor.onTick = () => {
        this.updateTick();
      };
      this._editor.onThumbnailUpdated = () => {
        this.updateThumbnailTick();
      };
      this._editor.onSaveRequested = () => {
        console.log("Save requested (Ctrl+S), triggering saveProject");
        this.saveProject();
      };
      return await this._editor.initialize(mode);
    },

    async exportAudio() {
      return await this._editor.exportAudio();
    },

    async exportVideo(headless: boolean = false, upload: boolean = true) {
      return await this._editor.exportVideo(headless);
    },

    async autoRenderAndExport() {
      return await this._editor.autoRenderAndExport();
    },

    async exportTemplate() {
      return await this._editor.exportTemplate();
    },

    loadTemplate(template: EditorTemplate, mode: "replace" | "reset") {
      this._editor.loadTemplate(template, mode);
    },

    onResetProgress() {
      this._editor.onResetProgress();
    },

    onChangeExportStatus(status: ExportProgress) {
      this._editor.onChangeExportStatus(status);
    },

    onChangeExportCodec(codec: string) {
      this._editor.onChangeExportCodec(codec);
    },

    onChangeExportFPS(fps: number) {
      this._editor.onChangeExportFPS(fps);
    },

    onChangeExportMode(mode: ExportMode) {
      this._editor.onChangeExportMode(mode);
    },

    onChangeFileName(name: string) {
      this._editor.onChangeFileName(name);
    },

    onChangeName(name: string) {
      this._editor.onChangeName(name);
    },

    setActiveSidebarLeft(sidebar: string | null) {
      this._editor.setActiveSidebarLeft(sidebar);
    },

    setActiveSidebarRight(sidebar: string | null) {
      this._editor.setActiveSidebarRight(sidebar);
    },

    getPageById(id: string) {
      return this._editor.getPageById(id);
    },

    addPage(template?: EditorTemplatePage, index?: number) {
      this._editor.addPage(template, index);
    },

    async addImage(payload: { src: string, name?: string }) {
      const page = this._editor.pages[this._editor.page];
      if (page) {
        await page.onAddImageFromSource(payload.src);
      }
    },

    async addVideo(payload: { src: string, name?: string }) {
      const page = this._editor.pages[this._editor.page];
      if (page) {
        await page.onAddVideoFromSource(payload.src);
      }
    },

    async addAudio(payload: { src: string, name?: string }) {
      const page = this._editor.pages[this._editor.page];
      if (page) {
        await page.onAddAudioFromSource(payload.src, { meta: { name: payload.name } });
      }
    },

    deleteActivePage() {
      this._editor.deleteActivePage();
    },

    deletePage(index: number) {
      this._editor.deletePage(index);
    },

    copyPage(index: number) {
      this._editor.copyPage(index);
    },

    swapPage(oldIndex: number, newIndex: number) {
      this._editor.swapPage(oldIndex, newIndex);
    },

    reorderPages(newPages: Canvas[]) {
      this._editor.reorderPages(newPages);
    },

    setPageTransition(index: number, transition: string, duration?: number) {
      const page = this._editor.pages[index];
      if (page) {
        page.transition = transition as any;
        if (duration !== undefined) {
          page.transitionDuration = duration;
        }
        this._editor.onModified?.();
      }
    },

    async splitPage(index: number, timeMs: number) {
      await this._editor.splitPage(index, timeMs);
    },

    async splitSceneAtPlayhead() {
      const index = this.page;
      const page = this.pages[index];
      if (!page) return;

      const seek = (page.timeline as any)?.seek || 0; // ms
      const duration = (page.timeline as any)?.duration || 5000; // ms

      // Protect against micro-splits (min 500ms)
      if (seek > 500 && seek < duration - 500) {
        await this.splitPage(index, seek);
      } else {
        console.warn("Cannot split: Playhead too close to start or end of scene.");
      }
    },

    onChangeActivePage(index: number) {
      this._editor.onChangeActivePage(index);
    },

    onTogglePreviewModal(mode: "open" | "close") {
      this._editor.onTogglePreviewModal(mode);
    },

    onToggleMode(mode?: EditorMode) {
      this._editor.onToggleMode(mode);
    },

    onToggleTimeline(mode?: "open" | "close") {
      this._editor.onToggleTimeline(mode);
    },

    addMarker(time: number, label?: string) {
      this._editor.addMarker(time, label);
    },

    removeMarker(id: string) {
      this._editor.removeMarker(id);
    },

    changeStatus(status: EditorStatus) {
      this._editor.changeStatus(status);
    },

    onChangeTimelineMode(mode: 'compact' | 'layered') {
      this._editor.onChangeTimelineMode(mode);
    },

    setTimelineZoom(zoom: number) {
      this._editor.setTimelineZoom(zoom);
      this.tick++;
    },

    resize(dimensions: { width: number; height: number }, changeArtboards: boolean = false) {
      this._editor.resize(dimensions, changeArtboards);
    },

    getCanvasInstance(page: number): fabric.Canvas {
      return this.pages[page]?.instance;
    },

    onModified() {
      this._editor.onModified?.();
    },

    async saveProject() {
      if (this.instance.saving) return;
      const projectStore = useProjectStore();

      this.instance.saving = true;
      try {
        const pages = await this.exportTemplate();
        const projectData = {
          name: this.name,
          dimension: this.dimension,
          pages
        };

        const uiStore = useUIStore();
        // 1. Save to LocalStorage for crash recovery
        localStorage.setItem(`${uiStore.appName.toLowerCase().replace(/\s+/g, '_')}_autosave_${this.id}`, JSON.stringify(projectData));

        // 2. Save to Server if it's a real project
        if (this.id && !this.id.startsWith('preview_')) {
          await projectStore.updateProject({
            name: this.name,
            data: JSON.stringify(projectData)
          }, this.id);
        }

        console.log("Project saved successfully");
      } catch (err) {
        console.error("Failed to auto-save project:", err);
      } finally {
        this.instance.saving = false;
      }
    },

    autoSave: throttle(async function (this: any) {
      await this.saveProject();
    }, 10000, { leading: false, trailing: true }),

    seekToGlobalTime(seconds: number) {
      const ms = seconds * 1000;
      const pages = (this._editor as any).pages as Canvas[];
      let acc = 0;
      let targetPage = 0;
      let localTime = 0;

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const pageDuration = (page.timeline as any)?.duration || 5000;
        const start = acc;
        const end = start + pageDuration;

        if (ms >= start && ms < end) {
          targetPage = i;
          localTime = ms - start;
          break;
        } else if (i === pages.length - 1 && ms >= end) {
          targetPage = i;
          localTime = pageDuration;
        }
        acc += pageDuration;
      }

      if (targetPage !== this.page) {
        this.onChangeActivePage(targetPage);
        setTimeout(() => {
          const instance = this.getCanvasInstance(targetPage);
          if (instance?.timeline) {
            (instance.timeline as any).set("seek", localTime / 1000);
          }
        }, 50);
      } else {
        const instance = this.getCanvasInstance(targetPage);
        if (instance?.timeline) {
          (instance.timeline as any).set("seek", localTime / 1000);
        }
      }
    }
  }
});
