import { createInstance } from "video-editor/lib/utils";
import { fabric } from "fabric";

export const propertiesToInclude = [
  "name",
  "meta",
  "chart",
  "anim",
  "blur",
  "effects",
  "adjustments",
  "previousFill",
  "trimStart",
  "trimEnd",
  "hasAudio",
  "selectable",
  "evented",
  "hasControls",
  "textTransform",
  "isEditing",
  "objectCaching",
  "excludeFromTimeline",
  "excludeFromAlignment",
  "absolutePositioned",
  "visualType",
  "visualProps",
  "audioName",
  "src",
  "volume",
  "muted",
  "keepRatio",
  "thumbnail"
];

export const textLayoutProperties = ["textTransform"];

export const activityIndicator = "M21 12a9 9 0 1 1-6.219-8.56";

export const defaultColor = "#FFFFFF";//text
export const defaultFill = "#FFFFFF";//shape
export const defaultStroke = "#FFFFFF";//shape
export const defaultBackgroundColor = "#303030";//artboard

export const defaultGradient = createInstance(fabric.Gradient, {
  type: "linear",
  gradientUnits: "percentage",
  coords: { x1: 0, y1: 0, x2: 1, y2: 0 },
  colorStops: [
    { offset: 0, color: "#000000" },
    { offset: 1, color: "#ffffff" },
  ],
}).toObject();
