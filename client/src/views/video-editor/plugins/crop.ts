import { fabric } from "fabric";

import { FabricUtils } from "video-editor/fabric/utils";
import { createInstance, isVideoElement } from "video-editor/lib/utils";
import { Canvas } from "video-editor/plugins/canvas";

export class CanvasCropper {
  private _canvas: Canvas;
  active: fabric.Image | null;

  constructor(canvas: Canvas) {
    this.active = null;
    this._canvas = canvas;

    this._initEvents();
    // makeAutoObservable(this);
  }

  private get canvas() {
    return this._canvas.instance!;
  }

  private get history() {
    return this._canvas.history;
  }

  private _initEvents() {
    this.canvas.on("mouse:dblclick", this._mouseDoubleClickEvent.bind(this));
    this.canvas.on("timeline:start", this._timelineRecorderStartEvent.bind(this));
    this.canvas.on("recorder:start", this._timelineRecorderStartEvent.bind(this));
  }

  private _timelineRecorderStartEvent() {
    this.active = null;
    this.canvas.discardActiveObject();
  }

  private _mouseDoubleClickEvent<T extends Event>(event: fabric.IEvent<T>) {
    if (!(FabricUtils.isImageElement(event.target) || FabricUtils.isVideoElement(event.target)) || this.active === event.target) return;
    event.target.clipPath ? this.cropObjectWithClipPath(event.target) : this.cropObjectWithoutClipPath(event.target);
  }

  cropActiveObject() {
    const object = this.canvas.getActiveObject();
    if (!object || !(FabricUtils.isVideoElement(object) || FabricUtils.isImageElement(object))) return;
    object.clipPath ? this.cropObjectWithClipPath(object) : this.cropObjectWithoutClipPath(object);
  }

