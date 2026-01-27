import { toRaw, markRaw } from "vue"
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { defineStore } from 'pinia';
import { throttle } from 'lodash';
import { useProjectStore } from '@/stores/project';

import { Editor, type EditorStatus, type EditorMode, type ExportProgress, type ExportMode } from "video-editor/plugins/editor";
import { Canvas } from "video-editor/plugins/canvas";
import { Prompt } from "video-editor/plugins/prompt";
import { Recorder } from "video-editor/plugins/recorder";
import { createInstance } from "video-editor/lib/utils";
import type { EditorTemplate, EditorTemplatePage } from "video-editor/types/editor";

export { EditorMode };
export type { EditorTemplate, EditorTemplatePage, EditorStatus, ExportProgress, ExportMode };

export interface EditorStoreState {
  _editor: Editor;
}

export const useEditorStore = defineStore('editor', {
  state: (): EditorStoreState => ({
    _editor: createInstance(Editor) as Editor,
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
      return (state._editor as any).progress;
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
      return (state._editor as any)?.timelineZoom || 1;
    },
    totalDuration(state): number {
      const pages = (state._editor as any).pages as Canvas[];
      return pages.reduce((acc, page) => acc + (page.timeline?.duration || 5000), 0);
    }
  },

  actions: {
    _progressEvent({ progress, frame }: { progress: number; frame?: string }) {
      this._editor._progressEvent({ progress, frame });
    },

    async initialize(mode?: EditorMode) {
      this._editor.onModified = () => {
        console.log("Editor modified, triggering autoSave");
        this.autoSave();
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

    async exportVideo() {
      return await this._editor.exportVideo();
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

    addPage(template?: EditorTemplatePage) {
      this._editor.addPage(template);
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

    changeStatus(status: EditorStatus) {
      this._editor.changeStatus(status);
    },

    onChangeTimelineMode(mode: 'compact' | 'layered') {
      this._editor.onChangeTimelineMode(mode);
    },

    setTimelineZoom(zoom: number) {
      this._editor.setTimelineZoom(zoom);
    },

    resize(dimensions: { width: number; height: number }, changeArtboards: boolean = false) {
      this._editor.resize(dimensions, changeArtboards);
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

        // 1. Save to LocalStorage for crash recovery
        localStorage.setItem(`antflow_autosave_${this.id}`, JSON.stringify(projectData));

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

    getCanvasInstance(page: number): any {
      return (this._editor.pages[page] as any)?.instance;
    }
  }
});
