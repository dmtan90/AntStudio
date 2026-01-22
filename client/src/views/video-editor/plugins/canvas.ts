import { markRaw, ref } from "vue"
import { nanoid } from "nanoid";
import { fabric } from "fabric";
import { floor, isUndefined } from "lodash";
// import { AnimationTimeline } from "canvas";
type AnimationTimeline = fabric.AnimationTimeline;
import type { EditorAudioElement } from "video-editor/types/editor";

import { CanvasAlignment } from "video-editor/plugins/alignment";
import { CanvasAudio } from "video-editor/plugins/audio";
import { CanvasCropper } from "video-editor/plugins/crop";
import { CanvasEffects } from "video-editor/plugins/filters";
import { CanvasGuidelines } from "video-editor/plugins/guidelines";
import { CanvasHistory } from "video-editor/plugins/history";
import { CanvasClipMask } from "video-editor/plugins/mask";
import { CanvasReplace } from "video-editor/plugins/replace";
import { CanvasSelection } from "video-editor/plugins/selection";
import { CanvasTemplate } from "video-editor/plugins/template";
import { CanvasTimeline } from "video-editor/plugins/timeline";
import { CanvasTrimmer } from "video-editor/plugins/trim";
import { CanvasWorkspace } from "video-editor/plugins/workspace";
import { CanvasChart } from "video-editor/plugins/chart";
import { CanvasText } from "video-editor/plugins/text";
import { CanvasAnimations } from "video-editor/plugins/animations";

import type { EditorFont } from "video-editor/constants/fonts";
import { activityIndicator, propertiesToInclude, textLayoutProperties, defaultColor, defaultBackgroundColor, defaultFill, defaultStroke } from "video-editor/fabric/constants";
import { FabricUtils } from "video-editor/fabric/utils";
import { createInstance, createPromise } from "video-editor/lib/utils";
import { CanvasHotkeys } from "video-editor/plugins/hotkeys";
import { CanvasClone } from "video-editor/plugins/clone";
import { defaultSpringConfig } from "video-editor/constants/animations";
import { Editor, type Dimension } from "./editor";
import { getFileUrl } from "@/utils/api";

export class Canvas {
  id: string;
  name: string;

  editor: Editor;
  artboard!: fabric.Rect;
  instance!: fabric.Canvas;

  text!: CanvasText;
  audio!: CanvasAudio;
  chart!: CanvasChart;
  timeline!: CanvasTimeline;
  animations!: CanvasAnimations;
  workspace!: CanvasWorkspace;
  cloner!: CanvasClone;

  replacer!: CanvasReplace;
  effects!: CanvasEffects;
  cropper!: CanvasCropper;
  clipper!: CanvasClipMask;
  trimmer!: CanvasTrimmer;

  hotkeys!: CanvasHotkeys;
  history!: CanvasHistory;
  template!: CanvasTemplate;
  selection!: CanvasSelection;
  alignment!: CanvasAlignment;

  controls: boolean;
  elements: fabric.Object[];
  anim!: AnimationTimeline;//default animation for elements
  public initialized: boolean;

  constructor(editor: Editor) {
    this.id = nanoid();
    this.name = "Untitled Page";

    this.elements = [];
    this.controls = true;
    this.initialized = false;

    this.editor = editor;
    this.template = createInstance(CanvasTemplate, this);
  }

  private _toggleControls(object: fabric.Object, enabled: boolean) {
    object.hasControls = enabled;
    this.controls = enabled;
  }

  private _refreshElements() {
    this.elements = this.instance._objects.filter((object) => !object.excludeFromTimeline).map((object) => object.toObject(propertiesToInclude));
  }

  private _objectAddedEvent(event: fabric.IEvent) {
    // console.log("_objectAddedEvent", event.target);
    if (!event.target || event.target.excludeFromTimeline) return;
    this.elements.push(event.target.toObject(propertiesToInclude));
  }

  private _objectModifiedEvent(event: fabric.IEvent) {
    // console.log("_objectModifiedEvent", event.target);
    if (!event.target) return;
    this._toggleControls(event.target, true);
    FabricUtils.applyObjectScaleToDimensions(event.target, ["rect", "circle", "triangle", "ellipse"]);
    event.target.setCoords();
    const index = this.elements.findIndex((element) => element.name === event.target!.name);
    if (index === -1 || event.target.excludeFromTimeline) return;
    this.elements[index] = event.target.toObject(propertiesToInclude);
  }

