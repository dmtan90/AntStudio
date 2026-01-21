import { fabric } from "fabric";

declare module "fabric" {
    namespace fabric {
        // Static properties on the fabric object itself
        export const controlsUtils: any;
        export const isWebglSupported: boolean;
        export const devicePixelRatio: number;

        interface IObjectOptions {
            [key: string]: any;
        }

        interface Object {
            id?: string;
            name?: string;
            meta?: any;
            anim?: any;
            excludeFromTimeline?: boolean;
            excludeFromExport?: boolean;
            excludeFromAlignment?: boolean;
            _objects?: Object[];
            text?: any;
            // Private/Internal properties often accessed
            _controlsVisibility?: any;
            controls?: any;
            initialize?: any;
            setOptions?: any;
            transform?: any;
            toObject?: any;
            callSuper?: any;
            toDatalessObject?: any;
            getObjectScaling?: any;
            getTotalObjectScaling?: any;
            getObjectOpacity?: any;
            setOnGroup?: any;
            getViewportTransform?: any;
            render?: any;
            needsItsOwnCache?: any;
            [key: string]: any;
        }

        interface IImageOptions {
            [key: string]: any;
        }

        interface IVideoOptions extends IImageOptions { }

        interface IAudioOptions extends IObjectOptions {
            src?: string;
            file?: File;
            width?: number;
            height?: number;
            visualType?: string;
            visualProps?: any;
            trimStart?: number;
            trimEnd?: number;
            visible?: boolean;
        }

        class Video extends Image {
            static fromURL(url: string, callback: (vid: Video) => void, options?: any): void;
            static fromObject(object: any, callback: (vid: Video) => void): void;
            _originalElement?: HTMLVideoElement;
            constructor(element?: HTMLVideoElement | string, options?: IVideoOptions);
        }

        class Gif extends Image {
            static fromURL(url: string, callback: (gif: Gif) => void, options?: any): void;
            static fromURL(url: string, callback: (gif: Gif) => void): void;
            _originalElement?: HTMLImageElement;
        }

        class Audio extends Object {
            static fromURL(url: string, callback: (audio: Audio) => void, options?: any): void;
            static fromURL(url: string, callback: (audio: Audio) => void): void;
            audioElement?: HTMLAudioElement;
            trimStart?: number;
            trimEnd?: number;
            volume?: number;
            visible?: boolean;
            visualType?: any;
            visualProps?: any;
            visualEnabled?: boolean;
            url?: string;
            offset?: number;
            duration?: number;
            source?: any;
            buffer?: any;
        }

        class Chart extends Object {
            static fromObject(options: any, callback: Function): void;
        }

        class Cropper extends Object {
            clipActiveObjectFromBasicShape(shape: any): void;
            clipActiveObjectFromAbstractShape(shape: any): void;
        }

        interface AnimationTimeline {
            in: any;
            out: any;
            scene: any;
        }

        // Augment Canvas
        interface Canvas {
            getItemByName(name: string): Object | undefined;
            indexOf(object: Object): number;
            workspace?: any;
            history?: any;
            _objects?: Object[];
            audio?: any;
        }

        interface StaticCanvas {
            getItemByName(name: string): Object | undefined;
            width: number;
            height: number;
        }

        interface IUtil {
            loadVideo(url: string): void;
            toDataURL(element: any, format?: string, quality?: number): string;
        }

        // Augment Filters
        interface IBaseFilter {
            intensity?: number;
            mode?: any;
            color?: string;
            alpha?: number;
            distance?: number;
            subFilters?: any[];
            fromObject?: any;
        }

        interface IAllFilters {
            SoftLightBlend: any;
            SaturationBlend: any;
            HardLightBlend: any;
        }

        // Custom Types used in fabric context
        type EntryAnimation = any;
        type ExitAnimation = any;
        type SceneAnimations = any;
        type AnimationPhysics = any;
        type TextAnimateOptions = any;

        interface IChartConfigurationOptions extends IObjectOptions { }
    }
}
