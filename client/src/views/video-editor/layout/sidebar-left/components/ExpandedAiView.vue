<script setup lang="ts">
import { ref } from 'vue';
import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from 'video-editor/store/canvas';
import { toast } from 'vue-sonner';
import { Loading } from '@element-plus/icons-vue';
import { getFileUrl } from '@/utils/api';
import { generateImage, generateVoice, generateVideo, generateCaptions, detectScenes, detectBeats, detectSilence, extractTextFromImage, generateImageCaption, detectObjects, detectFaces, detectLandmarks } from 'video-editor/api/ai';
import { useUserMediaStore } from 'video-editor/hooks/use-user-media';
import { Magic, MovieBoard, CheckOne, MusicOne, Pic, Transform, DistributeVertically, Focus } from '@icon-park/vue-next';
import { rmbgAI } from 'video-editor/models/rmbgAI';
import { autoReframeService } from 'video-editor/services/AutoReframeService';
import { objectDetectionService, type DetectedObject } from 'video-editor/services/ObjectDetectionService';
import { faceDetectionService, type DetectedFace } from 'video-editor/services/FaceDetectionService';
import { textRecognitionService, type DetectedText } from 'video-editor/services/TextRecognitionService';
import { colorAnalysisService } from 'video-editor/services/ColorAnalysisService';
import { motionAnalysisService, type MotionData } from 'video-editor/services/MotionAnalysisService';
import { Scan, FaceRecognition, TextRecognition, Platte, Analysis } from '@icon-park/vue-next';
const props = defineProps<{ match: string }>();
const editor = useEditorStore();
const canvasStore = useCanvasStore();
import { useMediaStore } from '@/stores/media';

const isGenerating = ref(false);

// Voice State
const voiceText = ref('');
const selectedVoice = ref('en-US-Neural2-J');
const voices = [
  { value: 'en-US-Neural2-J', label: 'Male (Studio)' },
  { value: 'en-US-Neural2-F', label: 'Female (Studio)' },
  { value: 'en-US-News-K', label: 'Female (News)' },
  { value: 'en-US-News-N', label: 'Male (News)' },
];

// Image State
const imagePrompt = ref('');
const imageStyle = ref('Cinematic');
const imageAspectRatio = ref('16:9');

// Video State
const videoPrompt = ref('');
const videoDuration = ref(5);

// Caption State
const captionLanguage = ref('en');
const generatedCaption = ref(''); 

// Scene Detection State
const selectedVideoId = ref('');
const detectedScenes = ref<any[]>([]);
const isAnalyzing = ref(false);

// Auto-cut State
const selectedAudioId = ref('');
const detectedBeats = ref<number[]>([]);
const isAnalyzingBeats = ref(false);

// Smart Trim State
const selectedTrimVideoId = ref('');
const detectedRegions = ref<{ start: number, end: number }[]>([]);
const isTrimming = ref(false);
const noiseThreshold = ref(-30);
const minSilenceLen = ref(0.5);

// Enhancement State
const selectedImageId = ref('');
const isProcessingImage = ref(false);
const enhancementResult = ref<string | null>(null);
const upscaleFactor = ref(2);

// Auto-reframe State
const selectedReframeVideoId = ref('');
const reframeAspectRatio = ref(9 / 16);
const isAnalyzingReframe = ref(false);
const reframeProgress = ref(0);

// Background Removal State
const backgroundRemovalType = ref<'image' | 'video'>('image');
const selectedBgVideoId = ref('');
const bgRemovalProgress = ref(0);
const isCustomProcessing = ref(false);

// Object Detection State
const selectedObjectVideoId = ref('');
const detectedObjects = ref<any[]>([]); // Changed to any[] to match new API
const isDetectingObjects = ref(false);
const objectAnalysisProgress = ref(0);

// Face Detection State
const selectedFaceVideoId = ref('');
const detectedFaces = ref<any[]>([]); // Changed to any[] to match new API
const isDetectingFaces = ref(false);
const faceAnalysisProgress = ref(0);

// Text Recognition State
const selectedTextVideoId = ref('');
const detectedTexts = ref<DetectedText[]>([]);
const isDetectingText = ref(false);
const textAnalysisProgress = ref(0);
const extractedText = ref(''); // Added missing ref

const detectedLandmarks = ref<any>(null); // Added missing ref

// Color Analysis State
const selectedColorVideoId = ref('');
const detectedColors = ref<{ timestamp: number, palette: string[] }[]>([]);
const isAnalyzingColors = ref(false);
const colorAnalysisProgress = ref(0);

// Motion Analysis State
const selectedMotionVideoId = ref('');
const detectedMotion = ref<MotionData[]>([]);
const isAnalyzingMotion = ref(false);
const motionAnalysisProgress = ref(0);

