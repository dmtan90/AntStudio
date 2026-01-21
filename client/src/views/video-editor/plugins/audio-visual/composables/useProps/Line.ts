import { resolvePropNum, resolvePropColor, resolvePropBool } from './utils'
import { commonProps } from './common'

/**
 * props for AVLine component
 */
const lineProps = {
  /**
   * prop: 'line-width'
   * Draw line width in px
   */
  lineWidth: {
    type: Number,
    default: 2
  },
  /**
   * prop: 'line-color'
   * Draw line color or gradient array
   */
  lineColor: {
    // type: [String, Array],
    type: String,
    default: '#9F9'
  },
  /**
   * prop: 'line-space'
   * Space between lines to draw.
   */
  lineSpace: {
    type: Number,
    default: 1
  },
  /**
   * prop: 'fft-size'
   * Represents the window size in samples that is used when performing
   * a Fast Fourier Transform (FFT) to get frequency domain data.
   * Must be power of 2 between 2^5 and 2^15
   * Default: 128
   */
  fftSize: {
    type: Number,
    default: 128
  }
}

export const PropsLine = { ...commonProps, ...lineProps }
export type PropsLineType = typeof PropsLine
export function makeLineProps(): PropsLineType { return PropsLine }

export class Line{
  canvWidth: number
  canvHeight: number
  canvFillColor: string | string[]
  lineWidth: number
  lineSpace: number
  lineColor: string | string[]
  fftSize: number
  frqBits: number
  placeholder: boolean
  peaks: [number, number][] = []
  constructor (p: PropsLineType) {
    const l = PropsLine
    this.canvWidth = resolvePropNum(p.canvWidth, l.canvWidth.default)
    this.canvHeight = resolvePropNum(p.canvHeight, l.canvHeight.default)
    this.canvFillColor = resolvePropColor(p.canvFillColor, l.canvFillColor.default)
    this.lineWidth = resolvePropNum(p.lineWidth, l.lineWidth.default)
    this.lineSpace = resolvePropNum(p.lineSpace, l.lineSpace.default)
    this.lineColor = resolvePropColor(p.lineColor, l.lineColor.default)
    this.fftSize = resolvePropNum(p.fftSize, l.fftSize.default)
    this.frqBits = this.fftSize >> 1 // same as div 2 in this case
    this.placeholder = resolvePropBool(p.placeholder, l.placeholder.default)
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
