import { checkForAudioInVideo } from "video-editor/lib/media";
import { createInstance, createPromise, waitUntilEvent } from "video-editor/lib/utils";
import { fabric } from "fabric";
import { clamp, isUndefined } from "lodash";
const FILL = 'fill';
import { parseGIF, decompressFrames } from 'gifuct-js';
// const fetchGif = fetch(gifURL)
//      .then(resp => resp.arrayBuffer())
//      .then(buff => {
//        var gif = parseGIF(buff)
//        var frames = decompressFrames(gif, true)
//        return gif;
//      });

const gifToFrames = async (url: string, width: number, height: number) => {
  try{
    const reponse = await fetch(url);
    if(!reponse.ok){
      throw new Error(`Load GIF error: ${response.status}`);
    }
    const arrayBuffer = await reponse.arrayBuffer();
    const gif = parseGIF(arrayBuffer)
    let frames = decompressFrames(gif, true);
    let i = 0;
    let canvas = document.createElement('canvas');
    canvas.width = width;//frame.dims.width;
    canvas.height = height;//frame.dims.height;
    const ctx = canvas.getContext('2d');

    frames = frames.map(frame => {
      // if(i == 0){
      //   console.log("transparentIndex", frame.transparentIndex, frame.pixels, frame.patch, frame.colorTable);
      //   i++;
      // }
      ctx.clearRect(0, 0, width, height);
      // Create ImageData from frame patch data (assuming buildPatch was true)
      const imageData = ctx.createImageData(frame.dims.width, frame.dims.height);
      imageData.data.set(frame.patch); // 'frame.patch' contains the pixel data
      let paddingX = 0;
      let paddingY = 0;
      if(frame.dims.width < width){
        paddingX = (width - frame.dims.width)/2;
        // console.log(paddingX);
      }

      if(frame.dims.height < height){
        paddingY = (height - frame.dims.height)/2;
        // console.log(paddingY);
      }

      // Draw the image data onto the canvas
      ctx.putImageData(imageData, paddingX, paddingY);

      // Optional: Convert canvas to image data URL
      const imageUrl = canvas.toDataURL('image/png');
      // Use imageUrl to display or save the frame as an image

      // Convert Uint8Array to a binary string
      // Using reduce for robustness with potentially large arrays
      // const binaryString = frame.patch?.reduce((data, byte) => data + String.fromCharCode(byte), '');

      // // Encode the binary string to Base64
      // const base64String = btoa(binaryString);

      // Prepend the data URI scheme
      // const base64Img = `data:${mimeType};base64,${base64String}`;
      // const blob = new Blob([frame.patch], { type: 'image/gif' });
      // const url = URL.createObjectURL(blob);
      return { img: imageUrl, delay: frame.delay };
    });
    canvas = null;
    return frames;
  }catch(err){
    return null;
  }
}

