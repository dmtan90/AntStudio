import { ref, computed } from "vue";
import { checkForAudioInVideo } from "video-editor/lib/media";
import { createInstance, createPromise, waitUntilEvent } from "video-editor/lib/utils";
import { fabric } from "fabric";
import { clamp, isUndefined } from "lodash";
import {
  Bars, Circle, Line, Media, Waveform, useAVBars,
  useAVCircle, useAVLine, useAVMedia, useAVWaveform, VisualType, VisualProps
} from "audio-visual";
import { AudioVisual } from "video-editor/plugins/audio-visual/audio-visual";
// import { FabricAudio as FabricAudioImpl } from "video-editor/fabric/audio";
import { type IAudioOptions, type EditorAudioElement } from "video-editor/types/editor";
const FILL = 'fill';

export class FabricAudio extends fabric.Object {
  public type = "audio";
  public playing = false;
  public audioName: string = "";
  public _audioElement!: HTMLAudioElement;
  public __visual!: AudioVisual;
  private _audioVisual: typeof AudioVisual;
  _audioVisualProps: any;
  private _visualType: VisualType = 'circle' as any;
  private _visualProps: VisualProps = {};
  public __renderer!: HTMLCanvasElement;
  public src!: string;
  public trimStart: number = 0;
  public trimEnd: number = 0;
  public radius: number = 0;
  public imageSmoothing: boolean = true;

  // @ts-ignore
  public initialize(element: HTMLAudioElement, options: IAudioOptions = {}): void {
    this._audioElement = element;
    options.width = options.width || 400;
    options.height = options.height || 100;
    // @ts-ignore
    super.initialize(options);
    this.set(options);

    // console.log("initialize", options);
    // options = options || {};

    element.loop = false;
    element.currentTime = 0;
    element.crossOrigin = options.crossOrigin ?? null;

    // this._visualProps = {};
    // this.audioElement = element;
    this.visualType = options.visualType ?? 'circle';
    this.visualProps = options.visualProps ?? {};
    this.visualProps.src = element.src;

    // super.initialize(options);
    this.createAudioVisual();
    this.createAudioVisualRenderer();
    this.set({
      left: options.left ?? 0,
      top: options.top ?? 0,
      trimStart: options.trimStart ?? 0,
      trimEnd: options.trimEnd ?? 0,
      objectCaching: false,
      src: options.src ?? element.src,
      visible: options.visible || false
    });
    // this.initAudioVisual();
    console.log(this, options);
    this.on("added", () => fabric.util.requestAnimFrame(this.update.bind(this)));
    this.on("modified", this.update.bind(this));
  }

  public _set(key: string, value: any) {
    // console.log("_set", key, value);
    // this.callSuper("_set", key, value);
    // this.update();
    if (key == "visible") {
      this.visible = value;
      this.update();
    }
    else if (key == "visualType") {
      this.visualType = value;
    }
    else if (key == "visualProps") {
      this.visualProps = value;
    }
    else if (key == "src") {
      this.src = value;
    }
    else {
      return super._set(key, value);
    }
  }

  public get visualType() {
    return this._visualType;
  }

  public set visualType(type: VisualType) {
    if (type != this._visualType) {
      this._visualType = type;
      if (this.audioVisual) {
        this._visualProps = this.initVisualProps(this._visualProps);
      }
      else {
        this._visualProps = this.initVisualProps({});
      }
      this.update();
    }
  }

  public get visualProps() {
    return this._visualProps;
  }

  public set visualProps(props) {
    // this._visualProps = this.initVisualProps(props);
    if (!this._visualProps) {
      this._visualProps = this.initVisualProps(props);
    }
    else {
      this._visualProps = Object.assign(this._visualProps, props);
    }
    this.update();
  }

  // public get src() {
  //   return this._src;
  // }

  // public set src(value: string) {
  //   this._src = value;
  //   this.audioElement.src = value;
  // }

