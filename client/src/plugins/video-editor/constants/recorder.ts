export interface CodecExtension {
  command: string;
  extension: string;
  mimetype: string;
}

export const fps = [15, 24, 30, 60];

export const codecs = ["MP4", "WEBM"];
// export const codecs = ["H.264", "H.265", "MPEG-4", "VP8", "VP9", "AV1", "MPEG-2", "Theora", "ProRes", "DNxHD"];

export const codecsExtensionsMap: Record<string, CodecExtension> = {
  "MP4": { command: "libx264", extension: "mp4", mimetype: "video/mp4" },
  "WEBM": { command: "libvpx-vp9", extension: "webm", mimetype: "video/webm" },
  "H.264": { command: "libx264", extension: "mp4", mimetype: "video/mp4" },
  "H.265": { command: "libx265", extension: "mp4", mimetype: "video/mp4" },
  "MPEG-4": { command: "libxvid", extension: "avi", mimetype: "video/x-msvideo" },
  "VP8": { command: "libvpx", extension: "webm", mimetype: "video/webm" },
  "VP9": { command: "libvpx-vp9", extension: "webm", mimetype: "video/webm" },
  "AV1": { command: "libaom-av1", extension: "mkv", mimetype: "video/x-matroska" },
  "MPEG-2": { command: "mpeg2video", extension: "mpg", mimetype: "video/mpeg" },
  "Theora": { command: "libtheora", extension: "ogv", mimetype: "video/ogg" },
  "ProRes": { command: "prores", extension: "mov", mimetype: "video/quicktime" },
  "DNxHD": { command: "dnxhd", extension: "mov", mimetype: "video/quicktime" },
};

export const scales = [1, 2, 3, 4];

export function fetchExtensionByCodec(label: string) {
  return codecsExtensionsMap[label] || codecsExtensionsMap["H.264"];
}
