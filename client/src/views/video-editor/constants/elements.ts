import abstractJSON from "video-editor/database/shapes.json";
import framesJSON from "video-editor/database/frames.json";
import type { EditorAbstractShape, EditorFrames } from "video-editor/types/elements";
import { defaultColor, defaultBackgroundColor, defaultFill, defaultStroke } from "video-editor/fabric/constants";

export const frames = framesJSON as EditorFrames[];

export const abstract = abstractJSON as EditorAbstractShape[];

export const basic = [
  {
    name: "square",
    path: "M4 4 H44 V44 H4 Z",
    klass: "Rect",
    params: { height: 500, width: 500, fill: defaultFill, stroke: defaultStroke } as fabric.IRectOptions,
  },
  {
    name: "square-rounded",
    path: "M12 4 H36 A8 8 0 0 1 44 12 V36 A8 8 0 0 1 36 44 H12 A8 8 0 0 1 4 36 V12 A8 8 0 0 1 12 4 Z",
    klass: "Rect",
    params: { height: 500, width: 500, rx: 48, ry: 48, fill: defaultStroke } as fabric.IRectOptions,
  },
  {
    name: "triange",
    path: "M24 4 L44 44 H4 Z",
    klass: "Triangle",
    params: { height: 500, width: 500, fill: defaultFill, stroke: defaultStroke } as fabric.ITriangleOptions,
  },
  {
    name: "circle",
    path: "M24 4 A 20 20 0 1 1 23.99 4 Z",
    klass: "Circle",
    params: { radius: 250, fill: defaultFill, stroke: defaultStroke } as fabric.ICircleOptions,
  },
  {
    name: "ellipse",
    path: "M 4 24 A 20 15 0 1 0 44 24 A 20 15 0 1 0 4 24 Z",
    klass: "Ellipse",
    params: { rx: 240, ry: 160, fill: defaultFill, stroke: defaultStroke } as fabric.IEllipseOptions,
  },
];

export const lines = [
  {
    name: "Line",
    path: "M 0.46601942,2.5631068 2.5631068,0.40776699 48.563819,45.433327 46.463094,47.534052 Z",
    points: [0, 0, 250, 0],
  },
];
