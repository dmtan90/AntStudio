import { ref, toValue } from "vue";
import { createInstance } from "video-editor/lib/utils";
/* import { 
	Bars, Circle, Line, Media, Waveform, useAVBars, 
	useAVCircle, useAVLine, useAVMedia, useAVWaveform 
} from "audio-visual"; */
const Bars: any = null;
const Circle: any = null;
const Line: any = null;
const Media: any = null;
const Waveform: any = null;
import { useEventListener } from '@vueuse/core'
import { useAudioContext } from './composables/useAudioContext'
import { useCanvasContext } from './composables/useCanvasContext'

// import type { PropsBarsType, PropsCircleType, PropsLineType, PropsMediaType, PropsWaveformType } from "audio-visual";
type PropsBarsType = any;
type PropsCircleType = any;
type PropsLineType = any;
type PropsMediaType = any;
type PropsWaveformType = any;

import { useAVBars, draw as barsDraw, drawPlaceholder as barDrawPlaceholder } from "./composables/useAVBars";
import { useAVCircle, draw as circleDraw, drawPlaceholder as circleDrawPlaceholder } from "./composables/useAVCircle";
import { useAVLine, draw as lineDraw, drawPlaceholder as lineDrawPlaceholder } from "./composables/useAVLine";
import { useAVMedia, drawBuffer as mediaDraw } from "./composables/useAVMedia";
import { useAVWaveform, drawBuffer as waveDrawBuffer, draw as waveDraw } from "./composables/useAVWaveform";

export enum VisualType {
	Bars = "bars",
	Circle = "circle",
	Line = "line",
	Media = "media",
	Waveform = "waveform"
};

export type VisualProps = PropsBarsType | PropsCircleType | PropsLineType | PropsMediaType | PropsWaveformType;

const AVBars = {
	draw: barsDraw,
	drawPlaceholder: barDrawPlaceholder,
};

const AVCircle = {
	draw: circleDraw,
	drawPlaceholder: circleDrawPlaceholder
};

const AVLine = {
	draw: lineDraw,
	drawPlaceholder: lineDrawPlaceholder
};

const AVMedia = {
	draw: mediaDraw,
	drawPlaceholder: () => { }
}

const AVWaveform = {
	draw: waveDraw,
	drawBuffer: waveDrawBuffer,
	drawPlaceholder: () => { }
}

export class AudioVisual {
	private _element: HTMLAudioElement;
	private _canvas: HTMLCanvasElement;
	private _options: VisualProps;
	private _type: VisualType;
	private canvasCtx: any;
	private audioCtx: any = null;
	private audioBuffer: AudioBuffer = null;
	private audioContext: AudioContext = null;
	private _visible: boolean = true;
	// init with min value
	private caps: number[] = Array(16).fill(0);

	constructor(element: HTMLAudioElement, canvas: HTMLCanvasElement, type: VisualType, options: VisualProps, visible: boolean = true) {
		this._element = element;
		this._canvas = canvas;
		this._type = type;
		this._visible = visible;
		this._options = this.initProps(options);
		this.initContext();
	}

	private get _defaultOptions() {
		let options = { canvWidth: this.canvas.width, canvHeight: this.canvas.height };
		return this.initProps(options);
	}

	private initProps(options: VisualProps) {
		let props = null;
		if (this.type == VisualType.Bars) {
			props = new Bars(options);
		}
		else if (this.type == VisualType.Circle) {
			props = new Circle(options);
		}
		else if (this.type == VisualType.Line) {
			props = new Line(options);
		}
		else if (this.type == VisualType.Media) {
			props = new Media(options);
		}
		else if (this.type == VisualType.Waveform) {
			props = new Waveform(options);
		}

		props.canvWidth = this.canvas.width;
		props.canvHeight = this.canvas.height;
		if (this.audioBuffer) {
			props.setPeaks(this.audioBuffer);
		}

		return props;
	}

	public get player() {
		return this._element;
	}

	public get canvas() {
		return this._canvas;
	}

	public get options() {
		return this._options;
	}

	public set options(options) {
		this._options = this.initProps(options);
	}

	public get type() {
		return this._type || VisualType.Circle;
	}

	public set type(type) {
		this._type = type;
	}

	public get visible() {
		return this._visible;
	}

	public set visible(visible) {
		this._visible = visible;
	}

	public update() {
		console.log("update");
	}

	public resize(width: number, height: number) {
		this.options.canvWidth = width;
		this.options.canvHeight = height;
	}

	public setProps(props: VisualProps = {}) {
		console.log("setProps");
		const options = Object.assign(this._options, props);
		this._options = this.initProps(options);//Object.assign(this._options, props);
		if (this._options.fftSize) {
			this.caps.length = this._options.fftSize / 2
			this.caps.fill(0)
		}
	}

	public setType(type: VisualType) {
		if (type == VisualType.Waveform) {
			this.decodeAudioData();
		}
		this._type = type;
	}

