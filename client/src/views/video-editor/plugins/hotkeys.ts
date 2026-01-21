import { Canvas } from "video-editor/plugins/canvas";

export class CanvasHotkeys {
  private _canvas: Canvas;

  constructor(canvas: Canvas) {
    this._canvas = canvas;
    this._initializeEvents();
    // makeAutoObservable(this);
  }

  private _keyDownEvent(event: KeyboardEvent) {
    switch (event.key) {
      case "Delete":
      case "Backspace":
        if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA" || document.activeElement?.tagName === "SELECT") return;
        this._canvas.onDeleteActiveObject();
        break;
      case "z":
        if (event.ctrlKey || event.metaKey) {
          if (event.metaKey && event.shiftKey) this._canvas.history.redo();
          else this._canvas.history.undo();
        }
        break;
      case "y":
        if (event.ctrlKey || event.metaKey) {
          this._canvas.history.redo();
        }
        break;
      case "c":
        if (event.ctrlKey || event.metaKey) {
          this._canvas.cloner.copy();
        }
        break;
      case "v":
        if (event.ctrlKey || event.metaKey) {
          this._canvas.cloner.paste();
        }
        break;
    }
  }

  private _initializeEvents() {
    window.addEventListener("keydown", this._keyDownEvent.bind(this));
  }

  destroy() {
    window.removeEventListener("keydown", this._keyDownEvent);
  }
}
