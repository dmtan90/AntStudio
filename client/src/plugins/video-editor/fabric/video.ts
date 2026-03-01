import { checkForAudioInVideo } from "video-editor/lib/media";
import { createInstance, createPromise, waitUntilEvent } from "video-editor/lib/utils";
import { fabric } from "fabric";
import { clamp, isUndefined } from "lodash";
const FILL = 'fill';

const Video = fabric.util.createClass(fabric.Image, {
  type: "video",
  playing: false,

  initialize: function (element: HTMLVideoElement, options?: fabric.IVideoOptions) {
    options = options || {};

    element.loop = false;
    element.currentTime = 0;
    element.muted = options.muted ?? (options.hasAudio ? false : true);
    element.crossOrigin = options.crossOrigin ?? null;
    element.volume = options.volume ?? (options.hasAudio ? 1 : 0);

    this.callSuper("initialize", element, options);
    this.set({
      left: options.left ?? 0,
      top: options.top ?? 0,
      trimStart: options.trimStart ?? 0,
      trimEnd: options.trimEnd ?? 0,
      hasAudio: options.hasAudio ?? false,
      objectCaching: options.objectCaching ?? false,
      volume: element.volume,
      muted: element.muted,
      thumbnail: options.thumbnail
    });
    this.on("added", () => fabric.util.requestAnimFrame(this.update.bind(this)));
    // this.on("modified", this.update.bind(this));
  },

  set(key: string, value: any) {
    // this.callSuper("_set", key, value);
    // this.update();
    // if (isUndefined(value)) return this;
    // const element = this._originalElement as HTMLVideoElement;
    if (key == "muted") {
      // console.log("set", key, value);
      this._muted(value);
      // element.muted = value;
    }
    else if (key == "volume") {
      // console.log("set", key, value);
      this._volume(value);
      // element.volume = value;
    }
    return this.callSuper("set", key, value);
  },

  // get muted(){
  //   const element = this._originalElement as HTMLVideoElement;
  //   if (!element) return true;
  //   return element.muted;
  // },

  // set muted(value: boolean){
  //   console.log("muted", muted);
  //   const element = this._originalElement as HTMLVideoElement;
  //   if (!element) return;
  //   if (isUndefined(value)) value = true;
  //   element.muted = value;
  // },

  // get volume(){
  //   const element = this._originalElement as HTMLVideoElement;
  //   if (!this.hasAudio || !element) return 0;
  //   return element.volume;
  // },

  // set volume(value: number){
  //   console.log("volume", volume);
  //   const element = this._originalElement as HTMLVideoElement;
  //   if (!element || isUndefined(value)) return;
  //   element.volume = value;
  // },

  _muted: function (value?: boolean) {
    const element = this._originalElement as HTMLVideoElement;
    if (!element) return true;
    if (isUndefined(value)) return element.muted;
    element.muted = value;
    return value;
  },

  _volume: function (value?: number) {
    const element = this._originalElement as HTMLVideoElement;
    if (!this.hasAudio || !element) return 0;
    if (isUndefined(value)) return element.volume;
    element.volume = value;
    return value;
  },

  _duration: function (trim?: boolean) {
    const element = this._originalElement as HTMLVideoElement;
    return element ? (trim ? element.duration - this.trimStart - this.trimEnd : element.duration) : 0;
  },

  play: async function () {
    if (this.playing) return;
    this.playing = true;
    const element = this._originalElement as HTMLVideoElement;
    element.currentTime = this.trimStart;
    await element.play();
  },

  pause: function () {
    if (!this.playing) return;
    this.playing = false;
    const element = this._originalElement as HTMLVideoElement;
    element.pause();
  },

  seek: async function (_seconds: number) {
    const element = this._originalElement as HTMLVideoElement;
    const seconds = _seconds + this.trimStart;
    if (typeof this._duration == "function") {
      element.currentTime = clamp(seconds, 0, this._duration(true));
    }
    else {
      element.currentTime = clamp(seconds, 0, element.duration);
    }
    await waitUntilEvent(element, "seeked");
  },

  update: function () {
    if (this.canvas) {
      try {
        const backend = fabric.filterBackend;
        if (backend?.evictCachesForKey) {
          backend.evictCachesForKey(this.cacheKey);
          backend.evictCachesForKey(this.cacheKey + "_filtered");
        }
        this.applyFilters();
        this.canvas.renderAll();
        fabric.util.requestAnimFrame(this.update.bind(this));
      } catch (error) {
        console.error(error);
      }
    }
  },

  _render(ctx: CanvasRenderingContext2D) {
    this.callSuper("_render", ctx);
  },

  /**
   * Returns svg representation of an instance
   * @return {string[]} an array of strings with the specific svg representation
   * of the instance
   */
  _toSVG() {
    const imageMarkup: string[] = [],
      element = this._element,
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
        this.width +
        '" height="' +
        this.height +
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
      `xlink:href="${this.getThumbnail()}" x="${x - this.cropX}" y="${y - this.cropY
      // we're essentially moving origin of transformation from top/left corner to the center of the shape
      // by wrapping it in container <g> element with actual transformation, then offsetting object to the top/left
      // so that object's center aligns with container's left/top
      }" width="${element.width || (element as HTMLImageElement).naturalWidth
      }" height="${element.height || (element as HTMLImageElement).naturalHeight
      }"${imageRendering}${clipPath}></image>\n`,
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
  },

  getThumbnail(): string {
    // console.log(this, this._element, this._originalElement);
    let base64 = null;
    if (this.clipPath) {
      const x = -this.width / 2;
      const y = -this.height / 2;
      base64 = this.toDataURL({
        format: "png",
        withoutTransform: true,
        left: 0,
        top: 0,
        width: this._stateProperties.width,
        height: this._stateProperties.height
      });
    }
    else {
      base64 = this.toDataURL({
        format: "png",
        withoutShadow: true,
        withoutTransform: true
      });
    }

    return base64;
  },

  toDataURL: function (options) {
    options || (options = {});
    return fabric.util.toDataURL(this.toCanvasElement(options), options.format || 'png', options.quality || 1);
  },

  toCanvasElement: function (options) {
    try {
      // console.log("toCanvasElement", options);
      options || (options = {});

      var utils = fabric.util, origParams = utils.saveObjectTransform(this),
        originalGroup = this.group,
        originalShadow = this.shadow, abs = Math.abs,
        multiplier = (options.multiplier || 1) * (options.enableRetinaScaling ? (fabric as any).devicePixelRatio : 1);
      delete this.group;
      if (options.withoutTransform) {
        utils.resetObjectTransform(this);
      }
      if (options.withoutShadow) {
        this.shadow = null;
      }

      var el = fabric.util.createCanvasElement(),
        // skip canvas zoom and calculate with setCoords now.
        boundingRect = this.getBoundingRect(true, true),
        shadow = this.shadow, scaling,
        shadowOffset = { x: 0, y: 0 }, shadowBlur,
        width, height;

      if (shadow) {
        shadowBlur = shadow.blur;
        if (shadow.nonScaling) {
          scaling = { scaleX: 1, scaleY: 1 };
        }
        else {
          scaling = this.getObjectScaling();
        }
        // consider non scaling shadow.
        shadowOffset.x = 2 * Math.round(abs(shadow.offsetX) + shadowBlur) * (abs(scaling.scaleX));
        shadowOffset.y = 2 * Math.round(abs(shadow.offsetY) + shadowBlur) * (abs(scaling.scaleY));
      }
      width = boundingRect.width + shadowOffset.x;
      height = boundingRect.height + shadowOffset.y;
      // if the current width/height is not an integer
      // we need to make it so.
      el.width = Math.ceil(width);
      el.height = Math.ceil(height);
      var canvas = new fabric.StaticCanvas(el, {
        enableRetinaScaling: false,
        renderOnAddRemove: false,
        skipOffscreen: false,
      });
      if (options.format === 'jpeg') {
        canvas.backgroundColor = '#fff';
      }
      this.setPositionByOrigin(new fabric.Point(canvas.width / 2, canvas.height / 2), 'center', 'center');

      var originalCanvas = this.canvas;
      canvas.add(this);
      var canvasEl = canvas.toCanvasElement(multiplier || 1, options);
      this.shadow = originalShadow;
      this.set('canvas', originalCanvas);
      if (originalGroup) {
        this.group = originalGroup;
      }
      this.set(origParams).setCoords();
      // canvas.dispose will call image.dispose that will nullify the elements
      // since this canvas is a simple element for the process, we remove references
      // to objects in this way in order to avoid object trashing.
      canvas._objects = [];
      canvas.dispose();
      canvas = null;

      return canvasEl;
    } catch (error) {
      console.error("toCanvasElement", error);
    }
    return null;
  },

  // /**
  //  * Returns source of an image
  //  * @param {Boolean} filtered indicates if the src is needed for svg
  //  * @return {String} Source of an image
  //  */
  // getSrc(filtered?: boolean): string {
  //   const element = filtered ? this._element : this._originalElement;
  //   if (element) {
  //     if ((element as HTMLCanvasElement).toDataURL) {
  //       return (element as HTMLCanvasElement).toDataURL();
  //     }

  //     if (this.srcFromAttribute) {
  //       return element.getAttribute('src') || '';
  //     } else {
  //       return (element as HTMLImageElement).src;
  //     }
  //   } else {
  //     return this.src || '';
  //   }
  // },

  // /**
  //  * Alias for getSrc
  //  * @param filtered
  //  * @deprecated
  //  */
  // getSvgSrc(filtered?: boolean) {
  //   return this.getSrc(filtered);
  // },

  dispose: function () {
    this.callSuper("dispose");
    // this.thumbnail = null;
  }
});