  private _objectDeletedEvent(event: fabric.IEvent) {
    // console.log("_objectDeletedEvent", event.target);
    if (!event.target) return;
    const index = this.elements.findIndex((element) => element.name === event.target!.name);
    if (index !== -1) this.elements.splice(index, 1);
    if (event.target.clipPath) this.instance.remove(event.target.clipPath);
  }

  private _objectMovingEvent(event: fabric.IEvent) {
    // console.log("_objectMovingEvent", event.target);
    if (!event.target) return;
    this._toggleControls(event.target, false);
  }

  private _objectScalingEvent(event: fabric.IEvent) {
    // console.log("_objectScalingEvent", event.target);
    if (!event.target) return;
    this._toggleControls(event.target, false);
  }

  private _objectRotatingEvent(event: fabric.IEvent<MouseEvent>) {
    // console.log("_objectRotatingEvent", event.target);
    if (!event.target) return;
    this._toggleControls(event.target, false);
    if (event.e.shiftKey) event.target.set({ snapAngle: 45 });
    else event.target.set({ snapAngle: undefined });
  }

  get thumbnailElements() {
    //get elements to build thumbnails
    const elements = this.elements.filter(element => {
      if (element.meta && element.meta.duration && element.meta.duration > 1000 && element.meta.offset <= 2000) {
        // console.log(element.meta);
        return true;
      }
      return false;
    });
    // console.log(elements);
    return elements;
  }

  private _initEvents() {
    this.instance.on("object:added", this._objectAddedEvent.bind(this));
    this.instance.on("object:modified", this._objectModifiedEvent.bind(this));
    this.instance.on("object:removed", this._objectDeletedEvent.bind(this));
    this.instance.on('before:selection:cleared', this._objectModifiedEvent.bind(this));

    this.instance.on("object:moving", this._objectMovingEvent.bind(this));
    this.instance.on("object:scaling", this._objectScalingEvent.bind(this));
    this.instance.on("object:rotating", this._objectRotatingEvent.bind(this));

    this.instance.on("clip:added", this._refreshElements.bind(this));
    this.instance.on("clip:removed", this._refreshElements.bind(this));
    this.instance.on("object:layer", this._refreshElements.bind(this));
  }

  initialize(element: HTMLCanvasElement, workspace: HTMLDivElement) {
    // console.log("initialize canvas", element, workspace);
    const props = { width: workspace.offsetWidth, height: workspace.offsetHeight, backgroundColor: "#F0F0F0" };
    this.instance = markRaw(createInstance(fabric.Canvas, element, { stateful: true, centeredRotation: true, preserveObjectStacking: true, renderOnAddRemove: false, controlsAboveOverlay: true, ...props }));
    this.artboard = markRaw(createInstance(fabric.Rect, { name: "artboard", rx: 0, ry: 0, selectable: false, absolutePositioned: true, hoverCursor: "default", excludeFromExport: true, excludeFromTimeline: true }));

    this.history = createInstance(CanvasHistory, this);
    this.alignment = createInstance(CanvasAlignment, this);
    this.selection = createInstance(CanvasSelection, this);
    this.replacer = createInstance(CanvasReplace, this);

    this.effects = createInstance(CanvasEffects, this);
    this.clipper = createInstance(CanvasClipMask, this);
    this.cropper = createInstance(CanvasCropper, this);
    this.trimmer = createInstance(CanvasTrimmer, this);
    this.hotkeys = createInstance(CanvasHotkeys, this);
    this.cloner = createInstance(CanvasClone, this);

    this.text = markRaw(createInstance(CanvasText, this));
    this.chart = markRaw(createInstance(CanvasChart, this));
    this.audio = createInstance(CanvasAudio, this);
    this.timeline = createInstance(CanvasTimeline, this);
    this.animations = createInstance(CanvasAnimations, this);
    this.workspace = createInstance(CanvasWorkspace, this, workspace, this.editor.dimension);

    this._initEvents();
    CanvasGuidelines.initializeAligningGuidelines(this.instance);

    this.instance.clipPath = this.artboard;
    this.instance.add(this.artboard).renderAll();
    if (this.template.pending) this.template.load();
    this.initialized = true;
  }

  onToggleControls(visible?: boolean) {
    if (isUndefined(visible)) this.controls = !this.controls;
    else this.controls = visible;
  }

  onDeleteObject(object?: fabric.Object) {
    if (object) this.instance.remove(object).requestRenderAll();
  }

  onDeleteActiveObject() {
    let activeObject = this.selection.active;
    console.log(activeObject);
    if (!activeObject) {
      return;
    }

    if (activeObject.type == "audio") {
      this.audio.delete(activeObject.id);
    }
    else {
      const selection = this.instance.getActiveObject();
      if (FabricUtils.isActiveSelection(selection)) {
        this.instance.remove(...selection._objects);
      } else {
        if (selection) this.instance.remove(selection);
      }
      this.instance.discardActiveObject().requestRenderAll();
    }
  }

