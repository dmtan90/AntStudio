import { fabric } from "fabric";
import { sum } from "lodash";
import { createInstance, createMap } from "video-editor/lib/utils";
import { Canvas } from "video-editor/plugins/canvas";

interface AnimatedTextState {
  textbox: fabric.Textbox;
  group: fabric.Group;
}

export class CanvasText {
  private _canvas: Canvas;
  animated: Map<string, AnimatedTextState>;

  constructor(canvas: Canvas) {
    this._canvas = canvas;
    this.animated = createMap();
    // makeAutoObservable(this);
  }

  private get canvas() {
    return this._canvas.instance!;
  }

  private _transformText(text: string, textTransform?: string) {
    switch (textTransform) {
      case "uppercase":
        return text.toUpperCase();
      case "lowercase":
        return text.toLowerCase();
      default:
        return text;
    }
  }

  animate(textbox: fabric.Textbox, canvas: fabric.Canvas | fabric.StaticCanvas) {
    const lines: fabric.Group[] = [];
    const exclude = { excludeFromTimeline: true, excludeFromExport: true, excludeFromAlignment: true };

    if (!(textbox as any).__charBounds?.length) (textbox as any)._textLines.map((_: any, index: number) => (textbox as any)._measureLine(index));

    for (let outer = 0; outer < (textbox as any).__charBounds!.length; outer++) {
      let word: fabric.Text[] = [];
      let line: fabric.Group[] = [];
      const char = (textbox as any)._textLines[outer];

      for (let inner = 0; inner < char.length; inner++) {
        const bounds = (textbox as any).__charBounds![outer][inner];
        const character = this._transformText(char[inner], (textbox as any).textTransform);

        const fonts = { fontFamily: textbox.fontFamily, fontSize: textbox.fontSize! * textbox.scaleY!, fontStyle: textbox.fontStyle, fontWeight: textbox.fontWeight };
        const decorations = { underline: textbox.underline, fill: textbox.fill, linethrough: textbox.linethrough };
        const dimensions = { top: sum((textbox as any).__lineHeights.slice(0, outer).map((value: number) => value * textbox.scaleY!)), left: bounds.left * textbox.scaleX!, width: bounds.width * textbox.scaleX!, scaleX: 1, scaleY: 1 };

        if (character !== " ") {
          const letter = createInstance(fabric.Text, character, Object.assign({ objectCaching: false }, exclude, fonts, dimensions, decorations));
          word.push(letter);
        }

        if (character === " " || inner === char.length - 1) {
          line.push(createInstance(fabric.Group, word, Object.assign({ objectCaching: false }, exclude)));
          word = [];
        }
      }

      const group = createInstance(fabric.Group, line, Object.assign({ objectCaching: false }, exclude));
      lines.push(group);
    }

    const rect = createInstance(fabric.Rect, Object.assign({ height: textbox.height! * textbox.scaleY!, width: textbox.width! * textbox.scaleX!, visible: false, objectCaching: false }, exclude));
    const group = createInstance(fabric.Group, [...lines, rect], Object.assign({ type: "animated-text", name: "animated_" + textbox.name, meta: textbox.meta, anim: textbox.anim, objectCaching: false }, exclude));

    for (const line of lines) {
      switch (textbox.textAlign) {
        case "left":
          line.setPositionByOrigin(createInstance(fabric.Point, rect.left!, line.getCenterPoint().y), "left", "center");
          break;
        case "center":
          line.setPositionByOrigin(createInstance(fabric.Point, rect.getCenterPoint().x, line.getCenterPoint().y), "center", "center");
          break;
        case "right":
          line.setPositionByOrigin(createInstance(fabric.Point, rect.left! + rect.width!, line.getCenterPoint().y), "right", "center");
          break;
      }
    }

    group.setPositionByOrigin(textbox.getCenterPoint(), "center", "center");
    group.set({ visible: textbox.visible }).rotate(textbox.angle!);
    textbox.set({ visible: false, hasBorders: false, hasControls: false });

    canvas.add(group);
    this.animated.set(textbox.name!, { textbox, group });
    canvas.renderAll();

    return group;
  }

  restore(_id: string) {
    const id = _id.replace("animated_", "");
    if (!this.animated.has(id)) return;

    const animated = this.animated.get(id)!;
    this.animated.delete(id);

    animated.textbox.set({ visible: true, hasBorders: true, hasControls: true });
    this.canvas.remove(animated.group);
  }
}
