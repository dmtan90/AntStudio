import { toRaw } from "vue"
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { defineStore } from 'pinia';

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
      return state._editor;
    },
    page(state): number {
      return state._editor.page;
    },
    id(state): string {
      return state._editor.id;
    },
    mode(state): EditorMode {
      return state._editor.mode;
    },
    name(state): string {
      return state._editor.name;
    },
    status(state): EditorStatus {
      return state._editor.status;
    },
    pages(state): Canvas[] {
      return state._editor.pages as Canvas[];
    },
    controller(state) {
      return state._editor.controller;
    },
    adapter(state) {
      return state._editor.adapter;
    },
    prompter(state) {
      return state._editor.prompter;
    },
    recorder(state) {
      return state._editor.recorder;
    },
    saving(state): boolean {
      return state._editor.saving;
    },
    preview(state): boolean {
      return state._editor.preview;
    },
    exporting(state): ExportProgress {
      return state._editor.exporting;
    },
    ffmpeg(state): FFmpeg {
      // Using any cast as a last resort for vue-tsc if type inference fails on markRaw property
      return (toRaw(state._editor) as any).ffmpeg;
    },
    progress(state) {
      return state._editor.progress;
    },
    blob(state) {
      return state._editor.blob;
    },
    frame(state) {
      return state._editor.frame;
    },
    file(state): string {
      return state._editor.file;
    },
    fps(state): number {
      return state._editor.fps;
    },
    codec(state): string {
      return state._editor.codec;
    },
    exports(state): ExportMode {
      return state._editor.exports;
    },
    sidebarLeft(state): string | null {
      return state._editor.sidebarLeft;
    },
    sidebarRight(state): string | null {
      return state._editor.sidebarRight;
    },
    timelineOpen(state): boolean {
      return state._editor.timelineOpen;
    },
    canvas(state): Canvas {
      return state._editor?.canvas as Canvas;
    },
    dimension(state) {
      return state._editor?.dimension;
    }
  },

  actions: {
    _progressEvent({ progress, frame }: { progress: number; frame?: string }) {
      this._editor._progressEvent({ progress, frame });
    },

    async initialize(mode?: EditorMode) {
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

    resize(dimensions: { width: number; height: number }, changeArtboards: boolean = false) {
      this._editor.resize(dimensions, changeArtboards);
    },

    getCanvasInstance(page: number): any {
      return (this._editor.pages[page] as any)?.instance;
    }
  }
});
