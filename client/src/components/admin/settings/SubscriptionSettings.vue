<template>
    <div class="subscription-settings space-y-8 animate-in">
        <!-- Membership Plans -->
        <section>
            <div class="section-title text-xs font-black uppercase tracking-widest opacity-40 mb-6 px-4">Membership
                Plans</div>
            <div class="plans-grid grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div v-for="(plan, index) in plans" :key="index" class="settings-section plan-card cinematic-panel p-6">
                    <div class="panel-header mb-6">
                        <el-input v-model="plan.name" size="small" class="glass-input text-lg font-black" />
                    </div>
                    <div class="plan-form space-y-6">
                        <div class="grid grid-cols-2 gap-4">
                            <div class="form-group">
                                <label class="text-[9px] opacity-40 uppercase font-black mb-2 block">Monthly Price
                                    ($)</label>
                                <el-input-number v-model="plan.price" :min="0" :precision="2"
                                    class="w-full glass-input-number" />
                            </div>
                            <div class="form-group">
                                <label class="text-[9px] opacity-40 uppercase font-black mb-2 block">Yearly Price
                                    ($)</label>
                                <el-input-number v-model="plan.yearlyPrice" :min="0" :precision="2"
                                    class="w-full glass-input-number" />
                            </div>
                        </div>
                        <div class="limits-section p-4 bg-white/5 rounded-2xl border border-white/5">
                            <p class="text-[8px] font-black uppercase opacity-30 mb-4 tracking-widest text-center">Plan
                                Quotas</p>
                            <div class="form-group mb-4">
                                <label class="text-[9px] opacity-40 uppercase font-black mb-2 block">Monthly
                                    Credits</label>
                                <el-input-number v-model="plan.features.monthlyCredits" :min="0"
                                    class="w-full glass-input-number" />
                            </div>
                            <div class="form-group checkbox flex items-center justify-between">
                                <span class="text-[10px] font-bold">Priority Support Engaged</span>
                                <el-checkbox v-model="plan.features.prioritySupport" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <el-divider />

        <!-- Credit Packages -->
        <section>
            <div class="flex justify-between items-center mb-6 px-4">
                <div class="section-title text-xs font-black uppercase tracking-widest opacity-40">Credit Packages</div>
                <el-button type="primary" plain bg round size="small" @click="$emit('add-package')">Add Neural
                    Pack</el-button>
            </div>

            <div class="plans-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div v-for="(pkg, idx) in creditPackages" :key="idx"
                    class="settings-section plan-card cinematic-panel p-6">
                    <div class="panel-header flex justify-between items-center mb-6">
                        <el-input v-model="pkg.name" size="small" class="glass-input font-bold"
                            placeholder="Package Name" />
                        <button class="icon-btn-sm text-red-500" @click="$emit('remove-package', idx)">
                            <delete theme="outline" size="14" />
                        </button>
                    </div>
                    <div class="plan-form space-y-4">
                        <div class="form-group">
                            <label class="text-[8px] opacity-40 uppercase font-black mb-1 block">Credits Volume</label>
                            <el-input-number v-model="pkg.credits" :min="100" class="w-full glass-input-number" />
                        </div>
                        <div class="form-group">
                            <label class="text-[8px] opacity-40 uppercase font-black mb-1 block">Price ($)</label>
                            <el-input-number v-model="pkg.price" :min="0" :precision="2"
                                class="w-full glass-input-number" />
                        </div>
                        <div
                            class="form-group checkbox flex items-center justify-between bg-white/3 p-2 rounded-xl mt-4">
                            <span class="text-[9px] font-black uppercase opacity-60">Package Active</span>
                            <el-switch v-model="pkg.isActive" size="small" />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </div>
</template>

<script setup lang="ts">
import { Delete } from '@icon-park/vue-next';

defineProps<{
    plans: any[];
    creditPackages: any[];
}>();

defineEmits(['add-package', 'remove-package']);
</script>

<style scoped lang="scss">
.cinematic-panel {
    background: rgba(255, 255, 255, 0.02);
    border-radius: 32px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    overflow: hidden;
}

.icon-btn-sm {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
}

:deep(.glass-input-number) {
    .el-input__wrapper {
        background: rgba(255, 255, 255, 0.03) !important;
        box-shadow: none !important;
        border: 1px solid rgba(255, 255, 255, 0.05) !important;
    }
}
</style>
