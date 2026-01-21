// @ts-ignore
import { propertiesToInclude } from "video-editor/fabric/constants";
import { FabricUtils } from "video-editor/fabric/utils";
import { createPromise } from "video-editor/lib/utils";
import { Canvas } from "video-editor/plugins/canvas";
import { cloneDeep, cloneDeepWith } from "lodash";
import { type EditorAudioElement } from "video-editor/types/editor";

export class CanvasClone {
  private _canvas: Canvas;
  private _clipboard: fabric.Object | null;

  constructor(canvas: Canvas) {
    this._canvas = canvas;
    this._clipboard = null;
  }

  get canvas(){
    return this._canvas;
  }

  _resolver(_: unknown, key: string | number | undefined) {
    switch (key) {
      case "clipPath":
        return null;
      case "filters":
        return null;
    }
  }

  copy(_object?: fabric.Object | EditorAudioElement) {
    // const object = _object || this._canvas.instance.getActiveObject();
    this._clipboard = _object || this.canvas.instance.getActiveObject();
  }

  async paste() : Promise<fabric.Object | EditorAudioElement> {
    if (!this._clipboard) return null;
    const type = this._clipboard.type || "audio";

    const name = (type == "audio") ? 
      FabricUtils.elementID(this._clipboard.id!.split("_").at(0) || "clone") :
      FabricUtils.elementID(this._clipboard.name!.split("_").at(0) || "clone");
    // if(this._clipboard.type == 'audio'){
    //   // const id = FabricUtils.elementID(this._clipboard.name!.split("_").at(0) || "clone");
    //   const audio = this._canvas.audio.get(this._clipboard.name);
    //   const cloneAudio: EditorAudioElement = cloneDeep(audio);
    //   cloneAudio.id = name;
    //   // @ts-expect-error
    //   // this._canvas.audio.elements.push(cloneAudio as EditorAudioElement);
    // }
    let clone: fabric.Object | EditorAudioElement = null;
    // const clone: fabric.Object | EditorAudioElement = await createPromise<fabric.Object | EditorAudioElement>((resolve) => this._clipboard!.clone(resolve, propertiesToInclude));
    if(type != "audio"){
      const meta = cloneDeep(this._clipboard.meta);
      const anim = cloneDeepWith(this._clipboard.anim, this._resolver);
      clone = await createPromise<fabric.Object>((resolve) => this._clipboard!.clone(resolve, propertiesToInclude));
      clone.set({ name: name, top: clone.top! + 10, left: clone.left! + 10, meta: meta, anim: anim, clipPath: undefined });  
    }
    else{
      clone = cloneDeep(this._clipboard);
      clone.id = name;
    }

    if (this._clipboard.clipPath) {
      this.canvas.history.active = false;

      const clipPath: fabric.Object = await createPromise<fabric.Object>((resolve) => this._clipboard!.clipPath!.clone(resolve, propertiesToInclude));
      clipPath.set({ name: FabricUtils.elementID(clipPath.name!.split("_").at(0) || "clone") });

      FabricUtils.bindObjectTransformToParent(clone, [clipPath]);
      const handler = () => FabricUtils.updateObjectTransformToParent(clone, [{ object: clipPath }]);

      clone.on("moving", handler);
      clone.on("scaling", handler);
      clone.on("rotating", handler);
      clone.set({ clipPath }).setCoords();

      this.canvas.instance.add(clipPath, clone);
      this.canvas.instance.setActiveObject(clone).requestRenderAll();
      this.canvas.history.active = true;

      this.canvas.instance.fire("object:modified", { target: clone });
      this.canvas.instance.fire("clip:added", { target: clone });
    } else if(type != "audio") {
      this.canvas.instance.add(clone);
      this.canvas.instance.setActiveObject(clone).requestRenderAll();
    } else {
      // let audio = await this.canvas.audio.add(clone.url, clone.name, clone.visual ?? false, name);
      // clone = object.assign(...audio, {offset: clone.offset, timeline: clone.timeline, duration: clone.duration});
      await this.canvas.audio?.initialize([clone]);
      clone = this.canvas.audio.get(name)
    }

    this._clipboard = clone;
    return clone;
  }

  async clone(object?: fabric.Object | EditorAudioElement) : Promise<fabric.Object> {
    this.copy(object);
    const cloned = await this.paste();
    console.log("clone", cloned);
    this.destroy();
    return cloned;
  }

  destroy() {
    this._clipboard = null;
  }
}
