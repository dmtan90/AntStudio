import { fabric } from "fabric";
export type EditorReplace = EditorReplaceVideo | EditorReplaceImage | EditorReplaceAudio | EditorReplaceGif | null;

export type EditorPlaceholder = "main-image" | "brand-image" | "cta-text" | "headline-text" | "description-text";

export interface EditorTemplate {
  id: string;
  name: string;
  is_pubished: boolean;
  pages: EditorTemplatePage[];
}

export interface EditorTemplateBlock {
  id: string;
  start: number;
  end: number;
  _id?: string;
}

export interface EditorTemplatePage {
  id: string;
  name: string;
  thumbnail: string;
  preview?: string; // Video preview URL
  duration: number;
  transition?: 'none' | 'fade' | 'wipe' | 'slide' | 'zoom-in' | 'zoom-out' | 'dip-to-black' | 'dip-to-white' | 'blur' | 'glitch' | 'morph' | 'light-leak' | 'zoom-blur' | 'cube' | 'flip' | 'circle';
  transitionDirection?: 'left' | 'right' | 'up' | 'down';
  transitionDuration?: number;
  transitionEasing?: string;
  data: EditorTemplatePageData;
  blocks?: EditorTemplateBlock[];
  _id?: string; // MongoDB ID if exists
}

export interface EditorTemplatePageData {
  scene: string;
  audios: Omit<EditorAudioElement, "buffer" | "source">[];
  fill: string;
  width: number;
  height: number;
  format?: string;
  orientation?: string;
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

export interface AutomationPoint {
  id: string;
  time: number; // in milliseconds relative to clip start
  value: number; // 0 to 1
  easing: 'linear' | 'step';
}

export interface AudioEffects {
  eq: {
    low: number;  // -40 to 40
    mid: number;  // -40 to 40
    high: number; // -40 to 40
  };
  compressor: {
    threshold: number; // -100 to 0
    ratio: number;     // 1 to 20
    attack: number;    // 0 to 1
    release: number;   // 0 to 1
    enabled: boolean;
  };
  reverb: {
    mix: number; // 0 to 1
    enabled: boolean;
  };
  echo?: {
    mix: number;      // 0 to 1
    delayTime: number; // 0 to 2 (seconds)
    feedback: number;  // 0 to 0.9
    enabled: boolean;
  };
  enhancement?: {
    studio: boolean;
    denoise: boolean;
    gateThreshold?: number; // -100 to 0
  };
}

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
  automation?: AutomationPoint[];
  effects?: AudioEffects;
  analyser?: AnalyserNode;
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
