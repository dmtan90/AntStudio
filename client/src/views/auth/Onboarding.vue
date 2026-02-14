<template>
    <div class="onboarding-page flex items-center justify-center min-height-screen">
        <!-- Background Elements -->
        <div class="macos-bg">
            <div class="blob blob-1"></div>
            <div class="blob blob-2"></div>
        </div>

        <div class="glass-container p-1 pt-1 overflow-hidden shadow-2xl">
            <!-- Sidebar (macOS Style) -->
            <div class="flex h-full w-[850px] min-h-[550px] bg-black/40 backdrop-blur-[50px]">
                <div class="w-1/3 border-r border-white/5 p-8 flex flex-col justify-between">
                    <div>
                        <div
                            class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 mb-8 shadow-lg shadow-blue-500/20">
                        </div>
                        <h2 class="text-xs font-black uppercase tracking-widest text-white/40 mb-2">Setup Assistant</h2>
                        <h1 class="text-xl font-bold text-white leading-tight">Initialize Your AntStudio</h1>
                    </div>

                    <div class="space-y-3">
                        <div v-for="s in [0, 1, 2, 3]" :key="s" class="flex items-center gap-3">
                            <div class="w-1.5 h-1.5 rounded-full transition-all duration-500"
                                :class="step === s ? 'bg-blue-500 scale-125' : 'bg-white/10'"></div>
                            <span class="text-[10px] uppercase font-bold tracking-tighter transition-all"
                                :class="step === s ? 'text-white' : 'text-white/20'">
                                {{ stepLabels[s] }}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Main Content Area -->
                <div class="flex-1 p-12 relative flex flex-col justify-center">

                    <!-- STEP 0: Regional & Language -->
                    <div v-if="step === 0" class="animate-macos-in">
                        <h2 class="text-3xl font-black mb-2 tracking-tight">Select Region</h2>
                        <p class="text-sm text-white/50 mb-10">Choose your primary language and region for localized
                            services.</p>

                        <div class="grid grid-cols-2 gap-4 mb-10">
                            <div v-for="lang in languages" :key="lang.code" @click="selectedLang = lang.code"
                                :class="['p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3',
                                    selectedLang === lang.code ? 'bg-white/10 border-blue-500/50' : 'bg-white/5 border-transparent hover:bg-white/8']">
                                <span class="text-2xl">{{ lang.flag }}</span>
                                <span class="font-bold text-sm">{{ lang.name }}</span>
                            </div>
                        </div>

                        <button @click="nextStep" class="macos-btn primary">Continue</button>
                    </div>

                    <!-- STEP 1: Owner Registration -->
                    <div v-if="step === 1" class="animate-macos-in">
                        <h2 class="text-3xl font-black mb-2 tracking-tight">Create Admin</h2>
                        <p class="text-sm text-white/50 mb-10">Register the supreme owner of this node.</p>
                        <div class="space-y-4">
                            <el-input v-model="ownerForm.name" placeholder="Full Name" />
                            <el-input v-model="ownerForm.email" placeholder="Email Address" />
                            <el-input v-model="ownerForm.password" type="password" placeholder="Secure Password" />
                            <button @click="registerOwner" :disabled="loading" class="macos-btn primary w-full mt-4">
                                {{ loading ? 'Creating...' : 'Initialize Identity' }}
                            </button>
                        </div>
                    </div>

                    <!-- STEP 2: License Activation -->
                    <div v-if="step === 2" class="animate-macos-in">
                        <h2 class="text-3xl font-black mb-2 tracking-tight">Activation</h2>
                        <p class="text-sm text-white/50 mb-10">Paste your high-fidelity license key to unlock features.
                        </p>
                        <div class="space-y-6">
                            <el-input v-model="licenseKey" placeholder="LIC-XXXX-XXXX" class="font-mono text-center" />
                            <button @click="activateLicense" :disabled="loading" class="macos-btn purple w-full">
                                {{ loading ? 'Validating...' : 'Authorize Registry' }}
                            </button>
                            <p
                                class="text-center text-[10px] font-bold text-white/30 uppercase tracking-widest cursor-pointer hover:text-white transition-colors">
                                Get a trial key
                            </p>
                        </div>
                    </div>

                    <!-- STEP 3: Calibration -->
                    <div v-if="step === 3" class="animate-macos-in">
                        <h2 class="text-3xl font-black mb-2 tracking-tight">Calibration</h2>
                        <p class="text-sm text-white/50 mb-10">Finalize storage and AI unit configuration.</p>
                        <div class="grid grid-cols-2 gap-4 mb-10">
                            <div
                                class="p-6 bg-white/5 rounded-3xl text-center border border-white/5 hover:border-green-500/30 transition-all cursor-pointer group">
                                <database-network theme="outline"
                                    class="mb-3 mx-auto text-white/20 group-hover:text-green-400" size="24" />
                                <p class="text-[10px] font-black uppercase text-white/40 group-hover:text-white">Cloud
                                    Storage</p>
                            </div>
                            <div
                                class="p-6 bg-white/5 rounded-3xl text-center border border-white/5 hover:border-blue-500/30 transition-all cursor-pointer group">
                                <brain theme="outline" class="mb-3 mx-auto text-white/20 group-hover:text-blue-400"
                                    size="24" />
                                <p class="text-[10px] font-black uppercase text-white/40 group-hover:text-white">VTuber
                                    Units</p>
                            </div>
                        </div>
                        <button @click="completeOnboarding" class="macos-btn success w-full">DEPLOY PRODUCTION
                            HUB</button>
                    </div>

                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { DatabaseNetwork, Brain, AtSign, Key, Config, DataServer } from '@icon-park/vue-next';