  public initVisualProps(props: VisualProps) {
    // let options = {...this._visualProps, ...props};
    console.log("initVisualProps", props);
    let _props = null;
    if (this.visualType == 'bars') {
      _props = new Bars(props);
    }
    else if (this.visualType == 'circle') {
      _props = new Circle(props);
    }
    else if (this.visualType == 'line') {
      _props = new Line(props);
    }
    else if (this.visualType == 'media') {
      _props = new Media(props);
    }
    else if (this.visualType == 'wave') {
      _props = new Waveform(props);
    }

    return _props;
    // this._visualProps = Object.assign(this._visualProps, _props);
  }

  // muted: function (value?: boolean) {
  //   const element = this.audioElement as HTMLAudioElement;
  //   if (!element) return true;
  //   if (isUndefined(value)) return element.muted;
  //   element.muted = value;
  //   return value;
  // },

  public volume(value?: number) {
    const element = this._audioElement as HTMLAudioElement;
    if (!element) return 0;
    if (isUndefined(value)) return element.volume;
    element.volume = value;
    return value;
  }

  public _duration(trim?: boolean) {
    // console.log("duration", trim);
    const element = this._audioElement as HTMLAudioElement;
    return element ? (trim ? element.duration - this.trimStart - this.trimEnd : element.duration) : 0;
  }

  public async play() {
    // console.log("play");
    if (this.playing) return;
    this.playing = true;
    const element = this._audioElement as HTMLAudioElement;
    element.currentTime = this.trimStart;
    if (!this.visible) {
      return;
    }
    await element.play();
    // console.log(element);
  }

  public pause() {
    if (!this.playing) return;
    this.playing = false;
    const element = this._audioElement as HTMLAudioElement;
    element.pause();
  }

  public async seek(_seconds: number) {
    const element = this._audioElement as HTMLAudioElement;
    const seconds = _seconds + this.trimStart;
    element.currentTime = clamp(seconds, 0, this._duration(true));
    await waitUntilEvent(element, "seeked");
  }

  public updateProps(values: Partial<EditorAudioElement>) {
    //id, buffer, url, timeline, name, duration, source, muted: false, playing: false, trim: 0, offset: 0, volume: 1
  }

  // update: function () {
  //   if (this.canvas) {
  //     const backend = fabric.filterBackend;
  //     if (backend?.evictCachesForKey) {
  //       backend.evictCachesForKey(this.cacheKey);
  //       backend.evictCachesForKey(this.cacheKey + "_filtered");
  //     }
  //     // this.applyFilters();
  //     this.canvas.renderAll();
  //     fabric.util.requestAnimFrame(this.update.bind(this));
  //   }
  // },

  private drawPlaceholder() {
    this.audioVisual.drawPlaceholder();
    // this.seek(0.1);
    this.setCoords();
  }

  public update = () => {
    // console.log("update", this._visualType, this._visualProps);
    if (this.audioVisual) {
      const canvas = this.audioVisual.canvas;//_originalElement!;
      canvas.width = this.getScaledWidth();
      canvas.height = this.getScaledHeight();
      this._visualProps.canvWidth = canvas.width;
      this._visualProps.canvHeight = canvas.height;
      this.audioVisual.resize(canvas.width, canvas.height);
      this.audioVisual.setType(this._visualType);
      this.audioVisual.setProps(this._visualProps);
      this.audioVisual.visible = this.visible;
      this.drawPlaceholder();
    }
  }

  private getAudioVisualBoundingClientRect() {
    return {
      bottom: this.top! + this.getScaledHeight(),
      height: this.getScaledHeight(),
      left: this.left,
      right: this.left! + this.getScaledWidth(),
      top: this.top,
      width: this.getScaledWidth(),
      x: this.left! + this.getScaledWidth() / 2,
      y: this.top! + this.getScaledHeight() / 2,
    } as DOMRect;
  }

  private getAudioVisualCurrentStyle() {
    return {
      "padding-left": 0,
      "padding-right": 0,
      "padding-top": 0,
      "padding-bottom": 0,
    } as Partial<CSSStyleDeclaration>;
  }

