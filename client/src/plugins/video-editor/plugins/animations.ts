import { markRaw } from "vue"
import anime from "animejs";
import { random } from "lodash";
import { fabric } from "fabric";
import { Canvas } from "video-editor/plugins/canvas";
import { FabricUtils } from "video-editor/fabric/utils";
import { modifyAnimationEasing } from "video-editor/lib/animations";
import { createInstance } from "video-editor/lib/utils";

type AnimationTimeline = fabric.AnimationTimeline;

type AnimationState = ReturnType<CanvasAnimations["_save"]>;

export class CanvasAnimations {
  private _canvas: Canvas;

  private _extras: fabric.Object[];
  private _active: fabric.Object | null;
  private _timeline: anime.AnimeTimelineInstance | null;

  private _blur = 10;
  private _merge = 15;
  private _zoom = 0.25;

  private _exitOffset = 50;
  private _entryOffset = 50;

  previewing: boolean;

  constructor(canvas: Canvas) {
    this._active = null;
    this._timeline = null;

    this._extras = [];
    this.previewing = false;

    this._canvas = canvas;
  }

  get timeline() {
    return this._canvas.timeline;
  }

  get canvas() {
    return this._canvas.instance;
  }

  get text() {
    return this._canvas.text;
  }

  get anim() {
    return this._canvas.anim;
  }

  private _update(value) {
    // console.log("anime update", value);
    this.canvas.renderAll();
  }

  private _complete(object: fabric.Object) {
    // console.log("anime complete", object);
    setTimeout(() => this.dispose(object), 500);
  }

  private _ungroupAnimatedText(lines: fabric.Group, type: fabric.TextAnimateOptions) {
    if (type === "line") {
      return lines._objects;
    } else {
      return lines._objects
        .map((line) => {
          if (FabricUtils.isGroupElement(line)) {
            if (type === "word") {
              return line._objects;
            } else {
              return line._objects
                .map((word) => {
                  if (FabricUtils.isGroupElement(word)) {
                    return word._objects;
                  } else {
                    return [];
                  }
                })
                .flat();
            }
          } else {
            return [];
          }
        })
        .flat();
    }
  }

  private _save(object: fabric.Object) {
    const left = object.left!;
    const top = object.top!;
    const height = object.height!;
    const width = object.width!;

    const fill = object.fill!;
    const stroke = object.stroke!;
    const opacity = object.opacity!;

    const scaleX = object.scaleX!;
    const scaleY = object.scaleY!;
    const angle = object.angle!;
    const clipPath = object.clipPath;

    const state = { opacity, left, top, scaleX, scaleY, fill, stroke, angle, clipPath, height, width };
    const events = { selectable: object.selectable, evented: object.evented };
    const controls = { hasControls: object.hasControls, hasBorders: object.hasBorders };
    const locks = { lockMovementX: object.lockMovementX, lockMovementY: object.lockMovementY, lockScalingX: object.lockScalingX, lockScalingY: object.lockScalingY, lockRotation: object.lockRotation };

    if (!object.anim) FabricUtils.initializeAnimationProperties(object);
    object.anim!.state = Object.assign(state, events, locks, controls);
    object.set({ lockMovementX: true, lockMovementY: true, lockScalingX: true, lockScalingY: true, lockRotation: true, hasBorders: false, hasControls: false, selectable: false, evented: false });

    return { ...state };
  }

