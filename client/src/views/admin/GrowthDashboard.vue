<template>
    <div class="growth-dashboard p-6 animate-in">
        <header class="page-header mb-10 flex justify-between items-start">
            <div>
                <h1 class="text-3xl font-black text-white tracking-tight mb-2">{{ t('admin.growth.title') }}</h1>
                <p class="text-gray-400 uppercase text-[10px] font-bold tracking-widest">{{ t('admin.growth.subtitle') }}</p>
            </div>
            <div class="flex items-center gap-4">
                <span
                    class="text-[10px] font-black px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full uppercase">{{ t('admin.growth.status.liveOptimizing') }}</span>
            </div>
        </header>

        <div class="grid grid-cols-12 gap-8">
            <!-- TOP: Quick Stats -->
            <div class="col-span-12 grid grid-cols-1 md:grid-cols-4 gap-6">
                <div class="stat-card glass-card p-6 rounded-3xl border border-white/5">
                    <p class="text-[10px] font-black opacity-30 uppercase mb-2">{{ t('admin.growth.stats.impressions') }}</p>
                    <h2 class="text-2xl font-black">1.2M</h2>
                    <p class="text-[10px] text-green-400 font-bold mt-1">{{ t('admin.growth.stats.vsPrevWeek', { n: '+12.4' }) }}</p>
                </div>
                <div class="stat-card glass-card p-6 rounded-3xl border border-white/5">
                    <p class="text-[10px] font-black opacity-30 uppercase mb-2">{{ t('admin.growth.stats.conversion') }}</p>
                    <h2 class="text-2xl font-black">3.8%</h2>
                    <p class="text-[10px] text-yellow-400 font-bold mt-1">{{ t('admin.growth.stats.abWinner') }}</p>
                </div>
                <div class="stat-card glass-card p-6 rounded-3xl border border-white/5">
                    <p class="text-[10px] font-black opacity-30 uppercase mb-2">{{ t('admin.growth.stats.discoveryIndex') }}</p>
                    <h2 class="text-2xl font-black">8.4</h2>
                    <p class="text-[10px] text-blue-400 font-bold mt-1">{{ t('admin.growth.stats.seoHealth') }}</p>
                </div>
                <div class="stat-card glass-card p-6 rounded-3xl border border-white/5">
                    <p class="text-[10px] font-black opacity-30 uppercase mb-2">{{ t('admin.growth.stats.viralVelocity') }}</p>
                    <h2 class="text-2xl font-black">14.2</h2>
                    <p class="text-[10px] text-purple-400 font-bold mt-1">{{ t('admin.growth.stats.clippingEngine') }}</p>
                </div>
            </div>

            <!-- LEFT: A/B Testing Orchestration -->
            <div class="col-span-12 lg:col-span-8 space-y-8">
                <section
                    class="glass-card p-8 rounded-3xl border border-white/5 bg-gradient-to-br from-white/5 to-transparent">
                    <div class="flex justify-between items-center mb-8">
                        <h3 class="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                            <chart-pie theme="outline" /> {{ t('admin.growth.abTesting.missionTitle') }}
                        </h3>
                        <el-button type="primary" size="small" class="create-btn">{{ t('admin.growth.abTesting.newTest') }}</el-button>
                    </div>

                    <div class="space-y-4">
                        <div v-for="test in activeTests" :key="test.id"
                            class="p-6 bg-black/40 border border-white/5 rounded-2xl">
                            <div class="flex justify-between items-center mb-6">
                                <div>
                                    <h4 class="text-lg font-bold">{{ test.name }}</h4>
                                    <p class="text-[10px] opacity-40 uppercase">{{ test.status }} • {{ test.startDate }}
                                    </p>
                                </div>
                                <div class="flex gap-2">
                                    <span
                                        class="px-3 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-black rounded-lg border border-blue-500/20">{{ t('admin.growth.abTesting.variantA') }}</span>
                                    <span
                                        class="px-3 py-1 bg-purple-500/10 text-purple-400 text-[10px] font-black rounded-lg border border-purple-500/20">{{ t('admin.growth.abTesting.variantB') }}</span>
                                </div>
                            </div>

                            <div class="grid grid-cols-2 gap-10 h-2 bg-white/5 rounded-full overflow-hidden mb-2">
                                <div :style="{ width: test.conversionA + '%' }"
                                    class="bg-blue-500 shadow-[0_0_10px_#3b82f6]"></div>
                                <div :style="{ width: test.conversionB + '%' }"
                                    class="bg-purple-500 shadow-[0_0_10px_#a855f7]"></div>
                            </div>
                            <div class="flex justify-between text-[10px] font-black uppercase opacity-40">
                                <span>{{ t('admin.growth.abTesting.crLabel', { n: 'A: ' + test.conversionA }) }}</span>
                                <span>{{ t('admin.growth.abTesting.crLabel', { n: 'B: ' + test.conversionB }) }}</span>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <!-- RIGHT: SEO Discovery Engine -->
            <div class="col-span-12 lg:col-span-4 space-y-8">
                <section class="glass-card p-8 rounded-3xl border border-white/5">
                    <h3 class="text-sm font-black uppercase tracking-widest mb-6">{{ t('admin.growth.seo.engine') }}</h3>
                    <div class="space-y-6">
                        <div class="seo-entry flex items-center gap-4">
                            <div
                                class="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400 border border-green-500/20">
                                <check-one />
                            </div>
                            <div class="flex-1">
                                <p class="text-[10px] font-bold">{{ t('admin.growth.seo.schema') }}</p>
                                <p class="text-[8px] opacity-40 uppercase">{{ t('admin.growth.getStarted') || t('admin.growth.seo.verified') }}</p>
                            </div>
                        </div>
                        <div class="seo-entry flex items-center gap-4">
                            <div
                                class="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                                <share-two />
                            </div>
                            <div class="flex-1">
                                <p class="text-[10px] font-bold">{{ t('admin.growth.seo.socialMeta') }}</p>
                                <p class="text-[8px] opacity-40 uppercase">{{ t('admin.growth.seo.tagsActive') }}</p>
                            </div>
                        </div>
                        <div class="seo-entry flex items-center gap-4 opacity-40">
                            <div
                                class="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
                                <loading-one class="animate-spin" />
                            </div>
                            <div class="flex-1">
                                <p class="text-[10px] font-bold">{{ t('admin.growth.seo.autoIndex') }}</p>
                                <p class="text-[8px] uppercase">{{ t('admin.growth.seo.calibrating', { n: 64 }) }}</p>
                            </div>
                        </div>
                    </div>

                    <div class="mt-10 pt-8 border-t border-white/5">
                        <h4 class="text-[8px] font-black uppercase opacity-30 mb-4 tracking-widest">{{ t('admin.growth.seo.topKeywords') }}</h4>
                        <div class="flex flex-wrap gap-2">
                            <span v-for="kw in keywords" :key="kw"
                                class="px-2 py-1 bg-black/40 border border-white/5 rounded text-[8px] font-black uppercase opacity-60">{{
                                kw }}</span>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ChartPie, CheckOne, LoadingOne, ShareTwo } from '@icon-park/vue-next';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const activeTests = ref([
    { id: '1', name: 'Phase 14 Hero Conversion', status: 'Running', startDate: '2026-01-20', conversionA: 14.2, conversionB: 18.5 },
    { id: '2', name: 'Pricing Page Tactical Layout', status: 'Running', startDate: '2026-01-22', conversionA: 4.1, conversionB: 3.8 }
]);

const keywords = ref(['AI Studio', 'Autonomous Streaming', 'VEO 3.1', 'VTuber Production', 'Live AI Translation', 'Virtual Media Hub']);
</script>

<style lang="scss" scoped>
.growth-dashboard {
    min-height: 100vh;
    background: radial-gradient(circle at bottom right, rgba(16, 185, 129, 0.05), transparent 40%);
}

.glass-card {
    backdrop-filter: blur(40px);
    background: rgba(255, 255, 255, 0.02);
}

.create-btn {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    border: none;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 1px;
}
</style>
