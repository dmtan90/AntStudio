interface AnimationInputState {
  duration?: boolean;
  easing?: boolean;
  text?: boolean;
}
export interface EditorAnimation {
  label: string;
  type?: string;
  preview: string;
  easing?: any;
  duration?: number;
  text?: any;
  fixed?: AnimationInputState;
  disabled?: AnimationInputState;
  value: any;
}

export interface EditorEasing {
  label: string;
  value: string;
}

export const defaultSpringConfig = {
  damping: 10,
  mass: 1,
  stiffness: 100,
  velocity: 0,
};

import NoneAnimation from "video-editor/assets/editor/animations/none.png";
import FadeAnimation from "video-editor/assets/editor/animations/general/fade.svg";
import SlideAnimation from "video-editor/assets/editor/animations/general/drift.svg";
import PanAnimation from "video-editor/assets/editor/animations/general/pan.svg";
import RiseAnimation from "video-editor/assets/editor/animations/general/rise.svg";
// import SinkAnimation from "video-editor/assets/editor/animations/general/sink.svg";
import WipeAnimation from "video-editor/assets/editor/animations/general/wipe.svg";
import BaselineAnimation from "video-editor/assets/editor/animations/general/baseline.svg";
import PopAnimation from "video-editor/assets/editor/animations/general/pop.svg";

import TypewriterTextAnimation from "video-editor/assets/editor/animations/text/typewriter.svg";
import BlockTextAnimation from "video-editor/assets/editor/animations/text/block.svg";
import MergeTextAnimation from "video-editor/assets/editor/animations/text/merge.svg";
import BurstTextAnimation from "video-editor/assets/editor/animations/text/burst.svg";
import ClarifyTextAnimation from "video-editor/assets/editor/animations/text/clarify.svg";
import BounceTextAnimation from "video-editor/assets/editor/animations/text/bounce.svg";
import AscendTextAnimation from "video-editor/assets/editor/animations/text/ascend.svg";

export const entry: EditorAnimation[] = [
  {
    value: "none",
    label: "None",
    preview: NoneAnimation,
  },
  {
    value: "fade",
    label: "Fade",
    preview: FadeAnimation,
    duration: 250,
  },
  {
    value: "slide-left",
    label: "Slide Left",
    preview: SlideAnimation,
    duration: 250,
  },
  {
    value: "slide-right",
    label: "Slide Right",
    preview: SlideAnimation,
    duration: 250,
  },
  {
    value: "pan-left",
    label: "Pan Left",
    preview: PanAnimation,
    duration: 250,
  },
  {
    value: "pan-right",
    label: "Pan Right",
    preview: PanAnimation,
    duration: 250,
  },
  {
    value: "rise-up",
    label: "Rise Up",
    preview: RiseAnimation,
    duration: 250,
  },
  {
    value: "sink-down",
    label: "Sink Down",
    preview: RiseAnimation,
    duration: 250,
  },
  {
    value: "wipe",
    label: "Wipe",
    preview: WipeAnimation,
    duration: 250,
  },
  {
    value: "baseline",
    label: "Baseline",
    preview: BaselineAnimation,
    duration: 250,
  },
  {
    value: "pop",
    label: "Pop",
    preview: PopAnimation,
    duration: 300,
    easing: "spring",
    fixed: {
      easing: true,
      duration: true,
    },
  },

  {
    type: "textbox",
    value: "typewriter",
    label: "Typewriter",
    preview: TypewriterTextAnimation,
    duration: 1500,
    fixed: {
      duration: true,
    },
  },
  {
    type: "textbox",
    value: "block",
    label: "Block",
    preview: BlockTextAnimation,
    duration: 1500,
    easing: "easeOutSine",
    fixed: {
      duration: true,
      easing: true,
    },
    disabled: {
      text: true,
    },
  },
  {
    type: "textbox",
    value: "merge",
    label: "Merge",
    preview: MergeTextAnimation,
    duration: 1500,
    text: "word",
    fixed: {
      duration: true,
      text: true,
    },
    disabled: {
      text: true,
    },
  },
  {
    type: "textbox",
    value: "burst",
    label: "Burst",
    easing: "spring",
    preview: BurstTextAnimation,
    duration: 1500,
    fixed: {
      easing: true,
      duration: true,
    },
  },
  {
    type: "textbox",
    value: "clarify",
    label: "Clarify",
    easing: "linear",
    preview: ClarifyTextAnimation,
    duration: 1500,
    fixed: {
      duration: true,
    },
  },
  {
    type: "textbox",
    value: "bounce",
    label: "Bounce",
    easing: "spring",
    preview: BounceTextAnimation,
    duration: 1500,
    fixed: {
      easing: true,
      duration: true,
    },
  },
  {
    type: "textbox",
    value: "ascend",
    label: "Ascend",
    easing: "linear",
    preview: AscendTextAnimation,
    duration: 1500,
    fixed: {
      duration: true,
    },
  },
];

