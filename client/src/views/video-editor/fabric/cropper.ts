import { fabric } from "fabric";
import CropControl from "video-editor/assets/editor/controls/crop-icon.svg";

const cropControl = document.createElement("img");
cropControl.src = CropControl;

function renderIconCrop(rotate: number) {
  return (ctx: CanvasRenderingContext2D, left: number, top: number, _: unknown, _fabricObject: fabric.Object) => {
    const wsize = 25;
    const hsize = 25;
    ctx.save();
    ctx.translate(left, top);
    ctx.rotate(fabric.util.degreesToRadians(rotate));
    ctx.drawImage(cropControl, -wsize / 2, -hsize / 2, wsize, hsize);
    ctx.restore();
  };
}

fabric.Cropper = fabric.util.createClass(fabric.Rect, {
  lockRotation: true,
  controls: {
    mt: fabric.Object.prototype.controls.mt,
    mb: fabric.Object.prototype.controls.mb,
    ml: fabric.Object.prototype.controls.ml,
    mr: fabric.Object.prototype.controls.mr,
    tl: new fabric.Control({
      x: -0.5,
      y: -0.5,
      cursorStyleHandler: fabric.controlsUtils.scaleCursorStyleHandler,
      actionHandler: fabric.controlsUtils.scalingEqually,
      render: renderIconCrop(0),
    }),
    tr: new fabric.Control({
      x: 0.5,
      y: -0.5,
      cursorStyleHandler: fabric.controlsUtils.scaleCursorStyleHandler,
      actionHandler: fabric.controlsUtils.scalingEqually,
      render: renderIconCrop(90),
    }),
    bl: new fabric.Control({
      x: -0.5,
      y: 0.5,
      cursorStyleHandler: fabric.controlsUtils.scaleCursorStyleHandler,
      actionHandler: fabric.controlsUtils.scalingEqually,
      render: renderIconCrop(270),
    }),
    br: new fabric.Control({
      x: 0.5,
      y: 0.5,
      cursorStyleHandler: fabric.controlsUtils.scaleCursorStyleHandler,
      actionHandler: fabric.controlsUtils.scalingEqually,
      render: renderIconCrop(180),
    }),
  },
});
