<template>
    <div class="h-full flex flex-col bg-[#050505] text-white">
        <!-- Header -->
        <div class="p-4 border-b border-white/5 flex items-center justify-between">
            <div class="flex items-center gap-2">
                <movie theme="outline" size="18" class="text-purple-400" />
                <h3 class="font-bold text-sm uppercase tracking-wider">{{ $t('studio.drawers.showrunner.title') }}</h3>
            </div>
            <button @click="$emit('close')" class="p-2 hover:bg-white/5 rounded-full transition-colors">
                <close theme="outline" size="18" class="text-white/40" />
            </button>
        </div>

        <div class="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
            
            <!-- 1. Select Profile -->
            <div class="space-y-3">
                <label class="text-[10px] font-bold text-white/40 uppercase tracking-widest">{{ $t('studio.drawers.showrunner.selectProfile') }}</label>
                <div class="grid grid-cols-2 gap-2">
                    <div 
                        v-for="profile in studioStore.showProfiles" 
                        :key="profile.id"
                        class="p-3 rounded-xl border cursor-pointer transition-all hover:bg-white/5 relative overflow-hidden group"
                        :class="selectedProfileId === profile.id ? 'border-purple-500 bg-purple-500/10' : 'border-white/5 bg-white/2'"
                        @click="selectProfile(profile.id)"
                    >
                        <!-- Checkmark -->
                        <div v-if="selectedProfileId === profile.id" class="absolute top-2 right-2 text-purple-400">
                            <check-one theme="filled" size="16" />
                        </div>

                        <component :is="getIcon(profile.icon)" theme="outline" size="24" :class="selectedProfileId === profile.id ? 'text-purple-400' : 'text-white/40 group-hover:text-white/80'" class="mb-2" />
                        <h4 class="text-xs font-bold mb-1">{{ profile.name }}</h4>
                        <p class="text-[10px] text-white/40 leading-snug">{{ profile.description }}</p>
                    </div>
                </div>
            </div>

            <!-- 2. Inputs -->
            <div v-show="currentProfile" class="space-y-4 py-4">
                <div class="flex items-center gap-2 py-2 border-b border-white/5">
                    <edit theme="outline" size="14" class="text-white/40" />
                    <span class="text-[10px] font-bold text-white/40 uppercase tracking-widest">{{ $t('studio.drawers.showrunner.scriptInputs') }}</span>
                </div>

                <div v-if="currentProfile" v-for="field in currentProfile.requiredInputs" :key="field.key" class="space-y-1">
                    <label class="text-xs font-medium text-white/80">{{ field.label }}</label>
                    
                    <textarea 
                        v-if="field.type === 'textarea' || field.type === 'list'"
                        v-model="inputs[field.key]"
                        rows="4"
                        class="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-sm focus:border-purple-500/50 focus:outline-none transition-colors resize-none placeholder-white/20"
                        :placeholder="field.placeholder"
                    ></textarea>

                    <input 
                        v-else
                        v-model="inputs[field.key]"
                        type="text"
                        class="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-sm focus:border-purple-500/50 focus:outline-none transition-colors placeholder-white/20"
                        :placeholder="field.placeholder"
                    />
                </div>

                <!-- Infinite Mode Toggle -->
                <div v-if="selectedProfileId === 'infinite_podcast'" class="p-3 bg-purple-500/5 border border-purple-500/20 rounded-xl flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                            <refresh theme="outline" size="18" />
                        </div>
                        <div>
                            <h4 class="text-xs font-bold">Infinite Podcast Mode</h4>
                            <p class="text-[10px] text-white/40">Keep the loop running autonomously</p>
                        </div>
                    </div>
                    <button 
                        class="w-10 h-6 rounded-full transition-colors relative"
                        :class="studioStore.isInfiniteMode ? 'bg-purple-600' : 'bg-white/10'"
                        @click="studioStore.isInfiniteMode = !studioStore.isInfiniteMode"
                    >
                        <div 
                            class="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform"
                            :class="studioStore.isInfiniteMode ? 'translate-x-4' : ''"
                        ></div>
                    </button>
                </div>
            </div>
        </div>

        <!-- Footer Actions -->
        <div class="p-4 border-t border-white/5 space-y-3 bg-[#080808]">
            <button 
                v-if="!isGenerating && !studioStore.activeScript"
                class="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold text-sm shadow-lg shadow-purple-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="!isValid"
                @click="generateScript"
            >
                <cpu theme="outline" size="16" />
                {{ $t('studio.drawers.showrunner.generateAiScript') }}
            </button>

            <button 
                v-else-if="isGenerating"
                class="w-full py-3 bg-white/5 rounded-xl font-bold text-sm text-white/60 cursor-wait flex items-center justify-center gap-2"
                disabled
            >
                <loading-four theme="outline" size="16" class="animate-spin" />
                {{ $t('studio.drawers.showrunner.dreaming') }}
            </button>

             <div v-else class="space-y-2">
                <div class="px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2">
                    <check-one theme="filled" size="16" class="text-green-400" />
                    <span class="text-xs text-green-400 font-bold">{{ $t('studio.drawers.showrunner.scriptReady', { title: studioStore.activeScript.title }) }}</span>
                </div>
                
                <div class="grid grid-cols-2 gap-2">
                    <button class="py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold transition-colors" @click="studioStore.activeScript = null">
                        {{ $t('studio.common.discard') }}
                    </button>
                    <button class="py-2.5 bg-purple-600 hover:bg-purple-500 rounded-lg text-xs font-bold shadow-lg shadow-purple-900/20 transition-colors" @click="startProduction">
                        {{ $t('studio.drawers.showrunner.startProduction') }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStudioStore } from '@/stores/studio';
