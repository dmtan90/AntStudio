declare module 'audio-visual' {
    export type PropsBarsType = any;
    export type PropsCircleType = any;
    export type PropsLineType = any;
    export type PropsMediaType = any;
    export type PropsWaveformType = any;
    export type VisualProps = any;
    export class Bars { }
    export class Circle { }
    export class Line { }
    export class Media { }
    export class Waveform { }
    export const useAVBars: any;
    export const useAVCircle: any;
    export const useAVLine: any;
    export const useAVMedia: any;
    export const useAVWaveform: any;
    export type VisualType = any;
    const content: any;
    export default content;
}

declare module 'animejs' {
    const anime: any;
    export default anime;
    export namespace anime {
        export type AnimeInstance = any;
        export type AnimeTimelineInstance = any;
        export type AnimeParams = any;
    }
}

declare module 'mediabunny' {
    export class Output {
        constructor(...args: any[]);
        [key: string]: any;
    }
    export class Mp4OutputFormat { constructor(...args: any[]); }
    export class WebMOutputFormat { constructor(...args: any[]); }
    export class MkvOutputFormat { constructor(...args: any[]); }
    export class MovOutputFormat { constructor(...args: any[]); }
    export class GifOutputFormat { constructor(...args: any[]); }
    export class BufferTarget { constructor(...args: any[]); }
    export class CanvasSource {
        constructor(...args: any[]);
        [key: string]: any;
    }
    export class AudioBufferSource {
        constructor(...args: any[]);
        [key: string]: any;
    }
    export const QUALITY_LOW: any;
    export const QUALITY_MEDIUM: any;
    export const QUALITY_HIGH: any;
    export const QUALITY_VERY_HIGH: any;
    const MediaBunny: any;
    export default MediaBunny;
}

declare module 'vue-color' {
    export const Sketch: any;
    export const Chrome: any;
    export const ChromePicker: any;
    export const ColorResult: any;
    export const tinycolor: any;
}

declare module 'class-variance-authority' {
    export function cva(...args: any[]): any;
    export type VariantProps<T> = any;
}

declare module '@vueuse/core' {
    export function onClickOutside(...args: any[]): any;
    export function useEventListener(...args: any[]): any;
    export function useRafFn(...args: any[]): any;
    export function createFetch(...args: any[]): any;
    export type MaybeRef<T> = any;
    export type CreateFetchOptions = any;
}

declare module 'vue-draggable-resizable' {
    const content: any;
    export default content;
}

declare module 'canvas' {
    const content: any;
    export default content;
}

// Global Interfaces
interface EyeDropper {
    open(): Promise<{ sRGBHex: string }>;
}

interface Window {
    EyeDropper: {
        new(): EyeDropper;
        prototype: EyeDropper;
    };
}