  onAddText(text: string, font: EditorFont, fontSize: number, fontWeight: number, color: string = defaultColor): fabric.Object {
    const dimensions = FabricUtils.measureTextDimensions(text, font.family, fontSize, fontWeight);
    const options = { name: FabricUtils.elementID("text"), objectCaching: false, fontFamily: font.family, fontWeight, fontSize, width: Math.min(dimensions.width, this.workspace.width), textAlign: "center", fill: color };
    const textbox = createInstance(fabric.Textbox, text, options);

    textbox.setPositionByOrigin(this.artboard!.getCenterPoint(), "center", "center");
    FabricUtils.initializeMetaProperties(textbox, { font });
    FabricUtils.initializeAnimationProperties(textbox);
    //fix wrong coords issue with custom font
    // console.log(textbox);
    this.instance.add(textbox);
    this.instance.setActiveObject(textbox).requestRenderAll();
    return textbox;
  }

  async onAddImageFromSource(source: string, options?: fabric.IImageOptions, skip = false, render = true) {
    const resolvedSource = await getFileUrl(source, { cached: true });
    return createPromise<fabric.Image>((resolve, reject) => {
      fabric.Image.fromURL(
        resolvedSource,
        (image) => {
          if (!image._originalElement) {
            return reject();
          }

          if (!skip) {
            image.scaleToHeight(500);
            image.setPositionByOrigin(this.artboard!.getCenterPoint(), "center", "center");
          }

          FabricUtils.initializeMetaProperties(image);
          FabricUtils.initializeAnimationProperties(image);

          this.instance.add(image);
          if (!skip) this.instance.setActiveObject(image);
          if (render) this.instance.requestRenderAll();

          resolve(image);
        },
        { ...options, name: FabricUtils.elementID("image"), crossOrigin: (resolvedSource.startsWith('blob:') || !resolvedSource.startsWith('http')) ? 'anonymous' : undefined, objectCaching: false, effects: {}, adjustments: {} },
      );
    });
  }

  async onAddImageFromThumbnail(source: string, thumbnail: HTMLImageElement) {
    const overlay = createInstance(fabric.Rect, { fill: defaultFill, opacity: 0.25, evented: false, selectable: false, excludeFromAlignment: true });
    const image = createInstance(fabric.Image, thumbnail, { type: "video", crossOrigin: "anonymous", evented: false, selectable: false, excludeFromAlignment: true });
    const spinner = createInstance(fabric.Path, activityIndicator, { fill: "", stroke: "#fafafa", strokeWidth: 4, evented: false, selectable: false, excludeFromAlignment: true });

    image.scaleToWidth(500);
    spinner.scaleToWidth(48);
    overlay.set({ height: image.height, width: image.width, scaleX: image.scaleX, scaleY: image.scaleY });

    const id = FabricUtils.elementID("image");
    const placeholder = createInstance(fabric.Group, [image, overlay, spinner], { name: id, excludeFromExport: true });

    spinner.setPositionByOrigin(overlay.getCenterPoint(), "center", "center");
    placeholder.setPositionByOrigin(this.artboard.getCenterPoint(), "center", "center");

    FabricUtils.objectSpinningAnimation(spinner);
    FabricUtils.initializeMetaProperties(placeholder, { thumbnail: true });
    FabricUtils.initializeAnimationProperties(placeholder);

    this.instance.add(placeholder);
    this.instance.setActiveObject(placeholder).requestRenderAll();

    return createPromise<fabric.Image | null>(async (resolve, reject) => {
      const resolvedSource = await getFileUrl(source, { cached: true });
      fabric.Image.fromURL(
        resolvedSource,
        (image) => {
          if (!this.instance!.contains(placeholder)) {
            return resolve(null);
          }

          if (!image._originalElement) {
            this.instance!.remove(placeholder).requestRenderAll();
            return reject();
          }

          image.set({ scaleX: placeholder.getScaledWidth() / image.getScaledWidth(), scaleY: placeholder.getScaledHeight() / image.getScaledHeight() });
          image.setPositionByOrigin(placeholder.getCenterPoint(), "center", "center");
          FabricUtils.initializeMetaProperties(image);
          FabricUtils.initializeAnimationProperties(image);

          this.instance!.remove(placeholder).add(image);
          this.instance!.setActiveObject(image).requestRenderAll();

          resolve(image);
        },
        { name: id, crossOrigin: "anonymous", objectCaching: false, effects: {}, adjustments: {} },
      );
    });
  }