const handleGenerate = async (type: string) => {
  isGenerating.value = true;
  enhancementResult.value = null;
  try {
    const userMediaStore = useUserMediaStore();

    switch (type) {
      case 'voice': {
        const res = await generateVoice({ text: voiceText.value, voice: selectedVoice.value });
        if (res && (res as any).media) {
          const media = (res as any).media;
          toast.success("Voice generated successfully!");
          userMediaStore.addLocalItem('audio', media);

          // Automatically add to active canvas for better UX
          const audioUrl = getFileUrl(media.key);
          const name = `AI Voice: ${voiceText.value.substring(0, 15)}...`;
          canvasStore.canvas?.audio.add(media.key, name, false, media.id);
        }
        break;
      }
      case 'image': {
        const res = await generateImage({
          prompt: imagePrompt.value,
          style: imageStyle.value,
          aspectRatio: imageAspectRatio.value
        });
        if (res && (res as any).media) {
          const media = (res as any).media;
          toast.success("Image generated successfully!");
          userMediaStore.addLocalItem('image', media);
        }
        break;
      }
      case 'video': {
        // Advanced: Handle polling or background notification
        const res = await generateVideo({
          prompt: videoPrompt.value,
          duration: videoDuration.value
        });
        if (res && (res as any).jobId) {
          toast.success("Video generation started! It will appear in your videos shortly.");
          // Trigger a background poll or just refresh after a delay
          setTimeout(() => { userMediaStore.refreshVideos() }, 5000);
          setTimeout(() => { userMediaStore.refreshVideos() }, 15000);
        }
        break;
      }
      case 'caption': {
        const res = await generateCaptions({ language: captionLanguage.value });
        if (res && res.segments) {
          toast.success("Captions generated!");

          // Scene-aware placement logic
          let cumulativeTime = 0;
          const pages = editor.pages;

          // Re-implementing more robustly:
          res.segments.forEach((seg: any) => {
            let runningEnd = 0;
            let found = false;
            for (let i = 0; i < pages.length; i++) {
              const start = runningEnd;
              const end = start + pages[i].timeline.duration;
              if (seg.start >= start && seg.start < end) {
                pages[i].onAddSubtitle(seg.text, {
                  start: seg.start - start,
                  duration: seg.duration
                });
                found = true;
                break;
              }
              runningEnd = end;
            }
            // If not found (e.g. past the end), add to last page at the end
            if (!found && pages.length > 0) {
              pages[pages.length - 1].onAddSubtitle(seg.text, {
                start: pages[pages.length - 1].timeline.duration - 100, // Near end
                duration: seg.duration
              });
            }
          });
        }
        break;
      }
      case 'scene-detection': {
        if (!selectedVideoId.value) {
          toast.error("Please select a video for analysis");
          return;
        }

        isAnalyzing.value = true;
        const res = await detectScenes({ mediaId: selectedVideoId.value });
        if (res && (res as any).scenes) {
          detectedScenes.value = (res as any).scenes;
          toast.success(`Detected ${(res as any).scenes.length} shots!`);
        }
        break;
      }
      case 'auto-cut': {
        if (!selectedAudioId.value) {
          toast.error("Please select an audio track for analysis");
          return;
        }

        isAnalyzingBeats.value = true;
        const res = await detectBeats({ mediaId: selectedAudioId.value });
        if (res && (res as any).beats) {
          detectedBeats.value = (res as any).beats;
          toast.success(`Detected ${(res as any).beats.length} rhythmic peaks!`);
        }
        break;
      }
      case 'smart-trim': {
        if (!selectedTrimVideoId.value) {
          toast.error("Please select a video for trimming");
          return;
        }

        isTrimming.value = true;
        const res = await detectSilence({
          mediaId: selectedTrimVideoId.value,
          noiseThreshold: noiseThreshold.value,
          minSilenceLen: minSilenceLen.value
        });
        if (res && (res as any).regions) {
          detectedRegions.value = (res as any).regions;
          toast.success(`Identified ${(res as any).regions.length} non-silent segments!`);
        }
        break;
      }
      case 'background-removal': {
        if (!selectedImageId.value) {
          toast.error("Please select an image");
          return;
        }
        isProcessingImage.value = true;
        const userMediaStore = useUserMediaStore();
        const image = userMediaStore.images.items.find(i => i._id === selectedImageId.value);
        if (!image) return;

        const url = await getFileUrl(image.key);
        if (!rmbgAI.getModelInfo().isLoaded) {
          toast.info("Loading AI model...");
          await rmbgAI.initializeModel();
        }

        const blob = await rmbgAI.removeBackground(url, image._id);
        if (blob) {
          enhancementResult.value = URL.createObjectURL(blob);
          toast.success("Background removed!");
        }
        break;
      }
      case 'video-background-removal': {
        if (!selectedBgVideoId.value) {
          toast.error("Please select a video");
          return;
        }
        isCustomProcessing.value = true;
        bgRemovalProgress.value = 0;
        enhancementResult.value = null;

        const userMediaStore = useUserMediaStore();
        const video = userMediaStore.videos.items.find(v => v._id === selectedBgVideoId.value);
        if (!video) return;

        const url = await getFileUrl(video.key);

        try {
          const blob = await rmbgAI.removeVideoBackground(url, video._id, (p) => {
            bgRemovalProgress.value = p;
          });

          if (blob) {
            // Upload the transparent WebM to S3
            const formData = new FormData();
            const fileName = `transparent_${video.fileName.replace(/\.[^/.]+$/, "")}.webm`;
            formData.append('file', blob, fileName);
            formData.append('purpose', 'ai-video');

            toast.info("Uploading processed video...");
            const mediaStore = useMediaStore();
            const uploadRes = await mediaStore.uploadMedia(formData);

            if (uploadRes.success) {
              const newMedia = uploadRes.data.media;
              userMediaStore.addLocalItem('video', newMedia);
              enhancementResult.value = getFileUrl(newMedia.key);
              toast.success("Video background removed and saved to library!");
            }
          }
        } catch (e) {
          console.error(e);
          toast.error("Process failed");
        } finally {
          isCustomProcessing.value = false;
        }
        break;
      }
      case 'upscale': {
        if (!selectedImageId.value) return;
        isProcessingImage.value = true;
        const userMediaStore = useUserMediaStore();
        const image = userMediaStore.images.items.find(i => i._id === selectedImageId.value);
        if (!image) return;

        const url = await getFileUrl(image.key);
        const blob = await rmbgAI.upscale(url, upscaleFactor.value);
        if (blob) {
          enhancementResult.value = URL.createObjectURL(blob);
          toast.success("Image upscaled!");
        }
        break;
      }
      case 'denoise': {
        if (!selectedImageId.value) return;
        isProcessingImage.value = true;
        const userMediaStore = useUserMediaStore();
        const image = userMediaStore.images.items.find(i => i._id === selectedImageId.value);
        if (!image) return;

        const url = await getFileUrl(image.key);
        const blob = await rmbgAI.denoise(url);
        if (blob) {
          enhancementResult.value = URL.createObjectURL(blob);
          toast.success("Noise removed!");
        }
        break;
      }
      case 'vectorize': {
        if (!selectedImageId.value) return;
        isProcessingImage.value = true;
        const userMediaStore = useUserMediaStore();
        const image = userMediaStore.images.items.find(i => i._id === selectedImageId.value);
        if (!image) return;

        const url = await getFileUrl(image.key);
        const svg = await rmbgAI.vectorize(url);
        if (svg) {
          enhancementResult.value = `data:image/svg+xml;base64,${btoa(svg)}`;
          toast.success("Image vectorized!");
        }
        break;
      }
      case 'text-extraction': {
        if (!selectedImageId.value) { return; }
        const image = userMediaStore.images.items.find(i => i._id === selectedImageId.value);
        if (!image) return;

        isProcessingImage.value = true;
        
        try {
           const res = await extractTextFromImage({ mediaId: image._id });
           if ((res as any).text) {
              extractedText.value = (res as any).text;
              toast.success("Text extracted!");
           }
        } catch(e) { console.error(e); }
        finally { isProcessingImage.value = false; }
        break;
      }
      case 'caption-generation': {
        if (!selectedImageId.value) { return; }
        const image = userMediaStore.images.items.find(i => i._id === selectedImageId.value);
        if (!image) return;

        isProcessingImage.value = true;
        try {
            const res = await generateImageCaption({ mediaId: image._id });
            if ((res as any).caption) {
                generatedCaption.value = (res as any).caption;
                toast.success("Caption generated!");
            }
        } catch(e) { console.error(e); }
        finally { isProcessingImage.value = false; }
        break;
      }
      case 'landmarks-detection': {
        if (!selectedImageId.value) return;
        const image = userMediaStore.images.items.find(i => i._id === selectedImageId.value);
        if (!image) return;

        isProcessingImage.value = true;
        try {
            const res = await detectLandmarks({ mediaId: image._id });
            if ((res as any).landmarks) {
                detectedLandmarks.value = (res as any).landmarks;
                toast.success("Landmarks detected!");
            }
        } catch(e) { console.error(e); }
        finally { isProcessingImage.value = false; }
        break;
      }
      case 'auto-reframe': {
        if (!selectedReframeVideoId.value) {
          toast.error("Please select a video");
          return;
        }
        isAnalyzingReframe.value = true;
        reframeProgress.value = 0;

        const userMediaStore = useUserMediaStore();
        const video = userMediaStore.videos.items.find(v => v._id === selectedReframeVideoId.value);
        if (!video) return;

        const url = await getFileUrl(video.key);
        try {
          const keyframes = await autoReframeService.analyzeVideo(url, reframeAspectRatio.value, (p) => {
            reframeProgress.value = p;
          });

          // Apply keyframes to the timeline element
          // This is a placeholder for actual timeline integration
          console.log("Auto-reframe keyframes generated:", keyframes);
          toast.success("Auto-reframe complete! View the console for keyframes.");

          // Logic to apply keyframes would go here
        } catch (err: any) {
          toast.error("Auto-reframe failed: " + err.message);
        } finally {
          isAnalyzingReframe.value = false;
        }
        break;
      }
      case 'object-detection': {
        if (!selectedObjectVideoId.value && !selectedImageId.value) {
          toast.error("Please select a video or image");
          return;
        }

        if(selectedObjectVideoId.value){
          isDetectingObjects.value = true;
          objectAnalysisProgress.value = 0;

          const userMediaStore = useUserMediaStore();
          const video = userMediaStore.videos.items.find(v => v._id === selectedObjectVideoId.value);
          if (!video) return;
          const url = await getFileUrl(video.key);

          try {
            const results = await objectDetectionService.analyzeVideo(url, (p) => {
              objectAnalysisProgress.value = p;
            });
            detectedObjects.value = results;
            toast.success(`Detected ${results.length} objects!`);
          } catch (err: any) {
            toast.error("Object detection failed: " + err.message);
          } finally {
            isDetectingObjects.value = false;
          }
        }
        else if(selectedImageId.value){
          const image = userMediaStore.images.items.find(i => i._id === selectedImageId.value);
          if (!image) return;

          isProcessingImage.value = true;
          try {
              const res = await detectObjects({ mediaId: image._id });
              if ((res as any).objects) {
                  detectedObjects.value = (res as any).objects;
                  toast.success(`Found ${(res as any).objects.length} objects!`);
              }
          } catch(e) { console.error(e); }
          finally { isProcessingImage.value = false; }
        }
        
        break;
      }
      case 'face-detection': {
        if (!selectedFaceVideoId.value && !selectedImageId.value) {
          toast.error("Please select a video or image");
          return;
        }

        if(selectedFaceVideoId.value){
          isDetectingFaces.value = true;
          faceAnalysisProgress.value = 0;

          const userMediaStore = useUserMediaStore();
          const video = userMediaStore.videos.items.find(v => v._id === selectedFaceVideoId.value);
          if (!video) return;
          const url = await getFileUrl(video.key);

          try {
            const results = await faceDetectionService.analyzeVideo(url, (p) => {
              faceAnalysisProgress.value = p;
            });
            detectedFaces.value = results;
            toast.success(`Detected ${results.length} faces!`);
          } catch (err: any) {
            toast.error("Face detection failed: " + err.message);
          } finally {
            isDetectingFaces.value = false;
          }
        }
        else if(selectedImageId.value){
          const image = userMediaStore.images.items.find(i => i._id === selectedImageId.value);
          if (!image) return;

          isProcessingImage.value = true;
          try {
              const res = await detectFaces({ mediaId: image._id });
              if ((res as any).faces) {
                  detectedFaces.value = (res as any).faces;
                  toast.success(`Found ${(res as any).faces.length} faces!`);
              }
          } catch(e) { console.error(e); }
          finally { isProcessingImage.value = false; }
        }
        
        break;
      }
      case 'text-recognition': {
        if (!selectedTextVideoId.value) {
          toast.error("Please select a video");
          return;
        }
        isDetectingText.value = true;
        textAnalysisProgress.value = 0;

        const userMediaStore = useUserMediaStore();
        const video = userMediaStore.videos.items.find(v => v._id === selectedTextVideoId.value);
        if (!video) return;
        const url = await getFileUrl(video.key);

        try {
          const results = await textRecognitionService.analyzeVideo(url, (p) => {
            textAnalysisProgress.value = p;
          });
          detectedTexts.value = results;
          toast.success(`Detected text regions in ${results.length} frames!`);
        } catch (err: any) {
          toast.error("Text recognition failed: " + err.message);
        } finally {
          isDetectingText.value = false;
        }
        break;
      }
      case 'color-analysis': {
        if (!selectedColorVideoId.value) {
          toast.error("Please select a video");
          return;
        }
        isAnalyzingColors.value = true;
        colorAnalysisProgress.value = 0;

        const userMediaStore = useUserMediaStore();
        const video = userMediaStore.videos.items.find(v => v._id === selectedColorVideoId.value);
        if (!video) return;
        const url = await getFileUrl(video.key);

        try {
          const results = await colorAnalysisService.analyzeVideo(url, (p) => {
            colorAnalysisProgress.value = p;
          });
          detectedColors.value = results;
          toast.success("Color analysis complete!");
        } catch (err: any) {
          toast.error("Color analysis failed: " + err.message);
        } finally {
          isAnalyzingColors.value = false;
        }
        break;
      }
      case 'motion-analysis': {
        if (!selectedMotionVideoId.value) {
          toast.error("Please select a video");
          return;
        }
        isAnalyzingMotion.value = true;
        motionAnalysisProgress.value = 0;

        const userMediaStore = useUserMediaStore();
        const video = userMediaStore.videos.items.find(v => v._id === selectedMotionVideoId.value);
        if (!video) return;
        const url = await getFileUrl(video.key);

        try {
          const results = await motionAnalysisService.analyzeVideo(url, (p) => {
            motionAnalysisProgress.value = p;
          });
          detectedMotion.value = results;
          toast.success("Motion analysis complete!");
        } catch (err: any) {
          toast.error("Motion analysis failed: " + err.message);
        } finally {
          isAnalyzingMotion.value = false;
        }
        break;
      }
    }

  } catch (e: any) {
    console.error(e);
    toast.error(`Generation failed: ${e.message || 'Unknown error'}`);
  } finally {
    isGenerating.value = false;
    isAnalyzing.value = false;
  }
}

