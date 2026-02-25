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
  const res = await api.post<{ success: boolean; data: string[] }>(`/ai/headlines`, body);
  return res.data?.data ?? res.data;
}

async function generateDescription(product: EditorProduct, _objective: string) {
  const body: GenerateContentParams = { description: product.description, product_name: product.name };
  const res = await api.post<GenerateContentResponse>(`/ai/subheadlines`, body);
  return res.data?.data ?? res.data;
}

async function generateCTA(product: EditorProduct, objective: string) {
  // Simplified params for backend, it handles defaults/limits
  const body = { name: product.name, description: product.description, objective };
  const res = await api.post<GenerateContentResponse>(`/ai/ad-cta`, body);
  return res.data?.data ?? res.data;
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
  return (res.data as any)?.data ?? res.data as any;
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
  multiSpeaker?: {
    enabled: boolean;
    speakers: { label: string, start: number, end: number }[];
  };
}

interface GenerateVideoParams {
  prompt: string;
  duration?: number;
  aspectRatio?: string;
}

async function generateImage(params: GenerateImageParams) {
  const res = await api.post<{ success: boolean; data: { media: any; url: string } }>(`/ai/generate-image`, params);
  return res.data?.data ?? res.data;
}

async function generateVoice(params: GenerateVoiceParams) {
  const res = await api.post<{ success: boolean; data: { media: any; url: string } }>(`/ai/generate-voice`, params);
  return res.data?.data ?? res.data;
}

async function generateVideo(params: GenerateVideoParams) {
  const res = await api.post<{ success: boolean; data: { jobId: string } }>(`/ai/generate-video`, params);
  return res.data?.data ?? res.data;
}

async function checkVideoStatus(jobId: string) {
  const res = await api.get<{ success: boolean; data: { status: string; progress?: number; videoUrl?: string; media?: any } }>(`/ai/video-status/${jobId}`);
  return res.data?.data ?? res.data;
}

async function generateCaptions(options: any) {
  const res = await api.post<{ success: boolean; data: any }>(`/ai/generate-captions`, options);
  return res.data?.data ?? res.data;
}

async function detectScenes(options: any) {
  const res = await api.post<{ success: boolean; data: { scenes: any[] } }>(`/ai/detect-scenes`, options);
  return res.data?.data ?? res.data;
}

async function detectBeats(options: any) {
  const res = await api.post<{ success: boolean; data: { beats: number[] } }>(`/ai/detect-beats`, options);
  return res.data?.data ?? res.data;
}

async function detectSilence(options: any) {
  const res = await api.post<{ success: boolean; data: { regions: { start: number, end: number }[] } }>(`/ai/detect-silence`, options);
  return res.data?.data ?? res.data;
}

async function translateMedia(options: { mediaId: string, targetLang: string, voiceCloning?: boolean }) {
  const res = await api.post<{ success: boolean; data: { media: any; url: string } }>(`/ai/translate-media`, options);
  return res.data?.data ?? res.data;
}

async function translateProject(options: { projectId: string, targetLang: string, voiceCloning?: boolean }) {
  const res = await api.post<{ success: boolean; data: { jobId: string } }>(`/ai/translate-project`, options);
  return res.data?.data ?? res.data;
}

async function checkTranslationStatus(jobId: string) {
  const res = await api.get<{ success: boolean; data: { status: string; progress?: number; result?: any } }>(`/ai/translation-status/${jobId}`);
  return res.data?.data ?? res.data;
}

async function extractHighlights(options: { mediaId?: string, projectId?: string, sensitivity?: number }) {
  const res = await api.post<{ success: boolean; data: { highlights: any[] } }>(`/ai/extract-highlights`, options);
  return res.data?.data ?? res.data;
}

async function generateSocialMeta(options: { text?: string, context?: any }) {
  const res = await api.post<{ success: boolean; data: { title: string, description: string, hashtags: string[] } }>(`/ai/generate-social-meta`, options);
  return res.data?.data ?? res.data;
}

async function analyzeAudioEmphasis(options: { mediaId: string }) {
  const res = await api.post<{ success: boolean; data: { emphasisPoints: { timestamp: number, type: string, intensity: number }[] } }>(`/ai/analyze-audio-emphasis`, options);
  return res.data?.data ?? res.data;
}

