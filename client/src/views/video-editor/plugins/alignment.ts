import { createInstance } from "video-editor/lib/utils";
import { Canvas } from "video-editor/plugins/canvas";
import { fabric } from "fabric";

export class CanvasAlignment {
  private _canvas: Canvas;

  constructor(canvas: Canvas) {
    this._canvas = canvas;
    // makeAutoObservable(this);
  }

  private get canvas() {
    return this._canvas.instance!;
  }

  private get artboard() {
    return this._canvas.artboard!;
  }

  changeLayer(element: fabric.Object, type: "up" | "down" | "top" | "bottom") {
    switch (type) {
      case "up":
        element.bringForward();
        break;
      case "down":
        if (this.canvas.indexOf(element) > 1) element.sendBackwards();
        break;
      case "top":
        element.bringToFront();
        break;
      case "bottom":
        element.moveTo(1);
        break;
    }
    this.canvas.fire("object:layer", { target: element });
  }

  changeActiveObjectLayer(type: "up" | "down" | "top" | "bottom") {
    const selected = this.canvas.getActiveObject();
    if (selected) this.changeLayer(selected, type);
  }

  alignToPage(element: fabric.Object, type: "left" | "center" | "right" | "top" | "middle" | "bottom") {
    const elementCenter = element.getCenterPoint();
    const artboardCenter = this.artboard.getCenterPoint();

    switch (type) {
      case "left":
        element.setPositionByOrigin(createInstance(fabric.Point, this.artboard.left!, elementCenter.y), "left", "center");
        break;
      case "center":
        element.setPositionByOrigin(createInstance(fabric.Point, artboardCenter.x!, elementCenter.y), "center", "center");
        break;
      case "right":
        element.setPositionByOrigin(createInstance(fabric.Point, this.artboard.left! + this.artboard.width!, elementCenter.y), "right", "center");
        break;
      case "top":
        element.setPositionByOrigin(createInstance(fabric.Point, elementCenter.x, this.artboard.top!), "center", "top");
        break;
      case "middle":
        element.setPositionByOrigin(createInstance(fabric.Point, elementCenter.x, artboardCenter.y), "center", "center");
        break;
      case "bottom":
        element.setPositionByOrigin(createInstance(fabric.Point, elementCenter.x, this.artboard.top! + this.artboard.height!), "center", "bottom");
        break;
    }

    element.setCoords();
    this.canvas.fire("object:modified", { target: element }).requestRenderAll();
  }

  alignObjects(type: "left" | "center" | "right" | "top" | "middle" | "bottom") {
    const selected = this.canvas.getActiveObject();
    if (!selected || !selected.isType("activeSelection")) return;

    const selection = selected as fabric.ActiveSelection;
    const objects = selection.getObjects();

    switch (type) {
      case "left": {
        const minLeft = Math.min(...objects.map(o => o.left!));
        objects.forEach(o => o.set({ left: minLeft }));
        break;
      }
      case "center": {
        const groupCenter = selection.getCenterPoint().x;
        objects.forEach(o => o.set({ left: groupCenter - (o.width! * o.scaleX!) / 2 }));
        break;
      }
      case "right": {
        const maxRight = Math.max(...objects.map(o => o.left! + o.width! * o.scaleX!));
        objects.forEach(o => o.set({ left: maxRight - o.width! * o.scaleX! }));
        break;
      }
      case "top": {
        const minTop = Math.min(...objects.map(o => o.top!));
        objects.forEach(o => o.set({ top: minTop }));
        break;
      }
      case "middle": {
        const groupMiddle = selection.getCenterPoint().y;
        objects.forEach(o => o.set({ top: groupMiddle - (o.height! * o.scaleY!) / 2 }));
        break;
      }
      case "bottom": {
        const maxBottom = Math.max(...objects.map(o => o.top! + o.height! * o.scaleY!));
        objects.forEach(o => o.set({ top: maxBottom - o.height! * o.scaleY! }));
        break;
      }
    }

    this.canvas.requestRenderAll();
    this.canvas.fire("object:modified", { target: selection });
  }

  distributeObjects(type: "horizontal" | "vertical") {
    const selected = this.canvas.getActiveObject();
    if (!selected || !selected.isType("activeSelection")) return;

    const selection = selected as fabric.ActiveSelection;
    const objects = [...selection.getObjects()];

    if (type === "horizontal") {
      objects.sort((a, b) => a.left! - b.left!);
      const minLeft = objects[0].left!;
      const maxRight = objects[objects.length - 1].left! + objects[objects.length - 1].width! * objects[objects.length - 1].scaleX!;
      const totalWidth = objects.reduce((sum, o) => sum + o.width! * o.scaleX!, 0);
      const space = (maxRight - minLeft - totalWidth) / (objects.length - 1);

      let currentLeft = minLeft;
      objects.forEach((o, i) => {
        o.set({ left: currentLeft });
        currentLeft += o.width! * o.scaleX! + space;
      });
    } else {
      objects.sort((a, b) => a.top! - b.top!);
      const minTop = objects[0].top!;
      const maxBottom = objects[objects.length - 1].top! + objects[objects.length - 1].height! * objects[objects.length - 1].scaleY!;
      const totalHeight = objects.reduce((sum, o) => sum + o.height! * o.scaleY!, 0);
      const space = (maxBottom - minTop - totalHeight) / (objects.length - 1);

      let currentTop = minTop;
      objects.forEach((o, i) => {
        o.set({ top: currentTop });
        currentTop += o.height! * o.scaleY! + space;
      });
    }

    this.canvas.requestRenderAll();
    this.canvas.fire("object:modified", { target: selection });
  }

  alignActiveObjecToPage(type: "left" | "center" | "right" | "top" | "middle" | "bottom") {
    const selected = this.canvas.getActiveObject();
    if (selected) this.alignToPage(selected, type);
  }
}
