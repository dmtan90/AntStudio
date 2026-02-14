import { fabric } from "fabric";
import { createInstance } from "video-editor/lib/utils";
import { Canvas } from "video-editor/plugins/canvas";
import type { EditorAudioElement } from "video-editor/types/editor";
import { FabricUtils } from "video-editor/fabric/utils";
import { propertiesToInclude } from "video-editor/fabric/constants";
import { useCanvasStore } from "video-editor/store/canvas";

export class CanvasSelection {
  private _canvas: Canvas;
  active: fabric.Object | null;

  constructor(canvas: Canvas) {
    this._canvas = canvas;
    this.active = null;

    this._initEvents();
  }

  private get canvas() {
    return this._canvas.instance;
  }

  private _initEvents() {
    const canvas = this.canvas;
    if (!canvas) return;

    canvas.on("object:modified", this._modifiedEvent.bind(this));
    canvas.on("timeline:start", this._timelineRecorderStartEvent.bind(this));
    canvas.on("recorder:start", this._timelineRecorderStartEvent.bind(this));

    canvas.on("selection:created", this._selectionEvent.bind(this));
    canvas.on("selection:updated", this._selectionEvent.bind(this));
    canvas.on("selection:cleared", this._selectionEvent.bind(this));
    // this.canvas.on('before:selection:cleared', this._selectionEvent.bind(this));

    canvas.on("clip:added", this._modifiedEvent.bind(this));
    canvas.on("clip:removed", this._modifiedEvent.bind(this));
  }

  private _modifiedEvent(event: fabric.IEvent) {
    if (!this.active || !event.target || this.active.name !== event.target.name) return;
    this.active = event.target.toObject(propertiesToInclude);
  }

  private _timelineRecorderStartEvent() {
    this.canvas?.discardActiveObject();
  }

  private _selectionEvent() {
    const canvas = this.canvas;
    if (!canvas) return;
    const selection = canvas.getActiveObject();
    // console.log("_selectionEvent", selection);
    if (FabricUtils.isActiveSelection(this.active)) {
      const objects = this.active.objects.map((object) => this.canvas.getItemByName(object.name)).filter(Boolean) as fabric.Object[];
      objects.forEach((object) => object.set({ hasBorders: true, hasControls: true }));
    }
    if (!selection || selection.excludeFromTimeline) {
      this.active = null;
    } else if (FabricUtils.isActiveSelection(selection)) {
      selection.off("moving");
      selection.off("scaling");
      selection.off("rotating");
      let preserveAspectRatio = false;
      selection.forEachObject((object) => {
        object.set({ hasBorders: false, hasControls: false });
        if (["image", "video", "textbox"].includes(object.type!)) preserveAspectRatio = true;
        if (object.clipPath) {
          const handler = FabricUtils.updateObjectTransformToParent.bind(FabricUtils, object, [{ object: object.clipPath! }]);
          selection.on("moving", handler);
          selection.on("scaling", handler);
          selection.on("rotating", handler);
        }
      });
      selection.setControlsVisibility({ mt: !preserveAspectRatio, mb: !preserveAspectRatio, mr: !preserveAspectRatio, ml: !preserveAspectRatio });
      this.active = selection.toObject(propertiesToInclude);
    } else {
      this.active = selection.toObject(propertiesToInclude);
    }
    canvas?.requestRenderAll();

    const canvasStore = useCanvasStore();
    canvasStore.onChangeSelection();
  }

  selectObjectByName(name: string, multiple?: boolean) {
    const canvas = this.canvas;
    if (!canvas) return;
    const object = canvas.getItemByName(name);
    if (!object) return;
    const selected = canvas.getActiveObject();
    if (!selected || !multiple) {
      canvas.setActiveObject(object);
    } else {
      if (FabricUtils.isActiveSelection(selected)) {
        if (object.group === selected) {
          if (selected._objects.length === 1) {
            canvas.discardActiveObject();
          } else {
            selected.removeWithUpdate(object);
            canvas.fire("selection:updated");
          }
        } else {
          selected.addWithUpdate(object);
          canvas.fire("selection:updated");
        }
      } else {
        if (selected.name !== object.name) {
          const activeSelection = createInstance(fabric.ActiveSelection, [selected, object], { canvas: canvas });
          canvas.setActiveObject(activeSelection);
        }
      }
    }
    canvas.requestRenderAll();
  }

  selectAudio(audio: EditorAudioElement | null) {
    if (!audio) {
      this.active = null;
    } else {
      this.canvas?.discardActiveObject().requestRenderAll();
      this.active = Object.assign({ type: "audio" }, audio) as unknown as fabric.Object;
    }
  }

  selectMetaGroup(group: string[]) {
    const canvas = this.canvas;
    if (!canvas || !group.length) return;
    const elements = group.map((item) => canvas.getItemByName(item)).filter(Boolean) as fabric.Object[];
    const activeSelection = createInstance(fabric.ActiveSelection, elements, { canvas: canvas });
    canvas.setActiveObject(activeSelection).requestRenderAll();
  }
}