const applyScenesToTimeline = () => {
  if (detectedScenes.value.length === 0) return;

  const userMediaStore = useUserMediaStore();
  const video = userMediaStore.videos.items.find(v => v._id === selectedVideoId.value);
  if (!video) return;

  detectedScenes.value.forEach((scene, index) => {
    // 1. Create a new page for each scene segment
    editor.addPage();
    const lastPage = editor.pages[editor.pages.length - 1];

    // 2. Calculate duration in ms
    const durationMs = (scene.end - scene.start) * 1000;

    // 3. Set page duration
    lastPage.timeline.duration = durationMs;

    // 4. Add the video clip to the page with correct trim
    // Using onAddVideoFromSource as verified in canvas.ts
    // We pass trimStart. trimEnd is optional as page duration limits playback
    if (typeof lastPage.onAddVideoFromSource === 'function') {
      lastPage.onAddVideoFromSource(video.key, {
        trimStart: scene.start * 1000,
        meta: {
          name: scene.label || `Shot ${index + 1}`,
          description: scene.description
        }
      });
    }
  });

  toast.success(`Successfully added ${detectedScenes.value.length} scenes to timeline.`);
  editor.setActiveSidebarLeft('scene'); // Switch to scene view to see results
}

const applyBeatsToTimeline = () => {
  if (detectedBeats.value.length === 0) return;

  const pages = editor.pages;
  if (pages.length === 0) {
    toast.error("Add some scenes to your timeline first!");
    return;
  }

  // Synchronize scene durations to beat intervals
  // beat[0] is start of scene 1, beat[1] is end of scene 1 / start of scene 2, etc.
  detectedBeats.value.forEach((beat, index) => {
    if (index < pages.length) {
      const nextBeat = detectedBeats.value[index + 1] || beat + 2; // Default 2s if no next beat
      const duration = (nextBeat - beat) * 1000;
      pages[index].timeline.duration = Math.max(500, duration); // Minimum 0.5s per scene
    }
  });

  toast.success("Timeline synchronized to beat!");
  editor.setActiveSidebarLeft('scene');
}

