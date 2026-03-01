
import { fabric } from "fabric";
import { Canvas } from "./canvas";
import { FabricUtils } from "video-editor/fabric/utils";
import type { DetectedObject } from "../services/ObjectDetectionService";
import type { DetectedFace } from "../services/FaceDetectionService";

export class CanvasAiOverlays {
    private canvas: Canvas;
    private overlayGroup: fabric.Group | null = null;
    private faceBlurGroup: fabric.Group | null = null;

    constructor(canvas: Canvas) {
        this.canvas = canvas;
    }

    /**
     * Draws bounding boxes for detected objects.
     * @param objects Detected objects with bounding box data (normalized coordinates 0-1).
     */
    drawObjectBoundingBoxes(objects: DetectedObject[]) {
        if (!this.canvas.instance) return;

        // Clear existing overlays
        this.clearObjectOverlays();

        if (objects.length === 0) return;

        const artboard = this.canvas.artboard;
        const width = artboard.width || 1080;
        const height = artboard.height || 1920;
        const left = artboard.left || 0;
        const top = artboard.top || 0;

        const overlayObjects: fabric.Object[] = [];

        objects.forEach(obj => {
            const { originX, originY, width: w, height: h } = obj.box;

            const rect = new fabric.Rect({
                left: left + (originX * width),
                top: top + (originY * height),
                width: w * width,
                height: h * height,
                fill: 'transparent',
                stroke: '#F97316', // Orange
                strokeWidth: 2,
                selectable: false,
                evented: false,
            });

            const text = new fabric.Text(`${obj.label} ${(obj.score * 100).toFixed(0)}%`, {
                left: left + (originX * width),
                top: top + (originY * height) - 15,
                fontSize: 12,
                fill: 'white',
                backgroundColor: '#F97316',
                fontFamily: 'Inter',
                selectable: false,
                evented: false,
            });

            overlayObjects.push(rect, text);
        });

        this.overlayGroup = new fabric.Group(overlayObjects, {
            selectable: false,
            evented: false,
            excludeFromExport: true,
            name: "ai-object-overlays"
        });

        this.canvas.instance.add(this.overlayGroup);
        this.canvas.instance.requestRenderAll();
    }

    clearObjectOverlays() {
        if (this.overlayGroup) {
            this.canvas.instance.remove(this.overlayGroup);
            this.overlayGroup = null;
            this.canvas.instance.requestRenderAll();
        }
    }

    /**
     * Applies a blur effect to detected faces.
     * @param faces Detected faces with bounding box data.
     */
    async applyFaceBlur(faces: DetectedFace[]) {
        if (!this.canvas.instance) return;

        // This is a visualization hack for now. 
        // Real implementation would involve cloning the video, applying blur filter, 
        // and masking it, or using a specialized filter if Fabric supports region-based filters.

        // For now, let's draw a blurred image overlay or a "pixellated" rect 
        // to clearly show the "Blur" intent in the UI. Is semi-transparent white box for now.

        this.clearFaceBlur();

        if (faces.length === 0) return;

        const artboard = this.canvas.artboard;
        const width = artboard.width || 1080;
        const height = artboard.height || 1920;
        const left = artboard.left || 0;
        const top = artboard.top || 0;

        const blurObjects: fabric.Object[] = [];

        faces.forEach(face => {
            const { originX, originY, width: w, height: h } = face.box;

            // Create a "blur" placeholder - frosted glass look
            const blurRect = new fabric.Rect({
                left: left + (originX * width),
                top: top + (originY * height),
                width: w * width,
                height: h * height,
                fill: 'rgba(255, 255, 255, 0.3)',
                stroke: 'transparent',
                rx: 10,
                ry: 10,
                selectable: false,
                evented: false,
            });

            // Hack to simulate blur? 
            // In a real editor we might use image.clone() -> apply Filter.Blur -> clipPath = rect

            const label = new fabric.Text(`Face Hidden`, {
                left: left + (originX * width) + (w * width) / 2,
                top: top + (originY * height) + (h * height) / 2,
                fontSize: 10,
                originX: 'center',
                originY: 'center',
                fill: 'white',
                selectable: false,
                evented: false,
                shadow: new fabric.Shadow({ color: 'black', blur: 2 })
            });

            blurObjects.push(blurRect, label);
        });

        this.faceBlurGroup = new fabric.Group(blurObjects, {
            selectable: false,
            evented: false,
            excludeFromExport: true,
            name: "ai-face-blur-overlays"
        });

        this.canvas.instance.add(this.faceBlurGroup);
        this.canvas.instance.requestRenderAll();
    }

    clearFaceBlur() {
        if (this.faceBlurGroup) {
            this.canvas.instance.remove(this.faceBlurGroup);
            this.faceBlurGroup = null;
            this.canvas.instance.requestRenderAll();
        }
    }

    /**
     * Draws bounding boxes for detected text.
     * @param detectedTexts Detected text with bounding box data.
     */
    drawTextDetections(detectedTexts: any[]) {
        if (!this.canvas.instance) return;

        // Clear object overlays as we might want to reuse or create a specific group for text
        // For now, let's reuse the overlay group logic or create a new one
        if (this.overlayGroup) {
            this.canvas.instance.remove(this.overlayGroup);
            this.overlayGroup = null;
        }

        if (detectedTexts.length === 0) return;

        const artboard = this.canvas.artboard;
        const width = artboard.width || 1080;
        const height = artboard.height || 1920;
        const left = artboard.left || 0;
        const top = artboard.top || 0;

        const overlayObjects: fabric.Object[] = [];

        detectedTexts.forEach(obj => {
            const { originX, originY, width: w, height: h } = obj.box;

            const rect = new fabric.Rect({
                left: left + (originX * width),
                top: top + (originY * height),
                width: w * width,
                height: h * height,
                fill: 'rgba(59, 130, 246, 0.2)', // Blue tint
                stroke: '#3B82F6', // Blue
                strokeWidth: 2,
                selectable: false,
                evented: false,
            });

            const text = new fabric.Text(obj.text || "Text", {
                left: left + (originX * width),
                top: top + (originY * height) - 15,
                fontSize: 12,
                fill: 'white',
                backgroundColor: '#3B82F6',
                fontFamily: 'Inter',
                selectable: false,
                evented: false,
            });

            overlayObjects.push(rect, text);
        });

        this.overlayGroup = new fabric.Group(overlayObjects, {
            selectable: false,
            evented: false,
            excludeFromExport: true,
            name: "ai-text-overlays"
        });

        this.canvas.instance.add(this.overlayGroup);
        this.canvas.instance.requestRenderAll();
    }
}
