import { fabric } from "fabric";
// @ts-ignore
const f = fabric as any;
import { createInstance } from "video-editor/lib/utils";

export interface Filter {
  name: string;
  value?: string;
  filter: (...args: any[]) => any;
}

export interface Adjustment {
  name: string;
  value?: string;
  filter: (...args: any[]) => any;
}

export type BlendMode = null | 'add' | 'diff' | 'subtract' |
  'multiply' | 'screen' | 'overlay' |
  'darken' | 'lighten' | 'exclusion' |
  'tint' | 'luminosity';

// 'add' | 'diff' | 'subtract' | 'multiply' | 'screen' | 'lighten' | 'darken' | 'overlay' | 'exclusion';
export const BlendModes = [
  {
    name: 'Add',
    value: 'add'
  },
  {
    name: 'Difference',
    value: 'diff'
  },
  {
    name: 'Subtract',
    value: 'subtract'
  },
  {
    name: 'Multiply',
    value: 'multiply'
  },
  {
    name: 'Screen',
    value: 'screen'
  },
  {
    name: 'Overlay',
    value: 'overlay'
  },
  {
    name: 'Darken',
    value: 'darken'
  },
  {
    name: 'Lighten',
    value: 'lighten'
  },
  // {
  //   name: 'ColorDodge',
  //   value: 'color-dodge'
  // },
  // {
  //   name: 'ColorBurn',
  //   value: 'color-burn'
  // },
  // {
  //   name: 'HardLight',
  //   value: 'hard-light'
  // },
  // {
  //   name: 'SoftLight',
  //   value: 'soft-light'
  // },
  // {
  //   name: 'Difference',
  //   value: 'difference'
  // },
  {
    name: 'Exclusion',
    value: 'exclusion'
  },
  // {
  //   name: 'Hue',
  //   value: 'hue'
  // },
  // {
  //   name: 'Saturation',
  //   value: 'saturation'
  // },
  // {
  //   name: 'Color',
  //   value: 'color'
  // },
  // {
  //   name: 'Luminosity',
  //   value: 'luminosity'
  // },
  {
    name: 'Tint',
    value: 'tint'
  },
];
//'average', 'lightness', 'luminosity'
export const GrayScaleModes = [
  {
    name: 'Average',
    value: 'average'
  },
  {
    name: 'Lightness',
    value: 'lightness'
  },
  {
    name: 'Luminosity',
    value: 'luminosity'
  }
];

export const adjustments: Array<Adjustment> = [
  {
    name: "Brightness",
    value: "Brightness",
    filter: (intensity = 0) => {
      const brightness = intensity / 100;
      return createInstance(f.Image.filters.Brightness, {
        brightness
      })
    }
  },
  {
    name: "Contrast",
    value: "Contrast",
    filter: (intensity = 0) => {
      const contrast = intensity / 100;
      return createInstance(f.Image.filters.Contrast, {
        contrast
      })
    }
  },
  {
    name: "Saturation",
    value: "Saturation",
    filter: (intensity = 0) => {
      const saturation = intensity / 100;
      return createInstance(f.Image.filters.Saturation, {
        saturation,
      })
    }
  },
  {
    name: "Vibrance",
    value: "Vibrance",
    filter: (intensity = 0) => {
      const vibrance = intensity / 100;
      return createInstance(f.Image.filters.Vibrance, {
        vibrance,
      })
    }
  },
  {
    name: "Noise",
    value: "Noise",
    filter: (intensity = 0) => {
      const noise = parseInt(intensity);//[0 - 1000]
      return createInstance(f.Image.filters.Noise, {
        noise,
      })
    }
  },
  {
    name: "Pixelate",
    value: "Pixelate",
    filter: (intensity = 0) => {
      const blocksize = parseInt(intensity);//2 - 20
      return createInstance(f.Image.filters.Pixelate, {
        blocksize,
      })
    }
  },
  {
    name: "Hue",
    value: "Hue",
    filter: (intensity = 0) => {
      const rotation = intensity / 100;
      return createInstance(f.Image.filters.HueRotation, {
        rotation,
      })
    }
  },
  {
    name: "Blur",
    value: "Blur",
    filter: (intensity = 0) => {
      const blur = intensity / 100;
      return createInstance(f.Image.filters.Blur, {
        blur,
      })
    }
  },
  {
    name: "Gamma",
    value: "Gamma",
    filter: (intensity = 0) => {
      const gamma = (100 + intensity) / 100;
      return createInstance(f.Image.filters.Gamma, {
        gamma: [gamma, gamma, gamma],
      })
    }
  },
  {
    name: "Sepia",
    value: "Sepia",
    filter: () => {
      // const sepia = intensity / 100;
      return createInstance(f.Image.filters.Sepia, {
        // sepia,
      })
    }
  },
  {
    name: "BlackWhite",
    value: "BlackWhite",
    filter: () => {
      // const sepia = intensity / 100;
      return createInstance(f.Image.filters.BlackWhite, {
        // sepia,
      })
    }
  },
  {
    name: "Brownie",
    value: "Brownie",
    filter: () => {
      // const sepia = intensity / 100;
      return createInstance(f.Image.filters.Brownie, {
        // sepia,
      })
    }
  },
  {
    name: "Vintage",
    value: "Vintage",
    filter: () => {
      // const sepia = intensity / 100;
      return createInstance(f.Image.filters.Vintage, {
        // sepia,
      })
    }
  },
  {
    name: "Kodachrome",
    value: "Kodachrome",
    filter: () => {
      // const sepia = intensity / 100;
      return createInstance(f.Image.filters.Kodachrome, {
        // sepia,
      })
    }
  },
  {
    name: "Technicolor",
    value: "Technicolor",
    filter: () => {
      // const sepia = intensity / 100;
      return createInstance(f.Image.filters.Technicolor, {
        // sepia,
      })
    }
  },
  {
    name: "Polaroid",
    value: "Polaroid",
    filter: () => {
      // const sepia = intensity / 100;
      return createInstance(f.Image.filters.Polaroid, {
        // sepia,
      })
    }
  },
  {
    name: "Invert",
    value: "Invert",
    filter: (intensity = false) => {
      if (intensity) {
        return createInstance(f.Image.filters.Invert, {})
      }
    }
  },
  {
    name: "Grayscale",
    value: "Grayscale",
    filter: (mode = 'average') => {
      //'average', 'lightness', 'luminosity'
      // const grayscale = intensity / 100;
      if (mode == undefined) {
        mode = "average";
      }
      return createInstance(f.Image.filters.Grayscale, {
        mode,
      })
    }
  },
  {
    name: "BlendColor",
    value: "BlendColor",
    filter: (mode: BlendMode, color = "#FFFFFF", alpha = 0.5) => {
      // const alpha = intensity;
      if (mode == undefined) {
        mode = "overlay";
      }
      if (color == undefined) {
        color = "#FFFFFF";
      }
      if (alpha == undefined) {
        alpha = 0.5
      }
      let instance = createInstance(f.Image.filters.BlendColor, {
        mode, color, alpha
      })
      // console.log("BlendMode", instance);
      return instance;
    }
  },
  {
    name: "Duotone",
    value: "Duotone",
    filter: (lightMode: BlendMode, darkMode: BlendMode, lightColor?: string, darkColor?: string, lightAlpha?: number, darkAlpha?: number) => {
      // const alpha = intensity;
      if (lightMode == undefined) {
        lightMode = 'screen'
      }
      if (darkMode == undefined) {
        darkMode = 'screen'
      }
      if (lightColor == undefined) {
        lightColor = "#fffb00";
      }
      if (darkColor == undefined) {
        darkColor = "#c90300";
      }
      if (lightAlpha == undefined) {
        lightAlpha = 1
      }
      if (darkAlpha == undefined) {
        darkAlpha = 1
      }

      let instance = createInstance(f.Image.filters.Composed, {
        subFilters: [
          new f.Image.filters.Grayscale({ mode: 'luminosity' }), // make it black and white
          new f.Image.filters.BlendColor({ color: lightColor, mode: lightMode, alpha: lightAlpha }), // apply light color
          new f.Image.filters.BlendColor({ color: darkColor, mode: darkMode, alpha: darkAlpha }), // apply a darker color
        ]
      })
      console.log("Duotone", instance);
      return instance;
    }
  },
  {
    name: "RemoveColor",
    value: "RemoveColor",
    filter: (color: "#000000", distance = 0.5) => {
      if (color == undefined) {
        color = "#000000";
      }
      if (distance == undefined) {
        distance = 0.5
      }
      let instance = createInstance(f.Image.filters.RemoveColor, {
        distance, color
      })
      // console.log("RemoveColor", instance);
      return instance
    }
  },
]

