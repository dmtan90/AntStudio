import { defineStore, Store } from 'pinia';
import { ref, computed, watch, reactive } from 'vue';
import { fabric } from "fabric";
import { useEditorStore } from 'video-editor/store/editor';
import { Editor } from "video-editor/plugins/editor";
import { Canvas } from "video-editor/plugins/canvas";
import { CanvasAlignment } from "video-editor/plugins/alignment";
import { CanvasAudio } from "video-editor/plugins/audio";
import { CanvasCropper } from "video-editor/plugins/crop";
import { CanvasEffects } from "video-editor/plugins/filters";
import { CanvasGuidelines } from "video-editor/plugins/guidelines";
import { CanvasHistory } from "video-editor/plugins/history";
import { CanvasClipMask } from "video-editor/plugins/mask";
import { CanvasReplace } from "video-editor/plugins/replace";
import { CanvasSelection } from "video-editor/plugins/selection";
import { CanvasTemplate } from "video-editor/plugins/template";
import { CanvasTimeline } from "video-editor/plugins/timeline";
import { CanvasTrimmer } from "video-editor/plugins/trim";
import { CanvasWorkspace } from "video-editor/plugins/workspace";
import { CanvasChart } from "video-editor/plugins/chart";
import { CanvasText } from "video-editor/plugins/text";
import { CanvasAnimations } from "video-editor/plugins/animations";
import { CanvasClone } from "video-editor/plugins/clone";
import { Recorder } from "video-editor/plugins/recorder";
import type { EditorAudioElement, EditorTrim } from "video-editor/types/editor";

// export interface Canvas {
//   editor: Editor;
//   selectionActive: any;
//   cropperActive: any;
//   trimmerActive: any;
//   canvas: any;
//   instance: any;
//   selection: any;
//   workspace: any;
//   recorder: any;
//   cropper: any;
//   trimmer: any;
//   timeline: any;
//   animations: any;
//   audio: any;
//   video: any;
//   text: any;
//   effects: any;
//   elements: any;
// }
// 2. Infer the type of the store instance
type EditorStoreInstance = ReturnType<typeof useEditorStore>;

export const useCanvasStore = defineStore('canvas', {
  state: () => ({
    editor: null as EditorStoreInstance,
    selectionActive: ref<fabric.Object>(null),
    cropperActive: ref<fabric.Image>(null),
    trimmerActive: ref<EditorTrim>(null),
    showRulers: ref(true),
    showGrid: ref(false)
  }),

  getters: {
    canvas(state): Canvas {
      return this.editor?.canvas as Canvas;
    },
    instance(state): fabric.Canvas {
      return this.canvas?.instance;
    },
    grid(state) {
      return this.canvas?.grid;
    },
    selection(state): CanvasSelection {
      return this.canvas?.selection;
    },
    replacer(state): CanvasReplace {
      return this.canvas?.replacer;
    },
    workspace(state): CanvasWorkspace {
      return this.canvas?.workspace;
    },
    recorder(state): Recorder {
      return this.editor?.recorder as Recorder;
    },
    cropper(state): CanvasCropper {
      return this.canvas?.cropper;
    },
    trimmer(state): CanvasTrimmer {
      return this.canvas?.trimmer;
    },
    timeline(state): CanvasTimeline {
      return this.canvas?.timeline;
    },
    animations(state): CanvasAnimations {
      return this.canvas?.animations;
    },
    audio(state): CanvasAudio {
      return this.canvas?.audio;
    },
    text(state): CanvasText {
      return this.canvas?.text;
    },
    effects(state): CanvasEffects {
      return this.canvas?.effects;
    },
    elements(state): fabric.Object[] {
      return this.canvas?.elements;
    },
    alignment(state): CanvasAlignment {
      return this.canvas?.alignment;
    },
    history(state): CanvasHistory {
      return this.canvas?.history;
    },
    cloner(state): CanvasClone {
      return this.canvas?.cloner;
    },
    audioElements(state): EditorAudioElement[] {
      return this.audio?.elements;
    },
    clipper(state): CanvasCropper {
      return this.canvas?.clipper;
    },
    selectionCount(state): number {
      const active = state.selectionActive as any;
      if (!active) return 0;
      if (active.type === 'activeSelection' && active.objects) {
        return active.objects.length;
      }
      return 1;
    }
  },

  actions: {
    registerEvents() {
      this.editor = useEditorStore();
      const { page, pages } = storeToRefs<EditorStoreInstance>(this.editor);

      // Watch for page changes
      watch([page, pages], ([newPage, newPages]) => {
        this.updateRefs();
      }, { deep: true, immediate: true });

      // Sync Grid state
      watch(() => this.showGrid, (val) => {
        this.canvas?.grid?.toggle(val);
      });
    },
    getSelectionActive() {
      return this.selection?.active;
    },
    getCropperActive() {
      return this.cropper?.active;
    },
    getTrimmerActive() {
      return this.trimmer?.active;
    },
    getClipperActive() {
      return this.clipper?.active;
    },
    updateRefs() {
      // console.log("updateRefs");
      // this.canvas = this.editor?.canvas;
      this.selectionActive = this.getSelectionActive();
      this.cropperActive = this.getCropperActive();
      this.trimmerActive = this.getTrimmerActive();
      // this.selection = this.canvas?.selection;
      // this.workspace = this.canvas?.workspace;
      // this.active = this.canvas?.selection?.active;
      // console.log(this.canvas, this.selection, this.workspace, this.active);
    },

    initializeCanvas(canvas: Canvas, element: HTMLCanvasElement) {
      // Deprecated: Initialization is now handled by EditorCanvas.vue singleton logic
      console.warn("initializeCanvas is deprecated. Use EditorCanvas shared instance.");
    },

    // initializeThumbnail(element, index){
    //   // console.log("initializeThumbnail");
    //   const canvas = this.editor?.pages[index];
    //   const workspace = document.getElementById('workspace') as HTMLDivElement;
    //   if (!canvas || !workspace) return;

    //   if (!element) {
    //     canvas.destroy();
    //   } else {
    //     canvas.initialize(element, workspace);
    //   }
    // },

    initializeRecorder(canvas: HTMLCanvasElement) {
      // console.log("initializeRecorder", element);
      if (!canvas) {
        this.recorder.destroy();
      } else {
        this.recorder.initialize(canvas);
      }
      this.updateRefs();
    },

    onChangeSelection() {
      // console.log("onChangeSelection");
      this.updateRefs();

      if (this.selectionActive?.type === "audio") {
        this.editor.setActiveSidebarRight("audio");
      }
    },

    setSelectionActive(element: fabric.Object | null) {
      if (!this.instance) return;
      if (element) {
        this.instance.setActiveObject(element);
      } else {
        this.instance.discardActiveObject();
      }
      this.instance.requestRenderAll();
      this.updateRefs();
    }
  }
});