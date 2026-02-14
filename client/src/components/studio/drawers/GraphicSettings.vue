<template>
    <div class="graphic-settings flex flex-col gap-8 animate-in">
        <!-- Branding Metadata -->
        <section>
            <h4 class="text-xs font-black opacity-30 uppercase tracking-widest mb-4">IDENTITY_CORE</h4>
            <div class="space-y-4">
                <div class="form-group">
                    <label class="text-[8px] opacity-40 uppercase font-black mb-1 block">Broadcast Primary Name</label>
                    <el-input v-model="branding.name" size="small" class="glass-input"
                        placeholder="e.g. AntStudio Prime" />
                </div>
                <div class="form-group">
                    <label class="text-[8px] opacity-40 uppercase font-black mb-1 block">Sub-Title / Role</label>
                    <el-input v-model="branding.title" size="small" class="glass-input"
                        placeholder="e.g. AI News Anchor" />
                </div>
                <div class="form-group">
                    <label class="text-[8px] opacity-40 uppercase font-black mb-1 block">Brand Accent Color</label>
                    <div class="flex gap-2 items-center">
                        <el-color-picker v-model="branding.color" size="small" />
                        <span class="text-[10px] font-mono opacity-60">{{ branding.color }}</span>
                    </div>
                </div>
            </div>
        </section>

        <!-- Overlay Toggles -->
        <section>
            <h4 class="text-xs font-black opacity-30 uppercase tracking-widest mb-4">LIVE_OVERLAYS</h4>
            <div class="grid grid-cols-1 gap-3">
                <div class="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between group hover:border-blue-500/30 cursor-pointer"
                    @click="$emit('toggle-lower-third')">
                    <div class="flex items-center gap-3">
                        <graphic-design theme="outline" size="18" :class="{ 'text-blue-400': showLowerThird }" />
                        <span class="text-[10px] font-bold">Lower-Third Graphics</span>
                    </div>
                    <div class="w-1.5 h-1.5 rounded-full" :class="showLowerThird ? 'bg-blue-400' : 'bg-white/10'"></div>
                </div>

                <div class="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between group hover:border-blue-500/30 cursor-pointer"
                    @click="$emit('toggle-ticker')">
                    <div class="flex items-center gap-3">
                        <align-text-left-one theme="outline" size="18" :class="{ 'text-blue-400': showTicker }" />
                        <span class="text-[10px] font-bold">Dynamic Ticker Scroll</span>
                    </div>
                    <div class="w-1.5 h-1.5 rounded-full" :class="showTicker ? 'bg-blue-400' : 'bg-white/10'"></div>
                </div>
            </div>
        </section>
 
         <!-- Branding Overlay (Phase 18) -->
         <section>
             <h4 class="text-xs font-black opacity-30 uppercase tracking-widest mb-4">IDENTITY_OVERLAY</h4>
             <div class="space-y-4">
                 <div class="form-group">
                     <label class="text-[8px] opacity-40 uppercase font-black mb-1 block">Brand Logo URL</label>
                     <el-input v-model="studioStore.visualSettings.branding.logoUrl" size="small" class="glass-input"
                         placeholder="https://..." />
                 </div>
                 <div class="form-group">
                     <label class="text-[8px] opacity-40 uppercase font-black mb-1 block">Logo Position</label>
                     <el-select v-model="studioStore.visualSettings.branding.logoPosition" size="small" class="glass-select w-full">
                         <el-option label="Top Left" value="top-left" />
                         <el-option label="Top Right" value="top-right" />
                         <el-option label="Bottom Left" value="bottom-left" />
                         <el-option label="Bottom Right" value="bottom-right" />
                     </el-select>
                 </div>
                 <div class="form-group">
                     <label class="text-[8px] opacity-40 uppercase font-black mb-1 block">Logo Scale</label>
                     <el-slider v-model="studioStore.visualSettings.branding.logoScale" :min="0.5" :max="2.0" :step="0.1" />
                 </div>
             </div>
         </section>
 
         <!-- Utility Modes (Phase 18) -->
         <section>
             <h4 class="text-xs font-black opacity-30 uppercase tracking-widest mb-4">UTILITY_MODES</h4>
             <div class="space-y-4">
                 <div class="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between group hover:border-red-500/30 cursor-pointer"
                     @click="studioStore.visualSettings.breakMode.enabled = !studioStore.visualSettings.breakMode.enabled">
                     <div class="flex items-center gap-3">
                         <graphic-design theme="outline" size="18" :class="{ 'text-red-400': studioStore.visualSettings.breakMode.enabled }" />
                         <span class="text-[10px] font-bold">Studio Break Mode</span>
                     </div>
                     <el-switch v-model="studioStore.visualSettings.breakMode.enabled" size="small" />
                 </div>
                 <div v-if="studioStore.visualSettings.breakMode.enabled" class="form-group animate-in slide-in-from-top-2">
                     <label class="text-[8px] opacity-40 uppercase font-black mb-1 block">Status Message</label>
                     <el-input v-model="studioStore.visualSettings.breakMode.message" size="small" class="glass-input" />
                 </div>
             </div>
         </section>
         <!-- Special Overlays (Phase 18) -->
         <section>
             <h4 class="text-xs font-black opacity-30 uppercase tracking-widest mb-4">SPECIAL_TEMPLATES</h4>
             <div class="space-y-3">
                 <div class="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between group hover:border-yellow-500/30 cursor-pointer"
                     @click="studioStore.visualSettings.specialOverlays.showSponsorship = !studioStore.visualSettings.specialOverlays.showSponsorship">
                     <div class="flex items-center gap-3">
                         <div class="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                             <chart-line theme="outline" size="16" class="text-yellow-400" />
                         </div>
                         <div class="flex flex-col">
                             <span class="text-[10px] font-bold">Sponsorship Badge</span>
                             <span class="text-[8px] opacity-40">Animated corner banner</span>
                         </div>
                     </div>
                     <el-switch v-model="studioStore.visualSettings.specialOverlays.showSponsorship" size="small" />
                 </div>
             </div>
         </section>
     </div>
</template>

<script setup lang="ts">
import { GraphicDesign, AlignTextLeftOne, ChartLine } from '@icon-park/vue-next';
import { useStudioStore } from '@/stores/studio';

const studioStore = useStudioStore();

defineProps<{
    branding: any;
    showLowerThird: boolean;
    showTicker: boolean;
}>();

defineEmits(['toggle-lower-third', 'toggle-ticker', 'update-branding']);
</script>
