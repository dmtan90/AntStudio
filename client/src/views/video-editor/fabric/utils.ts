import WebFont from "webfontloader";

import { fabric } from "fabric";
import { omit } from "lodash";
import { customAlphabet } from "nanoid";

import { generateCTA, generateDescription, generateHeadline } from "video-editor/api/ai";
import { queryClient } from "video-editor/config/api";
import { defaultFont, type EditorFont } from "video-editor/constants/fonts";
import { createInstance, createPromise } from "video-editor/lib/utils";
import type { EditorAudioElement } from "video-editor/types/editor";
import type { EditorMode, Dimension } from "video-editor/plugins/editor";
import { formatSource } from "video-editor/lib/media";
import { getFileUrl } from "@/utils/api";

export interface TransformChildren {
  object: fabric.Object;
  skip?: string[];
  callback?: Function;
}

export abstract class FabricUtils {
  private static nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz");

  static isActiveSelection(object?: any): object is fabric.ActiveSelection {
    return object?.type === "activeSelection";
  }

  static isImageElement(object?: any): object is fabric.Image {
    return object?.type === "image" || object?.type === "gif";
  }

  static isVideoElement(object?: any): object is fabric.Video {
    return object?.type === "video";
  }

  static isGifElement(object?: any): object is fabric.Gif {
    return object?.type === "gif";
  }

  static isChartElement(object?: any): object is fabric.Chart {
    return object?.type === "chart";
  }

  static isAudioElement(object?: any): object is EditorAudioElement {
    return object?.type === "audio";
  }

  static isAudioVisualElement(object?: any): object is fabric.Audio {
    return object?.type === "audio-visual";
  }

  static isTextboxElement(object?: any): object is fabric.Textbox {
    return object?.type === "textbox";
  }

  static isTextElement(object?: any): object is fabric.Text {
    return object?.type === "text";
  }

  static isAnimatedTextElement(object?: any): object is fabric.Group {
    return object?.type === "animated-text";
  }

  static isGroupElement(object?: any): object is fabric.Group {
    return object?.type === "group";
  }

  static elementID(prefix: string) {
    return prefix.toLowerCase() + "_" + this.nanoid(4);
  }

  static linearEasing(t: number, b: number, c: number, d: number) {
    return b + (t / d) * c;
  }

  static measureTextDimensions(text: string, fontFamily: string, fontSize: number, fontWeight: number) {
    const object = createInstance(fabric.Text, text, { fontFamily, fontWeight, fontSize });
    return { width: object.width! + 1, height: object.height! };
  }

  static initializeMetaProperties(object: fabric.Object, props?: Record<string, any>) {
    // console.log("initializeMetaProperties", object, props);
    object.meta = { duration: 5000, offset: 0, ...(object.meta || {}) };
    if (!props) return;
    for (const key in props) object.meta[key] = props[key];
  }

  static initializeAnimationProperties(object: fabric.Object, props?: Partial<fabric.AnimationTimeline>) {
    object.anim = {
      in: props?.in ?? { name: "none", duration: 0 },
      scene: props?.scene ?? { name: "none" },
      out: props?.out ?? { name: "none", duration: 0 },
      keyframes: props?.keyframes ?? [],
    };
  }

  static bindObjectTransformToParent(parent: fabric.Object, children: fabric.Object[]) {
    // console.log("bindObjectTransformToParent", parent, children);
    const invertedTransform = fabric.util.invertTransform(parent.calcTransformMatrix());
    for (const child of children) {
      if (!child.meta) this.initializeMetaProperties(child);
      child.meta!.transformMatrix = fabric.util.multiplyTransformMatrices(invertedTransform, parent.calcTransformMatrix());
      child.meta!.originalScaleX = child.scaleX;
      child.meta!.originalScaleY = child.scaleY;
      child.meta!.initialParentScaleX = parent.scaleX;
      child.meta!.initialParentScaleY = parent.scaleY;
    }
  }