  cropObjectWithoutClipPath(image: fabric.Image) {
    this.active = image;
    this.history.active = false;
    this.canvas.fire("crop:start", { target: image });

    const exclude = { excludeFromExport: true, excludeFromTimeline: true, excludeFromAlignment: true };
    const props = { top: image.top, left: image.left, angle: image.angle, width: image.getScaledWidth(), height: image.getScaledHeight(), lockRotation: true };

    const crop = createInstance(fabric.Cropper, { name: "crop_" + image.name, fill: "#ffffff", globalCompositeOperation: "overlay", ...props, ...exclude });
    const overlay = createInstance(fabric.Rect, { name: "overlay_" + image.name, selectable: false, fill: "#00000080", ...props, ...exclude });

    const verticals = Array.from({ length: 3 }, (_, index) => {
      const x = crop.left! + crop.width! * 0.25 * (index + 1);
      const line = createInstance(fabric.Line, [x, crop.top!, x, crop.top! + crop.height!], { name: `crop_v_${index}_${image.name}`, stroke: "#ffffff", selectable: false, evented: false, ...exclude });
      this.canvas.add(line);
      return line;
    });

    const horizontals = Array.from({ length: 3 }, (_, index) => {
      const y = crop.top! + crop.height! * 0.25 * (index + 1);
      const line = createInstance(fabric.Line, [crop.left!, y, crop.left! + crop.width!, y], { name: `crop_h_${index}_${image.name}`, stroke: "#ffffff", selectable: false, evented: false, ...exclude });
      this.canvas.add(line);
      return line;
    });

    const width = image.width!;
    const height = image.height!;
    const cropX = image.cropX!;
    const cropY = image.cropY!;

    const element = image._originalElement as HTMLImageElement | HTMLVideoElement;
    const elementWidth = isVideoElement(element) ? element.videoWidth : element.naturalWidth;
    const elementHeight = isVideoElement(element) ? element.videoHeight : element.naturalHeight;

    image.set({ cropX: 0, cropY: 0, dirty: false, selectable: false, left: image.left! - cropX * image.scaleX!, top: image.top! - cropY * image.scaleY!, width: elementWidth, height: elementHeight });
    crop.set({ left: image.left! + cropX * image.scaleX!, top: image.top! + cropY * image.scaleY!, width: width * image.scaleX!, height: height * image.scaleY!, dirty: false, lockScalingFlip: true });
    overlay.set({ left: image.left, top: image.top, width: image.width! * image.scaleX!, height: image.height! * image.scaleY!, dirty: false });

    this.canvas.discardActiveObject().add(overlay, crop);
    this.canvas.setActiveObject(crop).requestRenderAll();

    crop.on("moving", () => {
      if (crop.top! <= image.top!) crop.set({ top: image.top! });
      if (crop.left! <= image.left!) crop.set({ left: image.left! });

      if (crop.top! + crop.getScaledHeight() >= image.top! + image.getScaledHeight()) crop.set({ top: image.top! + image.getScaledHeight() - crop.getScaledHeight() });
      if (crop.left! + crop.getScaledWidth() >= image.left! + image.getScaledWidth()) crop.set({ left: image.left! + image.getScaledWidth() - crop.getScaledWidth() });

      verticals.map((vertical, index) => vertical.set({ x1: crop.left! + crop.getScaledWidth() * 0.25 * (index + 1), y1: crop.top!, x2: crop.left! + crop.getScaledWidth() * 0.25 * (index + 1), y2: crop.top! + crop.getScaledHeight() }));
      horizontals.map((vertical, index) => vertical.set({ x1: crop.left!, y1: crop.top! + crop.getScaledHeight() * 0.25 * (index + 1), x2: crop.left! + crop.getScaledWidth(), y2: crop.top! + crop.getScaledHeight() * 0.25 * (index + 1) }));

      this.canvas.requestRenderAll();
    });

    crop.on("scaling", () => {
      verticals.map((vertical, index) => vertical.set({ x1: crop.left! + crop.getScaledWidth() * 0.25 * (index + 1), y1: crop.top!, x2: crop.left! + crop.getScaledWidth() * 0.25 * (index + 1), y2: crop.top! + crop.getScaledHeight() }));
      horizontals.map((vertical, index) => vertical.set({ x1: crop.left!, y1: crop.top! + crop.getScaledHeight() * 0.25 * (index + 1), x2: crop.left! + crop.getScaledWidth(), y2: crop.top! + crop.getScaledHeight() * 0.25 * (index + 1) }));
    });

    crop.on("mouseup", () => {
      if (crop.left! < image.left!) {
        const offsetX = image.left! - crop.left!;
        const scaleX = offsetX / crop.width!;
        crop.set({ left: image.left, scaleX: crop.scaleX! - scaleX });
      }

      if (crop.top! < image.top!) {
        const offsetY = image.top! - crop.top!;
        const scaleY = offsetY / crop.height!;
        crop.set({ top: image.top, scaleY: crop.scaleY! - scaleY });
      }

      if (crop.left! + crop.getScaledWidth() > image.left! + image.getScaledWidth()) {
        const offsetX = crop.left! + crop.getScaledWidth() - (image.left! + image.getScaledWidth());
        const scaleX = offsetX / crop.width!;
        crop.set({ scaleX: Math.abs(crop.scaleX! - scaleX) });
      }

      if (crop.top! + crop.getScaledHeight() > image.top! + image.getScaledHeight()) {
        const offsetY = crop.top! + crop.getScaledHeight() - (image.top! + image.getScaledHeight());
        const scaleY = offsetY / crop.height!;
        crop.set({ scaleY: Math.abs(crop.scaleY! - scaleY) });
      }

      verticals.map((vertical, index) => vertical.set({ x1: crop.left! + crop.getScaledWidth() * 0.25 * (index + 1), y1: crop.top!, x2: crop.left! + crop.getScaledWidth() * 0.25 * (index + 1), y2: crop.top! + crop.getScaledHeight() }));
      horizontals.map((vertical, index) => vertical.set({ x1: crop.left!, y1: crop.top! + crop.getScaledHeight() * 0.25 * (index + 1), x2: crop.left! + crop.getScaledWidth(), y2: crop.top! + crop.getScaledHeight() * 0.25 * (index + 1) }));
    });

    crop.on("deselected", () => {
      const cropX = (crop.left! - image.left!) / image.scaleX!;
      const cropY = (crop.top! - image.top!) / image.scaleY!;
      const width = (crop.width! * crop.scaleX!) / image.scaleX!;
      const height = (crop.height! * crop.scaleY!) / image.scaleY!;

      image.set({ cropX: cropX, cropY: cropY, width: width, height: height, top: image.top! + cropY * image.scaleY!, left: image.left! + cropX * image.scaleX!, selectable: true });
      image.setCoords();

      this.canvas.remove(overlay, crop, ...verticals, ...horizontals);
      this.canvas.setActiveObject(image).requestRenderAll();
      this.canvas.fire("crop:end", { target: image });

      this.active = null;
      this.history.active = true;
      this.canvas.fire("object:modified", { target: image });
    });
  }

