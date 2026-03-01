import { fabric } from "fabric";
import { Canvas } from "./canvas";

export class CanvasGrid {
    private canvas: Canvas;
    private visible: boolean = false;
    private gridSize: number = 50;
    private gridColor: string = "rgba(255, 255, 255, 0.1)";

    constructor(canvas: Canvas) {
        this.canvas = canvas;
        this._initEvents();
    }

    private get instance() {
        return this.canvas.instance!;
    }

    private _initEvents() {
        // We defer hooking into the render loop until enabled to save performance
        this.instance.on("after:render", this._renderGrid.bind(this));
    }

    private _renderGrid() {
        if (!this.visible || !(this.instance as any).contextTop) return;

        const ctx = (this.instance as any).contextTop;
        const vpt = this.instance.viewportTransform;
        if (!vpt) return;

        const zoom = this.instance.getZoom();
        const width = this.instance.width!;
        const height = this.instance.height!;

        ctx.save();
        ctx.strokeStyle = this.gridColor;
        ctx.lineWidth = 1;
        ctx.beginPath();

        // Calculate grid spacing based on zoom
        // We want the grid visual density to stay somewhat consistent
        // If we zoom out (zoom < 1), grid gets smaller. If we zoom in, grid gets bigger.
        // Let's keep fixed logical units (50px)
        const step = this.gridSize * zoom;

        // Offset
        const offsetX = vpt[4] % step;
        const offsetY = vpt[5] % step;

        // Vertical lines
        for (let x = offsetX; x < width; x += step) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
        }

        // Horizontal lines
        for (let y = offsetY; y < height; y += step) {
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
        }

        ctx.stroke();
        ctx.restore();
    }

    toggle(force?: boolean) {
        this.visible = force !== undefined ? force : !this.visible;
        this.instance.requestRenderAll();
    }

    setGridSize(size: number) {
        this.gridSize = size;
        this.instance.requestRenderAll();
    }
}
