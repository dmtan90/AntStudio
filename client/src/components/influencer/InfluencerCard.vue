<template>
    <div class="influencer-card group relative flex flex-col overflow-hidden rounded-[2.5rem] border border-white/5 bg-[#0a0a0a]/40 backdrop-blur-xl transition-all duration-500 hover:scale-[1.02] hover:border-blue-500/30 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_20px_rgba(59,130,246,0.1)]"
        @click="$emit('click')" @mouseenter="influencer.preview = true" @mouseleave="influencer.preview = false">
        
        <!-- Large Media Area -->
        <div class="relative aspect-[3/4] w-full overflow-hidden">
            <!-- Static Thumbnail -->
            <!-- <img v-if="influencer.visual?.thumbnailUrl || influencer.visual?.modelUrl"
                :src="getFileUrl(influencer.visual?.thumbnailUrl || influencer.visual?.modelUrl)"
                class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
            <div v-else class="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500/10 to-purple-500/10">
                <brain theme="outline" size="48" class="text-blue-400/30" />
            </div> -->

            <el-image
                :src="getFileUrl(influencer.visual?.thumbnailUrl || influencer.visual?.modelUrl)"
                class="h-full w-full transition-transform duration-700 group-hover:scale-110"
                fit="cover"
            >
                <template #error>
                    <div class="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500/10 to-purple-500/10">
                        <brain theme="outline" size="48" class="text-blue-400/30" />
                    </div>
                </template>
            </el-image>

            <!-- Top Actions Overlay -->
            <div class="absolute inset-x-0 top-0 z-20 flex items-start justify-between p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <div class="flex items-center gap-1.5">
                    <div class="flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 backdrop-blur-md border border-white/10">
                        <div class="h-1 w-1 rounded-full bg-green-500 animate-pulse"></div>
                        <span class="text-[8px] font-black uppercase tracking-widest text-green-400">{{ t('influencers.ready') }}</span>
                    </div>
                    <!-- Gemini Live Quick Chat -->
                    <button 
                        v-if="influencer.meta?.voiceConfig?.provider === 'gemini'"
                        @click.stop="$router.push(`/gemini-live-chat?influencerId=${influencer.entityId}`)"
                        class="flex h-7 px-2 items-center gap-1 rounded-lg bg-blue-500/10 text-blue-400 backdrop-blur-md border border-blue-500/20 hover:bg-blue-500 hover:text-black transition-all text-[8px] font-black uppercase tracking-widest"
                        :title="t('influencers.startLiveVoice')"
                    >
                        <microphone theme="outline" size="10" />
                        {{ t('influencers.live') }}
                    </button>
                    <!-- Dashboard Command Center -->
                    <button 
                        @click.stop="$emit('dashboard')"
                        class="flex h-7 px-2 items-center gap-1 rounded-lg bg-purple-500/10 text-purple-400 backdrop-blur-md border border-purple-500/20 hover:bg-purple-500 hover:text-white transition-all text-[8px] font-black uppercase tracking-widest"
                    >
                        <cpu theme="outline" size="10" />
                        {{ t('influencers.dashboard.title') }}
                    </button>
                </div>
                <button @click.stop="$emit('delete')" 
                    class="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 text-red-400 backdrop-blur-md border border-red-500/20 hover:bg-red-500 hover:text-white transition-all">
                    <delete theme="outline" size="12" />
                </button>
            </div>

            <!-- Shadow Gradient -->
            <div class="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent"></div>
        </div>

        <!-- Hover Video Preview -->
        <video v-if="influencer.preview && influencer.visual?.previewVideoUrl"
            ref="videoRef"
            :src="getFileUrl(influencer.visual.previewVideoUrl)" loop playsinline autoplay
            class="absolute z-10 inset-0 h-full w-full object-cover transition-opacity duration-500"
        />

        <!-- Content Section -->
        <div class="relative -mt-12 flex flex-col p-4 pt-0 z-20">
            <div class="rounded-2xl border border-white/5 bg-white/5 p-4 backdrop-blur-2xl shadow-xl transition-all group-hover:border-white/10 group-hover:bg-white/10">
                <div class="mb-2">
                    <h3 class="text-base font-black tracking-tight text-white transition-colors group-hover:text-blue-400">{{ influencer.identity.name }}</h3>
                    <p class="mt-0.5 text-[10px] font-medium text-white/50 line-clamp-1">
                        {{ influencer.identity.description || t('influencers.identityAwaitingSync') }}
                    </p>
                </div>

                <!-- <div class="grid grid-cols-2 gap-3 border-t border-white/5 pt-3">
                    <div class="space-y-0.5">
                        <p class="text-[7px] font-black uppercase tracking-widest text-white/20">Memory</p>
                        <div class="flex items-center gap-1">
                            <brain theme="outline" size="9" class="text-blue-400/50" />
                            <p class="text-[10px] font-bold text-white/80">{{ influencer.memory?.keyEvents?.length || 0 }} Events</p>
                        </div>
                    </div>
                    <div class="space-y-0.5">
                        <p class="text-[7px] font-black uppercase tracking-widest text-white/20">Config</p>
                        <div class="flex items-center gap-1">
                            <setting-config theme="outline" size="9" class="text-purple-400/50" />
                            <p class="text-[10px] font-bold text-white/80">{{ influencer.meta?.loras?.length || 0 }} LoRAs</p>
                        </div>
                    </div>
                </div> -->
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Brain, Delete, SettingConfig, Microphone, Cpu } from '@icon-park/vue-next';
import { getFileUrl } from '@/utils/api';
import { useI18n } from "vue-i18n";

const router = useRouter();
const { t } = useI18n();

const props = defineProps<{
    influencer: any;
}>();

const emit = defineEmits(['click', 'delete', 'dashboard']);

const videoRef = ref<HTMLVideoElement | null>(null);

const handleMouseEnter = () => {
    if (videoRef.value) {
        videoRef.value.play().catch(e => console.warn('Preview video play blocked:', e));
    }
};

const handleMouseLeave = () => {
    if (videoRef.value) {
        videoRef.value.pause();
        videoRef.value.currentTime = 0;
    }
};
</script>

<style lang="scss" scoped>
.influencer-card {
    cursor: pointer;
}
</style>
