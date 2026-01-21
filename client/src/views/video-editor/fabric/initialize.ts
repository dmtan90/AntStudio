import "video-editor/fabric/object";
import "video-editor/fabric/cropper";
import "video-editor/fabric/textbox";
import "video-editor/fabric/video";
import "video-editor/fabric/charts";
import "video-editor/fabric/gif";
import "video-editor/fabric/audio";
// import "video-editor/fabric/visual";

import { fabric } from "fabric";

import EdgeControl from "video-editor/assets/editor/controls/edge-control.svg";
import MiddleControlHorizontal from "video-editor/assets/editor/controls/middle-control-horizontal.svg";
import MiddleControlVertical from "video-editor/assets/editor/controls/middle-control-vertical.svg";
import RotationControl from "video-editor/assets/editor/controls/rotate-icon.svg";
import DragControl from "video-editor/assets/editor/controls/drag-icon.svg";

const middleControlVertical = document.createElement("img");
middleControlVertical.src = MiddleControlVertical;

const middleControlHorizontal = document.createElement("img");
middleControlHorizontal.src = MiddleControlHorizontal;

const edgeControl = document.createElement("img");
edgeControl.src = EdgeControl;

const rotationControl = document.createElement("img");
rotationControl.src = RotationControl;

const dragControl = document.createElement("img");
dragControl.src = DragControl;

// This enables the WebGL pipeline required for 'multiply'
(fabric as any).filterBackend = (fabric as any).initFilterBackend(null);
console.log("isWebglSupported", fabric.isWebglSupported())

// Sets crossOrigin to 'anonymous' for all new Fabric images globally
fabric.Image.prototype.crossOrigin = 'anonymous';

// console.log("fabric.controlsUtils", fabric.controlsUtils);

function renderIconVertical(ctx: CanvasRenderingContext2D, left: number, top: number, _: unknown, fabricObject: fabric.Object) {
  const wsize = 20;
  const hsize = 25;
  ctx.save();
  ctx.translate(left, top);
  ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle!));
  ctx.drawImage(middleControlVertical, -wsize / 2, -hsize / 2, wsize, hsize);
  ctx.restore();
}

function renderIconHorizontal(ctx: CanvasRenderingContext2D, left: number, top: number, _: unknown, fabricObject: fabric.Object) {
  const wsize = 25;
  const hsize = 20;
  ctx.save();
  ctx.translate(left, top);
  ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle!));
  ctx.drawImage(middleControlHorizontal, -wsize / 2, -hsize / 2, wsize, hsize);
  ctx.restore();
}

function renderIconEdge(ctx: CanvasRenderingContext2D, left: number, top: number, _: unknown, fabricObject: fabric.Object) {
  const wsize = 25;
  const hsize = 25;
  ctx.save();
  ctx.translate(left, top);
  ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle!));
  ctx.drawImage(edgeControl, -wsize / 2, -hsize / 2, wsize, hsize);
  ctx.restore();
}

function renderIconRotate(ctx: CanvasRenderingContext2D, left: number, top: number, _: unknown, fabricObject: fabric.Object) {
  const wsize = 40;
  const hsize = 40;
  ctx.save();
  ctx.translate(left, top);
  ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle!));
  ctx.drawImage(rotationControl, -wsize / 2, -hsize / 2, wsize, hsize);
  ctx.restore();
}

function renderIconDrag(ctx: CanvasRenderingContext2D, left: number, top: number, _: unknown, fabricObject: fabric.Object) {
  const wsize = 40;
  const hsize = 40;
  ctx.save();
  ctx.translate(left, top);
  ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle!));
  ctx.drawImage(dragControl, -wsize / 2, -hsize / 2, wsize, hsize);
  ctx.restore();
}

fabric.Object.prototype.controls.ml = new fabric.Control({
  x: -0.5,
  y: 0,
  offsetX: -1,
  cursorStyleHandler: fabric.controlsUtils.scaleSkewCursorStyleHandler,
  actionHandler: fabric.controlsUtils.scalingXOrSkewingY,
  getActionName: fabric.controlsUtils.scaleOrSkewActionName,
  render: renderIconVertical,
});

