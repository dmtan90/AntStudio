import { fabric } from "fabric";
import { FabricUtils } from "video-editor/fabric/utils";
const _initialize = fabric.Object.prototype.initialize;
const _render = fabric.Object.prototype.render;

fabric.Object.prototype.initialize = function (options) {
  // if(options?.type && options?.type == "rect"){
  //   console.log("initialize", options);
  // }
  _initialize.apply(this, [options]);
  this.blur = options?.blur;
  this.centeredRotation = true;
  // if(!this.name){
  //   this.name = FabricUtils.elementID(options.type);
  // }
  return this;
};

fabric.Object.prototype.render = function (ctx) {
  ctx.save();
  if (!!this.blur) ctx.filter = `blur(${this.blur}px)`;
  _render.apply(this, [ctx]);
  ctx.restore();
};

fabric.Object.prototype.update = function () {
  if (this.canvas) {
    try{
      const backend = fabric.filterBackend;
      if (backend?.evictCachesForKey) {
        backend.evictCachesForKey(this.cacheKey);
        backend.evictCachesForKey(this.cacheKey + "_filtered");
      }
      this.applyFilters();
      this.canvas.renderAll();
      fabric.util.requestAnimFrame(this.update.bind(this));
    }catch(error){
      console.error(error);
    }
  }
};

// fabric.Object.prototype.toPNG = function () {
//   // Assuming 'myObject' is a Fabric.js object on your canvas
//   let tempCanvas = document.createElement('canvas');
//   let tempCtx = tempCanvas.getContext('2d');

//   // Set dimensions of temporary canvas to match object's bounding box
//   tempCanvas.width = this.getScaledWidth();
//   tempCanvas.height = this.getScaledHeight();

//   // Render the object onto the temporary canvas
//   this.render(tempCtx);

//   // Get the data URL from the temporary canvas
//   const objectDataURL = tempCanvas.toDataURL({
//       format: 'png',
//       quality: 1.0
//   });

//   tempCanvas = null;
//   return objectDataURL;
// };

// fabric.Object.prototype.exportPNG = function() {
//   function trimCanvas(canvas)
//   {
//     var ctx = canvas.getContext('2d'),
//       w = canvas.width,
//       h = canvas.height,
//       pix = {x:[], y:[]}, n,
//       imageData = ctx.getImageData(0,0,w,h),
//       fn = function(a,b) { return a-b };

//     for (var y = 0; y < h; y++) {
//       for (var x = 0; x < w; x++) {
//         if (imageData.data[((y * w + x) * 4)+3] > 0) {
//           pix.x.push(x);
//           pix.y.push(y);
//         }
//       }
//     }
//     pix.x.sort(fn);
//     pix.y.sort(fn);
//     n = pix.x.length-1;

//     w = pix.x[n] - pix.x[0];
//     h = pix.y[n] - pix.y[0];
//     var cut = ctx.getImageData(pix.x[0], pix.y[0], w, h);

//     canvas.width = w;
//     canvas.height = h;
//     ctx.putImageData(cut, 0, 0);
//   };

//   var bound = this.getBoundingRect(),
//     json = JSON.stringify(this),
//     canvas = fabric.util.createCanvasElement();
//   canvas.width = bound.width;
//   canvas.height = bound.height;
//   var fcanvas = new fabric.Canvas(canvas, {enableRetinaScaling:false});

//   fabric.util.enlivenObjects([JSON.parse(json)], function(objects) {
//     objects.forEach(function(o) {
//       o.top -= bound.top;
//       o.left -= bound.left;
//       fcanvas.add(o);
//     });
//     fcanvas.renderAll();

//     var canvas = fcanvas.getElement();
//     trimCanvas(canvas);

//     /*
//     var url = canvas.toDataURL('image/png'),
//         img = new Image();
//     img.width = canvas.width;
//     img.height = canvas.height;
//     img.src = url;
//     document.body.appendChild(img);
//     */

//     canvas.toBlob(function(blob) {
//       $('<a>', {href:URL.createObjectURL(blob), download:'element.png'})[0].click();
//     }, 'image/png');
//   });
// };
