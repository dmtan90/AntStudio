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

  alignActiveObjecToPage(type: "left" | "center" | "right" | "top" | "middle" | "bottom") {
    const selected = this.canvas.getActiveObject();
    if (selected) this.alignToPage(selected, type);
  }
}