  async onAddVideoFromSource(source: string, options?: any, skip = false, render = true) {
    const resolvedSource = await getFileUrl(source, { cached: true });
    return createPromise<any>((resolve, reject) => {
      (fabric as any).Video.fromURL(
        resolvedSource,
        (video: any) => {
          console.log("options", options);
          if (!video || !video._originalElement) {
            return reject();
          }

          if (!skip) {
            video.scaleToHeight(500);
            video.setPositionByOrigin(this.artboard!.getCenterPoint(), "center", "center");
          }

          const element = video._originalElement as HTMLVideoElement;
          FabricUtils.initializeMetaProperties(video, { duration: Math.min(floor(element.duration, 1) * 1000, this.timeline.duration), ...options?.meta });
          FabricUtils.initializeAnimationProperties(video, { ...options?.anim });

          this.instance.add(video);
          if (!skip) this.instance.setActiveObject(video);
          if (render) this.instance.requestRenderAll();

          resolve(video);
        },
        { ...options, name: FabricUtils.elementID("video"), objectCaching: false, crossOrigin: (resolvedSource.startsWith('blob:') || !resolvedSource.startsWith('http')) ? 'anonymous' : undefined, effects: {}, adjustments: {} },
      );
    });
  }

  async onAddVideoFromThumbnail(source: string, thumbnail: HTMLImageElement | string) {
    const overlay = createInstance(fabric.Rect, { fill: defaultFill, opacity: 0.25, evented: false, selectable: false, excludeFromAlignment: true });
    const image = createInstance(fabric.Image, thumbnail, { type: "video", crossOrigin: (typeof thumbnail === 'string' && (thumbnail.startsWith('blob:') || !thumbnail.startsWith('http'))) ? 'anonymous' : undefined, evented: false, selectable: false, excludeFromAlignment: true });
    const spinner = createInstance(fabric.Path, activityIndicator, { fill: "", stroke: "#fafafa", strokeWidth: 4, evented: false, selectable: false, excludeFromAlignment: true });

    image.scaleToWidth(500);
    spinner.scaleToWidth(48);

    overlay.set({ height: image.height, width: image.width, scaleX: image.scaleX, scaleY: image.scaleY });
    FabricUtils.objectSpinningAnimation(spinner);

    const id = FabricUtils.elementID("video");
    const placeholder = createInstance(fabric.Group, [image, overlay, spinner], { name: id, excludeFromExport: true });

    placeholder.setPositionByOrigin(this.artboard.getCenterPoint(), "center", "center");
    FabricUtils.initializeMetaProperties(placeholder, { thumbnail: true });
    FabricUtils.initializeAnimationProperties(placeholder);

    this.instance.add(placeholder);
    this.instance.setActiveObject(placeholder).requestRenderAll();

    return createPromise<any>(async (resolve, reject) => {
      const resolvedSource = await getFileUrl(source, { cached: true });
      (fabric as any).Video.fromURL(
        resolvedSource,
        (video: any) => {
          if (!this.instance!.contains(placeholder)) {
            return;
          }

          if (!video || !video._originalElement) {
            this.instance!.remove(placeholder).requestRenderAll();
            return reject();
          }

          const element = video._originalElement as HTMLVideoElement;
          video.set({ scaleX: placeholder.getScaledWidth() / video.getScaledWidth(), scaleY: placeholder.getScaledHeight() / video.getScaledHeight(), thumbnail: thumbnail });
          video.setPositionByOrigin(placeholder.getCenterPoint(), "center", "center");

          FabricUtils.initializeMetaProperties(video, { duration: Math.min(floor(element.duration, 1) * 1000, this.timeline.duration) });
          FabricUtils.initializeAnimationProperties(video);

          this.instance!.remove(placeholder).add(video);
          this.instance!.setActiveObject(video).requestRenderAll();

        },
        { name: id, crossOrigin: (source.startsWith('blob:') || !source.startsWith('http')) ? 'anonymous' : undefined, objectCaching: false, effects: {}, adjustments: {} },
      );
    });
  }

