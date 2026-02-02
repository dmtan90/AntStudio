import anime from "animejs";
// import { makeAutoObservable } from "mobx";
import { FabricUtils } from "video-editor/fabric/utils";
import { Canvas } from "video-editor/plugins/canvas";

export class CanvasTimeline {
  private _canvas: Canvas;
  private _timeline: anime.AnimeTimelineInstance | null;

  seek: number;
  playing: boolean;
  duration: number;

  constructor(canvas: Canvas) {
    this.seek = 0;
    this.playing = false;
    this.duration = 15000;

    this._timeline = null;
    this._canvas = canvas;

    this._initEvents();
    // makeAutoObservable(this);
  }

  private get canvas() {
    return this._canvas.instance!;
  }

  private get animations() {
    return this._canvas.animations;
  }
  private get text() {
    return this._canvas.text;
  }

  private _initEvents() {
    this.canvas.on("object:added", this._objectAddedEvent.bind(this));
  }

  private _objectAddedEvent(event: fabric.IEvent<MouseEvent>) {
    if (!event.target || event.target.excludeFromTimeline) return;
    this._toggleElement(event.target, this.seek);
  }

  private _toggleElements(ms = this.seek) {
    for (const object of this.canvas._objects) {
      if (!object.excludeFromTimeline || FabricUtils.isAnimatedTextElement(object)) {
        this._toggleElement(object, ms);
      }
    }
    this.canvas.requestRenderAll();
  }

  private _toggleElement(object: fabric.Object, ms = this.seek) {
    const hidden = object.meta!.offset > ms || object.meta!.offset + object.meta!.duration < ms;
    object.visible = !FabricUtils.isTextboxElement(object) || !this.playing ? !hidden : false;
    if (object.clipPath) object.clipPath.visible = object.visible;
    if (FabricUtils.isVideoElement(object) || FabricUtils.isGifElement(object) || FabricUtils.isAudioElement(object)) {
      if (this.playing) {
        if (hidden) object.pause();
        else object.play();
      } else {
        object.pause();
        object.seek((ms - object.meta!.offset) / 1000);
      }
    }
  }

  private _begin(anim: anime.AnimeInstance) {
    this.seek = anim.currentTime;
    this._toggleElements();
  }

  private _update(anim: anime.AnimeInstance) {
    if (anim.currentTime < this.duration) {
      this.seek = anim.currentTime;
      this._toggleElements();

      // Update dynamic filters like FilmGrain
      for (const object of this.canvas._objects) {
        if (!object.visible || !object.filters) continue;
        let needsApply = false;
        object.filters.forEach((f: any) => {
          if (f.type === 'FilmGrain') {
            f.uTime = Math.random();
            needsApply = true;
          }
        });
        if (needsApply) {
          object.applyFilters();
        }
      }
    } else {
      this.pause();
      this.seek = 0;
    }
    // console.log("_update", this.duration, anim.currentTime);
  }

  private _complete(_: anime.AnimeInstance) {
    this.seek = 0;
    this.playing = false;
    this._resetTimeline();
    this.canvas.fire("timeline:stop");
    // console.log("_complete");
  }

  private _initializeTimeline() {
    this.animations.dispose();
    this._timeline = anime.timeline({ duration: this.duration, autoplay: false, begin: this._begin.bind(this), update: this._update.bind(this), complete: this._complete.bind(this) });
    this.animations.initialize(this.canvas, this._timeline!, this.duration);
  }

  private _resetTimeline() {
    if (this._timeline) {
      anime.remove(this._timeline);
      this._timeline = null;
    }
    for (const object of this.canvas._objects) {
      if (FabricUtils.isAnimatedTextElement(object) || FabricUtils.isTextboxElement(object)) {
        this.text.restore(object.name!);
      } else {
        if (object.excludeFromTimeline) continue;
        object.set({ ...(object.anim?.state || {}) });
        if (object.clipPath) object.clipPath.set({ ...(object.clipPath.anim?.state || {}) });
      }
    }
    this._toggleElements();
    // console.log("_resetTimeline", this.seek);
  }

  initialize(duration: number) {
    this.seek = 0;
    this.duration = duration;
    this._toggleElements();
  }

  update(object?: fabric.Object) {
    if (object) {
      this._toggleElement(object, this.seek);
    } else {
      this._toggleElements();
    }
  }

  play() {
    this._initializeTimeline();
    this.canvas.fire("timeline:start");
    this.playing = true;
    this._timeline!.seek(this.seek);
    this._timeline!.play();
  }

  pause() {
    this.playing = false;
    this.canvas.fire("timeline:stop");
    this._timeline!.pause();
    this.animations.deactivate();
    this._resetTimeline();
  }

  set(property: "duration" | "seek", seconds: number) {
    this[property] = seconds * 1000;
    this._toggleElements();
  }

  destroy() {
    this.playing = false;
    this.animations.deactivate();
    this.canvas.fire("timeline:stop");
    if (this._timeline) {
      this._timeline.pause();
      anime.remove(this._timeline);
      this._timeline = null;
    }
  }
}
