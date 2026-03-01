import { propertiesToInclude } from "video-editor/fabric/constants";
import { createPromise } from "video-editor/lib/utils";
import { Canvas } from "video-editor/plugins/canvas";
import { FabricUtils } from "video-editor/fabric/utils";

type HistoryStatus = "pending" | "idle";

export class CanvasHistory {
  private _canvas: Canvas;

  private _undo: string[];
  private _redo: string[];
  private _maxStates = 50;

  status: HistoryStatus;
  active: boolean;

  constructor(canvas: Canvas) {
    this.status = "idle";
    this.active = true;

    this._canvas = canvas;
    const history = this._next();

    this._undo = [history];
    this._redo = [];

    this._initEvents();
    // makeAutoObservable(this);
  }

  private get canvas() {
    return this._canvas.instance!;
  }

  private _next() {
    return JSON.stringify(this.canvas.toDatalessJSON(propertiesToInclude));
  }

  private async _load(history: string) {
    return createPromise<void>((resolve) => {
      const data = JSON.parse(history);
      FabricUtils.applyFontsBeforeLoad(data.objects || []).then(() => {
        this.canvas.loadFromJSON(history, () => {
          if (this._canvas.artboard) {
            this.canvas.insertAt(this._canvas.artboard, 0, false);
          }
          FabricUtils.applyTransformationsAfterLoad(this.canvas);
          this.status = "idle";
          this.canvas.renderAll();
          this._canvas.editor.onModified?.();
          resolve();
        });
      });
    });
  }

  private _saveHistoryEvent(event: fabric.IEvent) {
    if (!this.active || this.status === "pending") return;
    if (event.target && (event.target.excludeFromTimeline || event.target.excludeFromExport)) return;

    const json = this._next();
    const lastState = this._undo[this._undo.length - 1];

    if (json !== lastState) {
      this._undo.push(json);
      this._redo = []; // Clear redo on new action

      if (this._undo.length > this._maxStates) {
        this._undo.shift();
      }

      this._canvas.editor.onModified?.();
    }
  }

  private _initEvents() {
    this.canvas.on("object:added", (e) => this._saveHistoryEvent(e));
    this.canvas.on("object:modified", (e) => this._saveHistoryEvent(e));
    this.canvas.on("object:removed", (e) => this._saveHistoryEvent(e));
  }

  get canUndo() {
    return this._undo.length > 1 && this.status === "idle";
  }

  get canRedo() {
    return this._redo.length > 0 && this.status === "idle";
  }

  async undo() {
    if (!this.canUndo) return;
    this.status = "pending";
    const current = this._undo.pop()!;
    const history = this._undo[this._undo.length - 1];

    if (history) {
      this._redo.push(current);
      await this._load(history);
    } else {
      this.status = "idle";
    }
  }

  async redo() {
    if (!this.canRedo) return;
    this.status = "pending";
    const history = this._redo.pop();
    if (history) {
      this._undo.push(history);
      await this._load(history);
    } else {
      this.status = "idle";
    }
  }

  clear() {
    this._undo = [this._next()];
    this._redo = [];
  }
}
