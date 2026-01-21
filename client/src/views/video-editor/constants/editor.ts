export const MIN_DURATION = 10;
export const MAX_DURATION = 5*60;//5MINS
export const fontSizes = [12, 14, 16, 18, 24, 28, 32, 36, 40, 44, 48, 56, 64, 72, 80, 96];
// export const presetDurations = [10, 15, 20, 25, 30, 50, 60];
export const presetDurations = [
  {
    label: "10s",
    value: 10
  },
  {
    label: "15s",
    value: 15
  },
  {
    label: "30s",
    value: 30
  },
  {
    label: "60s",
    value: 60
  },
  {
    label: "2m",
    value: 120
  },
  {
    label: "3m",
    value: 180
  },
  {
    label: "5m",
    value: 300
  },
];

export const minZoom = 0.1;
export const maxZoom = 2.5;

export const darkHexCodes = ["#333333", "#1a1a80", "#4b2e2e", "#2e4b2e", "#444444", "#2c3e50", "#8b0000", "#2f4f4f", "#6a5acd", "#800080"];
export const lightHexCodes = ["#ffffff", "#cccccc", "#add8e6", "#ffffcc", "#ffb6c1", "#ff69b4", "#ffd700", "#98fb98", "#afeeee", "#d8bfd8"];
export const pastelHexCodes = ["#FFB3BA", "#FFDFBA", "#FFFFBA", "#BAFFC9", "#BAE1FF", "#E6E6FA", "#FFD1DC", "#D5E8D4", "#FFDAC1", "#F4C2C2"];

import placeholder from 'video-editor/assets/editor/filters/default.jpg';
export const filterPlaceholder = placeholder;

//"https://plus.unsplash.com/premium_photo-1710119487743-48959c984d45?q=75&w=265";
import squareFrame from 'video-editor/assets/editor/frames/square.svg';
import portraitFrame from 'video-editor/assets/editor/frames/portrait.svg';
import landscapeFrame from 'video-editor/assets/editor/frames/landscape.svg';

export const formats = [
  {
    name: "Square (1:1)",
    aspectRatio: 1 / 1,
    ratio: '1:1',
    dimensions: { height: 1080, width: 1080 },
    preview: squareFrame,
    purpose: "Instagram, Facebook, LinkedIn, Snapchat"
  },
  {
    name: "Portrait (9:16)",
    dimensions: { height: 1920, width: 1080 },
    aspectRatio: 9 / 16,
    ratio: '9:16',
    preview: portraitFrame,
    purpose: "Shorts, Reels, TikTok"
  },
  {
    name: "Landscape (16:9)",
    dimensions: { height: 1080, width: 1920 },
    aspectRatio: 16 / 9,
    ratio: '16:9',
    preview: landscapeFrame,
    purpose: "Youtube, Facebook, General"
  },
  {
    name: "Cinema (21:9)",
    dimensions: { height: 1080, width: 2520 },
    aspectRatio: 21 / 9,
    ratio: '21:9',
    preview: landscapeFrame,
    purpose: "Cinema TV (21:9), Sony Phone (21:9)"
  },
  // {
  //   name: "Logo",
  //   dimensions: { height: 500, width: 500 },
  //   aspectRatio: 1 / 1,
  //   preview: "https://img.ly/showcases/cesdk/cases/page-sizes/thumbnail-brochure.svg",
  // },
  // {
  //   name: "Flyer",
  //   dimensions: { height: 3507, width: 2480 },
  //   aspectRatio: 2480 / 3507,
  //   preview: "https://img.ly/showcases/cesdk/cases/page-sizes/thumbnail-flyer.svg",
  // },
  // {
  //   name: "Poster",
  //   dimensions: { height: 2229, width: 1587 },
  //   aspectRatio: 529 / 743,
  //   preview: "https://img.ly/showcases/cesdk/cases/page-sizes/thumbnail-poster.svg",
  // },
  // {
  //   name: "Facebook Post",
  //   dimensions: { height: 788, width: 940 },
  //   aspectRatio: 235 / 197,
  //   preview: "https://img.ly/showcases/cesdk/cases/page-sizes/thumbnail-fb-photo-post.svg",
  // },
  // {
  //   name: "Instagram Post",
  //   dimensions: { height: 1080, width: 1080 },
  //   aspectRatio: 1 / 1,
  //   preview: "https://img.ly/showcases/cesdk/cases/page-sizes/thumbnail-ig-profile.svg",
  // },
];

export const placeholders = [
  {
    label: "Main Image",
    value: "main-image",
  },
  {
    label: "Brand Image",
    value: "brand-image",
  },
  {
    label: "CTA Text",
    value: "cta-text",
  },
  {
    label: "Headline Text",
    value: "headline-text",
  },
  {
    label: "Description Text",
    value: "description-text",
  },
] as const;

import { BringToFront, AlignTextTop as BringForward, SendToBack, SendBackward } from '@icon-park/vue-next';

export const move = [
  {
    label: "To Front",
    value: "top",
    icon: BringToFront
  },
  {
    label: "Forward",
    value: "up",
    icon: BringForward
  },
  {
    label: "To Back",
    value: "bottom",
    icon: SendToBack
  },
  {
    label: "Backward",
    value: "down",
    icon: SendBackward
  },
] as const;

import { AlignLeft, AlignRight, AlignBottom, AlignTop, AlignHorizontally, AlignVertically } from '@icon-park/vue-next';

export const align = [
  {
    label: "Left",
    value: "left",
    icon: AlignLeft
  },
  {
    label: "Center",
    value: "center",
    icon: AlignHorizontally
  },
  {
    label: "Right",
    value: "right",
    icon: AlignRight
  },
  {
    label: "Top",
    value: "top",
    icon: AlignTop
  },
  {
    label: "Middle",
    value: "middle",
    icon: AlignVertically
  },
  {
    label: "Bottom",
    value: "bottom",
    icon: AlignBottom
  },
] as const;
