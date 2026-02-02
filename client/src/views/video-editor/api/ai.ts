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

interface GenerateImageParams {
  prompt: string;
  style?: string;
  aspectRatio?: string;
}

interface GenerateVoiceParams {
  text: string;
  voice: string;
}

interface GenerateVideoParams {
  prompt: string;
  duration?: number;
  aspectRatio?: string;
}

async function generateImage(params: GenerateImageParams) {
  const res = await api.post<{ success: boolean; data: { media: any; url: string } }>(`/ai/generate-image`, params);
  return res.data;
}

async function generateVoice(params: GenerateVoiceParams) {
  const res = await api.post<{ success: boolean; data: { media: any; url: string } }>(`/ai/generate-voice`, params);
  return res.data;
}

async function generateVideo(params: GenerateVideoParams) {
  const res = await api.post<{ success: boolean; data: { jobId: string } }>(`/ai/generate-video`, params);
  return res.data;
}

async function checkVideoStatus(jobId: string) {
  const res = await api.get<{ success: boolean; data: { status: string; progress?: number; videoUrl?: string; media?: any } }>(`/ai/video-status/${jobId}`);
  return res.data;
}

async function generateCaptions(options: any) {
  const res = await api.post<{ success: boolean; data: any }>(`/ai/generate-captions`, options);
  return res.data;
}

async function detectScenes(options: any) {
  const res = await api.post<{ success: boolean; data: { scenes: any[] } }>(`/ai/detect-scenes`, options);
  return res.data;
}

async function detectBeats(options: any) {
  const res = await api.post<{ success: boolean; data: { beats: number[] } }>(`/ai/detect-beats`, options);
  return res.data;
}

async function detectSilence(options: any) {
  const res = await api.post<{ success: boolean; data: { regions: { start: number, end: number }[] } }>(`/ai/detect-silence`, options);
  return res.data;
}

export {
  generateCTA,
  generateDescription,
  generateHeadline,
  analyzeProduct,
  useGenerateCTASuggestions,
  useGenerateDescriptionSuggestions,
  useGenerateHeadlineSuggestions,
  generateImage,
  generateVoice,
  generateVideo,
  checkVideoStatus,
  generateCaptions,
  detectScenes,
  detectBeats,
  detectSilence
};