  private _entry(object: fabric.Object, timeline: anime.AnimeTimelineInstance, entry: AnimationTimeline["in"], state: AnimationState, meta: Record<string, any>, mask?: boolean, preview?: boolean) {
    if (!entry) return;

    const { left, top, height, width, opacity, angle, scaleX, scaleY } = state;
    const offset = preview ? 0 : meta.offset + this._entryOffset;
    const easing = modifyAnimationEasing(entry.easing, entry.config);

    switch (entry.name) {
      case "fade": {
        timeline.add(
          {
            targets: object,
            opacity: [0, opacity],
            duration: entry.duration,
            easing: easing,
          },
          offset,
        );
        break;
      }

      case "slide-left": {
        timeline.add(
          {
            targets: object,
            opacity: [0, opacity],
            left: [left - Math.min((width * scaleX) / 2, Number.MAX_SAFE_INTEGER), left],
            duration: entry.duration,
            easing: easing,
          },
          offset,
        );
        break;
      }

      case "slide-right": {
        timeline.add(
          {
            targets: object,
            opacity: [0, opacity],
            left: [left + Math.min((width * scaleX) / 2, Number.MAX_SAFE_INTEGER), left],
            duration: entry.duration,
            easing: easing,
          },
          offset,
        );
        break;
      }

      case "pan-left": {
        timeline.add(
          {
            targets: object,
            left: [left - Math.min((width * scaleX) / 2, Number.MAX_SAFE_INTEGER), left],
            duration: entry.duration,
            easing: easing,
          },
          offset,
        );
        break;
      }

      case "pan-right": {
        timeline.add(
          {
            targets: object,
            left: [left + Math.min((width * scaleX) / 2, Number.MAX_SAFE_INTEGER), left],
            duration: entry.duration,
            easing: easing,
          },
          offset,
        );
        break;
      }

      case "rise-up": {
        timeline.add(
          {
            targets: object,
            opacity: [0, opacity],
            top: [top + Math.min((height * scaleY) / 2, Number.MAX_SAFE_INTEGER), top],
            duration: entry.duration,
            easing: easing,
          },
          offset,
        );
        break;
      }

      case "sink-down": {
        timeline.add(
          {
            targets: object,
            opacity: [0, opacity],
            top: [top - Math.min((height * scaleY) / 2, Number.MAX_SAFE_INTEGER), top],
            duration: entry.duration,
            easing: easing,
          },
          offset,
        );
        break;
      }

      case "pop": {
        timeline.add(
          {
            targets: object,
            scaleY: [1 / height, scaleY],
            top: [top + (height * scaleY) / 2, top],
            duration: entry.duration,
            easing: easing,
          },
          offset,
        );
        break;
      }

      case "wipe": {
        let clipPath = object.clipPath;
        const delta = FabricUtils.calculateAnimationPositionDelta(object);
        const props = { angle, height, width, top: top - delta.x * delta.width, left: left - delta.y * delta.width, absolutePositioned: true };

        if (!clipPath) {
          clipPath = createInstance(fabric.Rect, props);
          object.clipPath = clipPath;
        }

        timeline.add(
          {
            targets: clipPath,
            left: [props.left, left],
            top: [props.top, top],
            duration: entry.duration,
            easing: easing,
          },
          offset,
        );
        break;
      }

      case "baseline": {
        if (mask) return;

        const delta = FabricUtils.calculateAnimationPositionDelta(object);
        if (!object.clipPath) object.clipPath = createInstance(fabric.Rect, { angle, height, width, top, left, absolutePositioned: true });

        timeline.add(
          {
            targets: object,
            top: [top + delta.y * delta.height, top],
            left: [left - delta.x * delta.height, left],
            duration: entry.duration,
            easing: easing,
          },
          offset,
        );
        break;
      }
    }

    if (FabricUtils.isAnimatedTextElement(object)) {
      const text = this._ungroupAnimatedText(object, entry.text || "letter");

      switch (entry.name) {
        case "typewriter": {
          text.map((element, index) => {
            const state = { opacity: 0 };
            element.set(Object.assign({}, state));
            timeline.add(
              {
                targets: state,
                opacity: 1,
                duration: entry.duration / text.length,
                easing: easing,
                update: () => element.set({ opacity: state.opacity }),
              },
              offset + (entry.duration / text.length) * index,
            );
          });
          break;
        }

        case "block": {
          const fill = this._ungroupAnimatedText(object, "letter").at(0)?.fill;
          const overlay = createInstance(fabric.Rect, { left, top, angle, fill, height: height * scaleY, width: width * scaleX, scaleY: 1, scaleX: 1 / (width * scaleX), opacity: 0, excludeFromTimeline: true });
          this.canvas.add(overlay).requestRenderAll();
          this._extras.push(overlay);
          object.set({ opacity: 0 });
          timeline.add(
            {
              targets: overlay,
              opacity: 1,
              duration: 1,
            },
            offset,
          );
          timeline.add(
            {
              targets: overlay,
              scaleX: 1,
              duration: entry.duration * 0.5,
              easing: easing,
            },
            offset,
          );
          timeline.add(
            {
              targets: overlay,
              scaleX: 1 / (width * scaleX),
              left: left + width * scaleX,
              duration: entry.duration * 0.5,
              easing: easing,
              begin: () => object.set({ opacity: 1 }),
            },
            offset + entry.duration * 0.5,
          );
          timeline.add(
            {
              targets: overlay,
              opacity: 0,
              duration: 1,
            },
            offset + entry.duration,
          );
          break;
        }

        case "merge": {
          let index = 0;
          const text = this._ungroupAnimatedText(object, "word");
          object._objects.map((line, outer) => {
            if (FabricUtils.isGroupElement(line)) {
              const multiplier = outer % 2 ? -1 : 1;
              const words = [...line._objects].reverse();
              const delta = FabricUtils.calculateAnimationPositionDelta(line);
              words.map((word) => {
                const target = { top: word.top!, left: word.left!, opacity: word.opacity! };
                const state = { top: target.top + delta.x * this._merge, left: target.left + delta.y * this._merge * multiplier, opacity: 0 };
                word.set(Object.assign({}, state));
                timeline.add(
                  {
                    targets: state,
                    opacity: target.opacity,
                    duration: entry.duration / (text.length - 1),
                    easing: easing,
                    update: () => word.set({ top: state.top, left: state.left, opacity: state.opacity }),
                  },
                  offset + (entry.duration / (text.length + 1)) * index,
                );
                timeline.add(
                  {
                    targets: state,
                    top: target.top,
                    left: target.left,
                    duration: entry.duration,
                    easing: easing,
                    update: () => word.set({ top: state.top, left: state.left }),
                  },
                  offset,
                );
                index += 1;
              });
            }
          });

          break;
        }

        case "burst": {
          text.map((element, index) => {
            const target = { scaleY: element.scaleY, scaleX: element.scaleX, top: element.top!, left: element.left! };
            const state = {
              scaleY: 1 / element.height!,
              scaleX: 1 / element.width!,
              top: element.top! + (element.height! * element.scaleY!) / 2,
              left: element.left! + (element.width! * element.scaleX!) / 2,
            };
            element.set(Object.assign({}, state));
            timeline.add(
              {
                targets: state,
                top: target.top,
                left: target.left,
                scaleX: target.scaleX,
                scaleY: target.scaleY,
                duration: entry.duration / text.length,
                easing: easing,
                update: () => element.set({ scaleX: state.scaleX, scaleY: state.scaleY, top: state.top, left: state.left }),
              },
              offset + (entry.duration / text.length) * index,
            );
          });
          break;
        }

        case "clarify": {
          text.map((element) => {
            const target = { opacity: 1, blur: 0 };
            const state = { opacity: 0, blur: this._blur };
            const seed = random(0, Math.min(500, entry.duration - 250));
            element.set(Object.assign({}, state));
            timeline.add(
              {
                targets: state,
                opacity: target.opacity,
                blur: target.blur,
                duration: entry.duration - seed,
                easing: easing,
                update: () => element.set({ opacity: state.opacity, blur: state.blur }),
              },
              offset + seed,
            );
          });
          timeline.add(
            {
              targets: object,
              left: [left - 15, left],
              duration: entry.duration,
              easing: easing,
            },
            offset,
          );
          break;
        }

        case "bounce": {
          text.map((element, index) => {
            const target = { top: element.top!, opacity: 1 };
            const state = { top: element.top! - element.height! / 2, opacity: 0 };
            element.set(Object.assign({}, state));
            timeline.add(
              {
                targets: state,
                top: target.top,
                opacity: target.opacity,
                duration: entry.duration,
                easing: easing,
                update: () => element.set({ top: state.top, opacity: state.opacity }),
              },
              offset + (entry.duration / text.length) * index,
            );
          });
          break;
        }

        case "ascend": {
          object._objects.map((line) => {
            if (!line.clipPath && FabricUtils.isGroupElement(line)) {
              const matrix = line.calcTransformMatrix();
              const clipPath = createInstance(fabric.Rect, { left: matrix[4] - line.width! / 2, top: matrix[5] - line.height! / 2, height: line.height, width: line.width, absolutePositioned: true });
              clipPath.rotate(object.angle!);
              line.clipPath = clipPath;
            }
          });
          text.map((element, index) => {
            const delta = FabricUtils.calculateAnimationPositionDelta(element);
            const target = { top: element.top!, left: element.left! };
            const state = { top: target.top + delta.y * delta.height!, left: target.left - delta.x * delta.height! };
            element.set(Object.assign({}, state));
            timeline.add(
              {
                targets: state,
                top: target.top,
                left: target.left,
                duration: entry.duration / text.length,
                easing: easing,
                update: () => element.set({ top: state.top, left: state.left }),
              },
              offset + (entry.duration / text.length) * index,
            );
          });
          break;
        }
      }
    }
  }