  static updateObjectTransformToParent(parent: fabric.Object, children: Array<TransformChildren>) {
    // console.log("updateObjectTransformToParent", parent, children);
    for (const child of children) {
      if (!child.object.meta || !child.object.meta.transformMatrix || !Array.isArray(child.object.meta.transformMatrix)) continue;

      const transform = fabric.util.multiplyTransformMatrices(parent.calcTransformMatrix(), child.object.meta.transformMatrix);

      let decompose: Record<string, number> = fabric.util.qrDecompose(transform);
      if (child.skip) decompose = omit(decompose, child.skip);

      child.object.set({ flipX: false, flipY: false });
      child.object.setPositionByOrigin(createInstance(fabric.Point, decompose.translateX, decompose.translateY), "center", "center");

      const scaleFactorX = parent.scaleX! / child.object.meta.initialParentScaleX;
      const scaleFactorY = parent.scaleY! / child.object.meta.initialParentScaleY;
      const adjustedScaleX = child.object.meta.originalScaleX * scaleFactorX;
      const adjustedScaleY = child.object.meta.originalScaleY * scaleFactorY;

      child.object.set({ ...decompose, scaleX: adjustedScaleX, scaleY: adjustedScaleY });
      child.object.setCoords();

      child.callback?.();
    }
  }

  static applyObjectScaleToDimensions(object: fabric.Object, list?: string[]) {
    // console.log("applyObjectScaleToDimensions", object, list);
    if (!list || list.includes(object.type!)) {
      // console.log("scale", object.scaleX, object.scaleY);
      if (object.scaleX == 1 && object.scaleY == 1) {
        return;
      }

      const keepRatio = object.keepRatio ?? false;
      switch (object.type) {
        case "textbox": {
          const textbox = object as fabric.Textbox;
          textbox.set({ fontSize: Math.round(textbox.fontSize! * textbox.scaleY!), width: textbox.width! * textbox.scaleX!, scaleY: 1, scaleX: 1 });
          break;
        }
        case "rect": {
          let width = object.width! * object.scaleX!;
          let height = object.height! * object.scaleY!;
          if (keepRatio) {
            if (object.scaleX != 1) {
              //force update by width
              height = width * object.height! / object.width!
            }
            else if (object.scaleY != 1) {
              //force update by height
              width = height * object.width! / object.height!;
            }
          }

          object.set({ width: width, height: height, scaleX: 1, scaleY: 1 });
          break;
        }
        case "triangle": {
          let width = object.width! * object.scaleX!;
          let height = object.height! * object.scaleY!;
          if (keepRatio) {
            if (object.scaleX != 1) {
              //force update by width
              height = width * object.height! / object.width!
            }
            else if (object.scaleY != 1) {
              //force update by height
              width = height * object.width! / object.height!;
            }
          }
          object.set({ width: width, height: height, scaleX: 1, scaleY: 1 });
          break;
        }
        case "ellipse": {
          const ellipse = object as fabric.Ellipse;
          let rx = ellipse.rx! * object.scaleX!;
          let ry = ellipse.ry! * object.scaleY!;
          if (keepRatio) {
            if (object.scaleX != 1) {
              //force update by width
              ry = rx * ellipse.ry! / ellipse.rx!
            }
            else if (object.scaleY != 1) {
              //force update by height
              rx = ry * ellipse.rx! / ellipse.ry!;
            }
          }
          ellipse.set({ rx: rx, ry: ry, scaleX: 1, scaleY: 1 });
          break;
        }
        case "circle": {
          const circle = object as fabric.Circle;
          let radius = circle.radius! * object.scaleX!;
          if (object.scaleX != 1) {
            radius = circle.radius! * object.scaleX!;
          }
          else if (object.scaleY != 1) {
            radius = circle.radius! * object.scaleY!;
          }
          circle.set({ radius: radius, scaleX: 1, scaleY: 1 });
          break;
        }
        case "path": {
          const path = object as Required<fabric.Path>;
          const scaleX = 1 / path.scaleX;
          const scaleY = 1 / path.scaleY;
          const points = path.path as unknown as number[][];
          points.forEach((point) => {
            if (point[1] !== undefined) point[1] *= scaleX;
            if (point[2] !== undefined) point[2] *= scaleY;
          });
          object.set({ scaleX: 1, scaleY: 1 });
          break;
        }
      }
    }
  }