export const filters: Array<Filter> = [
  // {
  //   name: "Warm",
  //   filter: (intensity = 50) => {
  //     const red = 1 + (intensity / 100) * 0.5; 
  //     const green = 1 + (intensity / 100) * 0.2;

  //     return [
  //       createInstance(f.Image.filters.ColorMatrix, {  
  //         matrix: [
  //           red, 0, 0, 0, 0,   
  //           0, green, 0, 0, 0, 
  //           0, 0, 1, 0, 0,  
  //           0, 0, 0, 1, 0     
  //         ]
  //       }),
  //     ]
  //   },
  // },
  // {
  //   name: "Cool",
  //   filter: (intensity = 50) => {
  //     const blue = 1 + (intensity / 100) * 0.5; 
  //     const green = 1 + (intensity / 100) * 0.2;

  //     return [
  //       createInstance(f.Image.filters.ColorMatrix, {  
  //         matrix: [
  //           1 , 0, 0, 0, 0,   
  //           0, green, 0, 0, 0, 
  //           0, 0, blue, 0, 0,  
  //           0, 0, 0, 1, 0     
  //         ]
  //       }),
  //     ]
  //   },
  // },
  // {
  //   name: "Vivid",
  //   filter: (intensity = 50) => {
  //     const saturation = 1 + (intensity / 100) * 0.3; 
  //     const contrast = 0.1 + (intensity / 100) * 0.3;
  //     return [
  //       createInstance(f.Image.filters.ColorMatrix, {  
  //         matrix: [
  //           saturation, 0, 0, 0, 0,  
  //           0, saturation, 0, 0, 0,  
  //           0, 0, saturation, 0, 0,  
  //           0, 0, 0, 1, 0     
  //         ] 
  //       }),
  //       createInstance(f.Image.filters.Contrast, {
  //         contrast,
  //       })
  //     ]
  //   },
  // },
  // {
  //   name: "Soft",
  //   filter: (intensity = 50) => {
  //     const brightness = (intensity / 100) * 0.2; 
  //     const contrast = 0.1 + (intensity / 100) * 0.2; 
  //     const blur = (intensity / 100) * 0.1; 
  //     return [  
  //       createInstance(f.Image.filters.Brightness, {
  //         brightness,
  //       }),
  //       createInstance(f.Image.filters.Contrast, {
  //         contrast,
  //       }),
  //       createInstance(f.Image.filters.Blur, {
  //         blur,
  //       })
  //     ]
  //   }
  // },
  // {
  //   name: "Vintage",
  //   filter: (intensity = 50) => {
  //     const sepia = intensity / 100; 
  //     const brightness = -0.1 + (intensity / 100) * 0.2; 
  //     const contrast = 0.1 + (intensity / 100) * 0.3; 
  //     return [  
  //       createInstance(f.Image.filters.Sepia, {
  //         sepia,
  //       }),
  //       createInstance(f.Image.filters.Brightness, {
  //         brightness,
  //       }),
  //       createInstance(f.Image.filters.Contrast, {
  //         contrast,
  //       }),
  //     ]
  //   }
  // },
  // {
  //   name: "Color Pop",
  //   filter: (intensity = 50) => {
  //     const saturation = 1 + (intensity / 100) * 0.7;
  //     const brightness = -0.1 + (intensity / 100) * 0.2;
  //     const contrast = 0.1 + (intensity / 100) * 0.3;
  //     return [  
  //       createInstance(f.Image.filters.Saturation, {
  //         saturation,
  //       }),
  //       createInstance(f.Image.filters.Brightness, {
  //         brightness,
  //       }),
  //       createInstance(f.Image.filters.Contrast, {
  //         contrast,
  //       }),
  //     ]
  //   }
  // },
  // {
  //   name: "Monochrome",
  //   filter: (intensity = 50) => {
  //     const contrast = 0.1 + (intensity / 100) * 0.3;
  //     return [  
  //       createInstance(f.Image.filters.Grayscale, {
  //         mode: "average"
  //       }),
  //       createInstance(f.Image.filters.Contrast, {
  //         contrast
  //       }),
  //     ]
  //   }
  // },
  // {
  //   name: "None",
  //   value: "none",
  //   filter: (intensity = 50) => {
  //     return [];
  //   }
  // },
  {
    name: "Ice Water",
    value: "ice-water",
    filter: (intensity = 50) => {
      const ratio = intensity / 50;
      const brightness = new f.Image.filters.Brightness({ brightness: 0.04 * ratio });
      const contrast = new f.Image.filters.Contrast({ contrast: 0.04 * ratio });
      const saturation = new f.Image.filters.Saturation({ saturation: 0.22 * ratio });
      const blend = new f.Image.filters.BlendColor({
        color: '#00e1fa',
        mode: 'screen',//multiply
        alpha: 0.13 * ratio
      });

      return [brightness, contrast, saturation, blend];
    }
  },
  {
    name: "Summer Heat",
    value: "summer-heat",
    filter: (intensity = 50) => {
      const ratio = intensity / 50;
      const brightness = new f.Image.filters.Brightness({ brightness: 0.03 * ratio });
      const contrast = new f.Image.filters.Contrast({ contrast: 0.14 * ratio });
      const saturation = new f.Image.filters.Saturation({ saturation: 0.22 * ratio });

      const blend = new f.Image.filters.BlendColor({
        color: '#fae900',
        mode: 'screen',//overlay
        alpha: 0.23 * ratio
      });

      return [brightness, contrast, saturation, blend];
    }
  },
  {
    name: "Fever",
    value: "fever",
    filter: (intensity = 50) => {
      const ratio = intensity / 50;
      const contrast = new f.Image.filters.Contrast({ contrast: -0.03 * ratio });
      const saturation = new f.Image.filters.Saturation({ saturation: 0.11 * ratio });
      const hueRotation = new f.Image.filters.HueRotation({ rotation: -0.166 * ratio });

      const blend = new f.Image.filters.BlendColor({
        color: '#ff0000',
        mode: 'screen',//multiply
        alpha: 0.13 * ratio
      });

      return [contrast, saturation, hueRotation, blend];
    }
  },
  {
    name: "Strawberry",
    value: "strawberry",
    filter: (intensity = 50) => {
      const ratio = intensity / 50;
      const blend = new f.Image.filters.BlendColor({
        color: '#fa00cc',
        mode: 'screen', // Mathematical inverse of multiply
        alpha: 0.5 * ratio      // Matches your 0.5 opacity
      });

      return [blend];
    }
  },
  {
    name: "Ibiza",
    value: "ibiza",
    filter: (intensity = 50) => {
      const ratio = intensity / 50;
      const filter = new f.Image.filters.Composed({
        subFilters: [
          // contrast(107%) -> 0.07
          new f.Image.filters.Contrast({ contrast: 0.07 * ratio }),

          // saturate(165%) -> 0.65
          new f.Image.filters.Saturation({ saturation: 0.65 * ratio }),

          // sepia(50%) -> 0.5
          // new f.Image.filters.ColorMatrix({
          //   matrix: [
          //     0.697, 0.379, 0.095, 0, 0,
          //     0.175, 0.742, 0.065, 0, 0,
          //     0.136, 0.265, 0.186, 0, 0,
          //     0, 0, 0, 1, 0
          //   ]
          // }),
          new f.Image.filters.ColorMatrix({
            matrix: [
              0.393 + 0.607 * (1 - 0.49), 0.769 - 0.769 * (1 - 0.49), 0.189 - 0.189 * (1 - 0.49), 0, 0,
              0.349 - 0.349 * (1 - 0.49), 0.686 + 0.314 * (1 - 0.49), 0.168 - 0.168 * (1 - 0.49), 0, 0,
              0.272 - 0.272 * (1 - 0.49), 0.534 - 0.534 * (1 - 0.49), 0.131 + 0.869 * (1 - 0.49), 0, 0,
              0, 0, 0, 1, 0
            ]
          }),

          // new f.Image.filters.ColorMatrix({
          //   matrix: [
          //     1, 0, 0, 0, 0,        // Red
          //     0, 1, 0, 0, 0,        // Green
          //     0.1, 0.1, 1.2, 0, 0,  // Blue (Boosted)
          //     0, 0, 0, 1, 0         // Alpha
          //   ]
          // })

          // // THE BRIGHTNESS FIX: Gamma boost
          // // Even though soft-light is bright, the sepia can 'brown' the image.
          // new f.Image.filters.Gamma({ gamma: [1.2, 1.2, 1.2] }),

          // Simulation of Soft-Light using Overlay
          new f.Image.filters.BlendColor({
            color: '#3a00fa',
            mode: 'screen', // Fallback for soft-light
            alpha: 0.2 * ratio      // Reduced from 0.5 to prevent harshness
          })

          // new f.Image.filters.SoftLightBlend({
          //   uColor: [58/255, 0/255, 250/255],
          //   uAlpha: 0.5
          // })
        ]
      });

      return [filter];
    }
  },
  {
    name: "Sweet Sunset",
    value: "sweet-sunset",
    filter: (intensity = 50) => {
      const ratio = intensity / 50;
      const filter = new f.Image.filters.Composed({
        subFilters: [
          // Contrast: CSS 128% -> Fabric 0.28
          new f.Image.filters.Contrast({ contrast: 0.28 * ratio }),

          // Saturation: CSS 120% -> Fabric 0.2
          new f.Image.filters.Saturation({ saturation: 0.2 * ratio }),

          // Multiply Layer: CSS #fa00cc at 15% opacity
          new f.Image.filters.BlendColor({
            color: '#fa00cc',
            mode: 'tint',
            alpha: 0.15 * ratio
          })
        ]
      });

      return [filter];
    }
  },
  {
    name: "Blue Rock",
    value: "blue-rock",
    filter: (intensity = 50) => {
      const ratio = intensity / 50;
      const filter = new f.Image.filters.Composed({
        subFilters: [
          // grayscale(100%)
          new f.Image.filters.Grayscale(),

          // contrast(128%) -> 0.28
          new f.Image.filters.Contrast({ contrast: 0.28 * ratio }),

          // mix-blend-mode: multiply; background: #008efa; opacity: 0.15;
          new f.Image.filters.BlendColor({
            color: '#008efa',
            mode: 'tint',
            alpha: 0.15 * ratio
          })
        ]
      });

      return [filter];
    }
  },
  {
    name: "Ocean Way",
    value: "ocean-way",
    filter: (intensity = 50) => {
      const ratio = intensity / 50;
      const filter = new f.Image.filters.Composed({
        subFilters: [
          // brightness(105%) -> 0.05
          new f.Image.filters.Brightness({ brightness: 0.05 * ratio }),

          // contrast(104%) -> 0.04
          new f.Image.filters.Contrast({ contrast: 0.04 * ratio }),

          // grayscale(10%) -> 0.1 (use the 'average' or 'lightness' mode if needed)
          // new f.Image.filters.Grayscale(), 
          new f.Image.filters.ColorMatrix({
            matrix: [
              // R       G       B      A    Offset
              0.921, 0.071, 0.007, 0, 0, // Red channel
              0.021, 0.971, 0.007, 0, 0, // Green channel
              0.021, 0.071, 0.907, 0, 0, // Blue channel
              0, 0, 0, 1, 0  // Alpha
            ]
          }),

          // sepia(50%) -> 0.5
          // new f.Image.filters.Sepia({ sepia: 0.5 }),
          new f.Image.filters.ColorMatrix({
            matrix: [
              0.697, 0.379, 0.095, 0, 0,
              0.175, 0.742, 0.065, 0, 0,
              0.136, 0.265, 0.186, 0, 0,
              0, 0, 0, 1, 0
            ]
          }),


          // mix-blend-mode: multiply; background: #00e5fa; opacity: 0.13;
          new f.Image.filters.BlendColor({
            color: '#00e5fa',
            mode: 'tint',
            alpha: 0.13 * ratio
          })
        ]
      });

      return [filter];
    }
  },
  {
    name: "Little Red",
    value: "little-red",
    filter: (intensity = 50) => {
      const ratio = intensity / 50;
      const filter = new f.Image.filters.Composed({
        subFilters: [
          // brightness(105%) -> 0.05
          new f.Image.filters.Brightness({ brightness: 0.05 * ratio }),

          // contrast(106%) -> 0.06
          new f.Image.filters.Contrast({ contrast: 0.06 * ratio }),

          // saturate(90%) -> -0.1 (reduction of 10% from base 1.0)
          new f.Image.filters.Saturation({ saturation: -0.1 * ratio }),

          // mix-blend-mode: overlay; background: #fa0000; opacity: 0.3;
          new f.Image.filters.BlendColor({
            color: '#fa0000',
            mode: 'add',
            alpha: 0.3 * ratio
          })
        ]
      });

      return [filter];
    }
  },
  {
    name: "Vintage May",
    value: "vintage-may",
    filter: (intensity = 50) => {
      const ratio = intensity / 50;
      const filter = new f.Image.filters.Composed({
        subFilters: [
          // brightness(105%) -> 0.05
          new f.Image.filters.Brightness({ brightness: 0.05 * ratio }),

          // grayscale(100%)
          new f.Image.filters.Grayscale(),

          // sepia(50%) -> 0.5
          // new f.Image.filters.Sepia({ sepia: 0.5 }),
          new f.Image.filters.ColorMatrix({
            matrix: [
              0.697, 0.379, 0.095, 0, 0,
              0.175, 0.742, 0.065, 0, 0,
              0.136, 0.265, 0.186, 0, 0,
              0, 0, 0, 1, 0
            ]
          }),

          // background: #faaa00; opacity: 0.13; mix-blend-mode: none;
          // In Fabric, mix-blend-mode 'none' with opacity is 'tint'
          new f.Image.filters.BlendColor({
            color: '#faaa00',
            mode: 'tint',
            alpha: 0.13 * ratio
          })
        ]
      });

      return [filter];
    }
  },
  // {
  //   name: "Space Trip",
  //   value: "space-trip",
  //   filter: (intensity = 50) => {
  //     const filter = new f.Image.filters.Composed({
  //       subFilters: [
  //         // 1. High Saturation: Essential to make the red lips and hair "pop"
  //         new f.Image.filters.Saturation({ saturation: 1.4 }),

  //         //grayscale 50%
  //         // new f.Image.filters.ColorMatrix({
  //         //   matrix: [
  //         //     0.6063, 0.3576, 0.0361, 0, 0, // Red channel
  //         //     0.1063, 0.8576, 0.0361, 0, 0, // Green channel
  //         //     0.1063, 0.3576, 0.5361, 0, 0, // Blue channel
  //         //     0,      0,      0,      1, 0  // Alpha channel
  //         //   ]
  //         // }),

  //         // 2. Contrast: Sharpens the tattoos and separates her from the background
  //         // new f.Image.filters.Contrast({ contrast: 0.25 }),

  //         // 3. THE BRIGHTNESS FIX: Gamma Boost
  //         // This creates the "lit" look on her face without washing out the blacks
  //         new f.Image.filters.Gamma({ gamma: [1.6, 1.6, 1.6] }),

  //         // 4. Amber Tint (#faaa00) using Overlay mode
  //         // Overlay protects your highlights while staining the midtones orange
  //         new f.Image.filters.BlendColor({
  //           color: '#faaa00',
  //           mode: 'add',
  //           alpha: 0.1
  //         })
  //         // new f.Image.filters.ColorMatrix({
  //         //   matrix: [
  //         //       1.2, 0, 0, 0, 0,   // Red channel (boosted)
  //         //       0, 1.1, 0, 0, 0,   // Green channel (boosted)
  //         //       0, 0, 0.8, 0, 0,   // Blue channel (reduced to create yellow/amber)
  //         //       0, 0, 0, 1, 0      // Alpha
  //         //   ]
  //         // })

  //       ]
  //     });
  //     return [filter];
  //   }
  // },
  {
    name: "Desert Morning",
    value: "desert-morning",
    filter: (intensity = 50) => {
      // 1. Convert Hex #fae500 to 0-1 range
      // R: 250/255=0.98, G: 229/255=0.90, B: 0/255=0.0
      const filterColor = [0.98, 0.90, 0.0];
      const ratio = intensity / 50;
      const filter = new f.Image.filters.Composed({
        subFilters: [
          new f.Image.filters.Brightness({ brightness: 0.10 * ratio }), // 110%
          new f.Image.filters.Contrast({ contrast: 0.14 * ratio }),    // 114%
          new f.Image.filters.Saturation({ saturation: 0.22 * ratio }), // 122%
          new f.Image.filters.BlendColor({
            color: '#fae500',
            mode: 'tint',
            alpha: 0.2 * ratio
          })
          // new f.Image.filters.HardLightBlend({
          //   uColor: filterColor,
          //   uAlpha: 0.2 // opacity: 0.2
          // })
        ]
      });

      return [filter];
    }
  },
  {
    name: "Blue Lagoon",
    value: "blue-lagoon",
    filter: (intensity = 50) => {
      const ratio = intensity / 50;
      const filter = new f.Image.filters.Composed({
        subFilters: [
          // brightness(104%) -> 0.04
          new f.Image.filters.Brightness({ brightness: 0.04 * ratio }),

          // contrast(104%) -> 0.04
          new f.Image.filters.Contrast({ contrast: 0.04 * ratio }),

          // saturate(122%) -> 0.22
          new f.Image.filters.Saturation({ saturation: 0.22 * ratio }),

          // mix-blend-mode: multiply; background: #00e1fa; opacity: 0.5
          new f.Image.filters.BlendColor({
            color: "#00e1fa",
            mode: 'lighten',
            alpha: 0.5 * ratio
          })
        ]
      });

      return [filter];
    }
  },
  {
    name: "Warm Ice",
    value: "warm-ice",
    filter: (intensity = 50) => {
      const ratio = intensity / 50;
      const filter = new f.Image.filters.Composed({
        subFilters: [
          // brightness(110%) -> 0.1
          new f.Image.filters.Brightness({ brightness: 0.1 * ratio }),

          // contrast(116%) -> 0.16
          new f.Image.filters.Contrast({ contrast: 0.16 * ratio }),

          // hue-rotate(342deg) -> normalized range -1 to 1 (342deg is -18deg)
          // Formula: (342 / 180) - 2 approx -0.1
          new f.Image.filters.HueRotation({ rotation: -0.1 * ratio }),

          // saturate(84%) -> -0.16 (reduction from base 1.0)
          new f.Image.filters.Saturation({ saturation: -0.16 * ratio }),

          // mix-blend-mode: lighten; background: #6be9ff; opacity: 0.23
          new f.Image.filters.BlendColor({
            color: '#6be9ff',
            mode: 'lighten',
            alpha: 0.23 * ratio
          })
        ]
      });

      return [filter];
    }
  },
  {
    name: "Burnt Coffee",
    value: "burnt-coffee",
    filter: (intensity = 50) => {
      const ratio = intensity / 50;
      const filter = new f.Image.filters.Composed({
        subFilters: [
          // grayscale(100%)
          // new f.Image.filters.Grayscale(),

          // // contrast(80%) -> Ff.util.degreesToRadiansge where 0 is neutral. 
          // // 80% is a reduction, so we use -0.2
          // new f.Image.filters.Contrast({ contrast: -0.2 }),

          // // mix-blend-mode: multiply; background: #e3dca1; opacity: 1;
          // new f.Image.filters.BlendColor({
          //   color: '#e3dca1',
          //   mode: 'tint',
          //   alpha: 0.2
          // })

          // 1. grayscale(100%)
          new f.Image.filters.Grayscale(),

          // 2. contrast(80%) -> -0.2 reduction
          new f.Image.filters.Contrast({ contrast: -0.2 * ratio }),

          // 3. THE BRIGHTNESS FIX: Gamma & Brightness
          // Multiply math (Base * Blend) makes everything darker.
          // Gamma 2.0+ is needed to simulate that "overexposed" reference look.
          // new f.Image.filters.Gamma({ gamma: [2.2, 2.2, 2.2] }),
          // new f.Image.filters.Brightness({ brightness: 0.05 }),

          // 4. Match ::after { mix-blend-mode: multiply; background: #e3dca1; opacity: 1; }
          new f.Image.filters.BlendColor({
            color: '#e3dca1',
            mode: 'multiply',
            alpha: 1.0 * ratio
          })
        ]
      });

      return [filter];
    }
  },
  {
    name: "Waterness",
    value: "waterness",
    filter: (intensity = 50) => {
      const ratio = intensity / 50;
      const filter = new f.Image.filters.Composed({
        subFilters: [
          // grayscale(100%)
          new f.Image.filters.Grayscale(),

          // contrast(128%) -> 0.28
          new f.Image.filters.Contrast({ contrast: 0.28 * ratio }),

          // Hard Light Overlay: #008efa (R:0, G:142, B:250) at 15% opacity
          // new f.Image.filters.HardLightBlend({
          //   uColor: [0/255, 142/255, 250/255],
          //   uAlpha: 0.15
          // })
          new f.Image.filters.BlendColor({
            color: '#008efa',
            mode: 'tint',
            alpha: 0.15 * ratio
          })
        ]
      });

      return [filter];
    }
  },
  {
    name: "Old Wood",
    value: "old-wood",
    filter: (intensity = 50) => {
      // 1. Convert Hex #574400 to normalized RGB (0-1)
      // R: 87/255=0.34, G: 68/255=0.26, B: 0/255=0.0
      const oliveColor = [0.34, 0.26, 0.0];
      const ratio = intensity / 50;
      const filter = new f.Image.filters.Composed({
        subFilters: [
          // 1. BASE ADJUSTMENTS
          // new f.Image.filters.Brightness({ brightness: 0.05 }), // brightness(105%)
          new f.Image.filters.Contrast({ contrast: 0.02 * ratio }),     // contrast(102%)
          new f.Image.filters.Saturation({ saturation: 0.4 * ratio }),  // saturate(140%)

          // 2. 50% GRAYSCALE + 9% SEPIA (Matrix approach for precision)
          new f.Image.filters.ColorMatrix({
            matrix: [
              0.88, 0.12, 0.03, 0, 0,
              0.10, 0.90, 0.02, 0, 0,
              0.08, 0.15, 0.82, 0, 0,
              0, 0, 0, 1, 0
            ]
          }),

          // 3. THE BRIGHTNESS FIX: Gamma Boost
          // Lifting midtones ensures the golden tint feels like "light" rather than "mud"
          new f.Image.filters.Gamma({ gamma: [1.4, 1.4, 1.4] }),

          // 4. CUSTOM SOFT-LIGHT BLEND (#574400)
          // Note: color is normalized (87/255, 68/255, 0)
          // new f.Image.filters.SoftLightBlend({
          //   uColor: [0.34, 0.26, 0.0],
          //   uAlpha: 1.0
          // })
          new f.Image.filters.BlendColor({
            color: '#574400',
            mode: 'tint',
            alpha: 0.2 * ratio
          })
        ]
      });

      return [filter];
    }
  },
  {
    name: "Distant Mountain",
    value: "distant-mountain",
    filter: (intensity = 50) => {
      const ratio = intensity / 50;
      const filter = new f.Image.filters.Composed({
        subFilters: [
          // grayscale(100%)
          new f.Image.filters.Grayscale(),

          // contrast(120%) -> 1.20 (an increase of 0.2)
          new f.Image.filters.Contrast({ contrast: 0.2 * ratio }),

          // mix-blend-mode: lighten; background: #033dc5; opacity: 1;
          new f.Image.filters.BlendColor({
            color: '#033dc5',
            mode: 'lighten',
            alpha: 1.0 * ratio
          })
        ]
      });

      return [filter];
    }
  },
  {
    name: "Coal Paper",
    value: "coal-paper",
    filter: (intensity = 50) => {
      const ratio = intensity / 50;
      const filter = new f.Image.filters.Composed({
        subFilters: [
          // 1. BASE ADJUSTMENTS
          new f.Image.filters.Contrast({ contrast: 0.25 * ratio }),     // contrast(125%)

          // 2. THE BRIGHTNESS FIX: Gamma & Brightness
          // We ignore the CSS brightness(90%) and instead boost midtones (2.0)
          // to match your high-exposure reference images.
          // new f.Image.filters.Gamma({ gamma: [2.0, 2.0, 2.0] }),
          // new f.Image.filters.Brightness({ brightness: 0.1 }),

          // 3. 100% GRAYSCALE + 50% SEPIA
          // Combined into one matrix to prevent "muddy" overlap
          new f.Image.filters.ColorMatrix({
            matrix: [
              0.393, 0.769, 0.189, 0, 0, // Sepia Red
              0.349, 0.686, 0.168, 0, 0, // Sepia Green
              0.272, 0.534, 0.131, 0, 0, // Sepia Blue
              0, 0, 0, 1, 0
            ]
          }),

          // 4. DARKEN OVERLAY (#7d0000 at 0.1 opacity)
          new f.Image.filters.BlendColor({
            color: '#7d0000',
            mode: 'tint',
            alpha: 0.2 * ratio
          })
        ]
      });

      return [filter];
    }
  },
  {
    name: "Simple Gray",
    value: "simple-gray",
    filter: (intensity = 50) => {
      const ratio = intensity / 50;
      const filter = new f.Image.filters.Composed({
        subFilters: [
          // grayscale(100%)
          new f.Image.filters.Grayscale(),

          // mix-blend-mode: none; background: #faaa00; opacity: 0.13;
          // In Fabric, 'tint' mode with alpha simulates a 'none' blend overlay
          new f.Image.filters.BlendColor({
            color: '#faaa00',
            mode: 'tint',
            alpha: 0.13 * ratio
          })
        ]
      });

      return [filter];
    }
  },
  {
    name: "Rose Quartz",
    value: "rose-quartz",
    filter: (intensity = 50) => {
      const ratio = intensity / 50;
      const filter = new f.Image.filters.Composed({
        subFilters: [
          // grayscale(100%)
          new f.Image.filters.Grayscale(),

          // mix-blend-mode: multiply; background: #fa00cc; opacity: 0.5;
          new f.Image.filters.BlendColor({
            color: '#fa00cc',
            mode: 'screen',
            alpha: 0.5 * ratio
          })
        ]
      });

      return [filter];
    }
  },
  {
    name: "Amazon",
    value: "amazon",
    filter: (intensity = 50) => {
      const ratio = intensity / 50;
      const filter = new f.Image.filters.Composed({
        subFilters: [
          // 1. Convert image to black and white
          new f.Image.filters.Grayscale(),

          // 2. Multiply with solid green: #00b309
          // alpha: 1 matches your opacity: 1
          new f.Image.filters.BlendColor({
            color: '#00b309',
            mode: 'multiply',
            alpha: 1 * ratio
          })
        ]
      });

      return [filter];
    }
  },
  {
    name: "Baseline Special",
    value: "baseline-special",
    filter: (intensity = 50) => {
      const ratio = intensity / 50;
      const filter = new f.Image.filters.Composed({
        subFilters: [
          // 1. Partial Grayscale (50%)
          // Note: Fabric's Grayscale is usually 100%, we use Saturation to mimic 50%
          new f.Image.filters.Saturation({ saturation: -0.5 * ratio }),

          // 2. Saturate(140%) 
          // This boosts the remaining color before the orange hits
          new f.Image.filters.Saturation({ saturation: 0.4 * ratio }),

          // 3. Multiply with #faaa00
          new f.Image.filters.BlendColor({
            color: '#faaa00',
            mode: 'multiply',
            alpha: 1 * ratio // Matches your opacity: 1
          })
        ]
      });

      return [filter];
    }
  },
  {
    name: "Baby Glass",
    value: "baby-glass",
    filter: (intensity = 50) => {
      const ratio = intensity / 50;
      const filter = new f.Image.filters.Composed({
        subFilters: [
          // 1. Convert to 100% grayscale first
          new f.Image.filters.Grayscale(),

          // 2. OPTIONAL: Brightness boost to counter the Multiply darkness
          // new f.Image.filters.Brightness({ brightness: 0.15 }),

          // 3. Multiply with #00ccfa
          new f.Image.filters.BlendColor({
            color: '#00ccfa',
            mode: 'multiply',
            alpha: 1 * ratio // Matches your CSS opacity: 1
          })
        ]
      });

      return [filter];
    }
  },
  {
    name: "Rose Glass",
    value: "rose-glass",
    filter: (intensity = 50) => {
      const ratio = intensity / 50;
      const filter = new f.Image.filters.Composed({
        subFilters: [
          // 1. Match brightness(106%) -> 0.06 boost
          new f.Image.filters.Brightness({ brightness: 0.06 * ratio }),

          // 2. Match grayscale(100%)
          new f.Image.filters.Grayscale(),

          // 3. Match mix-blend-mode: multiply; background: #fa0000; opacity: 1;
          new f.Image.filters.BlendColor({
            color: '#fa0000',
            mode: 'multiply',
            alpha: 1.0 * ratio
          })
        ]
      });

      return [filter];
    }
  },
  {
    name: "Yellow Haze",
    value: "yellow-haze",
    filter: (intensity = 50) => {
      const ratio = intensity / 50;
      const filter = new f.Image.filters.Composed({
        subFilters: [
          // 1. Match brightness(106%) -> 0.06 boost
          new f.Image.filters.Brightness({ brightness: 0.06 * ratio }),

          // 2. Match grayscale(100%)
          new f.Image.filters.Grayscale(),

          // 3. Match mix-blend-mode: multiply; background: #ffff00; opacity: 1;
          new f.Image.filters.BlendColor({
            color: '#ffff00',
            mode: 'multiply',
            alpha: 1.0 * ratio
          })
        ]
      });

      return [filter];
    }
  },
  {
    name: "Blue Haze",
    value: "blue-haze",
    filter: (intensity = 50) => {
      const ratio = intensity / 50;
      const filter = new f.Image.filters.Composed({
        subFilters: [
          // 1. brightness(110%) -> 0.1 boost
          new f.Image.filters.Brightness({ brightness: 0.1 * ratio }),

          // 2. grayscale(100%)
          new f.Image.filters.Grayscale(),

          // 3. mix-blend-mode: multiply; background: #002bff; opacity: 0.76;
          new f.Image.filters.BlendColor({
            color: '#002bff',
            mode: 'multiply',
            alpha: 0.76 * ratio
          })
        ]
      });

      return [filter];
    }
  },
  {
    name: "Studio 54",
    value: "studio-54",
    filter: (intensity = 50) => {
      const ratio = intensity / 50;
      const filter = new f.Image.filters.Composed({
        subFilters: [
          // 1. Convert to Grayscale
          new f.Image.filters.Grayscale(),

          // 2. BRIGHTNESS BOOST: This prevents the 'multiply' mode from being too dark
          new f.Image.filters.Brightness({ brightness: 0.15 * ratio }),

          // 3. Match 'mix-blend-mode: multiply' against the red background (#ff0000)
          new f.Image.filters.BlendColor({
            color: '#ff0000',
            mode: 'multiply',
            alpha: 1.0 * ratio
          }),

          // 4. Match 'mix-blend-mode: lighten' with the blue layer (#002b96)
          new f.Image.filters.BlendColor({
            color: '#002b96',
            mode: 'lighten',
            alpha: 1.0 * ratio
          })
        ]
      });

      return [filter];
    }
  },
  {
    name: "Burnt Peach",
    value: "burnt-peach",
    filter: (intensity = 50) => {
      const ratio = intensity / 50;
      const filter = new f.Image.filters.Composed({
        subFilters: [
          new f.Image.filters.Grayscale(),

          // THE BRIGHTNESS FIX: Gamma boost (values > 1 make the image brighter)
          // This prevents the Hard Light from "crushing" the midtones.
          new f.Image.filters.Gamma({ gamma: [1.6 * ratio, 1.6 * ratio, 1.6 * ratio] }),

          // Layer 1: Image Hard-Lighted onto Background #c4ba86
          new f.Image.filters.HardLightBlend({
            uColor: [196 / 255, 186 / 255, 134 / 255]
          }),

          // Layer 2: Lighten with Pink #f430a9
          new f.Image.filters.BlendColor({
            color: '#f430a9',
            mode: 'lighten',
            alpha: 1.0 * ratio
          })
        ]
      });

      return [filter];
    }
  },
  {
    name: "Mono Sky",
    value: "mono-sky",
    filter: (intensity = 50) => {
      const ratio = intensity / 50;
      const filter = new f.Image.filters.Composed({
        subFilters: [
          // 1. Convert to Grayscale
          new f.Image.filters.Grayscale(),

          // 2. contrast(120%) -> 0.2 boost
          new f.Image.filters.Contrast({ contrast: 0.2 * ratio }),

          // 3. THE BRIGHTNESS FIX: Gamma boost
          // Values > 1 lift the midtones, preventing 'multiply' from killing detail
          new f.Image.filters.Gamma({ gamma: [1.8 * ratio, 1.8 * ratio, 1.8 * ratio] }),

          // 4. Match img { mix-blend-mode: multiply } against background #42a4ff
          new f.Image.filters.BlendColor({
            color: '#42a4ff',
            mode: 'multiply',
            alpha: 1.0 * ratio
          }),

          // 5. Match ::after { mix-blend-mode: lighten } with background #002a8c
          new f.Image.filters.BlendColor({
            color: '#002a8c',
            mode: 'lighten',
            alpha: 1.0 * ratio
          })
        ]
      });

      return [filter];
    }
  },
  {
    name: "Mustard Grass",
    value: "mustard-grass",
    filter: (intensity = 50) => {
      const ratio = intensity / 50;
      const filter = new f.Image.filters.Composed({
        subFilters: [
          // 1. Convert to Grayscale
          new f.Image.filters.Grayscale(),

          // 2. contrast(125%) -> 0.25 boost
          new f.Image.filters.Contrast({ contrast: 0.25 * ratio }),

          // 3. THE BRIGHTNESS FIX: Gamma boost
          // Lift midtones to prevent the multiply layer from looking "muddy"
          new f.Image.filters.Gamma({ gamma: [1.8 * ratio, 1.8 * ratio, 1.8 * ratio] }),

          // 4. Match img { mix-blend-mode: multiply } against background #ffcd45
          new f.Image.filters.BlendColor({
            color: '#ffcd45',
            mode: 'multiply',
            alpha: 1.0 * ratio
          }),

          // 5. Match ::after { mix-blend-mode: lighten } with background #0d5c45
          new f.Image.filters.BlendColor({
            color: '#0d5c45',
            mode: 'lighten',
            alpha: 1.0 * ratio
          })
        ]
      });

      return [filter];
    }
  },
  {
    name: "Leaf",
    value: "leaf",
    filter: (intensity = 50) => {
      const ratio = intensity / 50;
      const filter = new f.Image.filters.Composed({
        subFilters: [
          // 1. Convert to Grayscale
          new f.Image.filters.Grayscale(),

          // 2. contrast(79%) -> -0.21 (reduction in contrast)
          new f.Image.filters.Contrast({ contrast: -0.21 * ratio }),

          // 3. THE BRIGHTNESS FIX: Combined Brightness & Gamma
          // We boost the base image so the 'lighten' mode captures more detail
          new f.Image.filters.Brightness({ brightness: 0.1 * ratio }),
          new f.Image.filters.Gamma({ gamma: [1.8 * ratio, 1.8 * ratio, 1.8 * ratio] }),

          // 4. Match img { mix-blend-mode: lighten } against background #0665c4
          new f.Image.filters.BlendColor({
            color: '#0665c4',
            mode: 'lighten',
            alpha: 1.0 * ratio
          }),

          // 5. Match ::after { mix-blend-mode: multiply } with yellow #f9ed3a
          new f.Image.filters.BlendColor({
            color: '#f9ed3a',
            mode: 'multiply',
            alpha: 1.0 * ratio
          })
        ]
      });

      return [filter];
    }
  },
  {
    name: "Ryellow",
    value: "ryellow",
    filter: (intensity = 50) => {
      const ratio = intensity / 50;
      const filter = new f.Image.filters.Composed({
        subFilters: [
          // 1. grayscale(100%)
          new f.Image.filters.Grayscale(),

          // 2. contrast(90%) -> -0.1 reduction
          new f.Image.filters.Contrast({ contrast: -0.1 * ratio }),

          // 3. THE BRIGHTNESS FIX: Gamma & Brightness
          // Multiply math (Base * Blend) makes everything darker.
          // Gamma 2.0 lifts the midtones significantly to keep the yellow 'glow'.
          new f.Image.filters.Brightness({ brightness: 0.1 * ratio }),
          // new f.Image.filters.Gamma({ gamma: [2.0, 2.0, 2.0] }),

          // 4. Match img { mix-blend-mode: multiply } against background #fffb00
          new f.Image.filters.BlendColor({
            color: '#fffb00',
            mode: 'multiply',
            alpha: 1.0 * ratio
          }),

          // 5. Match ::after { mix-blend-mode: lighten } with background #c90300
          new f.Image.filters.BlendColor({
            color: '#c90300',
            mode: 'lighten',
            alpha: 1.0 * ratio
          })
        ]
      });

      return [filter];
    }
  },
  {
    name: "Baseline Darken",
    value: "baseline-darken",
    filter: (intensity = 50) => {
      const ratio = intensity / 50;
      const filter = new f.Image.filters.Composed({
        subFilters: [
          // 1. THE BRIGHTNESS FIX: Gamma & Brightness
          // Since 'Darken' caps your highlights at the background color,
          // we boost the base image so more detail survives the blend.
          // new f.Image.filters.Gamma({ gamma: [1.5, 1.5, 1.5] }),
          new f.Image.filters.Brightness({ brightness: 0.05 * ratio }),

          // 2. Match img { mix-blend-mode: darken } against background #faaa00
          new f.Image.filters.BlendColor({
            color: '#faaa00',
            mode: 'darken',
            alpha: 1.0 * ratio
          }),

          // 3. Match ::after { opacity: 0.13; background: #faaa00; mix-blend-mode: none }
          // We use 'tint' mode in Fabric to simulate a low-opacity 'none' overlay
          new f.Image.filters.BlendColor({
            color: '#faaa00',
            mode: 'tint',
            alpha: 0.13 * ratio
          })
        ]
      });

      return [filter];
    }
  },
  {
    name: "Red Sky",
    value: "red-sky",
    filter: (intensity = 50) => {
      const ratio = intensity / 50;
      const filter = new f.Image.filters.Composed({
        subFilters: [
          // 1. grayscale(100%)
          new f.Image.filters.Grayscale(),

          // 2. contrast(120%) -> 0.2 boost
          new f.Image.filters.Contrast({ contrast: 0.2 * ratio }),

          // 3. THE BRIGHTNESS FIX: Gamma boost
          // Lifting midtones ensures the 'multiply' layer doesn't turn the blue muddy.
          new f.Image.filters.Gamma({ gamma: [1.8 * ratio, 1.8 * ratio, 1.8 * ratio] }),

          // 4. Match img { mix-blend-mode: multiply } against background #42a4ff
          new f.Image.filters.BlendColor({
            color: '#42a4ff',
            mode: 'multiply',
            alpha: 1.0 * ratio
          }),

          // 5. Match ::after { mix-blend-mode: lighten; background: #ab0000; opacity: 0.83 }
          new f.Image.filters.BlendColor({
            color: '#ab0000',
            mode: 'lighten',
            alpha: 0.83 * ratio
          })
        ]
      });

      return [filter];
    }
  },
];