  private _exit(object: fabric.Object, timeline: anime.AnimeTimelineInstance, exit: AnimationTimeline["in"], state: AnimationState, meta: Record<string, any>, _mask?: boolean, preview?: boolean) {
    if (!exit) return;

    const { left, top, height, width, angle, scaleX, scaleY } = state;
    const offset = preview ? 0 : meta.offset + meta.duration - exit.duration - this._exitOffset;
    const easing = modifyAnimationEasing(exit.easing, exit.config);

    switch (exit.name) {
      case "fade": {
        timeline.add(
          {
            targets: object,
            opacity: 0,
            duration: exit.duration,
            easing: easing,
          },
          offset,
        );
        break;
      }

      case "slide-left": {
        timeline.add(
          {
            targets: object,
            opacity: 0,
            left: [left, left - Math.min((width * scaleX) / 2, Number.MAX_SAFE_INTEGER)],
            duration: exit.duration,
            easing: easing,
          },
          offset,
        );
        break;
      }

      case "slide-right": {
        timeline.add(
          {
            targets: object,
            opacity: 0,
            left: [left, left + Math.min((width * scaleX) / 2, Number.MAX_SAFE_INTEGER)],
            duration: exit.duration,
            easing: easing,
          },
          offset,
        );
        break;
      }

      case "rise-up": {
        timeline.add(
          {
            targets: object,
            opacity: 0,
            top: [top, top - Math.min((height * scaleY) / 2, Number.MAX_SAFE_INTEGER)],
            duration: exit.duration,
            easing: easing,
          },
          offset,
        );
        break;
      }

      case "sink-down": {
        timeline.add(
          {
            targets: object,
            opacity: 0,
            top: [top, top + Math.min((height * scaleY) / 2, Number.MAX_SAFE_INTEGER)],
            duration: exit.duration,
            easing: easing,
          },
          offset,
        );
        break;
      }

      case "pop": {
        timeline.add(
          {
            targets: object,
            scaleY: [scaleY, 1 / height],
            top: [top, top + (height * scaleY) / 2],
            duration: exit.duration,
            easing: easing,
          },
          offset,
        );
        break;
      }

      case "pan-left": {
        timeline.add(
          {
            targets: object,
            left: [left, left - Math.min((width * scaleX) / 2, Number.MAX_SAFE_INTEGER)],
            duration: exit.duration,
            easing: easing,
          },
          offset,
        );
        break;
      }

      case "pan-right": {
        timeline.add(
          {
            targets: object,
            left: [left, left + Math.min((width * scaleX) / 2, Number.MAX_SAFE_INTEGER)],
            duration: exit.duration,
            easing: easing,
          },
          offset,
        );
        break;
      }

      case "wipe": {
        let clipPath = object.clipPath;
        const delta = FabricUtils.calculateAnimationPositionDelta(object);
        const props = { angle, height, width, top: top - delta.x * delta.width, left: left + delta.y * delta.width, absolutePositioned: true };

        if (!clipPath) {
          clipPath = createInstance(fabric.Rect, props);
          object.set({ clipPath });
        }

        timeline.add(
          {
            targets: clipPath,
            left: [left, props.left],
            top: [props.top, top],
            duration: exit.duration,
            easing: easing,
          },
          offset,
        );
        break;
      }

      case "baseline": {
        const delta = FabricUtils.calculateAnimationPositionDelta(object);
        if (!object.clipPath) object.clipPath = createInstance(fabric.Rect, { angle, height, width, top, left, absolutePositioned: true });

        timeline.add(
          {
            targets: object,
            top: [top, top - delta.y * delta.height],
            left: [left - delta.x * delta.height, left],
            duration: exit.duration,
            easing: easing,
          },
          offset,
        );
        break;
      }
    }
  }

