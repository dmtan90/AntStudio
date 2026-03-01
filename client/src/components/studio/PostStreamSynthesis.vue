<template>
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-500">
        <div class="relative w-full max-w-4xl max-h-[90vh] overflow-hidden glass rounded-[32px] border border-white/10 shadow-2xl flex flex-col">
            
            <!-- Close Button -->
            <button @click="$emit('close')" class="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors z-10">
                <close theme="outline" size="20" class="opacity-50" />
            </button>

            <!-- Header -->
            <div class="p-8 border-b border-white/5">
                <div class="flex items-center gap-4 mb-2">
                    <div class="p-3 rounded-2xl bg-blue-500/20 text-blue-400">
                        <chart-line theme="filled" size="24" />
                    </div>
                    <div>
                        <h2 class="text-2xl font-black uppercase tracking-tight">{{ $t('studio.synthesis.title') }}</h2>
                        <p class="text-xs font-bold opacity-40 uppercase tracking-widest">{{ $t('studio.synthesis.subtitle') }}</p>
                    </div>
                </div>
            </div>

            <!-- Content Area -->
            <div class="flex-1 overflow-y-auto p-8 custom-scrollbar">
                
                <!-- Loading State -->
                <div v-if="loading" class="flex flex-col items-center justify-center py-20 animate-pulse">
                    <div class="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-6"></div>
                    <p class="text-lg font-black uppercase opacity-50 tracking-widest">{{ $t('studio.synthesis.loading') }}</p>
                </div>

                <!-- Report Content -->
                <div v-else class="space-y-12">
                    
                    <!-- Performance Overview -->
 
                     <!-- Commercial Success (Phase 17) -->
                     <section v-if="commerceReport" class="animate-in slide-in-from-bottom-4 duration-700 delay-200">
                         <h3 class="text-xs font-black opacity-30 uppercase tracking-widest mb-6">{{ $t('studio.synthesis.commercialSuccess') }}</h3>
                         <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                             <div class="p-6 rounded-3xl bg-green-500/5 border border-green-500/10 flex flex-col items-center text-center">
                                 <p class="text-[10px] font-black text-green-400/50 uppercase tracking-widest mb-2">{{ $t('studio.synthesis.totalRevenue') }}</p>
                                 <p class="text-3xl font-black text-green-400 tracking-tighter">{{ formatCurrency(commerceReport.totalRevenue, commerceReport.currency) }}</p>
                             </div>
                             <div class="p-6 rounded-3xl bg-blue-500/5 border border-blue-500/10 flex flex-col items-center text-center">
                                 <p class="text-[10px] font-black text-blue-400/50 uppercase tracking-widest mb-2">{{ $t('studio.synthesis.orders') }}</p>
                                 <p class="text-3xl font-black text-blue-400 tracking-tighter">{{ commerceReport.totalOrders }}</p>
                             </div>
                             <div class="p-6 rounded-3xl bg-purple-500/5 border border-purple-500/10 flex flex-col items-center text-center">
                                 <p class="text-[10px] font-black text-purple-400/50 uppercase tracking-widest mb-2">{{ $t('studio.synthesis.conversion') }}</p>
                                 <p class="text-3xl font-black text-purple-400 tracking-tighter">{{ conversionRate }}%</p>
                             </div>
                         </div>
 
                         <div v-if="commerceReport.topSellingProducts?.length > 0" class="space-y-4">
                             <div v-for="product in commerceReport.topSellingProducts" :key="product.name" 
                                  class="flex justify-between items-center p-4 rounded-2xl bg-white/5 border border-white/5">
                                 <div class="flex items-center gap-3">
                                     <div class="w-2 h-2 rounded-full bg-blue-500"></div>
                                     <span class="text-sm font-bold">{{ product.name }}</span>
                                 </div>
                                 <div class="flex items-center gap-6">
                                     <span class="text-xs font-bold opacity-40">{{ $t('studio.synthesis.units', { count: product.count }) }}</span>
                                     <span class="text-sm font-black">{{ formatCurrency(product.revenue, commerceReport.currency) }}</span>
                                 </div>
                             </div>
                         </div>
                     </section>

                    <!-- Growth Strategies -->
                    <section>
                        <h3 class="text-xs font-black opacity-30 uppercase tracking-widest mb-6">{{ $t('studio.synthesis.growthStrategies') }}</h3>
                        <div class="space-y-4">
                            <div v-for="(tip, idx) in report.growthTips" :key="idx" class="flex items-start gap-4 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10">
                                <div class="mt-1">
                                    <lamp theme="outline" size="18" class="text-blue-400" />
                                </div>
                                <p class="text-sm font-bold opacity-90">{{ tip }}</p>
                            </div>
                        </div>
                    </section>

                    <!-- Viral Clip Suggestions -->
                    <section v-if="captions.length > 0">
                        <h3 class="text-xs font-black opacity-30 uppercase tracking-widest mb-6">{{ $t('studio.synthesis.viralClipHub') }}</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div v-for="clip in captions" :key="clip.highlightId" class="group relative p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-blue-500/30 transition-all">
                                <div class="flex justify-between items-start mb-4">
                                    <div class="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                                        <video-file theme="outline" size="20" />
                                    </div>
                                    <button @click="copyCaption(clip)" class="text-[10px] font-black text-blue-400 uppercase tracking-widest hover:text-blue-300">
                                        {{ $t('studio.synthesis.copyHook') }}
                                    </button>
                                </div>
                                <p class="text-sm font-black mb-4 group-hover:text-blue-400 transition-colors">"{{ clip.caption }}"</p>
                                <div class="flex flex-wrap gap-2">
                                    <span v-for="tag in clip.hashtags" :key="tag" class="text-[9px] font-bold px-2 py-1 rounded-lg bg-white/5 opacity-40">
                                        #{{ tag }}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            <!-- Footer -->
            <div class="p-8 border-t border-white/5 flex justify-end gap-4">
                <button @click="$emit('close')" class="px-8 py-4 rounded-full font-black uppercase tracking-widest text-[11px] opacity-50 hover:opacity-100 transition-all">
                    {{ $t('studio.common.dismiss') }}
                </button>
                <button @click="$emit('export')" class="px-8 py-4 rounded-full bg-blue-500 font-black uppercase tracking-widest text-[11px] shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all">
                    {{ $t('studio.synthesis.finalizeExport') }}
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
import { Close, ChartLine, Lamp, VideoFile } from '@icon-park/vue-next';
import { toast } from 'vue-sonner';

const props = defineProps({
    loading: Boolean,
    report: {
        type: Object,
        default: () => ({
            highlights: '',
            audienceVibe: '',
            commercialImpact: '',
            growthTips: []
        })
    },
    commerceReport: {
        type: Object as any,
        default: null
    },
    captions: {
        type: Array as any,
        default: () => []
    },
    viewers: {
        type: Number,
        default: 0
    }
});

const conversionRate = computed(() => {
    if (!props.viewers || !props.commerceReport?.totalOrders) return 0;
    return ((props.commerceReport.totalOrders / props.viewers) * 100).toFixed(1);
});

const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'USD'
    }).format(amount || 0);
};

defineEmits(['close', 'export']);

const copyCaption = (clip: any) => {
    const text = `${clip.caption}\n\n#${clip.hashtags.join(' #')}`;
    navigator.clipboard.writeText(text);
    toast.success(t('studio.synthesis.toast.copied'));
};
</script>

<style scoped>
.glass {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%);
    backdrop-filter: blur(40px);
}

.custom-scrollbar::-webkit-scrollbar {
    width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
}
</style>
