<template>
    <el-card class="settings-section">
        <template #header>
            <div class="panel-header flex justify-between items-center">
                <span>License Activation</span>
                <span v-if="license?.info" :class="['status-badge', license.info.status]">
                    {{ license.info.status.toUpperCase() }}
                </span>
            </div>
        </template>

        <div class="license-info mb-6" v-if="license?.info">
            <div class="info-grid grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="info-item p-3 bg-white/5 rounded-xl border border-white/5">
                    <span class="label text-[10px] opacity-40 uppercase font-black block mb-1">Type</span>
                    <span class="value type-badge font-bold text-blue-400">{{ license.info.type.toUpperCase() }}</span>
                </div>
                <div class="info-item p-3 bg-white/5 rounded-xl border border-white/5">
                    <span class="label text-[10px] opacity-40 uppercase font-black block mb-1">Max Users</span>
                    <span class="value font-mono font-bold">{{ license.info.maxUsers == -1 ? 'Unlimited' :
                        license.info.maxUsers
                    }}</span>
                </div>
                <div class="info-item p-3 bg-white/5 rounded-xl border border-white/5">
                    <span class="label text-[10px] opacity-40 uppercase font-black block mb-1">Max Projects</span>
                    <span class="value font-mono font-bold">{{ license.info.maxProjects == -1 ? 'Unlimited' :
                        license.info.maxProjects }}</span>
                </div>
                <div class="info-item p-3 bg-white/5 rounded-xl border border-white/5">
                    <span class="label text-[10px] opacity-40 uppercase font-black block mb-1">Expires</span>
                    <span class="value font-bold">{{ license.info.endDate ? new
                        Date(license.info.endDate).toLocaleDateString()
                        : 'Never' }}</span>
                </div>
            </div>
        </div>

        <el-form label-position="top" v-if="license">
            <el-form-item label="License Key">
                <el-input v-model="license.key" placeholder="Enter your license key" show-password
                    class="glass-input" />
                <p class="mt-2 text-[10px] text-muted opacity-50 uppercase font-black">Enter your license key and click
                    "Save
                    All Changes" to activate full system capabilities.</p>
            </el-form-item>
        </el-form>
    </el-card>
</template>

<script setup lang="ts">
defineProps<{
    license: any;
}>();
</script>

<style scoped lang="scss">
.status-badge {
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 1px;

    &.active {
        background: rgba(34, 197, 94, 0.1);
        color: #22c55e;
    }

    &.expired {
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
    }

    &.pending {
        background: rgba(245, 158, 11, 0.1);
        color: #f59e0b;
    }
}
</style>