  cropObjectWithClipPath(image: fabric.Image) {
    this.active = image;
    this.history.active = false;
    this.canvas.fire("crop:start", { target: image });

    const clipPath = image.clipPath!;
    const element = image.getElement();

    const index = this.canvas._objects.findIndex((object) => object === image);
    const fill = clipPath.fill;

    const top = image.top!;
    const left = image.left!;

    const x = image.cropX! * image.scaleX!;
    const y = image.cropY! * image.scaleY!;

    const width = isVideoElement(element) ? element.videoWidth : element.naturalWidth;
    const height = isVideoElement(element) ? element.videoHeight : element.naturalHeight;

    image.off("moving");
    image.off("scaling");
    image.off("rotating");

    image.set({ left: left - x, top: top - y, height: height, width: width, cropX: 0, cropY: 0 });
    image.set({ dirty: false, clipPath: undefined, lockRotation: true, lockScalingFlip: true });
    image.bringToFront();

    const props = { top: image.top, left: image.left, angle: image.angle, width: image.width, height: image.height, scaleX: image.scaleX, scaleY: image.scaleY };
    const overlay = createInstance(fabric.Rect, { selectable: false, excludeFromExport: true, excludeFromTimeline: true, excludeFromAlignment: true, evented: false, fill: "#00000080", ...props });
    this.canvas.add(overlay);

    clipPath.set({ globalCompositeOperation: "overlay", opacity: 1, fill: "#ffffff", lockScalingFlip: false, lockRotation: true, selectable: true, evented: true });
    clipPath.bringToFront();
    this.canvas.setActiveObject(image).requestRenderAll();

    const handlerMoving = () => {
      const imageHeight = image.getScaledHeight();
      const imageWidth = image.getScaledWidth();

      const clipPathHeight = clipPath.getScaledHeight();
      const clipPathWidth = clipPath.getScaledWidth();

      if (image.top! >= clipPath.top!) image.top = clipPath.top!;
      if (image.left! >= clipPath.left!) image.left = clipPath.left!;

      if (image.top! + imageHeight <= clipPath.top! + clipPathHeight) image.top = clipPath.top! - (imageHeight - clipPathHeight);
      if (image.left! + imageWidth <= clipPath.left! + clipPathWidth) image.left = clipPath.left! - (imageWidth - clipPathWidth);

      image.setCoords();
      overlay.set({ left: image.left, top: image.top });
      clipPath.setCoords();
    };

    const handlerScaling = () => {
      image.setCoords();
      overlay.set({ scaleX: image.scaleX, scaleY: image.scaleY, left: image.left, top: image.top });
      clipPath.setCoords();
    };

    const handlerMouseUp = () => {
      if (image.left! > clipPath.left!) {
        const scaleX = (image.left! - clipPath.left!) / image.width!;
        image.set({ left: clipPath.left, scaleX: image.scaleX! + scaleX });
      }

      if (image.top! > clipPath.top!) {
        const scaleY = (image.top! - clipPath.top!) / image.height!;
        image.set({ top: clipPath.top, scaleY: image.scaleY! + scaleY });
      }

      if (image.left! + image.getScaledWidth() < clipPath.left! + clipPath.getScaledWidth()) {
        const scaleX = (clipPath.left! + clipPath.getScaledWidth() - (image.left! + image.getScaledWidth())) / image.width!;
        image.set({ scaleX: Math.abs(image.scaleX! + scaleX) });
      }

      if (image.top! + image.getScaledHeight() < clipPath.top! + clipPath.getScaledHeight()) {
        const scaleY = (clipPath.top! + clipPath.getScaledHeight() - (image.top! + image.getScaledHeight())) / image.height!;
        image.set({ scaleY: Math.abs(image.scaleY! + scaleY) });
      }

      const difference = image.width! / image.height! - image.getScaledWidth() / image.getScaledHeight();
      if (difference > 0.025) image.set({ scaleX: image.scaleY });
      if (difference < 0.025) image.set({ scaleY: image.scaleX });

      image.setCoords();
      overlay.set({ scaleX: image.scaleX, scaleY: image.scaleY, left: image.left, top: image.top });
      clipPath.setCoords();
    };

    const handlerDeselected = () => {
      if (this.canvas._activeObject === clipPath || this.canvas._activeObject === image) return;

      const cropX = (clipPath.left! - image.left!) / image.scaleX!;
      const cropY = (clipPath.top! - image.top!) / image.scaleY!;

      const width = (clipPath.width! * clipPath.scaleX!) / image.scaleX!;
      const height = (clipPath.height! * clipPath.scaleY!) / image.scaleY!;

      image.moveTo(index);
      clipPath.moveTo(index);

      image.set({ cropX: cropX, cropY: cropY, width: width, height: height, top: clipPath.top, left: clipPath.left, clipPath: clipPath, lockRotation: false, lockScalingFlip: false });
      clipPath.set({ globalCompositeOperation: undefined, fill: fill, opacity: 0.01, evented: false, selectable: false, lockRotation: false, lockScalingFlip: true });

      image.off("scaling");
      image.off("deselected");
      image.off("moving");

      clipPath.off("moving");
      clipPath.off("mouseup");
      clipPath.off("deselected");

      FabricUtils.bindObjectTransformToParent(image, [clipPath]);
      const handler = () => FabricUtils.updateObjectTransformToParent(image, [{ object: clipPath }]);

      image.on("moving", handler);
      image.on("scaling", handler);
      image.on("rotating", handler);

      this.canvas.remove(overlay).requestRenderAll();
      this.canvas.fire("crop:end", { target: image });

      this.active = null;
      this.history.active = true;
      this.canvas.fire("object:modified", { target: image });
    };

    image.on("moving", handlerMoving);
    image.on("scaling", handlerScaling);
    image.on("mouseup", handlerMouseUp);
    image.on("deselected", handlerDeselected);

    clipPath.on("moving", handlerMoving);
    clipPath.on("mouseup", handlerMouseUp);
    clipPath.on("deselected", handlerDeselected);
  }
}