  async onAddGifFromSource(source: string, options?: fabric.IImageOptions, skip = false, render = true) {
    const resolvedSource = await getFileUrl(source, { cached: true });
    return createPromise<fabric.Gif>((resolve, reject) => {
      fabric.Gif.fromURL(
        resolvedSource,
        (image) => {
          if (!image._originalElement) {
            return reject();
          }

          if (!skip) {
            image.scaleToHeight(500);
            image.setPositionByOrigin(this.artboard!.getCenterPoint(), "center", "center");
          }

          FabricUtils.initializeMetaProperties(image);
          FabricUtils.initializeAnimationProperties(image);

          this.instance.add(image);
          if (!skip) this.instance.setActiveObject(image);
          if (render) this.instance.requestRenderAll();

          resolve(image);
        },
        { ...options, name: FabricUtils.elementID("gif"), crossOrigin: (resolvedSource.startsWith('blob:') || !resolvedSource.startsWith('http')) ? 'anonymous' : undefined, objectCaching: false, effects: {}, adjustments: {} },
      );
    });
  }

  async onAddGifFromThumbnail(source: string, thumbnail: HTMLImageElement) {
    // console.log("onAddGifFromThumbnail");
    const overlay = createInstance(fabric.Rect, { fill: defaultFill, opacity: 0.25, evented: false, selectable: false, excludeFromAlignment: true });
    const image = createInstance(fabric.Image, thumbnail, { type: "gif", crossOrigin: undefined, evented: false, selectable: false, excludeFromAlignment: true });
    const spinner = createInstance(fabric.Path, activityIndicator, { fill: "", stroke: "#fafafa", strokeWidth: 4, evented: false, selectable: false, excludeFromAlignment: true });

    image.scaleToWidth(500);
    spinner.scaleToWidth(48);
    overlay.set({ height: image.height, width: image.width, scaleX: image.scaleX, scaleY: image.scaleY });

    const id = FabricUtils.elementID("gif");
    const placeholder = createInstance(fabric.Group, [image, overlay, spinner], { name: id, excludeFromExport: true });

    spinner.setPositionByOrigin(overlay.getCenterPoint(), "center", "center");
    placeholder.setPositionByOrigin(this.artboard.getCenterPoint(), "center", "center");

    FabricUtils.objectSpinningAnimation(spinner);
    FabricUtils.initializeMetaProperties(placeholder, { thumbnail: true });
    FabricUtils.initializeAnimationProperties(placeholder);

    this.instance.add(placeholder);
    this.instance.setActiveObject(placeholder).requestRenderAll();

    return createPromise<fabric.Gif | null>(async (resolve, reject) => {
      const resolvedSource = await getFileUrl(source, { cached: true });
      fabric.Gif.fromURL(
        resolvedSource,
        (image) => {
          if (!this.instance!.contains(placeholder)) {
            return resolve(null);
          }

          if (!image._originalElement) {
            this.instance!.remove(placeholder).requestRenderAll();
            return reject();
          }

          image.set({ scaleX: placeholder.getScaledWidth() / image.getScaledWidth(), scaleY: placeholder.getScaledHeight() / image.getScaledHeight() });
          image.setPositionByOrigin(placeholder.getCenterPoint(), "center", "center");
          FabricUtils.initializeMetaProperties(image);
          FabricUtils.initializeAnimationProperties(image);

          this.instance!.remove(placeholder).add(image);
          this.instance!.setActiveObject(image).requestRenderAll();

        },
        { name: id, crossOrigin: (source.startsWith('blob:') || !source.startsWith('http')) ? 'anonymous' : undefined, objectCaching: false, effects: {}, adjustments: {} },
      );
    });
  }

  async onAddAudioFromSource(source: string, options?: fabric.IAudioOptions, skip = false, render = true) {
    const resolvedSource = await getFileUrl(source, { cached: true });
    return createPromise<fabric.Audio>((resolve, reject) => {
      console.log("onAddAudioFromSource", resolvedSource);
      fabric.Audio.fromURL(
        resolvedSource,
        (audio) => {
          console.log("onAddAudioFromSource", audio);
          if (!audio || !audio.audioElement) {
            return reject();
          }

          if (!skip) {
            audio.scaleToHeight(500);
            audio.setPositionByOrigin(this.artboard!.getCenterPoint(), "center", "center");
          }

          const element = audio.audioElement as HTMLAudioElement;
          FabricUtils.initializeMetaProperties(audio, { duration: Math.min(floor(element.duration, 1) * 1000, this.timeline.duration), ...options?.meta });
          FabricUtils.initializeAnimationProperties(audio, { ...options?.anim });

          this.instance.add(audio);
          if (!skip) this.instance.setActiveObject(audio);
          if (render) this.instance.requestRenderAll();

          resolve(audio);
        },
        { ...options, name: FabricUtils.elementID("audio"), objectCaching: false, crossOrigin: (resolvedSource.startsWith('blob:') || !resolvedSource.startsWith('http')) ? 'anonymous' : undefined, effects: {}, adjustments: {} },
      );
    });
  }

