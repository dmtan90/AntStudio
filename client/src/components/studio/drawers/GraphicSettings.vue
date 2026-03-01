<template>
    <div class="graphic-settings flex flex-col gap-8 animate-in">
        <!-- Host Identity -->
        <section>
            <h4 class="text-xs font-black opacity-30 uppercase tracking-widest mb-4">{{ $t('studio.drawers.graphics.hostIdentity') }}</h4>
            <div class="space-y-4">
                <div class="form-group">
                    <label class="text-[8px] opacity-40 uppercase font-black mb-1 block">{{ $t('studio.drawers.graphics.primaryName') }}</label>
                    <el-input v-model="branding.name" size="small" class="glass-input"
                        :placeholder="$t('studio.drawers.graphics.placeholders.primaryName')" />
                </div>
                <div class="form-group">
                    <label class="text-[8px] opacity-40 uppercase font-black mb-1 block">{{ $t('studio.drawers.graphics.subtitleRole') }}</label>
                    <el-input v-model="branding.title" size="small" class="glass-input"
                        :placeholder="$t('studio.drawers.graphics.placeholders.subtitleRole')" />
                </div>
                <div class="form-group">
                    <label class="text-[8px] opacity-40 uppercase font-black mb-1 block">{{ $t('studio.drawers.graphics.brandColor') }}</label>
                    <div class="flex gap-2 items-center">
                        <el-color-picker v-model="branding.color" size="small" />
                        <span class="text-[10px] font-mono opacity-60">{{ branding.color }}</span>
                    </div>
                </div>
            </div>
        </section>

        <!-- Guest Identities -->
        <section v-if="studioStore.liveGuests.length > 0">
            <h4 class="text-xs font-black opacity-30 uppercase tracking-widest mb-4">{{ $t('studio.drawers.graphics.guestIdentities') }}</h4>
            <div class="space-y-4">
                <div v-for="guest in studioStore.liveGuests" :key="guest.uuid" class="form-group">
                    <label class="text-[8px] opacity-40 uppercase font-black mb-1 block">{{ guest.name }}</label>
                    <el-input v-model="guest.title" size="small" class="glass-input"
                        :placeholder="$t('studio.drawers.graphics.placeholders.specialist')" />
                </div>
            </div>
        </section>

        <!-- Overlay Toggles -->
        <section>
            <h4 class="text-xs font-black opacity-30 uppercase tracking-widest mb-4">{{ $t('studio.drawers.graphics.liveOverlays') }}</h4>
            <div class="grid grid-cols-1 gap-3">
                <div class="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between group hover:border-blue-500/30 cursor-pointer"
                    @click="$emit('toggle-lower-third')">
                    <div class="flex items-center gap-3">
                        <graphic-design theme="outline" size="18" :class="{ 'text-blue-400': studioStore.visualSettings.showLowerThird }" />
                        <span class="text-[10px] font-bold">{{ $t('studio.drawers.graphics.lowerThird') }}</span>
                    </div>
                    <div class="w-1.5 h-1.5 rounded-full" :class="studioStore.visualSettings.showLowerThird ? 'bg-blue-400' : 'bg-white/10'"></div>
                </div>

                <div class="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between group hover:border-blue-500/30 cursor-pointer"
                    @click="$emit('toggle-ticker')">
                    <div class="flex items-center gap-3">
                        <align-text-left-one theme="outline" size="18" :class="{ 'text-blue-400': studioStore.visualSettings.showTicker }" />
                        <span class="text-[10px] font-bold">{{ $t('studio.drawers.graphics.dynamicTicker') }}</span>
                    </div>
                    <div class="w-1.5 h-1.5 rounded-full" :class="studioStore.visualSettings.showTicker ? 'bg-blue-400' : 'bg-white/10'"></div>
                </div>
                
                <!-- Ticker Settings -->
                <div v-if="studioStore.visualSettings.showTicker" class="form-group animate-in slide-in-from-top-2 ml-4 pl-4 border-l border-white/10">
                    <label class="text-[8px] opacity-40 uppercase font-black mb-1 block">{{ $t('studio.drawers.graphics.tickerText') }}</label>
                    <el-input v-model="studioStore.visualSettings.tickerText" size="small" class="glass-input" :placeholder="$t('studio.drawers.graphics.placeholders.tickerDefault')" />
                </div>
            </div>
        </section>
 
         <!-- Branding Overlay (Phase 18) -->
         <section>
             <h4 class="text-xs font-black opacity-30 uppercase tracking-widest mb-4">{{ $t('studio.drawers.graphics.identityOverlay') }}</h4>
             <div class="space-y-4">
                 <div class="form-group">
                     <label class="text-[8px] opacity-40 uppercase font-black mb-1 block">{{ $t('studio.drawers.graphics.brandLogo') }}</label>
                     
                     <!-- Logo Preview (if exists) -->
                     <div v-if="studioStore.visualSettings.branding.logoUrl" class="mb-3 relative inline-block">
                         <img :src="studioStore.visualSettings.branding.logoUrl" 
                              class="w-24 h-24 object-contain rounded-lg border border-white/10 bg-white/5 p-2" />
                         <button @click="removeLogo" 
                                 class="absolute -top-2 -right-2 w-6 h-6 bg-red-500/90 hover:bg-red-500 rounded-full flex items-center justify-center transition-all">
                             <close theme="outline" size="12" class="text-white" />
                         </button>
                     </div>
                     
                     <!-- Upload Button -->
                     <button @click="triggerLogoUpload" 
                             :disabled="uploading"
                             class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                         <div class="flex items-center justify-center gap-2">
                             <upload theme="outline" size="14" />
                             <span class="text-[10px] font-bold">
                                 {{ uploading ? $t('studio.common.uploading') : (studioStore.visualSettings.branding.logoUrl ? $t('studio.drawers.graphics.changeLogo') : $t('studio.drawers.graphics.uploadLogo')) }}
                             </span>
                         </div>
                     </button>
                     <input ref="logoInput" type="file" accept="image/*" class="hidden" @change="handleLogoUpload" />
                 </div>
                 <div class="form-group">
                     <label class="text-[8px] opacity-40 uppercase font-black mb-1 block">{{ $t('studio.drawers.graphics.logoPosition') }}</label>
                     <el-select v-model="studioStore.visualSettings.branding.logoPosition" size="small" class="glass-select w-full">
                         <el-option :label="$t('studio.drawers.graphics.positions.top-left')" value="top-left" />
                         <el-option :label="$t('studio.drawers.graphics.positions.top-right')" value="top-right" />
                         <el-option :label="$t('studio.drawers.graphics.positions.bottom-left')" value="bottom-left" />
                         <el-option :label="$t('studio.drawers.graphics.positions.bottom-right')" value="bottom-right" />
                     </el-select>
                 </div>
                 <div class="form-group">
                     <label class="text-[8px] opacity-40 uppercase font-black mb-1 block">{{ $t('studio.drawers.graphics.logoScale') }}</label>
                     <el-slider v-model="studioStore.visualSettings.branding.logoScale" :min="0.5" :max="2.0" :step="0.1" />
                 </div>
             </div>
         </section>
 
         <!-- Utility Modes (Phase 18) -->
         <section>
             <h4 class="text-xs font-black opacity-30 uppercase tracking-widest mb-4">{{ $t('studio.drawers.graphics.utilityModes') }}</h4>
             <div class="space-y-4">
                 <div class="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between group hover:border-red-500/30 cursor-pointer"
                     @click="studioStore.visualSettings.breakMode.enabled = !studioStore.visualSettings.breakMode.enabled">
                     <div class="flex items-center gap-3">
                         <graphic-design theme="outline" size="18" :class="{ 'text-red-400': studioStore.visualSettings.breakMode.enabled }" />
                         <span class="text-[10px] font-bold">{{ $t('studio.drawers.graphics.breakMode') }}</span>
                     </div>
                     <div @click.stop>
                         <el-switch v-model="studioStore.visualSettings.breakMode.enabled" size="small" />
                     </div>
                 </div>
                 <div v-if="studioStore.visualSettings.breakMode.enabled" class="form-group animate-in slide-in-from-top-2">
                     <label class="text-[8px] opacity-40 uppercase font-black mb-1 block">{{ $t('studio.drawers.graphics.statusMessage') }}</label>
                     <el-input v-model="studioStore.visualSettings.breakMode.message" size="small" class="glass-input" />
                 </div>
             </div>
         </section>
         <!-- Special Overlays (Phase 18) -->
         <section>
             <h4 class="text-xs font-black opacity-30 uppercase tracking-widest mb-4">{{ $t('studio.drawers.graphics.specialTemplates') }}</h4>
             <div class="space-y-3">
                 <div class="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between group hover:border-yellow-500/30 cursor-pointer"
                     @click="studioStore.visualSettings.specialOverlays.showSponsorship = !studioStore.visualSettings.specialOverlays.showSponsorship">
                     <div class="flex items-center gap-3">
                         <div class="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                             <chart-line theme="outline" size="16" class="text-yellow-400" />
                         </div>
                         <div class="flex flex-col">
                             <span class="text-[10px] font-bold">{{ $t('studio.drawers.graphics.sponsorshipBadge') }}</span>
                             <span class="text-[8px] opacity-40">{{ $t('studio.drawers.graphics.sponsorshipDesc') }}</span>
                         </div>
                     </div>
                     <div @click.stop>
                         <el-switch v-model="studioStore.visualSettings.specialOverlays.showSponsorship" size="small" />
                     </div>
                 </div>
                 
                 <!-- Sponsorship Settings -->
                 <div v-if="studioStore.visualSettings.specialOverlays.showSponsorship" class="form-group animate-in slide-in-from-top-2 ml-4 pl-4 border-l border-white/10">
                     <label class="text-[8px] opacity-40 uppercase font-black mb-1 block">{{ $t('studio.drawers.graphics.sponsorName') }}</label>
                     <el-input v-model="studioStore.visualSettings.specialOverlays.sponsorName" size="small" class="glass-input" :placeholder="$t('studio.drawers.graphics.placeholders.sponsorName')" />
                 </div>
             </div>
         </section>
     </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { GraphicDesign, AlignTextLeftOne, ChartLine, Close, Upload } from '@icon-park/vue-next';
