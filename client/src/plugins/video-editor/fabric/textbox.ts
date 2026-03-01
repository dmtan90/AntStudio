import { fabric } from "fabric";

const _splitTextIntoLines = fabric.Text.prototype._splitTextIntoLines;

fabric.Text.prototype._transformText = function (text) {
  switch (this.textTransform) {
    case "uppercase":
      return text.toUpperCase();
    case "lowercase":
      return text.toLowerCase();
    default:
      return text;
  }
};

fabric.Text.prototype._splitTextIntoLines = function (text) {
  return _splitTextIntoLines.call(this, this._transformText(text));
};