  private createAudioVisualCanvas() {
    const canvas = document.createElement("canvas");
    canvas.width = this.getScaledWidth();
    canvas.height = this.getScaledHeight();
    // console.log("createAudioVisualCanvas", canvas.width, canvas.height);
    // canvas.style.backgroundColor = "rgba(0,0,0,.5)";
    Object.defineProperty(canvas, "clientWidth", { get: () => canvas.width / window.devicePixelRatio });
    Object.defineProperty(canvas, "clientHeight", { get: () => canvas.height / window.devicePixelRatio });
    Object.defineProperty(canvas, "getBoundingClientRect", { value: this.getAudioVisualBoundingClientRect.bind(this) });
    Object.defineProperty(canvas, "currentStyle", { value: this.getAudioVisualCurrentStyle() });
    return canvas;
  }

  private createAudioVisual() {
    // const options = merge({}, this.visualProps, this.__defaultVisualConfiguration());
    const canvas = this.createAudioVisualCanvas();
    this.visualProps.canvWidth = canvas.width;
    this.visualProps.canvHeight = canvas.height;
    // console.log("_visualProps", this.visualProps);
    this.audioVisual = createInstance(AudioVisual, this._audioElement, canvas, this._visualType, this.visualProps, this.visible);
    return this.audioVisual;
  }

  private createAudioVisualRenderer() {
    this.__renderer = document.createElement("canvas");
  }

  private renderAudioVisual() {
    // console.log("renderAudioVisual");
    // this.__renderer.width = this.width! * window.devicePixelRatio;
    // this.__renderer.height = this.height! * window.devicePixelRatio;
    this.__renderer.width = this.getScaledWidth();
    this.__renderer.height = this.getScaledHeight();
    const context = this.__renderer.getContext("2d")!;
    context.clearRect(0, 0, this.__renderer.width, this.__renderer.height);
    context.fillStyle = this.fill ?? "#FFFFFF10";
    context.fillRect(0, 0, this.__renderer.width, this.__renderer.height);
    if (this.stroke) {
      context.strokeStyle = this.stroke;
      context.lineWidth = this.strokeWidth ?? 1;
      context.beginPath();
      if (this.radius) {
        context.roundRect(0, 0, this.__renderer.width, this.__renderer.height, this.radius);
      }
      else {
        context.strokeRect(0, 0, this.__renderer.width, this.__renderer.height);
      }
      context.stroke();
    }
    context.drawImage(this.audioVisual.canvas, 0, 0, this.__renderer.width, this.__renderer.height);
  }

  public _render(ctx: CanvasRenderingContext2D) {
    console.log("_render");
    if (!this.audioVisual) return;
    if (this.visible) {
      this.renderAudioVisual();
      ctx.drawImage(this.__renderer, -this.width! / 2, -this.height! / 2, this.width!, this.height!);
    }
    else {
      ctx.clearRect(0, 0, this.width, this.height);
    }
  }

  /**
   * Returns svg representation of an instance
   * @return {string[]} an array of strings with the specific svg representation
   * of the instance
   */
  public _toSVG() {
    // console.log("_toSVG", this);
    const width = this.width;
    const height = this.height;
    const imageMarkup: string[] = [],
      element = this.__renderer,
      x = -this.width / 2,
      y = -this.height / 2;
    let svgString: string[] = [],
      strokeSvg: string[] = [],
      clipPath = '',
      imageRendering = '';
    if (!element) {
      return [];
    }
    if (this.clipPath) {
      const clipPathId = this.clipPath?.clipPathId ?? "crop_image_1";
      svgString.push(
        '<clipPath id="' + clipPathId + '">\n',
        '\t<rect x="' +
        x +
        '" y="' +
        y +
        '" width="' +
        width +
        '" height="' +
        height +
        '" />\n',
        '</clipPath>\n',
      );
      clipPath = ' clip-path="url(#' + clipPathId + ')" ';
    }
    if (!this.imageSmoothing) {
      imageRendering = ' image-rendering="optimizeSpeed"';
    }
    imageMarkup.push(
      '\t<image ',
      'COMMON_PARTS',
      `xlink:href="${this.getThumbnail()}" x="${x}" y="${y
      // we're essentially moving origin of transformation from top/left corner to the center of the shape
      // by wrapping it in container <g> element with actual transformation, then offsetting object to the top/left
      // so that object's center aligns with container's left/top
      }" width="${this.width}" height="${this.height}" ${imageRendering}${clipPath}></image>\n`,
    );

    if (this.stroke || this.strokeDashArray) {
      const origFill = this.fill;
      this.fill = null;
      strokeSvg = [
        `\t<rect x="${x}" y="${y}" width="${this.width}" height="${this.height
        }" style="${this.getSvgStyles()}" />\n`,
      ];
      this.fill = origFill;
    }
    if (this.paintFirst !== FILL) {
      svgString = svgString.concat(strokeSvg, imageMarkup);
    } else {
      svgString = svgString.concat(imageMarkup, strokeSvg);
    }
    return svgString;
  }

