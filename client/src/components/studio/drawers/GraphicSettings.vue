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
    </div>
</template>

<script setup lang="ts">
import { GraphicDesign, AlignTextLeftOne } from '@icon-park/vue-next';

defineProps<{
    branding: any;
    showLowerThird: boolean;
    showTicker: boolean;
}>();

defineEmits(['toggle-lower-third', 'toggle-ticker', 'update-branding']);
</script>
