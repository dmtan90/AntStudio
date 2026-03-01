import { commonProps } from './common'
import { resolvePropNum, resolvePropColor, resolvePropString, resolvePropBool } from './utils'

/**
 * props for AVCircle component
 */
const circleProps = {
  /**
   * prop: 'fft-size'
   * Represents the window size in samples that is used when performing
   * a Fast Fourier Transform (FFT) to get frequency domain data.
   * Must be power of 2 between 2^5 and 2^15
   * Default: 1024
   */
  fftSize: {
    type: Number,
    default: 1024
  },
  /**
   * prop: 'canv-width'
   * Canvas element width. Default 100
   */
  canvWidth: {
    type: Number,
    default: 100
  },
  /**
   * prop: 'canv-height'
   * Canvas element height. Default 100
   */
  canvHeight: {
    type: Number,
    default: 100
  },
  /**
   * prop: 'radius'
   * Set circle radius. If zero will be calculated from canvas
   * width: (canv-width / 2) * 0.7
   * Default: 0
   */
  radius: {
    type: Number,
    default: 0
  },
  /**
   * prop: 'line-width'
   * Frequency bit line width to draw.
   */
  lineWidth: {
    type: Number,
    default: 3
  },
  /**
   * prop: 'line-space'
   * Space between lines to draw.
   */
  lineSpace: {
    type: Number,
    default: 3
  },
  /**
   * prop: 'outline-color'
   * Outline (contour) style RGB color.
   * Default: #00f
   */
  outlineColor: {
    type: String,
    default: '#0000FF'
  },
  /**
   * prop: 'outline-width'
   * Outline (contour) line width. Float value.
   * Default: 0.3
   */
  outlineWidth: {
    type: Number,
    default: 0.3
  },
  /**
   * prop: 'bar-width'
   * Frequency graph bar width.
   */
  barWidth: {
    type: Number,
    default: 5
  },
  /**
   * prop: 'bar-length'
   * Frequency graph bar length.
   * Default is a difference between radius and canvas width.
   */
  barLength: {
    type: Number,
    default: 0
  },
  /**
   * prop: 'bar-color'
   * Bar style RGB color or radient gradient when array.
   * Default: [ #FFFFFF, #0000FF ]
   */
  barColor: {
    // type: [String, Array],
    type: String,
    default: '#0000FF'
    // default: ['#FFFFFF', '#0000FF']
  },
  /**
   * prop: 'progress'
   * Draw play progress meter.
   * Default: false
   */
  progress: {
    type: Boolean,
    default: true
  },
  /**
   * prop: 'progress-width'
   * Progress meter width.
   * Default: 1
   */
  progressWidth: {
    type: Number,
    default: 3
  },
  /**
   * prop: 'progress-color'
   * Progress meter color.
   * Default: 1
   */
  progressColor: {
    type: String,
    default: '#0000FF'
  },
  /**
   * prop: 'progress-clockwise'
   * Progress meter arc draw direction. Default clockwise
   * Default: true
   */
  progressClockwise: {
    type: Boolean,
    default: true
  },
  /**
   * prop: 'outline-meter-space'
   * Space between outline and progress meter.
   * Default: 2
   */
  outlineMeterSpace: {
    type: Number,
    default: 3
  },
  /**
   * prop: 'playtime'
   * Draw playtime text in the center of the circle.
   * Default: false
   */
  playtime: {
    type: Boolean,
    default: true
  },
  /**
   * prop: 'playtime-font-size'
   * Played time print font size in pixels.
   * Default: 12
   */
  playtimeFontSize: {
    type: Number,
    default: 32
  },
  /**
   * prop: 'playtime-font-family'
   * Played time print font family.
   * Default: monospace
   */
  playtimeFontFamily: {
    type: String,
    default: 'Poppins'
  },
  /**
   * prop: 'playtime-color'
   * Played time font color.
   * Default: '#00f'
   */
  playtimeColor: {
    type: String,
    default: '#00f'
  },
  /**
   * prop: 'rotate-graph'
   * Rotate graph clockwise enable.
   * Default: false
   */
  rotateGraph: {
    type: Boolean,
    default: false
  },
  /**
   * prop: 'rotate-speed'
   * Rotate graph speed.
   * Default: 0.001
   */
  rotateSpeed: {
    type: Number,
    default: 0.001
  }
}

export const PropsCircle = { ...commonProps, ...circleProps }
export type PropsCircleType = typeof PropsCircle
export function makeCircleProps(): PropsCircleType { return PropsCircle }

let rotate = 1.5

