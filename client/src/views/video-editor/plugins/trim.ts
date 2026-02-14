import { propertiesToInclude } from "video-editor/fabric/constants";
import { FabricUtils } from "video-editor/fabric/utils";
import { Canvas } from "video-editor/plugins/canvas";
import type { EditorAudioElement, EditorTrim } from "video-editor/types/editor";

export class CanvasTrimmer {
  private _canvas: Canvas;
  active: EditorTrim;

  constructor(canvas: Canvas) {
    this.active = null;
    this._canvas = canvas;

    this._initEvents();
    // makeAutoObservable(this);
  }

  private get canvas() {
    return this._canvas.instance!;
  }

  private get selection() {
    return this._canvas.selection;
  }

  private _initEvents() {
    this.canvas.on("timeline:start", this._timelineRecorderStartEvent.bind(this));
    this.canvas.on("recorder:start", this._timelineRecorderStartEvent.bind(this));
    this.canvas.on("object:modified", this._objectModifiedEvent.bind(this));
  }

  private _objectModifiedEvent(event: fabric.IEvent) {
    if (!event.target || !this.active) return;
    if (event.target.name === this.active.object.name) this.active.object = event.target.toObject(propertiesToInclude);
  }

  private _timelineRecorderStartEvent() {
    this.active = null;
    this._canvas.instance?.discardActiveObject();
  }

  private _trimAudioStart(audio: EditorAudioElement) {
    this.active = Object.assign({ type: "audio" as "audio" }, { object: audio });
  }

  private _trimAudioEnd() {
    this.active = null;
  }

  private _trimVideoStart(video: any) {
    this.active = Object.assign({ type: "video" as "video" }, { object: video.toObject(propertiesToInclude) });
    video.on("deselected", () => this._trimVideoEnd());
  }

  private _trimVideoEnd() {
    const object = this._canvas.instance.getItemByName(this.active?.object.name);
    this.active = null;
    if (!FabricUtils.isVideoElement(object)) return;
    object.seek(this._canvas.timeline.seek);
    this._canvas.instance.requestRenderAll();
  }

  async split() {
    const object = this.selection.active;
    if (!object) return;
    if (FabricUtils.isVideoElement(object)) {
      const video = this.canvas.getItemByName(object.name) as any;

      const clone: any = await this._canvas.cloner.clone(video as fabric.Object);
      return clone;
    }
  }

  start() {
    const object = this.selection.active;
    if (!object) return;
    if (FabricUtils.isVideoElement(object)) {
      const video = this.canvas.getItemByName(object.name) as any;
      this._trimVideoStart(video);
    }
    if (FabricUtils.isAudioElement(object)) {
      this._trimAudioStart(object);
    }
  }

  exit() {
    if (!this.active) return;
    else if (this.active.type === 'video') this._trimVideoEnd();
    else if (this.active.type === 'audio') this._trimAudioEnd();
  }
}