import { toast } from 'vue-sonner';
import { 
    Movie, Close, CheckOne, Edit, Cpu, LoadingFour,
    ShoppingBag, BookOpen, Microphone, Trophy, Ghost, Refresh
} from '@icon-park/vue-next';

defineEmits(['close']);

const studioStore = useStudioStore();
const { t } = useI18n();
const selectedProfileId = ref<string | null>(null);
const inputs = ref<Record<string, string>>({});
const isGenerating = ref(false);

const currentProfile = computed(() => {
    if (!selectedProfileId.value || !studioStore.showProfiles) return null;
    return studioStore.showProfiles.find((p: any) => p.id === selectedProfileId.value) || null;
});

const isValid = computed(() => {
    if (!currentProfile.value) return false;
    // Simple check: are required fields filled?
    const requiredInps = currentProfile.value.requiredInputs || [];
    return requiredInps.every((f: any) => !!inputs.value[f.key]);
});

onMounted(async () => {
    try {
        await studioStore.fetchShowProfiles();
        if (studioStore.showProfiles.length > 0) {
            selectedProfileId.value = studioStore.showProfiles[0].id;
        }
    } catch (e) {
        toast.error(t('studio.drawers.showrunner.loadProfilesFailed'));
    }
});

const selectProfile = (id: string) => {
    selectedProfileId.value = id;
    inputs.value = {}; // Reset inputs
};

const getIcon = (name: string) => {
    switch (name) {
        case 'shopping-bag': return ShoppingBag;
        case 'book-open': return BookOpen;
        case 'microphone': return Microphone;
        case 'trophy': return Trophy;
        case 'ghost': return Ghost;
        case 'infinity': return Refresh;
        default: return Movie;
    }
};

const generateScript = async () => {
    if (!selectedProfileId.value) return;
    
    isGenerating.value = true;
    try {
        await studioStore.createShowScript(selectedProfileId.value, inputs.value);
        toast.success(t("studio.drawers.showrunner.generateScriptSuccess"));
    } catch (e) {
        console.error(e);
        toast.error(t("studio.drawers.showrunner.generateScriptFailed"));
    } finally {
        isGenerating.value = false;
    }
};

const startProduction = async () => {
    try {
        await studioStore.startShow();
        toast.success(t("studio.drawers.showrunner.showrunnerActive"));
        // Close drawer?
        // emit('close');
    } catch (e) {
        toast.error(t("studio.drawers.showrunner.startShowFailed"));
    }
};
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
    width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.02);
}
.custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
}
.animate-slide-up {
    animation: slideUp 0.3s ease-out;
}
@keyframes slideUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>