export class Circle {
  barColor: string | string[]
  barLength: number
  barWidth: number
  canvFillColor: string | string[]
  canvHeight: number
  canvWidth: number
  currentTime: number = 0
  duration: number = 10
  fftSize: number
  lineSpace: number
  lineWidth: number
  outlineColor: string
  outlineMeterSpace: number
  outlineWidth: number
  placeholder: boolean
  playtime: boolean
  playtimeColor: string
  playtimeFontSize: number
  playtimeFontFamily: string
  progress: boolean
  progressClockwise: boolean
  progressColor: string
  progressWidth: number
  radius: number
  rotateGraph: boolean
  rotateSpeed: number
  peaks: [number, number][] = []
  constructor(p: any) {
    const c = PropsCircle
    this.barColor = resolvePropColor(p.barColor, c.barColor.default)
    this.barLength = resolvePropNum(p.barLength, c.barLength.default)
    this.barWidth = resolvePropNum(p.barWidth, c.barWidth.default)
    this.canvFillColor = resolvePropColor(p.canvFillColor, c.canvFillColor.default)
    this.canvHeight = resolvePropNum(p.canvHeight, c.canvHeight.default)
    this.canvWidth = resolvePropNum(p.canvWidth, c.canvWidth.default)
    this.fftSize = resolvePropNum(p.fftSize, c.fftSize.default)
    this.lineSpace = resolvePropNum(p.lineSpace, c.lineSpace.default)
    this.lineWidth = resolvePropNum(p.lineWidth, c.lineWidth.default)
    this.outlineColor = resolvePropString(p.outlineColor, c.outlineColor.default)
    this.outlineMeterSpace = resolvePropNum(p.outlineMeterSpace, c.outlineMeterSpace.default)
    this.outlineWidth = resolvePropNum(p.outlineWidth, c.outlineWidth.default)
    this.lineWidth = resolvePropNum(p.lineWidth, c.lineWidth.default)
    this.placeholder = resolvePropBool(p.placeholder, c.placeholder.default)
    this.playtime = resolvePropBool(p.playtime, c.playtime.default)
    this.playtimeColor = resolvePropString(p.playtimeColor, c.playtimeColor.default)
    this.playtimeFontSize = resolvePropNum(p.playtimeFontSize, c.playtimeFontSize.default)
    this.playtimeFontFamily = resolvePropString(p.playtimeFontFamily, c.playtimeFontFamily.default)
    this.progress = resolvePropBool(p.progress, c.progress.default)
    this.progressClockwise = resolvePropBool(p.progressClockwise, c.progressClockwise.default)
    this.progressColor = resolvePropString(p.progressColor, c.progressColor.default)
    this.progressWidth = resolvePropNum(p.progressWidth, c.progressWidth.default)
    this.radius = resolvePropNum(p.radius, c.radius.default)
    this.rotateGraph = resolvePropBool(p.rotateGraph, c.rotateGraph.default)
    this.rotateSpeed = resolvePropNum(p.rotateSpeed, c.rotateSpeed.default)
  }
  get cx() { return this.canvWidth / 2 }
  get cy() { return this.canvHeight / 2 }
  get r() {
    return this.radius > 0
      ? this.radius
      : Math.round(this.canvWidth / 2 * 0.7)
  }
  get arcStep() { return Math.ceil(this.lineWidth + this.lineSpace) }
  get barLen() {
    return this.barLength > 0
      ? this.barLength
      : (this.canvWidth / 2) - this.r
  }

  get angle() {
    const rot = (): number => {
      return rotate === 3.5
        ? 1.5
        : rotate + this.rotateSpeed
    }

    rotate = this.rotateGraph
      ? rot()
      : 1.5

    return Math.PI * rotate
  }

  get playtimeFont() {
    return this.playtimeFontSize + "px " + this.playtimeFontFamily;
  }

  setPeaks(buffer: AudioBuffer) {
    this.peaks.slice(0)
    let min = 0
    let max = 0
    let top = 0
    let bottom = 0
    const segSize = Math.ceil(buffer.length / this.canvWidth)
    const width = this.canvWidth
    const height = this.canvHeight

    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const data = buffer.getChannelData(c)
      for (let s = 0; s < width; s++) {
        const start = ~~(s * segSize)
        const end = ~~(start + segSize)
        min = 0
        max = 0
        for (let i = start; i < end; i++) {
          min = data[i] < min ? data[i] : min
          max = data[i] > max ? data[i] : max
        }
        // merge multi channel data
        if (this.peaks[s]) {
          this.peaks[s][0] = this.peaks[s][0] < max ? max : this.peaks[s][0]
          this.peaks[s][1] = this.peaks[s][1] > min ? min : this.peaks[s][1]
        }
        this.peaks[s] = [max, min]
      }
    }
    // set peaks relativelly to canvas dimensions
    for (let i = 0; i < this.peaks.length; i++) {
      max = this.peaks[i][0]
      min = this.peaks[i][1]
      top = ((height / 2) - (max * height / 2))
      bottom = ((height / 2) - (min * height / 2))
      this.peaks[i] = [top, bottom === top ? top + 1 : bottom]
    }
  }
}