  public getThumbnail(): string {
    let base64 = (this.__renderer as any)?.toDataURL({
      format: "png",
      withoutShadow: true,
      withoutTransform: true
    });

    return base64;
  }

  public dispose() {
    super.dispose();
  }

  // public static fromObject(object: fabric.Audio, callback: (audio: fabric.Audio) => void) {
  //   // return FabricAudio.fromURL(
  //   //   object?.audioElement?.src,
  //   //   (audio: fabric.Audio) => {
  //   //     callback(audio);
  //   //   },
  //   //   { ...object },
  //   // );
  //   return callback?.(createInstance(fabric.Audio, options));
  // }

  // public static fromURL(url: string, callback: (audio: fabric.Audio | null) => void, options?: fabric.IAudioOptions) {
  //   options = options || {};
  //   const element = document.createElement("audio");
  //   // console.log("fromURL", url);
  //   element.currentTime = 0;
  //   element.playsInline = true;
  //   // element.controls = true;
  //   element.crossOrigin = options?.crossOrigin ?? null;

  //   element.onloadeddata = async () => {
  //     element.onloadeddata = null;
  //     element.onerror = null;

  //     // element.height = 50;
  //     // element.width = 50;
  //     if(!options.width){
  //       options.width = 100;
  //     }

  //     if(!options.height){
  //       options.height = 100;
  //     }

  //     const hasAudio = await checkForAudioInVideo(url);
  //     if(hasAudio){
  //       callback(createInstance(fabric.Audio, element, options));
  //     }
  //     else{
  //       callback(null);
  //     }
  //   };
  //   element.onerror = () => {
  //     element.onloadeddata = null;
  //     element.onerror = null;
  //     callback(null);
  //   };

  //   element.src = url;
  //   element.load();
  // }

  // public static fromElement(element: HTMLAudioElement, callback: (audio: fabric.Audio | null) => void, options?: fabric.IAudioOptions) {
  //   checkForAudioInVideo(element.src).then((hasAudio) => {
  //     if(hasAudio){
  //       callback(createInstance(fabric.Audio, element, options));
  //     }
  //     else{
  //       callback(null);
  //     }
  //   });
  // }





  // const Audio = fabric.util.createClass(fabric.Object, {
  //   type: "audio",
  //   playing: false,
  //   // _visualEnabled: true,
  //   audioElement: null,
  //   audioVisual: AudioVisual,
  //   _visualType: VisualType.Circle,
  //   _visualProps: {},
  //   __renderer: HTMLCanvasElement,

  //   initialize: function (element: HTMLAudioElement, options?: fabric.IAudioOptions) {
  //     console.log("initialize", options);
  //     options = options || {};

  //     element.loop = false;
  //     element.currentTime = 0;
  //     // element.muted = options.muted ?? false;
  //     element.crossOrigin = options.crossOrigin ?? null;

  //     // const canvas = document.createElement("canvas");
  //     // canvas.width = element.width;
  //     // canvas.height = element.height;

  //     this.audioElement = element;
  //     // this._visualEnabled = options.visible ?? true;
  //     this._visualType = options.visualType ?? VisualType.Circle;
  //     this._visualProps = options.visualProps ?? {};
  //     this._visualProps.src = element.src;