  private _scene(
    object: fabric.Object,
    timeline: anime.AnimeTimelineInstance,
    entry: AnimationTimeline["in"],
    exit: AnimationTimeline["out"],
    scene: AnimationTimeline["scene"],
    state: AnimationState,
    meta: Record<string, any>,
    mask?: boolean,
    preview?: boolean,
  ) {
    if (!scene) return;

    const { scaleX, scaleY } = state;
    const animation = scene.duration || 1000;

    const duration = preview ? 5000 : meta.duration - (entry.name === "none" ? 0 : entry.duration + this._entryOffset) - (exit.name === "none" ? 0 : exit.duration + this._exitOffset);
    const offset = preview ? 0 : meta.offset + (entry.name === "none" ? 0 : entry.duration + this._entryOffset);
    const easing = modifyAnimationEasing(scene.easing, scene.config);

    switch (scene.name) {
      case "rotate": {
        timeline.add(
          {
            targets: { angle: object.angle! },
            angle: object.angle! + 360 * Math.round(duration / animation),
            duration: duration,
            easing: easing,
            update: (anim) => {
              const centerPoint = object.getCenterPoint();
              const constraint = object.translateToOriginPoint(centerPoint, "center", "center");
              object.angle = +anim.animations[0].currentValue;
              object.setPositionByOrigin(constraint, "center", "center");
            },
          },
          offset,
        );
        break;
      }

      case "zoom-in": {
        if (mask) return;
        timeline.add(
          {
            targets: { scaleX: object.scaleX, scaleY: object.scaleY },
            scaleX: scaleX + this._zoom,
            scaleY: scaleY + this._zoom,
            duration: duration,
            easing: easing,
            update: (anim) => {
              const centerPoint = object.getCenterPoint();
              const constraint = object.translateToOriginPoint(centerPoint, "center", "center");
              object.scaleX = +anim.animations[0].currentValue;
              object.scaleY = +anim.animations[1].currentValue;
              object.setPositionByOrigin(constraint, "center", "center");
            },
          },
          offset,
        );
        break;
      }

      case "zoom-out": {
        if (mask) return;
        timeline.add(
          {
            targets: { scaleX: object.scaleX, scaleY: object.scaleY },
            scaleX: scaleX - this._zoom,
            scaleY: scaleY - this._zoom,
            duration: duration,
            easing: easing,
            update: (anim) => {
              const centerPoint = object.getCenterPoint();
              const constraint = object.translateToOriginPoint(centerPoint, "center", "center");
              object.scaleX = +anim.animations[0].currentValue;
              object.scaleY = +anim.animations[1].currentValue;
              object.setPositionByOrigin(constraint, "center", "center");
            },
          },
          offset,
        );
        break;
      }

      case "blink": {
        Array.from({ length: Math.ceil(duration / animation) * 2 }, (_, index) => {
          timeline.add(
            {
              targets: object,
              duration: animation / 2,
              opacity: index % 2,
              easing: easing,
            },
            offset + (animation / 2) * index,
          );
        });
        break;
      }
    }
  }

