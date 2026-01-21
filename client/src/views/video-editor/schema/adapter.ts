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

export type EditorProductImage = z.infer<typeof EditorProductImageSchema>;
export type EditorProduct = z.infer<typeof EditorProductSchema>;
export type EditorBrand = z.infer<typeof EditorBrandSchema>;