export const exit: EditorAnimation[] = [
  {
    value: "none",
    label: "None",
    preview: NoneAnimation,
  },
  {
    value: "fade",
    label: "Fade",
    preview: FadeAnimation,
    duration: 250,
  },
  {
    value: "slide-left",
    label: "Slide Left",
    preview: SlideAnimation,
    duration: 250,
  },
  {
    value: "slide-right",
    label: "Slide Right",
    preview: SlideAnimation,
    duration: 250,
  },
  {
    value: "rise-up",
    label: "Rise Up",
    preview: RiseAnimation,
    duration: 250,
  },
  {
    value: "sink-down",
    label: "Sink Down",
    preview: RiseAnimation,
    duration: 250,
  },
  {
    value: "pop",
    label: "Pop",
    preview: PopAnimation,
    duration: 250,
    easing: "easeOutSine",
  },
  {
    value: "pan-left",
    label: "Pan Left",
    preview: PanAnimation,
    duration: 250,
  },
  {
    value: "pan-right",
    label: "Pan Right",
    preview: PanAnimation,
    duration: 250,
  },
  {
    value: "wipe",
    label: "Wipe",
    preview: WipeAnimation,
    duration: 250,
  },
  {
    value: "baseline",
    label: "Baseline",
    preview: BaselineAnimation,
    duration: 250,
  },
];

// import NoneSceneAnimation from "video-editor/assets/editor/animations/scene/none.svg";
import RotateSceneAnimation from "video-editor/assets/editor/animations/general/rotate.svg";
import ZoomSceneAnimation from "video-editor/assets/editor/animations/scene/photo-zoom.svg";
import BlinkSceneAnimation from "video-editor/assets/editor/animations/scene/neon.svg";

export const scene: EditorAnimation[] = [
  {
    value: "none",
    label: "None",
    preview: NoneAnimation,
  },
  {
    value: "rotate",
    label: "Rotate",
    preview: RotateSceneAnimation,
    duration: 1000,
    easing: "linear",
    fixed: {
      duration: true,
    },
  },
  {
    value: "zoom-in",
    label: "Zoom In",
    preview: ZoomSceneAnimation,
    disabled: {
      duration: true,
    },
  },
  {
    value: "zoom-out",
    label: "Zoom out",
    preview: ZoomSceneAnimation,
    disabled: {
      duration: true,
    },
  },
  {
    value: "blink",
    label: "Blink",
    preview: BlinkSceneAnimation,
  },
];

export const easings: EditorEasing[] = [
  {
    label: "Linear",
    value: "linear",
  },
  {
    label: "Ease In",
    value: "easeInSine",
  },
  {
    label: "Ease Out",
    value: "easeOutSine",
  },
  {
    label: "Ease In Out",
    value: "easeInOutSine",
  },
  {
    label: "Ease Out In",
    value: "easeOutInSine",
  },
  {
    label: "Ease In Elastic",
    value: "easeInElastic",
  },
  {
    label: "Ease Out Elastic",
    value: "easeOutElastic",
  },
  {
    label: "Ease In Out Elastic",
    value: "easeInOutElastic",
  },
  {
    label: "Ease Out In Elastic",
    value: "easeOutInElastic",
  },
  {
    label: "Spring",
    value: "spring",
  },
];