  //     this.callSuper("initialize", options);
  //     this.createAudioVisual();
  //     this.createAudioVisualRenderer();
  //     this.set({ left: options.left ?? 0, top: options.top ?? 0, trimStart: options.trimStart ?? 0, trimEnd: options.trimEnd ?? 0, objectCaching: false });
  //     // this.initAudioVisual();
  //     this.on("added", () => fabric.util.requestAnimFrame(this.update.bind(this)));
  //     this.on("modified", this.update.bind(this));
  //   },

  //   _set: function(key: string, value: any) {
  //     console.log("_set", key, value);
  //     // if (key === "visualType") return this.__setChartConfiguration(value);
  //     // this.callSuper("_set", key, value);
  //     // this.update();
  //     if(key == "visible"){
  //       this.visible = value;
  //       this.update();
  //     }
  //     else if(key == "visualType"){
  //       this.visualType = value;
  //     }
  //     else if(key == "visualProps"){
  //       this.visualProps = value;
  //     }
  //     else{
  //       return this.callSuper("_set", key, value);
  //     }
  //   },

  //   get visualType(){
  //     return this._visualType;
  //   },

  //   set visualType(type: VisualType){
  //     this._visualType = type;
  //     this.update();
  //     // console.log(this._visualType);
  //   },

  //   get visualProps(){
  //     return this._visualProps;
  //   },

  //   set visualProps(props){
  //     this._visualProps = object.assign(this._visualProps, props || {});
  //     this.update();
  //   },

  //   // muted: function (value?: boolean) {
  //   //   const element = this.audioElement as HTMLAudioElement;
  //   //   if (!element) return true;
  //   //   if (isUndefined(value)) return element.muted;
  //   //   element.muted = value;
  //   //   return value;
  //   // },

  //   volume: function (value?: number) {
  //     const element = this.audioElement as HTMLAudioElement;
  //     if (!element) return 0;
  //     if (isUndefined(value)) return element.volume;
  //     element.volume = value;
  //     return value;
  //   },

  //   duration: function (trim?: boolean) {
  //     console.log("duration", trim);
  //     const element = this.audioElement as HTMLAudioElement;
  //     return element ? (trim ? element.duration - this.trimStart - this.trimEnd : element.duration) : 0;
  //   },

  //   play: async function () {
  //     console.log("play");
  //     if (this.playing) return;
  //     this.playing = true;
  //     const element = this.audioElement as HTMLAudioElement;
  //     element.currentTime = this.trimStart;
  //     if(!this.visible){
  //       return;
  //     }
  //     await element.play();
  //     // console.log(element);
  //   },

  //   pause: function () {
  //     if (!this.playing) return;
  //     this.playing = false;
  //     const element = this.audioElement as HTMLAudioElement;
  //     element.pause();
  //   },

  //   seek: async function (_seconds: number) {
  //     const element = this.audioElement as HTMLAudioElement;
  //     const seconds = _seconds + this.trimStart;
  //     element.currentTime = clamp(seconds, 0, this.duration(true));
  //     await waitUntilEvent(element, "seeked");
  //   },

  //   // update: function () {
  //   //   if (this.canvas) {
  //   //     const backend = fabric.filterBackend;
  //   //     if (backend?.evictCachesForKey) {
  //   //       backend.evictCachesForKey(this.cacheKey);
  //   //       backend.evictCachesForKey(this.cacheKey + "_filtered");
  //   //     }
  //   //     // this.applyFilters();
  //   //     this.canvas.renderAll();
  //   //     fabric.util.requestAnimFrame(this.update.bind(this));
  //   //   }
  //   // },

  //   update: function () {
  //     console.log("update", this._visualType, this._visualProps);
  //     if(this.audioVisual){
  //       const canvas = this.audioVisual.canvas;//_originalElement!;
  //       canvas.width = this.getScaledWidth();
  //       canvas.height = this.getScaledHeight();
  //       this._visualProps.canvWidth = canvas.width;
  //       this._visualProps.canvHeight = canvas.height;
  //       this.audioVisual.resize(canvas.width, canvas.height);
  //       this.audioVisual.setProps(this._visualProps);
  //       this.audioVisual.setType(this._visualType);
  //       this.audioVisual.visible = this.visible;
  //     }
  //   },