	private initContext() {
		// const p = new Bars(props as PropsBarsType)
		const fn = this;
		this.caps.length = this._options.fftSize / 2
		this.caps.fill(0)

		this.canvasCtx = useCanvasContext(ref(this.canvas), { canvWidth: this.options.canvWidth, canvHeight: this.options.canvHeight } as any)
		useEventListener(ref(this.player), 'loadedmetadata', () => {
			if (!fn.options.placeholder || !this.canvasCtx) return
			fn.draw(new Uint8Array(fn.options.fftSize / 2), { currentTime: fn.player.currentTime, duration: fn.player.duration } as any, 0)
		});

		useEventListener(ref(this.player), 'timeupdate', () => {
			fn.options.currentTime = fn.player.currentTime;
		});

		this.audioCtx = useAudioContext(ref(this.player), this._options.fftSize, (data: Uint8Array) => {
			fn.draw(data, fn.player.currentTime, fn.player.duration)
		});

		this.decodeAudioData();
	}

	private async decodeAudioData() {
		if (!this.player || !this.player.src) {
			return;
		}

		if (this.audioContext == null) {
			this.audioContext = createInstance(AudioContext);
		}

		try {
			const url = this.player.src;
			const response: Response = await fetch(url);
			const data: ArrayBuffer = await response.arrayBuffer();
			const buffer: AudioBuffer = await this.audioContext.decodeAudioData(data);
			if (buffer) {
				this.audioBuffer = buffer;
				this.options.duration = buffer.duration
				this.options.setPeaks(buffer);
				// console.log("buffer", buffer);
				this.drawPlaceholder();
			}
		} catch (error) {

		}
	}

	public destroy() {
		if (this.audioCtx) {
			this.audioCtx.dispose();
		}

		if (this.audioContext) {
			this.audioContext.suspend();
			this.audioContext = null;
		}
	}

	public draw(data: Uint8Array, currentTime: number, duration: number) {
		console.log("draw", data, currentTime, duration, this.options, this.canvas.width, this.canvas.height);
		if (!this.visible) {
			return;
		}
		const ctx = this.canvasCtx;
		const props = this._options;
		props.currentTime = currentTime ?? 0;
		props.duration = duration ?? 10;
		if (this.type == VisualType.Bars) {
			AVBars.draw(data, ctx, props);
		}
		else if (this.type == VisualType.Circle) {
			AVCircle.draw(data, ctx, props);
		}
		else if (this.type == VisualType.Line) {
			AVLine.draw(data, ctx, props);
		}
		else if (this.type == VisualType.Media) {
			AVMedia.draw(data, ctx, props);
		}
		else if (this.type == VisualType.Waveform) {
			AVWaveform.draw(ctx, props);
		}
	}

	public drawPlaceholder() {
		console.log("drawPlaceholder", this.options, this.type);
		if (!this.visible) {
			return;
		}
		const ctx = this.canvasCtx;
		const props = this._options;
		props.currentTime = this.player?.currentTime ?? 0;
		props.duration = this.player?.duration ?? 10;
		if (this.type == VisualType.Bars) {
			const data = this.createSampleAudioData(this.options.fftSize / 2);
			AVBars.draw(data, ctx, props);
		}
		else if (this.type == VisualType.Circle) {
			// AVCircle.draw(data, ctx, { currentTime, duration }, props);
			const data = this.createSampleAudioData(this.options.fftSize / 2);
			AVCircle.draw(data, ctx, props);
		}
		else if (this.type == VisualType.Line) {
			const data = this.createSampleAudioData(this.options.fftSize);
			AVLine.draw(data, ctx, props);
		}
		else if (this.type == VisualType.Media) {
			const data = this.createSampleAudioData(this.options.fftSize / 2);
			AVMedia.draw(data, ctx, props);
		}
		else if (this.type == VisualType.Waveform) {
			AVWaveform.draw(ctx, props);
		}
	}

	private getRandomIntInclusive(min, max) {
		min = Math.ceil(min);
		max = Math.floor(max);
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	private generateRandomIntArray(min, max, count) {
		const randomArray = [];
		for (let i = 0; i < count; i++) {
			randomArray.push(this.getRandomIntInclusive(min, max));
		}
		return randomArray;
	}

	private createSampleAudioData(size: number) {
		const array = this.generateRandomIntArray(0, 255, size);
		return Uint8Array.from(array);
	}

	// public render(){
	// 	if(this.player == null){
	// 		return;
	// 	}

	// 	const props = this.options;
	// 	if(this.type == VisualType.Bars){
	// 		useAVBars(this.player, this.canvas, props);
	// 	}
	// 	else if(this.type == VisualType.Circle){
	// 		useAVCircle(this.player, this.canvas, props);
	// 	}
	// 	else if(this.type == VisualType.Line){
	// 		useAVLine(this.player, this.canvas, props);
	// 	}
	// 	else if(this.type == VisualType.Media){
	// 		useAVMedia(this.player, this.canvas, props);
	// 	}
	// 	else if(this.type == VisualType.Waveform){
	// 		useAVWaveform(this.player, this.canvas, props);
	// 	}
	// }
}