  static objectSpinningAnimation(object: fabric.Object, duration = 750, loop = true, abort?: Function) {
    // console.log("objectSpinningAnimation", object, duration, loop);
    fabric.util.animate({
      startValue: object.angle!,
      endValue: object.angle! + 360,
      duration: duration,
      abort: abort,
      easing: this.linearEasing,
      onChange: (value) => {
        const centerPoint = object.getCenterPoint();
        const constraint = object.translateToOriginPoint(centerPoint, "center", "center");
        object.angle = value;
        object.setPositionByOrigin(constraint, "center", "center");
        if (object.canvas) object.canvas.requestRenderAll();
      },
      onComplete: () => {
        if (loop) this.objectSpinningAnimation(object);
      },
    } as any);
  }

  static applyTransformationsAfterLoad(canvas: fabric.Canvas | fabric.StaticCanvas) {
    // console.log("applyTransformationsAfterLoad", canvas);
    for (const object of canvas._objects) {
      object.set({ objectCaching: false });
      if (object.clipPath) {
        const existing = canvas.getItemByName(object.clipPath.name);
        if (existing) canvas.remove(existing);
        const clipPath = object.clipPath;
        clipPath.set({ objectCaching: false, opacity: 0.01, excludeFromTimeline: true });
        canvas.add(clipPath);
        FabricUtils.bindObjectTransformToParent(object, [clipPath]);
        const handler = FabricUtils.updateObjectTransformToParent.bind(this, object, [{ object: clipPath }]);
        object.on("moving", handler);
        object.on("scaling", handler);
        object.on("rotating", handler);
      }
    }
  }

  static transformObjectsToMatchWorkspace(objects: fabric.Object[], templateWorkspace: Dimension, canvasWorkspace: Dimension) {
    // console.log("transformObjectsToMatchWorkspace", objects, templateWorkspace, canvasWorkspace);
    try {
      if (!objects || objects.length == 0 || !templateWorkspace || !canvasWorkspace || (templateWorkspace.width == canvasWorkspace.width && templateWorkspace.height == canvasWorkspace.height)) {
        return
      }

      //move objects to center of canvas
      let deltaX = (canvasWorkspace.width - templateWorkspace.width) / 2;
      let deltaY = (canvasWorkspace.height - templateWorkspace.height) / 2;
      let scaleRatio = templateWorkspace.height * canvasWorkspace.width / canvasWorkspace.height;
      if (deltaX == 0 || deltaY == 0) {//fit width or height
        for (let i = 0; i < objects.length; i++) {
          const object = objects[i]
          object.left += deltaX;
          object.top += deltaY;
          if (object.clipPath) {
            object.clipPath.left += deltaX;
            object.clipPath.top += deltaY;
          }
        }
      }
      else {//scale objects to fit ratio
        for (let i = 0; i < objects.length; i++) {
          const object = objects[i]
          object.left += deltaX
          object.top += deltaY;
          object.width *= scaleRatio;
          object.height *= scaleRatio;
          if (object.clipPath) {
            object.clipPath.left += deltaX;
            object.clipPath.top += deltaY;
            object.clipPath.width *= scaleRatio;
            object.clipPath.height *= scaleRatio;
          }
        }
      }
    } catch (error) {
      console.error("transformObjectsToMatchWorkspace error:", error)
    }
  }

