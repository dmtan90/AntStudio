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

    const seek = this._canvas.timeline.seek;
    const isAudio = FabricUtils.isAudioElement(object) || object.type === 'audio';
    const isVideo = FabricUtils.isVideoElement(object);

    if (isAudio && (object as any).id) {
        const audio = this._canvas.audio.elements.find(e => e.id === (object as any).id);
        if (!audio) return;

        // Convert offset to ms if stored in seconds (based on play logic it's seconds, but let's check)
        // Actually, EditorAudioElement.offset is usually seconds in this codebase.
        // Let's assume seconds for EditorAudioElement properties as seen in audio.ts play().
        const clipStartMs = audio.offset * 1000;
        const clipDurationMs = audio.timeline * 1000;
        const relativeSeekMs = seek - clipStartMs;

        if (relativeSeekMs <= 100 || relativeSeekMs >= clipDurationMs - 100) {
            return; // Too close to edges
        }

        // Create second clip
        const newAudio: EditorAudioElement = {
            ...JSON.parse(JSON.stringify(audio)), // Deep clone properties
            id: FabricUtils.elementID("audio"),
            offset: seek / 1000,
            timeline: (clipDurationMs - relativeSeekMs) / 1000,
            trim: audio.trim + (relativeSeekMs / 1000),
            source: undefined as any, // Will be re-initialized on play
            playing: false
        };

        // Truncate first clip
        audio.timeline = relativeSeekMs / 1000;

        this._canvas.audio.elements.push(newAudio);
        this._canvas.editor.onModified?.();
        return newAudio;
    }

    if (isVideo) {
        const video = this.canvas.getItemByName(object.name) as any;
        if (!video || !video.meta) return;

        const clipStartMs = video.meta.offset;
        const clipDurationMs = video.meta.duration;
        const relativeSeekMs = seek - clipStartMs;

        if (relativeSeekMs <= 100 || relativeSeekMs >= clipDurationMs - 100) {
            return;
        }

        // Create second clip
        const clone: any = await this._canvas.cloner.clone(video as fabric.Object);
        clone.set({
            name: FabricUtils.elementID("video"),
            left: video.left, // Keep same position
            top: video.top
        });
        
        clone.meta = {
            ...video.meta,
            offset: seek,
            duration: clipDurationMs - relativeSeekMs
        };

        // Update second clip trim
        clone.set('trimStart', (video.trimStart || 0) + (relativeSeekMs / 1000));

        // Truncate first clip
        video.meta.duration = relativeSeekMs;

        this.canvas.add(clone);
        this.canvas.requestRenderAll();
        this._canvas.editor.onModified?.();
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