  //   getAudioVisualBoundingClientRect: function () {
  //     return {
  //       bottom: this.top! + this.getScaledHeight(),
  //       height: this.getScaledHeight(),
  //       left: this.left,
  //       right: this.left! + this.getScaledWidth(),
  //       top: this.top,
  //       width: this.getScaledWidth(),
  //       x: this.left! + this.getScaledWidth() / 2,
  //       y: this.top! + this.getScaledHeight() / 2,
  //     } as DOMRect;
  //   },

  //   getAudioVisualCurrentStyle: function () {
  //     return {
  //       "padding-left": 0,
  //       "padding-right": 0,
  //       "padding-top": 0,
  //       "padding-bottom": 0,
  //     } as Partial<CSSStyleDeclaration>;
  //   },

  //   createAudioVisualCanvas: function () {
  //     const canvas = document.createElement("canvas");
  //     canvas.width = this.getScaledWidth();
  //     canvas.height = this.getScaledHeight();
  //     console.log("createAudioVisualCanvas", canvas.width, canvas.height);
  //     // canvas.style.backgroundColor = "rgba(0,0,0,.5)";
  //     Object.defineProperty(canvas, "clientWidth", { get: () => canvas.width / window.devicePixelRatio });
  //     Object.defineProperty(canvas, "clientHeight", { get: () => canvas.height / window.devicePixelRatio });
  //     Object.defineProperty(canvas, "getBoundingClientRect", { value: this.getAudioVisualBoundingClientRect.bind(this) });
  //     Object.defineProperty(canvas, "currentStyle", { value: this.getAudioVisualCurrentStyle() });
  //     return canvas;
  //   },

  //   createAudioVisual: function() {
  //     // const options = merge({}, this.visualProps, this.__defaultVisualConfiguration());
  //     const canvas = this.createAudioVisualCanvas();
  //     this.visualProps.canvWidth = canvas.width;
  //     this.visualProps.canvHeight = canvas.height;
  //     console.log("_visualProps", this.visualProps);
  //     this.audioVisual = createInstance(AudioVisual, this.audioElement, canvas, this._visualType, this.visualProps, this.visible);
  //     return this.audioVisual;
  //   },

  //   createAudioVisualRenderer: function() {
  //     this.__renderer = document.createElement("canvas");
  //   },

  //   renderAudioVisual: function() {
  //     console.log("renderAudioVisual");
  //     // this.__renderer.width = this.width! * window.devicePixelRatio;
  //     // this.__renderer.height = this.height! * window.devicePixelRatio;
  //     this.__renderer.width = this.getScaledWidth();
  //     this.__renderer.height = this.getScaledHeight();
  //     const context = this.__renderer.getContext("2d")!;
  //     context.clearRect(0, 0, this.__renderer.width, this.__renderer.height);
  //     context.fillStyle = this.fill ?? "#FFFFFF10";
  //     context.fillRect(0, 0, this.__renderer.width, this.__renderer.height);
  //     if(this.stroke){
  //       context.strokeStyle = this.stroke;
  //       context.lineWidth = this.strokeWidth ?? 1;
  //       context.beginPath();
  //       if(this.radius){
  //         context.roundRect(0, 0, this.__renderer.width, this.__renderer.height, this.radius);
  //       }
  //       else{
  //         context.strokeRect(0, 0, this.__renderer.width, this.__renderer.height);
  //       }
  //       context.stroke();
  //     }
  //     context.drawImage(this.audioVisual.canvas, 0, 0, this.__renderer.width, this.__renderer.height);
  //   },

  //   _render: function(ctx: CanvasRenderingContext2D) {
  //     if (!this.audioVisual) return;
  //     this.renderAudioVisual();
  //     ctx.drawImage(this.__renderer, -this.width! / 2, -this.height! / 2, this.width!, this.height!);
  //   },

  //   dispose: function () {
  //     this.callSuper("dispose");
  //   }
  // });

  // Audio.fromURL = function (url: string, callback: (audio: fabric.Audio | null) => void, options?: fabric.IAudioOptions) {
  //   options = options || {};
  //   const element = document.createElement("audio");
  //   // console.log("fromURL", url);
  //   element.currentTime = 0;
  //   element.playsInline = true;
  //   // element.controls = true;
  //   element.crossOrigin = options?.crossOrigin ?? null;