fabric.Object.prototype.controls.mr = new fabric.Control({
  x: 0.5,
  y: 0,
  offsetX: 1,
  cursorStyleHandler: fabric.controlsUtils.scaleSkewCursorStyleHandler,
  actionHandler: fabric.controlsUtils.scalingXOrSkewingY,
  getActionName: fabric.controlsUtils.scaleOrSkewActionName,
  render: renderIconVertical,
});

fabric.Object.prototype.controls.mb = new fabric.Control({
  x: 0,
  y: 0.5,
  offsetY: 1,
  cursorStyleHandler: fabric.controlsUtils.scaleSkewCursorStyleHandler,
  actionHandler: fabric.controlsUtils.scalingYOrSkewingX,
  getActionName: fabric.controlsUtils.scaleOrSkewActionName,
  render: renderIconHorizontal,
});

fabric.Object.prototype.controls.mt = new fabric.Control({
  x: 0,
  y: -0.5,
  offsetY: -1,
  cursorStyleHandler: fabric.controlsUtils.scaleSkewCursorStyleHandler,
  actionHandler: fabric.controlsUtils.scalingYOrSkewingX,
  getActionName: fabric.controlsUtils.scaleOrSkewActionName,
  render: renderIconHorizontal,
});

fabric.Object.prototype.controls.tl = new fabric.Control({
  x: -0.5,
  y: -0.5,
  cursorStyleHandler: fabric.controlsUtils.scaleCursorStyleHandler,
  actionHandler: fabric.controlsUtils.scalingEqually,
  render: renderIconEdge,
});

fabric.Object.prototype.controls.tr = new fabric.Control({
  x: 0.5,
  y: -0.5,
  cursorStyleHandler: fabric.controlsUtils.scaleCursorStyleHandler,
  actionHandler: fabric.controlsUtils.scalingEqually,
  render: renderIconEdge,
});

fabric.Object.prototype.controls.bl = new fabric.Control({
  x: -0.5,
  y: 0.5,
  cursorStyleHandler: fabric.controlsUtils.scaleCursorStyleHandler,
  actionHandler: fabric.controlsUtils.scalingEqually,
  render: renderIconEdge,
});

fabric.Object.prototype.controls.br = new fabric.Control({
  x: 0.5,
  y: 0.5,
  cursorStyleHandler: fabric.controlsUtils.scaleCursorStyleHandler,
  actionHandler: fabric.controlsUtils.scalingEqually,
  render: renderIconEdge,
});

fabric.Object.prototype.controls.mtr = new fabric.Control({
  x: 0,
  y: 0.5,
  cursorStyleHandler: fabric.controlsUtils.rotationStyleHandler,
  actionHandler: fabric.controlsUtils.rotationWithSnapping,
  offsetY: 28,
  offsetX: 20,
  withConnection: false,
  actionName: "rotate",
  render: renderIconRotate,
});

fabric.Object.prototype.controls.mbr = new fabric.Control({
  x: 0,
  y: 0.5,
  cursorStyleHandler: (_e, _c, object) => {
    if (object.lockMovementX && object.lockMovementY) return "not-allowed";
    else if (!object.lockScalingX && object.lockMovementY) return "ew-resize";
    else if (object.lockScalingX && !object.lockMovementY) return "ns-resize";
    else return "all-scroll";
  },
  actionHandler: fabric.controlsUtils.dragHandler,
  offsetY: 28,
  offsetX: -20,
  withConnection: false,
  actionName: "drag",
  render: renderIconDrag,
});
const textProto = (fabric as any).Textbox.prototype;
textProto.controls.mt = new (fabric as any).Control({ visible: false });
textProto.controls.mb = new (fabric as any).Control({ visible: false });
textProto.controls.ml = new (fabric as any).Control({
  x: -0.5,
  y: 0,
  offsetX: -1,
  cursorStyleHandler: (fabric as any).controlsUtils.scaleSkewCursorStyleHandler,
  actionHandler: (fabric as any).controlsUtils.changeWidth,
  actionName: "resizing",
  render: renderIconVertical,
});