  static async applyModificationsAfterLoad(objects: fabric.Object[], { product, objective, brand }: any, mode: EditorMode) {
    console.log("applyModificationsAfterLoad", objects, mode, product, objective, brand);
    if (mode === "creator") return;

    if (brand) {
      const elements = objects.filter((object) => object.meta?.label === "brand-image" && this.isImageElement(object)) as fabric.Image[];
      const promises = elements.map(async (element) => {
        const resolvedUrl = await getFileUrl(brand.brand_logo, { cached: true });
        return createPromise<void>((resolve, reject) => {
          fabric.util.loadImage(
            formatSource(resolvedUrl),
            (image) => {
              if (!image || !image.height || !image.width) {
                reject();
              } else {
                const props = this.calculateReplacementImageProps(element, image, true);
                element.setElement(image);
                element.set(props).setCoords();
                resolve();
              }
            },
            null,
            "anonymous",
          );
        });
      });
      await Promise.allSettled(promises);
    }

    if (!product) return;

    if (product.images.length) {
      const elements = objects.filter((object) => object.meta?.label === "main-image" && this.isImageElement(object)) as fabric.Image[];
      const promises = elements.map(async (element, index) => {
        const url = product.images[index % product.images.length].url;
        const resolvedUrl = await getFileUrl(url, { cached: true });
        return createPromise<void>((resolve, reject) => {
          fabric.util.loadImage(
            formatSource(resolvedUrl),
            (image) => {
              if (!image || !image.height || !image.width) {
                reject();
              } else {
                const props = this.calculateReplacementImageProps(element, image);
                element.setElement(image);
                element.set(props).setCoords();
                resolve();
              }
            },
            null,
            "anonymous",
          );
        });
      });
      await Promise.allSettled(promises);
    }

    if (!objective) return;

    const [headlines, descriptions, ctas] = await Promise.allSettled([
      queryClient.ensureQueryData({ queryKey: [generateHeadline.name], queryFn: () => generateHeadline(product, objective) }),
      queryClient.ensureQueryData({ queryKey: [generateDescription.name], queryFn: () => generateDescription(product, objective) }),
      queryClient.ensureQueryData({ queryKey: [generateCTA.name], queryFn: () => generateCTA(product, objective) }),
    ]);

    if (ctas.status === "fulfilled" && Array.isArray(ctas.value) && ctas.value.length > 0) {
		console.log("ctas", ctas.value);
      const elements = objects.filter((object) => object.meta?.label === "cta-text" && this.isTextboxElement(object)) as fabric.Textbox[];
      elements.map((element, index) => element.set({ text: (ctas.value as string[])[index % (ctas.value as string[]).length] }));
    }

    if (headlines.status === "fulfilled" && Array.isArray(headlines.value) && headlines.value.length > 0) {
      console.log("headlines", headlines.value);
	  const elements = objects.filter((object) => object.meta?.label === "headline-text" && this.isTextboxElement(object)) as fabric.Textbox[];
      elements.map((element, index) => element.set({ text: (headlines.value as string[])[index % (headlines.value as string[]).length] }));
    }

    if (descriptions.status === "fulfilled" && Array.isArray(descriptions.value) && descriptions.value.length > 0) {
      console.log("descriptions", descriptions.value);
	  const elements = objects.filter((object) => object.meta?.label === "description-text" && this.isTextboxElement(object)) as fabric.Textbox[];
      elements.map((element, index) => element.set({ text: (descriptions.value as string[])[index % (descriptions.value as string[]).length] }));
    }
  }

  static applyFontsBeforeLoad(objects: fabric.Object[]) {
    return createPromise<void>((resolve) => {
      const fonts = objects.filter(this.isTextboxElement).map((text) => {
        const font: EditorFont = text.meta!.font || defaultFont;
        const styles = font.styles.map((style) => `${style.weight}`).join(",");
        return `${font.family}:${styles}`;
      });
      if (!fonts.length) {
        resolve();
      } else {
        WebFont.load({
          google: { families: fonts },
          active: resolve,
        });
      }
    });
  }