const applyTrimToTimeline = () => {
  if (detectedRegions.value.length === 0) return;

  const userMediaStore = useUserMediaStore();
  const video = userMediaStore.videos.items.find(v => v._id === selectedTrimVideoId.value);
  if (!video) return;

  detectedRegions.value.forEach((region, index) => {
    editor.addPage();
    const lastPage = editor.pages[editor.pages.length - 1];
    const durationMs = (region.end - region.start) * 1000;
    lastPage.timeline.duration = durationMs;

    if (typeof lastPage.onAddVideoFromSource === 'function') {
      lastPage.onAddVideoFromSource(video.key, {
        trimStart: region.start * 1000,
        meta: {
          name: `Segment ${index + 1} (Non-silent)`
        }
      });
    }
  });

  toast.success(`Successfully added ${detectedRegions.value.length} non-silent segments to timeline.`);
  editor.setActiveSidebarLeft('scene');
}

const addResultToCanvas = () => {
  if (!enhancementResult.value) return;
  canvasStore.canvas?.onAddImageFromSource(enhancementResult.value, { top: 100, left: 100 });
  toast.success("Added to canvas!");
}

const visualizeObjects = () => {
  if (detectedObjects.value.length === 0) return;
  canvasStore.canvas?.aiOverlays.drawObjectBoundingBoxes(detectedObjects.value);
  toast.success("Bounding boxes drawn on canvas!");
}

const applyFaceBlur = async () => {
  if (detectedFaces.value.length === 0) return;
  await canvasStore.canvas?.aiOverlays.applyFaceBlur(detectedFaces.value);
  toast.success("Blur effect visualization applied!");
}

const visualizeText = () => {
  if (detectedTexts.value.length === 0) return;
  canvasStore.canvas?.aiOverlays.drawTextDetections(detectedTexts.value);
  toast.success("Text bounding boxes drawn!");
}
</script>

