import { fabric } from "fabric";
export type EditorReplace = EditorReplaceVideo | EditorReplaceImage | EditorReplaceAudio | EditorReplaceGif | null;

export type EditorPlaceholder = "main-image" | "brand-image" | "cta-text" | "headline-text" | "description-text";

export interface EditorTemplate {
  id: string;
  name: string;
  is_pubished: boolean;
  pages: EditorTemplatePage[];
}

export interface EditorTemplatePage {
  id: string;
  name: string;
  thumbnail: string;
  duration: number;
  transition?: 'none' | 'fade' | 'wipe' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'zoom-in' | 'zoom-out' | 'dip-to-black' | 'dip-to-white';
  transitionDuration?: number;
  transitionEasing?: string;
  data: EditorTemplatePageData;
}

export interface EditorTemplatePageData {
  scene: string;
  audios: Omit<EditorAudioElement, "buffer" | "source">[];
  fill: string;
  width: number;
  height: number;
}

export interface EditorMedia {
  source: string;
  thumbnail: string;
}

export interface EditorAudio {
  source: string;
  name: string;
  thumbnail: string;
  duration: number;
}

import type { PropsBarsType, PropsCircleType, PropsLineType, PropsMediaType, PropsWaveformType, VisualType } from "audio-visual";

export interface EditorAudioElement {
  id: string;
  url: string;
  src?: string; // fallback or alias for url in some contexts
  name: string;
  buffer: AudioBuffer;
  source: AudioBufferSourceNode;
  audioElement?: HTMLAudioElement;
  currentTime?: number;
  volume: number;
  muted: boolean;
  duration: number;
  offset: number;
  playing: boolean;
  trim: number;
  trimStart: number;
  trimEnd: number;
  timeline: number;
  visualEnabled: boolean;
  visible: boolean;
  visualType: VisualType;
  visualProps: PropsBarsType | PropsCircleType | PropsLineType | PropsMediaType | PropsWaveformType;
  fadeIn: number;
  fadeOut: number;
  type: "audio"
}

export interface IAudioOptions extends fabric.IObjectOptions {
  audioElement?: HTMLAudioElement;
  src?: string;
  crossOrigin?: string | null;
  trimStart?: number;
  trimEnd?: number;
  visualType?: VisualType;
  visualProps?: PropsBarsType | PropsCircleType | PropsLineType | PropsMediaType | PropsWaveformType;
  fadeIn?: number;
  fadeOut?: number;
}


export interface EditorTrimVideo {
  object: fabric.Video;
  type: "video";
}

export interface EditorTrimAudio {
  object: EditorAudioElement;
  type: "audio";
}

export type EditorTrim = EditorTrimAudio | EditorTrimVideo | null;

export interface EditorReplaceVideo {
  object: fabric.Video;
  type: "video";
}

export interface EditorReplaceImage {
  object: fabric.Image;
  type: "image";
}

export interface EditorReplaceAudio {
  object: EditorAudioElement;
  type: "audio";
}

export interface EditorReplaceGif {
  object: fabric.Image;
  type: "gif";
}