const Gif = fabric.util.createClass(fabric.Image, {
  type: "gif",
  playing: false,
  duration: 0,
  frames: [],
  frameIndex: 0,
  delay: 30,
  // _src: "",//origin source
  timer: null,

  initialize: function (element: HTMLImageElement, options?: fabric.IImageOptions) {
    options = options || {};
    element.crossOrigin = options.crossOrigin ?? "anonymous";
    this.src = element.src;
    this.callSuper("initialize", element, options);
    this.set({ left: options.left ?? 0, top: options.top ?? 0, objectCaching: false });
    this.loadFrames();
    this.on("added", () => fabric.util.requestAnimFrame(this.update.bind(this)));
  },

  loadFrames: async function(){
    // console.log("loadFrames");
    let element = this._originalElement;
    const frames = await gifToFrames(this.src, element.width, element.height);
    this.frames = [];
    this.frameIndex = 0;
    this.duration = 0;
    if(frames && frames.length > 0){
      this.frames = frames;
      this.delay = frames[0].delay;
      frames.forEach(frame => {
        if(frame && frame.delay < this.delay){
          this.delay = frame.delay
        }
      });
      this.duration = this.delay * frames.length;//ms
    }
  },

  play: async function () {
    if (this.playing) return;
    this.playing = true;
    this.frameIndex = 0;
    this.timer = setInterval(() => {
      this.updateFrame();
    }, this.delay);
  },

  pause: function () {
    if (!this.playing) return;
    this.playing = false;
    clearInterval(this.timer);
    this.timer = null;
    // console.log(this.src);
    this.setSrc(this.src, function(img) {
      img.canvas.renderAll(); // Important: Re-render the canvas to see the change
    }, {crossOrigin: "anonymous"});
  },

  seek: function(seconds: number) {

  },

  update: function () {
    if (this.canvas) {
      const backend = fabric.filterBackend;
      if (backend?.evictCachesForKey) {
        backend.evictCachesForKey(this.cacheKey);
        backend.evictCachesForKey(this.cacheKey + "_filtered");
      }
      this.applyFilters();
      this.canvas.renderAll();
      fabric.util.requestAnimFrame(this.update.bind(this));
    }
  },

  updateFrame: function(){
    const src = this.getNextFrame();
    // var image = new Image();
    // image.crossOrigin = true;
    // image.onload = () => {
    //   console.log(image);
    //   this.setElement(image);
    // };
    // image.onerror = (err) => {
    //   console.log(image);
    // };
    // image.src = src;
    this.setSrc(src, function(img) {
      img.canvas.renderAll(); // Important: Re-render the canvas to see the change
    }, {crossOrigin: "anonymous"});
  },

  /**
   * Returns source of an image
   * @param {Boolean} filtered indicates if the src is needed for svg
   * @return {String} Source of an image
   */
  getSrc(filtered?: boolean): string {
    const element = filtered ? this._element : this._originalElement;
    if (element) {
      // console.log(element);
      if ((element as HTMLCanvasElement).toDataURL) {
        return (element as HTMLCanvasElement).toDataURL();
      }
      // return this._src;
      // if (this.srcFromAttribute) {
      //   return element.getAttribute('src') || '';
      // } else {
      //   return (element as HTMLImageElement).src;
      // }
    }
    return this.src || '';
  },

  getNextFrame: function(){
    const index = this.frameIndex % this.frames.length;
    const frame = this.frames[index];
    this.delay = frame.delay;
    this.frameIndex++;
    return frame.img;
  },

  destroyFrames: function(){
    this.frames = null;
    this.frameIndex = 0;
    this.delay = 0;
  },

  dispose: function(){
    this.pause();
    this.destroyFrames();
    this.callSuper("dispose");
  },
});

Gif.fromURL = function (url: string, callback: (gif: fabric.Gif | null) => void, options?: fabric.IImageOptions) {
  // const element = document.createElement("img");
  // element.crossOrigin = options?.crossOrigin ?? "anonymous";

  // element.onload = () => {
  //   element.onload = null;
  //   element.onerror = null;
  //   callback(createInstance(Gif, element, options));
  // };

  // element.onerror = () => {
  //   element.onload = null;
  //   element.onerror = null;
  //   callback(null);
  // };

  // element.src = url;
  fabric.util.loadImage(url, (image) => {
      if (!image || !image.height || !image.width) {
        callback(null);
      } else {
        callback(createInstance(Gif, image, options));
      }
    },
    null,
    "anonymous",
  );
};

Gif.fromElement = function (element: HTMLImageElement, callback: (gif: fabric.Gif | null) => void, options?: fabric.IImageOptions) {
  callback(createInstance(Gif, element, options));
};

Gif.fromObject = function (object: fabric.Gif, callback: (gif: fabric.Gif) => void) {
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
    Gif.fromURL(
      object.src,
      (gif: fabric.Gif) => {
        callback(gif);
      },
      { ...object, clipPath, filters },
    );
  });
};

fabric.Gif = Gif;