Video.fromURL = function (url: string, callback: (video: fabric.Video | null) => void, options?: fabric.IVideoOptions) {
  const element = document.createElement("video");

  element.currentTime = 0;
  element.playsInline = true;
  element.crossOrigin = options?.crossOrigin ?? null;

  element.onloadeddata = async () => {
    element.onloadeddata = null;
    element.onerror = null;

    element.height = element.videoHeight;
    element.width = element.videoWidth;

    const hasAudio = await checkForAudioInVideo(url);
    callback(createInstance(Video, element, Object.assign({ hasAudio }, options)));
  };
  element.onerror = () => {
    element.onloadeddata = null;
    element.onerror = null;
    callback(null);
  };

  element.src = url;
  element.load();
};

Video.fromElement = function (element: HTMLVideoElement, callback: (video: fabric.Video | null) => void, options?: fabric.IVideoOptions) {
  checkForAudioInVideo(element.src).then((hasAudio) => {
    callback(createInstance(Video, element, Object.assign({ hasAudio }, options)));
  });
};

Video.fromObject = function (object: fabric.Video, callback: (video: fabric.Video) => void) {
  Promise.all([
    createPromise<fabric.IBaseFilter[]>((resolve) => {
      if (!object.filters?.length) {
        resolve([]);
      } else {
        fabric.util.enlivenObjects(
          object.filters,
          (filters: fabric.IBaseFilter[]) => {
            resolve(filters);
          },
          "fabric.Image.filters",
        );
      }
    }),
    createPromise<fabric.Object | undefined>((resolve) => {
      if (!object.clipPath) {
        resolve(undefined);
      } else {
        fabric.util.enlivenObjects(
          [object.clipPath],
          ([clipPath]: [fabric.Object]) => {
            resolve(clipPath);
          },
          "fabric",
        );
      }
    }),
  ]).then(([filters, clipPath]) => {
    Video.fromURL(
      object.src,
      (video: fabric.Video) => {
        callback(video);
      },
      { ...object, clipPath, filters },
    );
  });
};

// @ts-ignore
fabric.Video = Video as any;