  static calculateReplacementImageProps(element: fabric.Image, image: HTMLImageElement, skip?: boolean) {
    let scale = (element.getScaledWidth() / image.width + element.getScaledHeight() / image.height) / 2;

    if (image.width * scale < element.getScaledWidth()) {
      const difference = element.getScaledWidth() - image.width * scale;
      scale += difference / image.width;
    }

    if (image.height * scale < element.getScaledHeight()) {
      const difference = element.getScaledHeight() - image.height * scale;
      scale += difference / image.height;
    }

    const cropX = skip ? 0 : element.cropX;
    const cropY = skip ? 0 : element.cropY;

    const width = skip ? image.width : element.getScaledWidth() / scale;
    const height = skip ? image.height : element.getScaledHeight() / scale;

    return { scaleX: scale, scaleY: scale, cropX, cropY, width, height };
  }

  static convertGradient(angle: number) {
    const radians = angle * (Math.PI / 180);
    const x1 = 0.5 + Math.cos(radians) * 0.5;
    const y1 = 0.5 + Math.sin(radians) * 0.5;
    const x2 = 0.5 - Math.cos(radians) * 0.5;
    const y2 = 0.5 - Math.sin(radians) * 0.5;
    return { x1, y1, x2, y2 };
  }

  static revertGradient({ x1, y1, x2, y2 }: any) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const angleRadians = Math.atan2(dy, dx);
    let angleDegrees = angleRadians * (180 / Math.PI);
    if (angleDegrees < 0) angleDegrees += 360;
    return Math.round(angleDegrees);
  }

  static calculateAnimationPositionDelta(object: fabric.Object) {
    const width = object.width! * object.scaleX!;
    const height = object.height! * object.scaleY!;

    const diagonal = Math.sqrt(width * width + height * height);
    const radian = fabric.util.degreesToRadians(object.angle!);

    const x = Math.sin(radian);
    const y = Math.cos(radian);

    return { x, y, diagonal, height, width };
  }

  static exportImage(callback: any, object: fabric.Object, format: string = "png", quality: number = 1.0) {
    if (!callback || !object) {
      return;
    }
    try {
      let tempCanvas = document.createElement('canvas');
      // Set dimensions of temporary canvas to match object's bounding box
      // tempCanvas.width = object.getScaledWidth();
      // tempCanvas.height = object.getScaledHeight();
      let fcanvas = new fabric.Canvas(tempCanvas, {
        enableRetinaScaling: false,
        width: object.width,
        height: object.height
      });

      object.clone((clonedObject) => {
        // console.log("clonedObject", clonedObject);
        clonedObject.set({ left: 0, top: 0 }); // Position at origin of temp canvas
        fcanvas.add(clonedObject);
        fcanvas.renderAll();
        const objectDataURL = fcanvas.toDataURL({
          format: format,
          quality: quality,
        });
        // fcanvas.dispose();
        // fcanvas = null;
        // tempCanvas = null;
        callback(objectDataURL);
      });
    } catch (error) {
      console.log(error);
    }

    // let clonedObject = fabric.util.object.clone(object); // Clone to avoid modifying original
    // clonedObject.set({ left: 0, top: 0 }); // Position at origin of temp canvas
    // fcanvas.add(clonedObject);
    // fcanvas.renderAll();
    // const objectDataURL = fcanvas.toDataURL({
    //     format: format,
    //     quality: quality,
    // });
    // fcanvas.dispose();
    // fcanvas = null;
    // tempCanvas = null;
    // return objectDataURL;

    // // Assuming 'myObject' is a Fabric.js object on your canvas
    // let tempCanvas = fabric.util.createCanvasElement();
    // const tempCtx = tempCanvas.getContext('2d');

    // // Set dimensions of temporary canvas to match object's bounding box
    // tempCanvas.width = object.getScaledWidth();
    // tempCanvas.height = object.getScaledHeight();

    // // Render the object onto the temporary canvas
    // object.render(tempCtx);

    // // Get the data URL from the temporary canvas
    // const objectDataURL = tempCanvas.toDataURL({
    //     format: 'png',
    //     quality: 1.0
    // });

    // tempCanvas = null;
    // return objectDataURL;
  }
}