  async onAddAudioFromElement(element: EditorAudioElement, options?: fabric.IAudioOptions, skip = false, render = true) {
    //id, url, timeline, name, duration, muted: false, playing: false, trim: 0, offset: 0, volume: 1
    return createPromise<fabric.Audio>(async (resolve, reject) => {
      // console.log("onAddAudioFromElement", element);
      const resolvedUrl = await getFileUrl(element.url, { cached: true });
      fabric.Audio.fromURL(
        resolvedUrl,
        (audio) => {
          if (!audio || !audio.audioElement) {
            return reject();
          }

          console.log("onAddAudioFromElement 1", audio, options);
          audio.trimStart = (element.trim ?? 0) * 1000;
          audio.trimEnd = audio.trimStart + (element.timeline ?? 10) * 1000;
          audio.volume = element.volume ?? 1;
          audio.visible = element.visible || false;
          if (!skip) {
            audio.scaleToHeight(500);
            audio.setPositionByOrigin(this.artboard!.getCenterPoint(), "center", "center");
          }
          console.log("onAddAudioFromElement 2", audio, options);
          const _element = audio.audioElement as HTMLAudioElement;
          FabricUtils.initializeMetaProperties(audio, { duration: element.timeline * 1000, offset: element.offset * 1000, ...options?.meta });
          FabricUtils.initializeAnimationProperties(audio, { ...options?.anim });
          // FabricUtils.initializeMetaProperties(audio, { duration: Math.min(floor(_element.duration, 1) * 1000, this.timeline.duration), ...options?.meta });
          console.log("onAddAudioFromElement 3", audio, options);
          this.instance.add(audio);
          if (!skip) this.instance.setActiveObject(audio);
          if (render) this.instance.requestRenderAll();

          resolve(audio);
          console.log("onAddAudioFromElement 4", audio, options);
        },
        { ...options, name: element.id, audioName: element.name, objectCaching: false, crossOrigin: "anonymous", effects: {}, adjustments: {} },
      );
    });
  }

  onAddBasicShape(klass: string, params: any): fabric.Object {
    console.log("onAddBasicShape", klass, params);
    const shape: fabric.Object = createInstance((fabric as any)[klass], { name: FabricUtils.elementID(klass), ...params, objectCaching: false });
    shape.setPositionByOrigin(this.artboard.getCenterPoint(), "center", "center");

    FabricUtils.initializeMetaProperties(shape);
    FabricUtils.initializeAnimationProperties(shape);

    this.instance.add(shape);
    this.instance.setActiveObject(shape);
    this.instance.requestRenderAll();

    return shape;
  }

  onAddAbstractShape(path: string, name = "shape", fill: string = defaultFill, stroke: string = defaultStroke): fabric.Object {
    console.log("onAddAbstractShape", path, fill);
    const options = { name: FabricUtils.elementID(name), fill, stroke, objectCaching: false };
    const shape = createInstance(fabric.Path, path, { ...options });

    shape.scaleToHeight(500);
    shape.setPositionByOrigin(this.artboard.getCenterPoint(), "center", "center");

    FabricUtils.initializeMetaProperties(shape);
    FabricUtils.initializeAnimationProperties(shape);

    this.instance.add(shape);
    this.instance.setActiveObject(shape);
    this.instance.requestRenderAll();

    return shape;
  }

  onAddLine(points: number[], name = "line", stroke: string = defaultStroke): fabric.Object {
    const options = { name: FabricUtils.elementID(name), strokeWidth: 4, stroke: stroke, hasBorders: false, objectCaching: false };
    const line = createInstance(fabric.Line, points, options);

    line.setPositionByOrigin(this.artboard.getCenterPoint(), "center", "center");
    line.set({ controls: { mtr: fabric.Object.prototype.controls.mtr, mr: fabric.Object.prototype.controls.mr, ml: fabric.Object.prototype.controls.ml } });

    FabricUtils.initializeMetaProperties(line);
    FabricUtils.initializeAnimationProperties(line);

    this.instance.add(line);
    this.instance.setActiveObject(line).requestRenderAll();

    return line;
  }

  //init audios from template
  async initializeAudios(audios: EditorAudioElement[]) {
    console.log("initializeAudios", audios);
    if (audios != undefined) {
      for (let i = 0; i < audios.length; i++) {
        const audio = audios[i]
        await this.onAddAudioFromElement(audio, { visible: audio.visible || false }, true);
      }
    }
  }

  onMarkObjectAsPlaceholder(object: fabric.Object, label: string | false) {
    if (!object || !object.meta) return;
    object.meta.placeholder = !!label;
    object.meta.label = label || undefined;
    this.instance.fire("object:modified", { target: object });
  }