import { useStudioStore } from '@/stores/studio';
import { uploadFile } from '@/utils/api';
import { toast } from 'vue-sonner';

const studioStore = useStudioStore();
const { t } = useI18n();

defineProps<{
    branding: any;
}>();

defineEmits(['toggle-lower-third', 'toggle-ticker', 'update-branding']);

// Logo Upload
const logoInput = ref<HTMLInputElement>();
const uploading = ref(false);

const triggerLogoUpload = () => {
    logoInput.value?.click();
};

const handleLogoUpload = async (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        toast.error(t('studio.drawers.graphics.selectImageError'));
        return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        toast.error(t('studio.drawers.graphics.imageSizeError'));
        return;
    }
    
    try {
        uploading.value = true;
        const url = await uploadFile(file, 'branding');
        studioStore.visualSettings.branding.logoUrl = url;
        toast.success(t('studio.drawers.graphics.uploadSuccess'));
    } catch (error) {
        console.error('Logo upload failed:', error);
        toast.error(t('studio.drawers.graphics.uploadFailed'));
    } finally {
        uploading.value = false;
        // Reset input
        if (logoInput.value) {
            logoInput.value.value = '';
        }
    }
};

const removeLogo = () => {
    studioStore.visualSettings.branding.logoUrl = '';
    toast.success(t('studio.drawers.graphics.logoRemoved'));
};
</script>