fabric.Textbox.prototype.controls.mr = new fabric.Control({
  x: 0.5,
  y: 0,
  offsetX: 1,
  cursorStyleHandler: fabric.controlsUtils.scaleSkewCursorStyleHandler,
  actionHandler: fabric.controlsUtils.changeWidth,
  actionName: "resizing",
  render: renderIconVertical,
});

fabric.StaticCanvas.prototype.getItemByName = function (name) {
  let object: fabric.Object | null = null;
  const objects = this._objects;
  for (let i = 0, len = this.size(); i < len; i++) {
    if (objects[i].get("type") == "group") {
      if (objects[i].get("name") && objects[i].get("name") === name) {
        object = objects[i];
        break;
      }
      const wip = i;
      for (let o = 0; o < (objects[i] as fabric.Group)._objects.length; o++) {
        if ((objects[wip] as fabric.Group)._objects[o].name && (objects[wip] as fabric.Group)._objects[o].name === name) {
          object = (objects[wip] as fabric.Group)._objects[o];
          break;
        }
      }
    } else if (objects[i].name && objects[i].name === name) {
      object = objects[i];
      break;
    }
  }
  return object;
};

fabric.Canvas.prototype.indexOf = function (object) {
  return this._objects.findIndex((element) => element === object);
};

fabric.util.loadVideo = function (url, callback, _, crossOrigin) {
  const element = document.createElement("video");

  element.currentTime = 0;
  element.playsInline = true;
  element.crossOrigin = crossOrigin ?? null;

  element.onloadeddata = async () => {
    element.onloadeddata = null;
    element.onerror = null;
    element.height = element.videoHeight;
    element.width = element.videoWidth;
    callback(element);
  };
  element.onerror = () => {
    element.onloadeddata = null;
    element.onerror = null;
    callback(null);
  };

  element.src = url;
  element.load();
};

fabric.Object.NUM_FRACTION_DIGITS = 5;

fabric.Object.prototype.set({
  transparentCorners: false,
  borderColor: "#2563EB",
  cornerColor: "#FFFFFF",
  borderScaleFactor: 2,
  paintFirst: "stroke",
  cornerStyle: "circle",
  cornerStrokeColor: "#2563EB",
  borderOpacityWhenMoving: 0.75,
  strokeUniform: true,
  objectCaching: false,
});

fabric.Image.prototype.set({
  _controlsVisibility: {
    mt: false,
    mb: false,
    ml: false,
    mr: false,
  },
  // backgroundColor: "#FFFFFF"
});

fabric.Audio.prototype.set({
  _controlsVisibility: {
    mt: true,
    mb: true,
    ml: true,
    mr: true,
  },
});

// Define a custom SoftLight filter class
fabric.Image.filters.SoftLightBlend = fabric.util.createClass(fabric.Image.filters.BaseFilter, {
  type: 'SoftLightBlend',

  fragmentSource: `
    precision highp float;
    uniform sampler2D uTexture;
    varying vec2 vTexCoord;
    uniform vec3 uColor;
    uniform float uAlpha;

    // W3C Soft Light Formula
    float blendSoftLight(float base, float blend) {
      return (blend <= 0.5) ? 
        (base - (1.0 - 2.0 * blend) * base * (1.0 - base)) : 
        (base + (2.0 * blend - 1.0) * (sqrt(base) - base));
    }

    void main() {
      vec4 texColor = texture2D(uTexture, vTexCoord);
      vec3 base = texColor.rgb;
      vec3 blend = uColor;
      
      vec3 res = vec3(
        blendSoftLight(base.r, blend.r),
        blendSoftLight(base.g, blend.g),
        blendSoftLight(base.b, blend.b)
      );

      gl_FragColor = vec4(mix(base, res, uAlpha), texColor.a);
    }
  `,

  initialize: function (options) {
    options = options || {};
    this.uColor = options.uColor || [0.5, 0.5, 0.5];
    this.uAlpha = options.uAlpha !== undefined ? options.uAlpha : 1;
  },

  sendUniformData: function (gl, uniformLocations) {
    gl.uniform3fv(uniformLocations.uColor, this.uColor);
    gl.uniform1f(uniformLocations.uAlpha, this.uAlpha);
  },

  toObject: function () {
    return fabric.util.object.extend(this.callSuper('toObject'), {
      uColor: this.uColor,
      uAlpha: this.uAlpha
    });
  }
});

