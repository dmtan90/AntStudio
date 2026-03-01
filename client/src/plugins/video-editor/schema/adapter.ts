import { z } from "zod";

export const EditorProductImageSchema = z.object({
  id: z.number(),
  url: z.string(),
});

export const EditorProductSchema = z.object({
  id: z.number().nullish(),
  business_id: z.number().nullish(),
  name: z.string(),
  currency: z.string().nullish(),
  description: z.string(),
  tags: z.array(z.string()).nullish(),
  selling_price: z.number().nullish(),
  original_price: z.number().nullish(),
  site_url: z.string().nullish(),
  images: z.array(EditorProductImageSchema),
  features: z.array(z.string()).nullish(),
  rating: z.number().nullish(),
  review_count: z.number().nullish(),
  sku: z.string().nullish(),
  availability: z.boolean().nullish(),
  category: z.string().nullish(),
});

export const EditorBrandSchema = z.object({
  brand_name: z.string(),
  brand_logo: z.string().nullish(),
  brand_description: z.string().nullish(),
  primary_colors: z.array(z.string()).nullish(),
  secondary_colors: z.array(z.string()).nullish(),
  tone_of_voice: z.string().nullish(),
});

export const EditorTemplateSchema = z.object({
  id: z.string().nullish(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  is_published: z.boolean(),
  pages: z.array(z.object({
    id: z.string(),
    name: z.string(),
    thumbnail: z.string(),
    preview: z.string().optional(),
    duration: z.number(),
    transition: z.enum(['none', 'fade', 'wipe', 'slide', 'zoom-in', 'zoom-out', 'dip-to-black', 'dip-to-white', 'blur', 'glitch', 'morph', 'light-leak', 'zoom-blur', 'cube', 'flip', 'circle']).optional(),
    transitionDirection: z.enum(['left', 'right', 'up', 'down']).optional(),
    transitionDuration: z.number().optional(),
    transitionEasing: z.string().optional(),
    data: z.object({
      scene: z.string(),
      audios: z.array(z.object({
        id: z.string(),
        url: z.string(),
        src: z.string().optional(),
        crossOrigin: z.string().optional(),
        trimStart: z.number().optional(),
        trimEnd: z.number().optional(),
        visualType: z.string().optional(),
        visualProps: z.object({
          type: z.string(),
          props: z.object({
            color: z.string(),
            width: z.number(),
            height: z.number(),
            format: z.string().optional(),
            orientation: z.string().optional(),
          }),
        }).optional(),
        fadeIn: z.number().optional(),
        fadeOut: z.number().optional(),
      })),
      fill: z.string(),
      width: z.number(),
      height: z.number(),
      format: z.string().optional(),
      orientation: z.string().optional(),
    }),
    blocks: z.array(z.object({
      id: z.string(),
      start: z.number(),
      end: z.number(),
    })).optional(),
    _id: z.string().optional(),
  })),
  _id: z.string().optional(),
});

export type EditorProductImage = z.infer<typeof EditorProductImageSchema>;
export type EditorProduct = z.infer<typeof EditorProductSchema>;
export type EditorBrand = z.infer<typeof EditorBrandSchema>;
export type EditorTemplate = z.infer<typeof EditorTemplateSchema>;