import { toast } from 'vue-sonner';
import { useTranslations } from '@/composables/useTranslations';
import { useUserStore } from '@/stores/user';
import { useLicenseStore } from '@/stores/license';

const router = useRouter();
const { setLocale } = useTranslations();
const userStore = useUserStore();
const licenseStore = useLicenseStore();

const step = ref(0);
const loading = ref(false);
const selectedLang = ref('en');

const stepLabels = ['Regional', 'Identity', 'Security', 'Finish'];

const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
    { code: 'ja', name: 'Japanese', flag: '🇯🇵' }
];

const ownerForm = ref({ name: '', email: '', password: '' });
const licenseKey = ref('');

const nextStep = () => {
    if (step.value === 0) {
        setLocale(selectedLang.value as any);
    }
    step.value++;
};

const registerOwner = async () => {
    loading.value = true;
    try {
        await userStore.registerOwner(ownerForm.value);
        toast.success('Identity established. Authenticating registry...');
        step.value = 2;
    } catch (e: any) {
        toast.error(e.response?.data?.error || 'Registration failed');
    } finally { loading.value = false; }
};

const activateLicense = async () => {
    loading.value = true;
    try {
        await licenseStore.activateLicense({ key: licenseKey.value });
        toast.success('VTuber handshake established. Tier confirmed.');
        step.value = 3;
    } catch (e: any) {
        toast.error(e.response?.data?.error || 'License activation failed');
    } finally { loading.value = false; }
};

const completeOnboarding = () => {
    toast.success('AntStudio Edge is now mission-ready!');
    router.push('/dashboard');
};
</script>

<style lang="scss" scoped>
.onboarding-page {
    min-height: 100vh;
    background: radial-gradient(circle at center, #0a0a0c 0%, #000 100%);
    overflow: hidden;
    position: relative;
    font-family: 'Inter', sans-serif;
}

.macos-bg {
    position: absolute;
    inset: 0;
    z-index: 0;

    .blob {
        position: absolute;
        width: 600px;
        height: 600px;
        border-radius: 50%;
        filter: blur(100px);
        opacity: 0.15;
    }

    .blob-1 {
        background: #3b82f6;
        top: -100px;
        left: -100px;
    }

    .blob-2 {
        background: #8b5cf6;
        bottom: -100px;
        right: -100px;
    }
}

.glass-container {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3.5rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(40px);
    z-index: 10;
}

.macos-btn {
    padding: 14px 28px;
    border-radius: 14px;
    font-weight: 800;
    font-size: 13px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: none;
    cursor: pointer;

    &.primary {
        background: #fff;
        color: #000;

        &:hover {
            opacity: 0.9;
            transform: translateY(-1px);
        }
    }

    &.purple {
        background: #8b5cf6;
        color: #fff;

        &:hover {
            background: #a78bfa;
        }
    }

    &.success {
        background: #10b981;
        color: #fff;
    }
}

.animate-macos-in {
    animation: macos-slide-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes macos-slide-up {
    from {
        opacity: 0;
        transform: translateY(30px) scale(0.95);
    }

    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

:deep(.el-input__wrapper) {
    background: rgba(255, 255, 255, 0.05) !important;
    border-radius: 12px !important;
    padding: 12px 16px !important;
    font-weight: 600;
}
</style>