fabric.Image.filters.SoftLightBlend.fromObject = fabric.Image.filters.BaseFilter.fromObject;

fabric.Image.filters.SaturationBlend = fabric.util.createClass(fabric.Image.filters.BaseFilter, {
  type: 'SaturationBlend',

  // 1. The GLSL Logic
  fragmentSource: `
    precision highp float;
    uniform sampler2D uTexture;
    varying vec2 vTexCoord;
    uniform vec3 uColor;
    uniform float uAlpha;

    float getLum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
    float getSat(vec3 c) { return max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b)); }

    void main() {
      vec4 texColor = texture2D(uTexture, vTexCoord);
      vec3 base = texColor.rgb;
      float l = getLum(base);
      float s = getSat(uColor);
      
      vec3 res = l + (base - l) * (s / (getSat(base) + 0.001));
      gl_FragColor = vec4(mix(base, res, uAlpha), texColor.a);
    }
  `,

  // 2. Initialize parameters
  initialize: function (options) {
    options = options || {};
    this.uColor = options.uColor || [1, 0, 0];
    this.uAlpha = options.uAlpha !== undefined ? options.uAlpha : 1;
  },

  // 3. Send data to the GPU
  sendUniformData: function (gl, uniformLocations) {
    gl.uniform3fv(uniformLocations.uColor, this.uColor);
    gl.uniform1f(uniformLocations.uAlpha, this.uAlpha);
  },

  // 4. Required for state saving/loading
  toObject: function () {
    return fabric.util.object.extend(this.callSuper('toObject'), {
      uColor: this.uColor,
      uAlpha: this.uAlpha
    });
  }
});

// 5. THE FIX: Attach the static fromObject method
fabric.Image.filters.SaturationBlend.fromObject = fabric.Image.filters.BaseFilter.fromObject;

fabric.Image.filters.HardLightBlend = fabric.util.createClass(fabric.Image.filters.BaseFilter, {
  type: 'HardLightBlend',

  fragmentSource: `
    precision highp float;
    uniform sampler2D uTexture;
    varying vec2 vTexCoord;
    uniform vec3 uColor;
    uniform float uAlpha;

    float blendHardLight(float base, float blend) {
      return (blend < 0.5) ? (2.0 * base * blend) : (1.0 - 2.0 * (1.0 - base) * (1.0 - blend));
    }

    void main() {
      vec4 texColor = texture2D(uTexture, vTexCoord);
      vec3 base = texColor.rgb;
      vec3 blend = uColor;
      
      vec3 res = vec3(
        blendHardLight(base.r, blend.r),
        blendHardLight(base.g, blend.g),
        blendHardLight(base.b, blend.b)
      );

      gl_FragColor = vec4(mix(base, res, uAlpha), texColor.a);
    }
  `,

  initialize: function (options) {
    options = options || {};
    this.uColor = options.uColor || [1, 1, 0];
    this.uAlpha = options.uAlpha !== undefined ? options.uAlpha : 1;
  },

  sendUniformData: function (gl, uniformLocations) {
    gl.uniform3fv(uniformLocations.uColor, this.uColor);
    gl.uniform1f(uniformLocations.uAlpha, this.uAlpha);
  },

  toObject: function () {
    return fabric.util.object.extend(this.callSuper('toObject'), {
      uColor: this.uColor,
      uAlpha: this.uAlpha
    });
  }
});

// Important: Fix for the fromObject error
fabric.Image.filters.HardLightBlend.fromObject = fabric.Image.filters.BaseFilter.fromObject;