async function suggestMusicMatch(options: { projectId: string }) {
  const res = await api.post<{ success: boolean; data: { tracks: any[] } }>(`/ai/suggest-music`, options);
  return res.data?.data ?? res.data;
}

async function suggestBRoll(options: { sceneId?: string, transcript?: string, context?: any }) {
  const res = await api.post<{ success: boolean; data: { suggestions: any[] } }>(`/ai/suggest-broll`, options);
  return res.data?.data ?? res.data;
}

async function analyzeSceneTransitions(options: { projectId: string }) {
  const res = await api.post<{ success: boolean; data: { transitions: { fromId: string, toId: string, type: string }[] } }>(`/ai/analyze-transitions`, options);
  return res.data?.data ?? res.data;
}

async function scoreEngagement(options: { projectId: string }) {
  const res = await api.post<{ success: boolean; data: { score: number; hookScore: number; pacingScore: number; ctaScore: number; suggestions: { type: string; message: string; autoFix?: string }[] } }>(`/ai/score-engagement`, options);
  return res.data?.data ?? res.data;
}

async function optimizeForPlatform(options: { projectId: string; platform: 'youtube' | 'tiktok' | 'instagram' | 'linkedin' }) {
  const res = await api.post<{ success: boolean; data: { width: number; height: number; codec: string; bitrate: number; fps: number } }>(`/ai/optimize-platform`, options);
  return res.data?.data ?? res.data;
}

export interface BrandKit {
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
  fontFamily?: string;
  logoPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

async function extractBrandKit(options: { projectId: string; referenceImageUrl?: string }) {
  const res = await api.post<{ success: boolean; data: BrandKit }>(`/ai/extract-brand-kit`, options);
  return res.data?.data ?? res.data;
}

async function applyBrandKit(options: { projectId: string; brandKit: BrandKit }) {
  const res = await api.post<{ success: boolean; data: { applied: number } }>(`/ai/apply-brand-kit`, options);
  return res.data?.data ?? res.data;
}

async function cloneVisualStyle(options: { referenceUrl: string }) {
  const res = await api.post<{ success: boolean; data: { palette: string[]; filterPreset: string } }>(`/ai/clone-visual-style`, options);
  return res.data?.data ?? res.data;
}

async function generateStoryboard(options: { prompt: string, format?: string, duration?: number }) {
  const res = await api.post<{ success: boolean; data: any }>(`/ai/generate-storyboard`, options);
  return res.data?.data ?? res.data;
}

async function extractTextFromImage(options: any) {
  const res = await api.post<{ success: boolean; data: { text: string } }>(`/ai/extract-text`, options);
  return res.data?.data ?? res.data;
}

async function generateImageCaption(options: any) {
  const res = await api.post<{ success: boolean; data: { caption: string } }>(`/ai/generate-caption`, options);
  return res.data?.data ?? res.data;
}

async function detectObjects(options: any) {
  const res = await api.post<{ success: boolean; data: { objects: any[] } }>(`/ai/detect-objects`, options);
  return res.data?.data ?? res.data;
}

async function detectFaces(options: any) {
  const res = await api.post<{ success: boolean; data: { faces: any[] } }>(`/ai/detect-faces`, options);
  return res.data?.data ?? res.data;
}

async function detectLandmarks(options: any) {
  const res = await api.post<{ success: boolean; data: { landmarks: any } }>(`/ai/detect-landmarks`, options);
  return res.data?.data ?? res.data;
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
  detectSilence,
  extractTextFromImage,
  generateImageCaption,
  detectObjects,
  detectFaces,
  detectLandmarks,
  generateStoryboard,
  translateMedia,
  translateProject,
  checkTranslationStatus,
  extractHighlights,
  generateSocialMeta,
  analyzeAudioEmphasis,
  suggestMusicMatch,
  suggestBRoll,
  analyzeSceneTransitions,
  scoreEngagement,
  optimizeForPlatform,
  extractBrandKit,
  applyBrandKit,
  cloneVisualStyle
};
