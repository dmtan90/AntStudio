import axios from "axios";
import { api } from "video-editor/config/api";
import { type EditorProduct, type EditorBrand } from "video-editor/schema/adapter";
import { useQuery } from "@tanstack/vue-query";

// Use relative path to proxy to our local backend
// const baseQuery = "/ai";

interface GenerateCTAParams {
  description: string;
  name: string;
  limit: number;
  currency: string;
  objective: string;
  selling_price: number;
}

interface GenerateContentParams {
  description: string;
  product_name: string;
}

interface GenerateContentResponse {
  data: string[];
}

interface AnalyzeProductResponse {
  product: EditorProduct;
  brand: EditorBrand;
}

async function generateHeadline(product: EditorProduct, _objective: string) {
  const body: GenerateContentParams = { description: product.description, product_name: product.name };
  const res = await api.post<GenerateContentResponse>(`/ai/headlines`, body);
  return res.data.data;
}

async function generateDescription(product: EditorProduct, _objective: string) {
  const body: GenerateContentParams = { description: product.description, product_name: product.name };
  const res = await api.post<GenerateContentResponse>(`/ai/subheadlines`, body);
  return res.data.data;
}

async function generateCTA(product: EditorProduct, objective: string) {
  // Simplified params for backend, it handles defaults/limits
  const body = { name: product.name, description: product.description, objective };
  const res = await api.post<GenerateContentResponse>(`/ai/ad-cta`, body);
  return res.data.data;
}

async function analyzeProduct(
  file: File | null,
  text: string | null,
  url: string | null
): Promise<{ product: EditorProduct; brand: EditorBrand }> {
  const formData = new FormData();
  if (file) formData.append("file", file);
  if (text) formData.append("text", text);
  if (url) formData.append("url", url);

  const res = await api.post<{ data: { product: EditorProduct; brand: EditorBrand } }>(
    `/ai/analyze-product`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return res.data.data;
}

function useGenerateHeadlineSuggestions(product: EditorProduct, objective: string) {
  return useQuery({
    queryKey: [generateHeadline.name, product?.id, objective],
    queryFn: () => generateHeadline(product, objective),
    enabled: !!product && !!objective,
  });
}

function useGenerateDescriptionSuggestions(product: EditorProduct, objective: string) {
  return useQuery({
    queryKey: [generateDescription.name, product?.id, objective],
    queryFn: () => generateDescription(product, objective),
    enabled: !!product && !!objective,
  });
}

function useGenerateCTASuggestions(product: EditorProduct, objective: string) {
  return useQuery({
    queryKey: [generateCTA.name, product?.id, objective],
    queryFn: () => generateCTA(product, objective),
    enabled: !!product && !!objective,
  });
}

export {
  generateCTA,
  generateDescription,
  generateHeadline,
  analyzeProduct,
  useGenerateCTASuggestions,
  useGenerateDescriptionSuggestions,
  useGenerateHeadlineSuggestions
};
