import { fabric } from "fabric";
import { FabricUtils } from "video-editor/fabric/utils";
import { createPromise } from "video-editor/lib/utils";
import { Canvas } from "video-editor/plugins/canvas";
import type { EditorTemplatePage } from "video-editor/types/editor";
import { defaultBackgroundColor } from "video-editor/fabric/constants"
import { getFileUrl } from "@/utils/api";

export class CanvasTemplate {
  private _canvas: Canvas;
  status: "idle" | "pending" | "completed" | "error";
  page: EditorTemplatePage | null;

  constructor(canvas: Canvas) {
    this._canvas = canvas;
    this.status = "idle";
    this.page = null;
  }

  private get canvas() {
    return this._canvas.instance;
  }

  private get editor() {
    return this._canvas.editor;
  }

  private get artboard() {
    return this._canvas.artboard;
  }

  private get history() {
    return this._canvas.history;
  }

  private get timeline() {
    return this._canvas.timeline;
  }

  private get selection() {
    return this._canvas.selection;
  }

  private get cropper() {
    return this._canvas.selection;
  }

  private get audio() {
    return this._canvas.audio;
  }

  private get workspace() {
    return this._canvas.workspace;
  }

  get pending() {
    return !(this.status === "completed" || this.status === "error") && !!this.page;
  }

  private async _scene() {
    this.canvas.clear();
    this.timeline.destroy();

    this.workspace.changeFill(this.page!.data.fill || defaultBackgroundColor);
    this.workspace.resizeArtboard({ height: this.page!.data.height, width: this.page!.data.width });

    this.canvas.add(this.artboard);
    this.canvas.clipPath = this.artboard;
    const serialized = JSON.parse(this.page!.data.scene);
    const templateSize = {
      width: this.page!.data.width || 1080,
      height: this.page!.data.height || 1080
    }

    const canvasSize = {
      width: this.workspace.width,
      height: this.workspace.height
    }

    // FabricUtils.transformObjectsToMatchWorkspace(serialized.objects, templateSize, canvasSize);

    for (let i = 0; i < serialized.objects.length; i++) {
      let object = serialized.objects[i]
      if (!object.name) {
        object.name = FabricUtils.elementID(object.type ?? "object");
      }

      if (object.clipPath && !object.clipPath.name) {
        object.clipPath.name = FabricUtils.elementID(object.clipPath.type ?? "clipPath");
      }
    }

    return createPromise<void>((resolve) => {
      FabricUtils.applyFontsBeforeLoad(serialized.objects).then(async () => {
        // Resolve all S3 assets before enlivenment
        for (const object of serialized.objects) {
          if ((object.type === 'image' || object.type === 'video' || object.type === 'gif') && object.src) {
            object.src = await getFileUrl(object.src, { cached: true });

            // Safeguard: If it's an external URL, don't force CORS unless it's a blob or internal
            const isInternal = object.src.startsWith('/') || object.src.startsWith(window.location.origin) || object.src.startsWith('blob:');
            if (!isInternal && object.src.startsWith('http')) {
              object.crossOrigin = undefined;
            } else {
              object.crossOrigin = 'anonymous';
            }
          }
        }

        fabric.util.enlivenObjects(
          serialized.objects,
          (objects: fabric.Object[]) => {
            // for(let i = 0; i < objects.length; i++){
            //   let object = objects[i]
            //   if(!object.name){
            //     object.name = FabricUtils.elementID(object.type ?? "object");
            //     console.log("object", object);
            //   }

            //   if(object.clipPath && !object.clipPath.name){
            //     object.clipPath.name = FabricUtils.elementID(object.clipPath.type ?? "clipPath");
            //     console.log("clipPath", object.clipPath);
            //   }
            // }

            FabricUtils.applyModificationsAfterLoad(objects, this.editor.adapter, this.editor.mode).then(() => {
              this.canvas.add(...objects);
              // this.workspace.changeFill(this.page!.data.fill || defaultBackgroundColor);
              // this.workspace.resizeArtboard({ height: this.page!.data.height || 1080, width: this.page!.data.width || 1080 });

              this.history.clear();
              this.timeline.initialize(this.page!.duration || 5000);

              FabricUtils.applyTransformationsAfterLoad(this.canvas);
              this.canvas.renderAll();
              this.status = "completed";

              resolve();
            });
          },
          "fabric",
        );
      });
    });
  }

  set(template: EditorTemplatePage) {
    this.page = template;
  }

  async load() {
    console.log("Load template", this.status, this.page);
    if (this.status == "pending" || !this.page) {
      return;
    }

    return createPromise<void>((resolve, reject) => {
      this.status = "pending";
      if (!this.page) {
        this.status = "error";
        reject();
      } else {
        this.audio.elements = [];
        this._canvas.elements = [];

        // this._canvas.id = this.page.id;
        this._canvas.name = this.page.name;

        this.cropper.active = null;
        this.selection.active = null;

        Promise.all([this.audio.initialize(this.page!.data.audios), this._scene()])
          .then(() => resolve())
          .catch(() => reject());
      }
    });
  }
}
