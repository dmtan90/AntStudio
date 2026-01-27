import { FabricUtils } from "video-editor/fabric/utils";
import { checkForAudioInVideo } from "video-editor/lib/media";
import { createPromise } from "video-editor/lib/utils";
import { rmbgAI } from "video-editor/models/rmbgAI";
import { Canvas } from "video-editor/plugins/canvas";
import type { EditorReplace } from "video-editor/types/editor";
import { fabric } from "fabric";

export class CanvasReplace {
  private _canvas: Canvas;
  active: EditorReplace;

  constructor(canvas: Canvas) {
    this.active = null;
    this._canvas = canvas;
    this._initEvents();
  }

  private get canvas() {
    return this._canvas.instance!;
  }

  private _initEvents() {
    this.canvas.on("selection:cleared", this._selectionEvent.bind(this));
    this.canvas.on("selection:updated", this._selectionEvent.bind(this));
    this.canvas.on("timeline:start", this._timelineRecorderStartEvent.bind(this));
    this.canvas.on("recorder:start", this._timelineRecorderStartEvent.bind(this));
  }

  private _selectionEvent() {
    this.active = null;
  }

  private _timelineRecorderStartEvent() {
    this.active = null;
    this.canvas.discardActiveObject();
  }

  async replaceImage(image: fabric.Image, source: string) {
    image.meta!.replacing = true;
    return createPromise<fabric.Image>((resolve, reject) => {
      fabric.util.loadImage(
        source,
        (element) => {
          if (!element || !element.height || !element.width) {
            reject();
          } else {
            const props = FabricUtils.calculateReplacementImageProps(image, element);
            image.setElement(element);
            image.meta!.replacing = false;
            image.set(props);
            this.canvas.requestRenderAll();
            resolve(image);
          }
        },
        null,
        "anonymous",
      );
    });
  }

  async replaceVideo(video: fabric.Video, source: string, thumbnail: string) {
    video.meta!.replacing = true;
    return createPromise<fabric.Video>((resolve, reject) => {
      (fabric.util as any).loadVideo(
        source,
        async (element) => {
          if (!element || !element.height || !element.width) {
            reject();
          } else {
            const hasAudio = await checkForAudioInVideo(source);

            element.loop = false;
            element.currentTime = 0;

            element.muted = video._muted() ?? (hasAudio ? false : true);
            element.crossOrigin = video.crossOrigin ?? null;

            video.setElement(element);
            video.meta!.replacing = false;
            video.set({
              scaleX: video.scaleX,
              scaleY: video.scaleY,
              left: video.left,
              top: video.top,
              angle: video.angle,
              cropX: video.cropX,
              cropY: video.cropY,
              hasAudio: hasAudio,
              thumbnail: thumbnail
            });

            this.canvas.requestRenderAll();
            resolve(video);
          }
        },
        null,
        "anonymous",
      );
    });
  }

  mark(object?: fabric.Object | null) {
    if (!object) this.active = null;
    if (FabricUtils.isGifElement(object)) (this as any).active = { type: "gif", object };
    else if (FabricUtils.isImageElement(object)) (this as any).active = { type: "image", object };
    else if (FabricUtils.isVideoElement(object)) (this as any).active = { type: "video", object };
    else if (FabricUtils.isAudioElement(object)) (this as any).active = { type: "audio", object };
    return this.active;
  }

  async replace(source: string, cache?: boolean, thumbnail?: string) {
    if (!this.active) return;
    switch (this.active.type) {
      case "image":
      case "gif":
        this.replaceImage(this.active.object, source);
        if (cache) rmbgAI.removeCacheEntry(this.active.object.name!);
        break;
      case "video":
        this.replaceVideo(this.active.object, source, thumbnail);
        break;
    }

    this.active = null;
  }
}