  onMarkActiveObjectAsPlaceholder(label: string | false) {
    const selected = this.instance.getActiveObject();
    if (selected) this.onMarkObjectAsPlaceholder(selected, label);
  }

  onChangeObjectTimelineProperty(object: fabric.Object, property: string, value: number) {
    if (!object || !object.meta) return;
    object.meta[property] = value;
    this.timeline.update(object);
    this.instance.fire("object:modified", { target: object });
    this.instance.requestRenderAll();
  }

  onChangeActiveObjectTimelineProperty(property: string, value: any) {
    const selected = this.instance.getActiveObject();
    if (selected) this.onChangeObjectTimelineProperty(selected, property, value);
  }

  onChangeObjectProperty(object: fabric.Object, property: keyof fabric.Object, value: any) {
    console.log("onChangeObjectProperty", object, property, value);
    if (!object) return;
    if (property == "angle") {
      object.rotate(value);
    }
    else if (property == "width" && object.keepRatio) {
      const height = Math.floor(value * object.height / object.width);
      object.set("width", value);
      object.set("height", height);
    }
    else if (object.type == "circle" && (property == "width" || property == "height")) {
      object.set("width", value);
      object.set("height", value);
    }
    else {
      object.set(property, value);
    }
    this.instance.fire("object:modified", { target: object });
    this.instance.requestRenderAll();
  }

  onChangeActiveObjectProperty(property: keyof fabric.Object, value: any) {
    console.log("onChangeActiveObjectProperty", property, value);
    const selected = this.instance.getActiveObject();
    if (selected) this.onChangeObjectProperty(selected, property, value);
  }

  onChangeObjectFillGradient(object: fabric.Object, type: string, colors: fabric.IGradientOptionsColorStops, coords: fabric.IGradientOptionsCoords) {
    if (!object) return;
    const gradient = createInstance(fabric.Gradient, { type: type, gradientUnits: "percentage", colorStops: colors, coords: coords });
    object.set({ fill: gradient });
    this.instance.fire("object:modified", { target: object });
    this.instance.requestRenderAll();
  }

  onChangeActiveObjectFillGradient(type: string, colors: fabric.IGradientOptionsColorStops, coords: fabric.IGradientOptionsCoords) {
    const selected = this.instance.getActiveObject();
    if (selected) this.onChangeObjectFillGradient(selected, type, colors, coords);
  }

  onChangeObjectAnimation(object: fabric.Object, type: "in" | "out" | "scene", animation: fabric.EntryAnimation | fabric.ExitAnimation | fabric.SceneAnimations) {
    if (!object) return;
    object.anim![type].name = animation;
    this.instance.fire("object:modified", { target: object }).requestRenderAll();
  }

  onChangeActiveObjectAnimation(type: "in" | "out" | "scene", animation: fabric.EntryAnimation | fabric.ExitAnimation | fabric.SceneAnimations) {
    const selected = this.instance.getActiveObject();
    if (selected) this.onChangeObjectAnimation(selected, type, animation);
  }

  onChangeObjectAnimationDuration(object: fabric.Object, type: "in" | "out" | "scene", duration: number) {
    if (!object) return;
    object.anim![type].duration = duration;
    this.instance.fire("object:modified", { target: object }).requestRenderAll();
  }

  onChangeObjectAnimationEasing(object: fabric.Object, type: "in" | "out" | "scene", easing: string) {
    if (!object) return;
    object.anim![type].easing = easing;
    this.instance.fire("object:modified", { target: object }).requestRenderAll();
  }

  onChangeObjectAnimationPhysics(object: fabric.Object, type: "in" | "out" | "scene", config: Partial<fabric.AnimationPhysics>) {
    if (!object) return;
    const _config = object.anim![type].config || defaultSpringConfig;
    object.anim![type].config = Object.assign({}, _config, config);
    this.instance.fire("object:modified", { target: object }).requestRenderAll();
  }

  onChangeActiveObjectAnimationEasing(type: "in" | "out" | "scene", easing: string) {
    const selected = this.instance.getActiveObject();
    if (selected) this.onChangeObjectAnimationEasing(selected, type, easing);
  }

  onChangeActiveObjectAnimationPhysics(type: "in" | "out" | "scene", config: Partial<fabric.AnimationPhysics>) {
    const selected = this.instance.getActiveObject();
    if (selected) this.onChangeObjectAnimationPhysics(selected, type, config);
  }

  onChangeActiveObjectAnimationDuration(type: "in" | "out" | "scene", duration: number) {
    const selected = this.instance.getActiveObject();
    if (selected) this.onChangeObjectAnimationDuration(selected, type, duration);
  }