<template>
  <div class="h-full flex flex-col p-5 gap-6">

    <!-- VOICE GENERATION -->
    <template v-if="match === 'voice'">
      <div class="flex flex-col gap-4">
        <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest">Script</label>
        <el-input v-model="voiceText" type="textarea" :rows="6" placeholder="Enter text to speak..."
          class="cinematic-input" resize="none" />

        <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest">Voice Model</label>
        <el-select v-model="selectedVoice" class="cinematic-select" placeholder="Select Voice">
          <el-option v-for="v in voices" :key="v.value" :label="v.label" :value="v.value" />
        </el-select>

        <el-button class="cinematic-button is-primary !h-11 !rounded-xl !border-none mt-4" :loading="isGenerating"
          @click="handleGenerate('voice')">
          <span class="text-xs font-bold uppercase tracking-widest">Generate Voice</span>
        </el-button>
      </div>
    </template>

    <!-- IMAGE GENERATION -->
    <template v-else-if="match === 'image'">
      <div class="flex flex-col gap-4">
        <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest">Prompt</label>
        <el-input v-model="imagePrompt" type="textarea" :rows="4" placeholder="Describe the image..."
          class="cinematic-input" resize="none" />

        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-2">
            <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest">Style</label>
            <el-select v-model="imageStyle" class="cinematic-select">
              <el-option label="Cinematic" value="Cinematic" />
              <el-option label="Anime" value="Anime" />
              <el-option label="Photorealistic" value="Photorealistic" />
              <el-option label="3D Render" value="3D Render" />
            </el-select>
          </div>
          <div class="flex flex-col gap-2">
            <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest">Ratio</label>
            <el-select v-model="imageAspectRatio" class="cinematic-select">
              <el-option label="16:9" value="16:9" />
              <el-option label="9:16" value="9:16" />
              <el-option label="1:1" value="1:1" />
            </el-select>
          </div>
        </div>

        <el-button class="cinematic-button is-primary !h-11 !rounded-xl !border-none mt-4" :loading="isGenerating"
          @click="handleGenerate('image')">
          <span class="text-xs font-bold uppercase tracking-widest">Generate Image</span>
        </el-button>
      </div>
    </template>

    <!-- VIDEO GENERATION -->
    <template v-else-if="match === 'video'">
      <div class="flex flex-col gap-4">
        <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest">Prompt</label>
        <el-input v-model="videoPrompt" type="textarea" :rows="4" placeholder="Describe the video movement and scene..."
          class="cinematic-input" resize="none" />

        <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest">Duration (sec)</label>
        <el-slider v-model="videoDuration" :min="3" :max="6" :step="1" show-stops />
        <div class="flex justify-between text-xs text-white/40 font-mono">
          <span>3s</span><span>6s</span>
        </div>

        <el-button class="cinematic-button is-primary !h-11 !rounded-xl !border-none mt-4" :loading="isGenerating"
          @click="handleGenerate('video')">
          <span class="text-xs font-bold uppercase tracking-widest">Generate Video</span>
        </el-button>
      </div>
    </template>

    <!-- CAPTION GENERATION -->
    <template v-else-if="match === 'caption'">
      <div class="flex flex-col gap-4">
        <div
          class="p-4 rounded-lg bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-[11px] leading-relaxed shadow-lg">
          <div class="flex items-center gap-2 mb-2">
            <MagicWand size="14" />
            <span class="font-bold uppercase tracking-widest">Experimental</span>
          </div>
          <p>Analyzing audio tracks and generating scene-by-scene captions. Please ensure your timeline has audio
            content.</p>
        </div>

        <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest">Source Language</label>
        <el-select v-model="captionLanguage" class="cinematic-select">
          <el-option label="English (US)" value="en" />
          <el-option label="Vietnamese" value="vi" />
          <el-option label="Japanese" value="ja" />
        </el-select>

        <el-button class="cinematic-button is-primary !h-11 !rounded-xl !border-none mt-4" :loading="isGenerating"
          @click="handleGenerate('caption')">
          <span class="text-xs font-bold uppercase tracking-widest">Analyze & Generate Captions</span>
        </el-button>
      </div>
    </template>

    <!-- SCENE DETECTION -->
    <template v-else-if="match === 'scene-detection'">
      <div class="flex flex-col gap-4">
        <div
          class="p-4 rounded-lg bg-indigo-400/10 border border-indigo-400/20 text-indigo-400 text-[11px] leading-relaxed shadow-lg">
          <div class="flex items-center gap-2 mb-2">
            <Magic :size="14" />
            <span class="font-bold uppercase tracking-widest">Auto-Split</span>
          </div>
          <p>AI will analyze your video to find logical shot changes and automatically split them into editable
            segments.</p>
        </div>

        <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest">Select Source Video</label>
        <el-select v-model="selectedVideoId" class="cinematic-select" placeholder="Choose a video from library">
          <el-option v-for="v in useUserMediaStore().videos.items" :key="v._id" :label="v.fileName" :value="v._id" />
        </el-select>

        <el-button v-if="detectedScenes.length === 0"
          class="cinematic-button is-primary !h-11 !rounded-xl !border-none mt-4" :loading="isAnalyzing"
          @click="handleGenerate('scene-detection')">
          <span class="text-xs font-bold uppercase tracking-widest">Identify Shots</span>
        </el-button>

        <template v-else>
          <div class="mt-4 flex flex-col gap-2">
            <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest">Detected Shots ({{
              detectedScenes.length }})</label>
            <div class="max-h-[200px] overflow-y-auto custom-scrollbar flex flex-col gap-2 p-1">
              <div v-for="(scene, idx) in detectedScenes" :key="idx"
                class="p-3 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between">
                <div class="flex flex-col gap-1">
                  <span class="text-[11px] font-bold text-white/80">{{ scene.label || `Shot ${idx + 1}` }}</span>
                  <span class="text-[9px] font-mono text-white/40">{{ scene.start.toFixed(2) }}s - {{
                    scene.end.toFixed(2) }}s</span>
                </div>
                <CheckOne theme="filled" size="16" class="text-emerald-400" />
              </div>
            </div>

            <el-button class="cinematic-button is-primary !h-11 !rounded-xl !border-none mt-6"
              @click="applyScenesToTimeline">
              <span class="text-xs font-bold uppercase tracking-widest">Apply to Timeline</span>
            </el-button>

            <button
              class="text-[10px] font-bold uppercase tracking-widest text-white/20 hover:text-white/60 transition-colors mt-2"
              @click="detectedScenes = []">
              Reset Analysis
            </button>
          </div>
        </template>
      </div>
    </template>

    <!-- AUTO-CUT TO BEAT -->
    <template v-else-if="match === 'auto-cut'">
      <div class="flex flex-col gap-4">
        <div
          class="p-4 rounded-lg bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 text-[11px] leading-relaxed shadow-lg">
          <div class="flex items-center gap-2 mb-2">
            <MusicOne :size="14" />
            <span class="font-bold uppercase tracking-widest">Rhythmic Sync</span>
          </div>
          <p>AI will analyze your background music to find the perfect beat for every cut. Add scenes to your timeline
            first, then sync them here.</p>
        </div>

        <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest">Select Background Music</label>
        <el-select v-model="selectedAudioId" class="cinematic-select" placeholder="Choose audio from library">
          <el-option v-for="a in useUserMediaStore().audios.items" :key="a._id" :label="a.fileName" :value="a._id" />
        </el-select>

        <el-button v-if="detectedBeats.length === 0"
          class="cinematic-button is-primary !h-11 !rounded-xl !border-none mt-4" :loading="isAnalyzingBeats"
          @click="handleGenerate('auto-cut')">
          <span class="text-xs font-bold uppercase tracking-widest">Analyze Rhythm</span>
        </el-button>

        <template v-else>
          <div class="mt-4 flex flex-col gap-2">
            <div
              class="p-4 rounded-lg bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-2 mb-4">
              <span class="text-2xl font-bold text-white">{{ detectedBeats.length }}</span>
              <span class="text-[10px] font-bold uppercase tracking-widest text-white/40">Beats Identified</span>
            </div>

            <el-button class="cinematic-button is-primary !h-11 !rounded-xl !border-none" @click="applyBeatsToTimeline">
              <span class="text-xs font-bold uppercase tracking-widest">Sync Timeline to Beat</span>
            </el-button>

            <button
              class="text-[10px] font-bold uppercase tracking-widest text-white/20 hover:text-white/60 transition-colors mt-2"
              @click="detectedBeats = []">
              Reset Analysis
            </button>
          </div>
        </template>
      </div>
    </template>

    <!-- SMART TRIM -->
    <template v-else-if="match === 'smart-trim'">
      <div class="flex flex-col gap-4">
        <div
          class="p-4 rounded-lg bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 text-[11px] leading-relaxed shadow-lg">
          <div class="flex items-center gap-2 mb-2">
            <Magic :size="14" />
            <span class="font-bold uppercase tracking-widest">Smart Trim</span>
          </div>
          <p>Remove silent gaps from your video automatically. AI will identify parts where someone is speaking or there
            is active audio.</p>
        </div>

        <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest">Select Source Video</label>
        <el-select v-model="selectedTrimVideoId" class="cinematic-select" placeholder="Choose a video from library">
          <el-option v-for="v in useUserMediaStore().videos.items" :key="v._id" :label="v.fileName" :value="v._id" />
        </el-select>

        <div class="grid grid-cols-2 gap-4 mt-2">
          <div class="flex flex-col gap-2">
            <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest">Sensitivity (dB)</label>
            <el-input-number v-model="noiseThreshold" :min="-60" :max="-10" :step="5" class="cinematic-number-input" />
            <span class="text-[9px] text-white/20 uppercase tracking-widest">-30dB is standard</span>
          </div>
          <div class="flex flex-col gap-2">
            <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest">Min silence (s)</label>
            <el-input-number v-model="minSilenceLen" :min="0.1" :max="2.0" :step="0.1" class="cinematic-number-input" />
          </div>
        </div>

        <el-button v-if="detectedRegions.length === 0"
          class="cinematic-button is-primary !h-11 !rounded-xl !border-none mt-4" :loading="isTrimming"
          @click="handleGenerate('smart-trim')">
          <span class="text-xs font-bold uppercase tracking-widest">Identify Non-Silent Parts</span>
        </el-button>

        <template v-else>
          <div class="mt-4 flex flex-col gap-2">
            <div
              class="p-4 rounded-lg bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-2 mb-4">
              <span class="text-2xl font-bold text-white">{{ detectedRegions.length }}</span>
              <span class="text-[10px] font-bold uppercase tracking-widest text-white/40">Active Segments Found</span>
            </div>

            <el-button class="cinematic-button is-primary !h-11 !rounded-xl !border-none" @click="applyTrimToTimeline">
              <span class="text-xs font-bold uppercase tracking-widest">Apply to Timeline</span>
            </el-button>

            <button
              class="text-[10px] font-bold uppercase tracking-widest text-white/20 hover:text-white/60 transition-colors mt-2"
              @click="detectedRegions = []">
              Reset Analysis
            </button>
          </div>
        </template>
      </div>
    </template>

    <!-- BACKGROUND REMOVAL -->
    <template v-else-if="match === 'background-removal'">
      <div class="flex flex-col gap-4">
        <div
          class="p-4 rounded-lg bg-indigo-400/10 border border-indigo-400/20 text-indigo-400 text-[11px] leading-relaxed shadow-lg">
          <div class="flex items-center gap-2 mb-2">
            <Pic :size="14" />
            <span class="font-bold uppercase tracking-widest">Background Removal</span>
          </div>
          <p>Remove the background from any image or video instantly in your browser.</p>
        </div>

        <!-- Type Switcher -->
        <div class="flex p-1 bg-white/5 rounded-xl border border-white/5">
          <button @click="backgroundRemovalType = 'image'; enhancementResult = null"
            :class="[backgroundRemovalType === 'image' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'text-white/40 border-transparent']"
            class="flex-1 py-2 px-4 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border">
            Image
          </button>
          <button @click="backgroundRemovalType = 'video'; enhancementResult = null"
            :class="[backgroundRemovalType === 'video' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'text-white/40 border-transparent']"
            class="flex-1 py-2 px-4 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border">
            Video
          </button>
        </div>
      </div>
    </template>

    <!-- OBJECT DETECTION -->
    <template v-else-if="match === 'object-detection'">
      <div class="flex flex-col gap-4">
        <div
          class="p-4 rounded-lg bg-orange-400/10 border border-orange-400/20 text-orange-400 text-[11px] leading-relaxed shadow-lg">
          <div class="flex items-center gap-2 mb-2">
            <Scan :size="14" />
            <span class="font-bold uppercase tracking-widest">Object Tracking</span>
          </div>
          <p>Identify and track objects in your video. Useful for auto-cropping or metadata tagging.</p>
        </div>

        <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest">Select Video</label>
        <el-select v-model="selectedObjectVideoId" class="cinematic-select" placeholder="Choose video">
          <el-option v-for="v in useUserMediaStore().videos.items" :key="v._id" :label="v.fileName"
            :value="v._id" />
        </el-select>

        <template v-if="isDetectingObjects">
          <div class="flex flex-col gap-2 mt-4">
            <div class="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
              <span class="text-white/40">Analyzing Frames...</span>
              <span class="text-orange-400">{{ Math.round(objectAnalysisProgress) }}%</span>
            </div>
            <div class="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div class="h-full bg-orange-500 transition-all duration-300"
                :style="{ width: objectAnalysisProgress + '%' }"></div>
            </div>
          </div>
        </template>

        <el-button v-else-if="detectedObjects.length === 0"
          class="cinematic-button is-primary !h-11 !rounded-xl !border-none mt-4"
          @click="handleGenerate('object-detection')">
          <span class="text-xs font-bold uppercase tracking-widest">Analyze Objects</span>
        </el-button>

        <template v-else>
          <div class="mt-4 flex flex-col gap-2">
            <div
              class="p-4 rounded-lg bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-2 mb-4">
              <span class="text-2xl font-bold text-white">{{ detectedObjects.length }}</span>
              <span class="text-[10px] font-bold uppercase tracking-widest text-white/40">Objects Found</span>
            </div>

            <div class="max-h-[200px] overflow-y-auto custom-scrollbar flex flex-col gap-2 p-1">
              <div v-for="(obj, idx) in detectedObjects.slice(0, 10)" :key="idx"
                class="p-2 rounded bg-white/5 flex justify-between items-center text-[10px]">
                <span class="text-white/80 font-bold">{{ obj.label }}</span>
                <span class="text-white/40">{{ obj.timestamp.toFixed(1) }}s</span>
              </div>
              <div v-if="detectedObjects.length > 10" class="text-center text-[9px] text-white/20 italic">
                +{{ detectedObjects.length - 10 }} more
              </div>
            </div>

            <el-button class="cinematic-button is-primary !h-11 !rounded-xl !border-none" @click="visualizeObjects">
              <span class="text-xs font-bold uppercase tracking-widest">Visualize</span>
            </el-button>
            <button
              class="text-[10px] font-bold uppercase tracking-widest text-white/20 hover:text-white/60 transition-colors mt-2"
              @click="detectedObjects = []">
              Reset Analysis
            </button>
          </div>
        </template>
      </div>
    </template>

    <!-- FACE DETECTION -->
    <template v-else-if="match === 'face-detection'">
      <div class="flex flex-col gap-4">
        <div
          class="p-4 rounded-lg bg-pink-400/10 border border-pink-400/20 text-pink-400 text-[11px] leading-relaxed shadow-lg">
          <div class="flex items-center gap-2 mb-2">
            <FaceRecognition :size="14" />
            <span class="font-bold uppercase tracking-widest">Face Blur</span>
          </div>
          <p>Automatically detect faces and apply blur or privacy filters.</p>
        </div>

        <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest">Select Video</label>
        <el-select v-model="selectedFaceVideoId" class="cinematic-select" placeholder="Choose video">
          <el-option v-for="v in useUserMediaStore().videos.items" :key="v._id" :label="v.fileName"
            :value="v._id" />
        </el-select>

        <template v-if="isDetectingFaces">
          <div class="flex flex-col gap-2 mt-4">
            <div class="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
              <span class="text-white/40">Analyzing Frames...</span>
              <span class="text-pink-400">{{ Math.round(faceAnalysisProgress) }}%</span>
            </div>
            <div class="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div class="h-full bg-pink-500 transition-all duration-300"
                :style="{ width: faceAnalysisProgress + '%' }"></div>
            </div>
          </div>
        </template>

        <el-button v-else-if="detectedFaces.length === 0"
          class="cinematic-button is-primary !h-11 !rounded-xl !border-none mt-4"
          @click="handleGenerate('face-detection')">
          <span class="text-xs font-bold uppercase tracking-widest">Find Faces</span>
        </el-button>

        <template v-else>
          <div class="mt-4 flex flex-col gap-2">
            <div
              class="p-4 rounded-lg bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-2 mb-4">
              <span class="text-2xl font-bold text-white">{{ detectedFaces.length }}</span>
              <span class="text-[10px] font-bold uppercase tracking-widest text-white/40">Faces Detected</span>
            </div>

            <el-button class="cinematic-button is-primary !h-11 !rounded-xl !border-none" @click="applyFaceBlur">
              <span class="text-xs font-bold uppercase tracking-widest">Apply Blur</span>
            </el-button>
            <button
              class="text-[10px] font-bold uppercase tracking-widest text-white/20 hover:text-white/60 transition-colors mt-2"
              @click="detectedFaces = []">
              Reset Analysis
            </button>
          </div>
        </template>
      </div>
    </template>

    <!-- UPSCALE & DENOISE -->
    <template v-else-if="match === 'upscale' || match === 'denoise'">
      <div class="flex flex-col gap-4">
        <div
          class="p-4 rounded-lg bg-violet-400/10 border border-violet-400/20 text-violet-400 text-[11px] leading-relaxed shadow-lg">
          <div class="flex items-center gap-2 mb-2">
            <Transform v-if="match === 'upscale'" :size="14" />
            <DistributeVertically v-else :size="14" />
            <span class="font-bold uppercase tracking-widest">{{ match === 'upscale' ? 'AI Upscale' : 'Noise Removal'
            }}</span>
          </div>
          <p>{{ match === 'upscale' ? 'Enhance image resolution and detail using super-resolution AI.' : 'Clear up grain and compression artifacts from low - quality images.' }}</p>
        </div>

        <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest">Select Image</label>
        <el-select v-model="selectedImageId" class="cinematic-select" placeholder="Choose image">
          <el-option v-for="i in useUserMediaStore().images.items" :key="i._id" :label="i.fileName" :value="i._id" />
        </el-select>

        <div v-if="match === 'upscale'" class="flex flex-col gap-2 mt-2">
          <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest">Scale Factor</label>
          <el-radio-group v-model="upscaleFactor" class="cinematic-radio-group flex flex-row !bg-transparent gap-2">
            <el-radio-button :label="2">2x</el-radio-button>
            <el-radio-button :label="4">4x</el-radio-button>
          </el-radio-group>
        </div>

        <el-button v-if="!enhancementResult" class="cinematic-button is-primary !h-11 !rounded-xl !border-none mt-4"
          :loading="isProcessingImage" @click="handleGenerate(match)">
          <span class="text-xs font-bold uppercase tracking-widest">Enhance Image</span>
        </el-button>

        <template v-else>
          <div class="mt-4 flex flex-col gap-4">
            <div
              class="aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center p-2">
              <img :src="enhancementResult" class="max-w-full max-h-full object-contain" />
            </div>
            <el-button class="cinematic-button is-primary !h-11 !rounded-xl !border-none" @click="addResultToCanvas">
              <span class="text-xs font-bold uppercase tracking-widest">Add to Canvas</span>
            </el-button>
            <button
              class="text-[10px] font-bold uppercase tracking-widest text-white/20 hover:text-white/60 transition-colors"
              @click="enhancementResult = null; isProcessingImage = false;">
              Reset
            </button>
          </div>
        </template>
      </div>
    </template>

    <!-- VECTORIZER -->
    <template v-else-if="match === 'vectorizer'">
      <div class="flex flex-col gap-4">
        <div
          class="p-4 rounded-lg bg-orange-400/10 border border-orange-400/20 text-orange-400 text-[11px] leading-relaxed shadow-lg">
          <div class="flex items-center gap-2 mb-2">
            <Magic :size="14" />
            <span class="font-bold uppercase tracking-widest">Image Vectorizer</span>
          </div>
          <p>Convert your raster images into sharp, infinitely scalable SVG vectors.</p>
        </div>

        <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest">Select Image</label>
        <el-select v-model="selectedImageId" class="cinematic-select" placeholder="Choose image">
          <el-option v-for="i in useUserMediaStore().images.items" :key="i._id" :label="i.fileName" :value="i._id" />
        </el-select>

        <el-button v-if="!enhancementResult" class="cinematic-button is-primary !h-11 !rounded-xl !border-none mt-4"
          :loading="isProcessingImage" @click="handleGenerate('vectorize')">
          <span class="text-xs font-bold uppercase tracking-widest">Vectorize</span>
        </el-button>

        <template v-else>
          <div class="mt-4 flex flex-col gap-4">
            <div
              class="aspect-square rounded-xl overflow-hidden bg-white border border-white/10 flex items-center justify-center p-2">
              <img :src="enhancementResult" class="max-w-full max-h-full object-contain" />
            </div>
            <el-button class="cinematic-button is-primary !h-11 !rounded-xl !border-none" @click="addResultToCanvas">
              <span class="text-xs font-bold uppercase tracking-widest">Add to Canvas</span>
            </el-button>
            <button
              class="text-[10px] font-bold uppercase tracking-widest text-white/20 hover:text-white/60 transition-colors"
              @click="enhancementResult = null; isProcessingImage = false;">
              Reset
            </button>
          </div>
        </template>
      </div>
    </template>

    <!-- AUTO-REFRAME -->
    <template v-else-if="match === 'auto-reframe'">
      <div class="flex flex-col gap-4">
        <div
          class="p-4 rounded-lg bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 text-[11px] leading-relaxed shadow-lg">
          <div class="flex items-center gap-2 mb-2">
            <Focus :size="14" />
            <span class="font-bold uppercase tracking-widest">AI Auto-reframe</span>
          </div>
          <p>Instantly adapt your landscape videos to vertical or square formats while keeping the subject in focus.</p>
        </div>

        <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest">Select Video</label>
        <el-select v-model="selectedReframeVideoId" class="cinematic-select" placeholder="Choose video">
          <el-option v-for="v in useUserMediaStore().videos.items" :key="v._id" :label="v.fileName" :value="v._id" />
        </el-select>

        <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-2">Target Ratio</label>
        <el-radio-group v-model="reframeAspectRatio" class="cinematic-radio-group flex flex-row !bg-transparent gap-2">
          <el-radio-button :value="9 / 16">9:16 (TT/Reels)</el-radio-button>
          <el-radio-button :value="1 / 1">1:1 (Post)</el-radio-button>
        </el-radio-group>

        <el-button class="cinematic-button is-primary !h-11 !rounded-xl !border-none mt-4" :loading="isAnalyzingReframe"
          @click="handleGenerate('auto-reframe')">
          <span class="text-xs font-bold uppercase tracking-widest">Apply Reframe</span>
        </el-button>

        <div v-if="isAnalyzingReframe" class="mt-4">
          <div class="flex justify-between mb-1">
            <span class="text-[9px] font-bold text-white/40 uppercase tracking-widest">Tracking Subject...</span>
            <span class="text-[9px] font-bold text-white/40 tracking-widest">{{ Math.round(reframeProgress) }}%</span>
          </div>
          <div class="h-1 bg-white/5 rounded-full overflow-hidden">
            <div class="h-full bg-emerald-500 transition-all duration-300" :style="{ width: reframeProgress + '%' }">
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- TEXT RECOGNITION -->
    <template v-else-if="match === 'text-recognition'">
      <div class="flex flex-col gap-4">
        <div
          class="p-4 rounded-lg bg-blue-400/10 border border-blue-400/20 text-blue-400 text-[11px] leading-relaxed shadow-lg">
          <div class="flex items-center gap-2 mb-2">
            <TextRecognition :size="14" />
            <span class="font-bold uppercase tracking-widest">Text Detection</span>
          </div>
          <p>Find and extract text from your video. Useful for creating subtitles or metadata.</p>
        </div>

        <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest">Select Video</label>
        <el-select v-model="selectedTextVideoId" class="cinematic-select" placeholder="Choose video">
          <el-option v-for="v in useUserMediaStore().videos.items" :key="v._id" :label="v.fileName"
            :value="v._id" />
        </el-select>

        <template v-if="isDetectingText">
          <div class="flex flex-col gap-2 mt-4">
            <div class="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
              <span class="text-white/40">Analyzing Frames...</span>
              <span class="text-blue-400">{{ Math.round(textAnalysisProgress) }}%</span>
            </div>
            <div class="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div class="h-full bg-blue-500 transition-all duration-300"
                :style="{ width: textAnalysisProgress + '%' }"></div>
            </div>
          </div>
        </template>

        <el-button v-else-if="detectedTexts.length === 0"
          class="cinematic-button is-primary !h-11 !rounded-xl !border-none mt-4"
          @click="handleGenerate('text-recognition')">
          <span class="text-xs font-bold uppercase tracking-widest">Detect Text</span>
        </el-button>

        <template v-else>
          <div class="mt-4 flex flex-col gap-2">
            <div
              class="p-4 rounded-lg bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-2 mb-4">
              <span class="text-2xl font-bold text-white">{{ detectedTexts.length }}</span>
              <span class="text-[10px] font-bold uppercase tracking-widest text-white/40">Regions Found</span>
            </div>

            <el-button class="cinematic-button is-primary !h-11 !rounded-xl !border-none" @click="visualizeText">
              <span class="text-xs font-bold uppercase tracking-widest">Visualize</span>
            </el-button>
            <button
              class="text-[10px] font-bold uppercase tracking-widest text-white/20 hover:text-white/60 transition-colors mt-2"
              @click="detectedTexts = []">
              Reset Analysis
            </button>
          </div>
        </template>
      </div>
    </template>

    <!-- COLOR ANALYSIS -->
    <template v-else-if="match === 'color-analysis'">
      <div class="flex flex-col gap-4">
        <div
          class="p-4 rounded-lg bg-purple-400/10 border border-purple-400/20 text-purple-400 text-[11px] leading-relaxed shadow-lg">
          <div class="flex items-center gap-2 mb-2">
            <Platte :size="14" />
            <span class="font-bold uppercase tracking-widest">Color Palette</span>
          </div>
          <p>Extract dominant color palettes from your video to check consistency or generate themes.</p>
        </div>

        <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest">Select Video</label>
        <el-select v-model="selectedColorVideoId" class="cinematic-select" placeholder="Choose video">
          <el-option v-for="v in useUserMediaStore().videos.items" :key="v._id" :label="v.fileName"
            :value="v._id" />
        </el-select>

        <el-button v-if="detectedColors.length === 0"
          class="cinematic-button is-primary !h-11 !rounded-xl !border-none mt-4" :loading="isAnalyzingColors"
          @click="handleGenerate('color-analysis')">
          <span class="text-xs font-bold uppercase tracking-widest">Extract Colors</span>
        </el-button>

        <template v-else>
          <div class="mt-4 flex flex-col gap-2">
            <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest">Extracted Palettes</label>
            <div class="max-h-[200px] overflow-y-auto custom-scrollbar flex flex-col gap-2 p-1">
              <div v-for="(frame, idx) in detectedColors.filter((_, i) => i % 5 === 0)" :key="idx"
                class="p-2 rounded bg-white/5 flex flex-col gap-2">
                <span class="text-[9px] text-white/40 font-mono">{{ frame.timestamp.toFixed(1) }}s</span>
                <div class="flex gap-1">
                  <div v-for="color in frame.palette" :key="color" class="w-6 h-6 rounded-full border border-white/10"
                    :style="{ backgroundColor: color }"></div>
                </div>
              </div>
            </div>

            <button
              class="text-[10px] font-bold uppercase tracking-widest text-white/20 hover:text-white/60 transition-colors mt-2"
              @click="detectedColors = []">
              Reset Analysis
            </button>
          </div>
        </template>
      </div>
    </template>

    <!-- MOTION ANALYSIS -->
    <template v-else-if="match === 'motion-analysis'">
      <div class="flex flex-col gap-4">
        <div
          class="p-4 rounded-lg bg-red-400/10 border border-red-400/20 text-red-400 text-[11px] leading-relaxed shadow-lg">
          <div class="flex items-center gap-2 mb-2">
            <Analysis :size="14" />
            <span class="font-bold uppercase tracking-widest">Motion Analysis</span>
          </div>
          <p>Analyze movement intensity to find action-packed scenes or still moments.</p>
        </div>

        <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest">Select Video</label>
        <el-select v-model="selectedMotionVideoId" class="cinematic-select" placeholder="Choose video">
          <el-option v-for="v in useUserMediaStore().videos.items" :key="v._id" :label="v.fileName"
            :value="v._id" />
        </el-select>

        <el-button v-if="detectedMotion.length === 0"
          class="cinematic-button is-primary !h-11 !rounded-xl !border-none mt-4" :loading="isAnalyzingMotion"
          @click="handleGenerate('motion-analysis')">
          <span class="text-xs font-bold uppercase tracking-widest">Analyze Motion</span>
        </el-button>

        <template v-else>
          <div class="mt-4 flex flex-col gap-2">
            <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest">Motion Graph</label>
            <div class="h-24 w-full bg-white/5 rounded-xl flex items-end p-2 gap-0.5 relative overflow-hidden">
               <!-- Simple Bar Graph -->
               <div v-for="(frame, idx) in detectedMotion" :key="idx" 
                    class="flex-1 bg-red-500/50 hover:bg-red-500 transition-colors rounded-t-sm"
                    :style="{ height: (frame.score * 100) + '%' }"
                    :title="`Time: ${frame.timestamp.toFixed(1)}s, Score: ${frame.score.toFixed(2)}`">
               </div>
            </div>
            
            <div class="flex justify-between text-[9px] text-white/20 font-mono">
                <span>0s</span>
                <span>{{ detectedMotion[detectedMotion.length-1]?.timestamp.toFixed(0) }}s</span>
            </div>

            <button
              class="text-[10px] font-bold uppercase tracking-widest text-white/20 hover:text-white/60 transition-colors mt-2"
              @click="detectedMotion = []">
              Reset Analysis
            </button>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>