  private _preview(element: fabric.Object, type: "in" | "out" | "scene", animation: AnimationTimeline, meta: Record<string, any>, mask?: boolean) {
    const state = this._save(element);
    switch (type) {
      case "in":
        this._entry(element, this._timeline!, animation["in"], state, meta, mask, true);
        break;
      case "out":
        this._exit(element, this._timeline!, animation["out"], state, meta, mask, true);
        break;
      case "scene":
        this._scene(element, this._timeline!, animation["in"], animation["out"], animation["scene"], state, meta, mask, true);
        this._keyframes(element, this._timeline!, animation["keyframes"] || [], state, meta);
        break;
    }
  }

  private _initialize(object: fabric.Object, timeline: anime.AnimeTimelineInstance, entry: AnimationTimeline["in"], exit: AnimationTimeline["out"], scene: AnimationTimeline["scene"], keyframes: any[], meta: Record<string, any>, mask?: boolean) {
    const state = this._save(object);
    this._entry(object, timeline, entry, state, meta, mask);
    this._exit(object, timeline, exit, state, meta, mask);
    this._scene(object, timeline, entry, exit, scene, state, meta, mask);
    this._keyframes(object, timeline, keyframes, state, meta);
  }

  private _keyframes(object: fabric.Object, timeline: any, keyframes: any[], _state: AnimationState, meta: Record<string, any>) {
    if (!keyframes || keyframes.length === 0) return;

    const sortedKeyframes = [...keyframes].sort((a, b) => a.time - b.time);
    let currentTime = 0;

    for (const kf of sortedKeyframes) {
      const duration = kf.time - currentTime;
      if (duration >= 0) {
        const animationProps: any = {
          targets: object,
          duration: duration,
          easing: kf.easing || "linear",
        };

        if (kf.left !== undefined) animationProps.left = kf.left;
        if (kf.top !== undefined) animationProps.top = kf.top;
        if (kf.scaleX !== undefined) animationProps.scaleX = kf.scaleX;
        if (kf.scaleY !== undefined) animationProps.scaleY = kf.scaleY;
        if (kf.angle !== undefined) animationProps.angle = kf.angle;
        if (kf.opacity !== undefined) animationProps.opacity = kf.opacity;

        timeline.add(animationProps, meta.offset + currentTime);
      }
      currentTime = kf.time;
    }
  }

