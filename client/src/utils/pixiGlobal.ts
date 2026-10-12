// pixi-live2d-display reads window.PIXI when its module is evaluated, so this side-effect
// module must be imported *before* 'pixi-live2d-display-advanced' wherever that is used.
// Kept out of main.ts so pixi.js isn't part of the initial bundle.
import * as PIXI from 'pixi.js'

;(window as any).PIXI = PIXI