  onChangeTextAnimationType(object: fabric.Object, type: "in" | "out" | "scene", animate?: fabric.TextAnimateOptions) {
    if (!object) return;
    object.anim![type].text = animate;
    this.instance.fire("object:modified", { target: object }).requestRenderAll();
  }

  onChangeActiveTextAnimationType(type: "in" | "out" | "scene", animate?: fabric.TextAnimateOptions) {
    const selected = this.instance.getActiveObject();
    if (selected) this.onChangeTextAnimationType(selected, type, animate);
  }

  onChangeTextboxProperty(textbox: fabric.Textbox, property: keyof fabric.Textbox, value: any, _selection = false) {
    if (textbox.type !== "textbox") return;
    textbox.set(property as string, value);
    if ((textLayoutProperties as string[]).includes(property as string)) textbox.initDimensions();
    this.instance.fire("object:modified", { target: textbox });
    this.instance.requestRenderAll();
  }

  onChangeActiveTextboxProperty(property: keyof fabric.Textbox, value: any, selection = false) {
    const selected = this.instance.getActiveObject() as fabric.Textbox | null;
    if (!selected || selected.type !== "textbox") return;
    this.onChangeTextboxProperty(selected, property, value, selection);
  }

  onChangeTextboxFontFamily(textbox: fabric.Textbox, font: string, family: EditorFont) {
    if (textbox.type !== "textbox") return;
    textbox.set("fontFamily", font);
    textbox.meta!.font = family;
    this.instance.fire("object:modified", { target: textbox });
    this.instance.requestRenderAll();
  }

  onChangeActiveTextboxFontFamily(font: string, family: EditorFont) {
    const selected = this.instance.getActiveObject() as fabric.Textbox | null;
    if (!selected || selected.type !== "textbox") return;
    this.onChangeTextboxFontFamily(selected, font, family);
  }

  onEnterActiveTextboxEdit() {
    const selected = this.instance.getActiveObject() as fabric.Textbox | null;
    if (!selected || selected.type !== "textbox") return;
    selected.enterEditing();
    this.instance.fire("object:modified", { target: selected });
    this.instance.requestRenderAll();
  }

  onExitActiveTextboxEdit() {
    const selected = this.instance.getActiveObject() as fabric.Textbox | null;
    if (!selected || selected.type !== "textbox") return;
    selected.exitEditing();
    this.instance.fire("object:modified", { target: selected });
    this.instance.requestRenderAll();
  }

  onChangeImageProperty(image: fabric.Image, property: keyof fabric.Image, value: any) {
    if (!(image.type === "image" || image.type === "video")) return;
    image.set(property, value);
    this.instance.fire("object:modified", { target: image });
    this.instance.requestRenderAll();
  }

  onChangeActiveImageProperty(property: keyof fabric.Image, value: any) {
    const selected = this.instance.getActiveObject() as fabric.Image | null;
    if (!selected || selected.type !== "image") return;
    this.onChangeImageProperty(selected, property, value);
  }

  onChangeVideoProperty(video: any, property: any, value: any) {
    if (video.type !== "video") return;
    video.set(property, value);
    this.instance.fire("object:modified", { target: video });
    this.instance.requestRenderAll();
  }

  onChangeActiveVideoProperty(property: any, value: any) {
    const selected = this.instance.getActiveObject() as any | null;
    if (!selected || selected.type !== "video") return;
    this.onChangeVideoProperty(selected, property, value);
  }

  onChangeAudioProperties(object: fabric.Audio, props: Partial<EditorAudioElement>) {
    if (!object || !props) return;
    if (props.url) {
      object.set("src", props.url);
    }

    if (props.duration != undefined) {
      object.set("duration", props.duration * 1000);
    }

    if (props.trim != undefined) {
      object.set("trimStart", props.trim * 1000);
    }

    if (props.volume != undefined) {
      object.set("volume", props.volume);
    }

    if (props.timeline != undefined && object.meta) {
      object.meta["duration"] = props.timeline * 1000;
      //update trimEnd
      let trimEnd = object.trimStart + props.timeline * 1000;
      object.set("trimEnd", trimEnd);
    }

    if (props.offset != undefined && object.meta) {
      object.meta["offset"] = props.offset * 1000;
    }

    if (props.offset != undefined || props.timeline != undefined) {
      this.timeline.update(object);
    }

    this.instance.fire("object:modified", { target: object });
    this.instance.requestRenderAll();
  }

  destroy() {
    this.instance?.dispose();
    this.workspace?.destroy();
  }
}