  preview(object: fabric.Object, type: "in" | "out" | "scene", animation: any) {
    // console.log("preview", object, type, animation);
    if (animation[type].name === "none") return;

    this.previewing = true;
    this._canvas.onToggleControls(false);
    // this.canvas.objectCaching = false;
    const element = FabricUtils.isTextboxElement(object) ? this.text.animate(object, this.canvas) : object;

    this._active = object;
    const timeline = anime.timeline({
      update: this._update.bind(this),
      complete: this._complete.bind(this, element),
      endDelay: 2000,
      loop: true
    });

    this._timeline = timeline;

    if (element.clipPath) this._preview(element.clipPath, type, animation, element.meta!, true);
    this._preview(element, type, animation, element.meta!);

    this._timeline.play();
    element.on("deselected", this.dispose.bind(this, element));
  }

  initialize(canvas: fabric.Canvas | fabric.StaticCanvas, timeline: anime.AnimeTimelineInstance, duration: number) {
    timeline.add({ targets: canvas, duration: duration });
    for (const object of canvas._objects) {
      if (object.excludeFromTimeline) continue;
      if (FabricUtils.isTextboxElement(object)) {
        const textbox = this.text.animate(object, canvas);
        this._initialize(textbox, timeline, textbox.anim!.in, textbox.anim!.out, textbox.anim!.scene, textbox.anim!.keyframes || [], textbox.meta!);
      } else {
        if (object.clipPath) this._initialize(object.clipPath, timeline, object.anim!.in, object.anim!.out, object.anim!.scene, object.anim!.keyframes || [], object.meta!, true);
        this._initialize(object, timeline, object.anim!.in, object.anim!.out, object.anim!.scene, object.anim!.keyframes || [], object.meta!);
      }
    }
  }

  deactivate() {
    this.canvas.remove(...this._extras);
    this._extras = [];
  }

  dispose(object = this._active) {
    // console.log("dispose", object);
    this._timeline?.pause();
    anime.remove(this._timeline as any);

    this.deactivate();
    this._canvas.onToggleControls(true);

    this._active = null;
    this._timeline = null;

    if (FabricUtils.isTextboxElement(object) || FabricUtils.isAnimatedTextElement(object)) {
      this.text.restore(object.name!);
    } else {
      object?.set({ ...(object?.anim?.state || {}) });
      object?.clipPath?.set({ ...(object?.clipPath?.anim?.state || {}) });
    }

    // object.objectCaching = true;
    object?.off("deselected");
    this.previewing = false;
    // this.canvas.objectCaching = true;
    this.canvas.renderAll();
  }
}