  //   element.onloadeddata = async () => {
  //     element.onloadeddata = null;
  //     element.onerror = null;

  //     // element.height = 50;
  //     // element.width = 50;
  //     if(!options.width){
  //       options.width = 100;
  //     }

  //     if(!options.height){
  //       options.height = 100;
  //     }

  //     const hasAudio = await checkForAudioInVideo(url);
  //     if(hasAudio){
  //       callback(createInstance(Audio, element, options));
  //     }
  //     else{
  //       callback(null);
  //     }
  //   };
  //   element.onerror = () => {
  //     element.onloadeddata = null;
  //     element.onerror = null;
  //     callback(null);
  //   };

  //   element.src = url;
  //   element.load();
  // };

  // Audio.fromElement = function (element: HTMLAudioElement, callback: (audio: fabric.Audio | null) => void, options?: fabric.IAudioOptions) {
  //   checkForAudioInVideo(element.src).then((hasAudio) => {
  //     if(hasAudio){
  //       callback(createInstance(Audio, element, options));
  //     }
  //     else{
  //       callback(null);
  //     }
  //   });
  // };

  // Audio.fromObject = function (object: fabric.Audio, callback: (audio: fabric.Audio) => void) {
  //   Audio.fromURL(
  //     object?.audioElement?.src,
  //     (audio: fabric.Audio) => {
  //       callback(audio);
  //     },
  //     { ...object },
  //   );
  //   // Promise.all([
  //   //   createPromise<fabric.IBaseFilter[]>((resolve) => {
  //   //     if (!object.filters?.length) {
  //   //       resolve([]);
  //   //     } else {
  //   //       fabric.util.enlivenObjects(
  //   //         object.filters,
  //   //         (filters: fabric.IBaseFilter[]) => {
  //   //           resolve(filters);
  //   //         },
  //   //         "fabric.Image.filters",
  //   //       );
  //   //     }
  //   //   }),
  //   //   createPromise<fabric.Object | undefined>((resolve) => {
  //   //     if (!object.clipPath) {
  //   //       resolve(undefined);
  //   //     } else {
  //   //       fabric.util.enlivenObjects(
  //   //         [object.clipPath],
  //   //         ([clipPath]: [fabric.Object]) => {
  //   //           resolve(clipPath);
  //   //         },
  //   //         "fabric",
  //   //       );
  //   //     }
  //   //   }),
  //   // ]).then(([filters, clipPath]) => {
  //   //   Audio.fromURL(
  //   //     object.src,
  //   //     (audio: fabric.Audio) => {
  //   //       callback(audio);
  //   //     },
  //   //     { ...object, clipPath, filters },
  //   //   );
  //   // });
  // };

  // @ts-ignore

  static fromURL(url: string, callback: (audio: FabricAudio | null) => void, options?: IAudioOptions) {
    const element = document.createElement("audio");
    element.currentTime = 0;
    element.crossOrigin = options?.crossOrigin ?? null;
    element.onloadeddata = async () => {
      element.onloadeddata = null;
      element.onerror = null;
      const hasAudio = await checkForAudioInVideo(url);
      callback(hasAudio ? createInstance(FabricAudio as any, element, options) : null);
    };
    element.onerror = () => {
      element.onloadeddata = null;
      element.onerror = null;
      callback(null);
    };
    element.src = url;
    element.load();
  }

  static fromElement(element: HTMLAudioElement, callback: (audio: FabricAudio | null) => void, options?: IAudioOptions) {
    checkForAudioInVideo(element.src).then((hasAudio) => {
      callback(hasAudio ? createInstance(FabricAudio as any, element, options) : null);
    });
  }

  static fromObject(object: FabricAudio, callback: (audio: FabricAudio) => void) {
    FabricAudio.fromURL(
      (object as any).src,
      (audio: any) => {
        callback(audio);
      },
      { ...object } as any,
    );
  }
}

// @ts-ignore
fabric.Audio = FabricAudio as any;
