<script setup lang="ts">
import { computed, ref } from 'vue';
import { Magic, MagicWand } from '@icon-park/vue-next';
import { useEditorStore } from 'video-editor/store/editor';
import { generateCaptions } from 'video-editor/api/ai';
import { useUserMediaStore } from 'video-editor/hooks/use-user-media';
import { isVideo, extractAudioFromVideo } from 'video-editor/lib/media';
import { toast } from 'vue-sonner';

const editor = useEditorStore();

const loading = ref(false);
const captionLanguage = ref('en');
const selectedCaptionMediaId = ref('');

const activeTimelineMedia = computed(() => {
  const _ = editor.tick;
  const userMediaStore = useUserMediaStore();
  const mediaMap = new Map<string, any>();

  editor.pages.forEach((page: any) => {
    if (page.elements) {
      page.elements.forEach((el: any) => {
        if (el.type === 'video' || el.type === 'audio' || el.type === 'audio-visual' || el.type === 'image') {
          const url = el.originalSrc || el.src || el.url;
          if (!url || url.startsWith('blob:')) return;
          
          if (!mediaMap.has(url)) {
            const match = [...userMediaStore.videos.items, ...userMediaStore.audios.items, ...userMediaStore.images.items].find(m => m.url === url || m.key === url || url.endsWith(m.key));
            let type: 'video' | 'audio' | 'image' = 'image';
            if (el.type === 'video' || isVideo(url)) type = 'video';
            else if (el.type === 'audio' || el.type === 'audio-visual') type = 'audio';

            mediaMap.set(url, { 
              url, 
              fileName: match?.fileName || (url.split('/').pop()?.split('?')[0] || 'Untitled'), 
              type
            });
          }
        }
      });
    }

    if (page.audio && page.audio.elements) {
      page.audio.elements.forEach((audio: any) => {
        if (!audio.url || audio.url.startsWith('blob:')) return;
        if (!mediaMap.has(audio.url)) {
           mediaMap.set(audio.url, { url: audio.url, fileName: audio.name, type: 'audio' });
        }
      });
    }
  });

  const items = Array.from(mediaMap.values());
  return {
    videos: items.filter(i => i.type === 'video'),
    audios: items.filter(i => i.type === 'audio')
  };
});

const onGenerateCaptions = async () => {
    const lang = captionLanguage.value || "en";
    const mediaSource = selectedCaptionMediaId.value || ""; 

    loading.value = true;
    try {
        let res: any;
        if (mediaSource && isVideo(mediaSource)) {
            const extractToast = toast.loading("Extracting audio for analysis...");
            try {
                const audioBlob = await extractAudioFromVideo(editor.ffmpeg, mediaSource);
                const formData = new FormData();
                formData.append('file', audioBlob, 'audio_source.mp3');
                formData.append('language', lang);
                
                toast.dismiss(extractToast);
                toast.loading("Analyzing audio and generating captions...", { id: 'caption-gen' });
                
                res = await generateCaptions(formData);
                toast.dismiss('caption-gen');
            } catch (e) {
                toast.dismiss(extractToast);
                toast.dismiss('caption-gen');
                throw e;
            }
        } else {
            res = await generateCaptions({ 
                language: lang,
                mediaId: mediaSource 
            });
        }

        if (res && res.segments) {
            toast.success("Captions generated!");

            const pages = editor.pages;
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
                if (!found && pages.length > 0) {
                    pages[pages.length - 1].onAddSubtitle(seg.text, {
                        start: pages[pages.length - 1].timeline.duration - 100,
                        duration: seg.duration
                    });
                }
            });
            editor.onModified();
        }
    } catch (err: any) {
        console.error(err);
        toast.error(`Caption generation failed: ${err.message || 'Unknown error'}`);
    } finally {
        loading.value = false;
    }
};
</script>

<template>
    <div class="flex flex-col gap-6 p-4">
        <div class="p-4 rounded-2xl bg-brand-primary/5 border border-brand-primary/10 relative overflow-hidden group">
            <div class="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-brand-primary/20 to-transparent"></div>
            <div class="flex items-center gap-2 mb-3">
                <MagicWand :size="14" class="text-brand-primary" />
                <span class="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em]">Magic Captioning</span>
            </div>
            <p class="text-[10px] text-white/40 leading-relaxed italic">
                AI will transcribe audio from your project and create synchronized subtitles across all scenes.
            </p>
        </div>

        <div class="flex flex-col gap-4 px-1">
            <div class="flex flex-col gap-2">
                <label class="text-[9px] font-black text-white/30 uppercase tracking-widest pl-1">Select Source</label>
                <el-select v-model="selectedCaptionMediaId" class="cinematic-select !w-full" placeholder="Select media source" clearable>
                    <el-option label="All video/audio" value="" />
                    <el-option-group v-if="activeTimelineMedia.videos.length > 0" label="Project Videos">
                        <el-option v-for="v in activeTimelineMedia.videos" :key="v.url" :label="v.fileName" :value="v.url" />
                    </el-option-group>
                    <el-option-group v-if="activeTimelineMedia.audios.length > 0" label="Project Audios">
                        <el-option v-for="a in activeTimelineMedia.audios" :key="a.url" :label="a.fileName" :value="a.url" />
                    </el-option-group>
                </el-select>
            </div>

            <div class="flex flex-col gap-2">
                <label class="text-[9px] font-black text-white/30 uppercase tracking-widest pl-1">Target Language</label>
                <el-select v-model="captionLanguage" class="cinematic-select !w-full" placeholder="Select Language">
                    <el-option label="English (US)" value="en" />
                    <el-option label="Vietnamese" value="vi" />
                    <el-option label="Japanese" value="ja" />
                </el-select>
            </div>
        </div>

        <el-button 
            type="primary" 
            class="cinematic-button is-primary !h-12 !rounded-2xl !border-none mt-2 shadow-lg shadow-brand-primary/20" 
            :loading="loading"
            @click="onGenerateCaptions"
        >
            <template #icon>
                <Magic :size="16" />
            </template>
            <span class="text-xs font-black uppercase tracking-widest">Generate Captions</span>
        </el-button>

        <div class="flex items-center gap-2 px-1 opacity-40">
            <div class="flex-1 h-px bg-white/10"></div>
            <span class="text-[8px] font-bold uppercase tracking-widest tracking-tighter">Powered by Gemini AI</span>
            <div class="flex-1 h-px bg-white/10"></div>
        </div>
    </div>
</template>

<style scoped lang="postcss">
:deep(.el-button.is-loading) {
    @apply opacity-80;
}
</style>
