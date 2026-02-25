<template>
    <header class="studio-header glass-dark">
        <div class="header-left">
            <div class="live-indicator" :class="{ 'active': isLive }">
                <div class="orb"></div>
                <span>{{ isLive ? 'LIVE' : 'READY' }}</span>
            </div>
            <div class="timer" v-if="isLive">{{ formatTime(liveTime) }}</div>
        </div>
        <div class="header-center">
            <div class="flex flex-col items-center max-w-[500px] w-full">
                <span class="text-[9px] font-black uppercase tracking-widest opacity-20 mb-1">Professional Studio</span>
                
                <div class="metadata-container relative w-full flex flex-col items-center">
                    <!-- Title Editing -->
                    <el-popover placement="bottom" :width="320" trigger="hover" popper-class="studio-popover">
                        <template #reference>
                            <div class="relative group w-full flex justify-center">
                                <input v-if="editingTitle" ref="titleInput" v-model="localTitle" @blur="saveTitle"
                                    @keyup.enter="saveTitle" 
                                    class="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-center text-sm font-black uppercase tracking-wider text-white outline-none focus:border-blue-500/50 w-full" />
                                <h2 v-else @click="startEditingTitle"
                                    class="stream-title text-sm font-black uppercase tracking-widest cursor-pointer hover:text-blue-400 transition-all text-center truncate px-4">
                                    {{ title }}
                                </h2>
                            </div>
                        </template>
                        <!-- Description Segment (Visible on hover or edit) -->
                        <div class="description-section mt-1 w-full overflow-hidden h-auto opacity-100 transition-all duration-300" >
                            <textarea v-if="editingDescription" ref="descriptionInput" v-model="localDescription" @blur="saveDescription"
                                class="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-white/80 outline-none focus:border-blue-500/50 w-full resize-none h-20"
                                placeholder="Add stream description..."></textarea>
                            <p v-else @click="startEditingDescription"
                                class="text-center italic cursor-pointer hover:text-blue-400 truncate px-8">
                                {{ description || 'No description provided' }}
                            </p>
                        </div>
                    </el-popover>
                </div>
            </div>
        </div>
        <div class="header-right">
            <!-- Swarm Button -->
            <div class="god-mode-indicator mr-2" :class="{ active: showSwarmMonitor, 'pulse': showSwarmMonitor }" @click="$emit('toggle-swarm')">
                <connection-point theme="outline" size="14" />
                <span class="text-[9px] font-black uppercase">Swarm</span>
            </div>

            <!-- God Mode Button with Log Popover -->
            <el-popover placement="bottom" :width="320" trigger="hover" popper-class="studio-popover" :disabled="!isGodMode">
                <template #reference>
                    <div class="god-mode-indicator" :class="{ active: isGodMode }" @click="$emit('toggle-god-mode')">
                        <robot theme="outline" size="14" />
                        <span class="text-[9px] font-black uppercase">God Mode: {{ isGodMode ? 'ENGAGED' : 'OFF' }}</span>
                        <div v-if="isGodMode" class="scanline"></div>
                    </div>
                </template>
                <div class="popover-content">
                    <div class="flex items-center justify-between mb-3">
                        <h3 class="text-xs font-black uppercase tracking-widest text-blue-400">Director's Log</h3>
                        <div class="flex items-center gap-2">
                             <span class="text-[8px] text-white/40">Throttling</span>
                             <div class="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                                <div class="h-full bg-blue-500" style="width: 60%"></div>
                             </div>
                        </div>
                    </div>
                    <div class="log-list max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        <div v-for="(log, i) in directorLog" :key="i" class="log-item mb-2 last:mb-0">
                            <div class="flex justify-between items-start mb-0.5">
                                <span class="text-[10px] font-bold text-white/80">{{ log.action }}</span>
                                <span class="text-[8px] text-white/30">{{ formatLogTime(log.timestamp) }}</span>
                            </div>
                            <p class="text-[9px] text-white/50 leading-tight">{{ log.reason }}</p>
                        </div>
                        <div v-if="!directorLog.length" class="py-4 text-center opacity-30">
                            <span class="text-[10px]">Awaiting AI decisions...</span>
                        </div>
                    </div>
                </div>
            </el-popover>

            <button class="exit-btn" 
                :class="{ 'text-yellow-400 border-yellow-400/50 bg-yellow-500/10': autoEmotionEnabled }"
                @click="$emit('toggle-auto-emotion')"
                title="Auto-Emotion">
                <face-recognition theme="outline" size="18" />
            </button>

            <!-- Demo Mode with Popover -->
            <el-popover placement="bottom" :width="200" trigger="hover" popper-class="studio-popover" :disabled="!demoMode">
                <template #reference>
                    <button class="exit-btn" title="Demo Mode"
                        :class="{ 'text-purple-400 border-purple-400/50 bg-purple-500/10': demoMode }"
                        @click="$emit('toggle-demo')">
                        <magic theme="outline" size="18" />
                    </button>
                </template>
                <div class="popover-content">
                    <h3 class="text-xs font-black uppercase tracking-widest text-purple-400 mb-2">Demo Statistics</h3>
                    <div class="flex flex-col gap-2">
                        <div class="flex justify-between text-[10px]">
                            <span class="opacity-50">Mock Viewers</span>
                            <span class="font-mono text-purple-300">1.2K</span>
                        </div>
                        <div class="flex justify-between text-[10px]">
                            <span class="opacity-50">Heartbeat</span>
                            <span class="text-green-400">OPTIMAL</span>
                        </div>
                        <div class="mt-2 pt-2 border-t border-white/5">
                            <p class="text-[9px] text-white/40 leading-tight italic">
                                * Streaming is simulated in Demo Mode. External platforms are not receiving data.
                            </p>
                        </div>
                    </div>
                </div>
            </el-popover>

            <button class="exit-btn" title="Auto-Atmosphere"
                :class="{ 'text-orange-400 border-orange-400/50 bg-orange-500/10': autoAtmosphereEnabled }"
                @click="$emit('toggle-auto-atmosphere')">
                <sun-one theme="outline" size="18" />
            </button>
            <button class="exit-btn" @click="$emit('exit')">
                <close theme="outline" size="18" />
            </button>
        </div>
    </header>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue';
import { Robot, Close, Magic, ConnectionPoint, FaceRecognition, SunOne } from '@icon-park/vue-next';

interface DirectorLogEntry {
    action: string;
    reason: string;
    timestamp: number;
}

const props = defineProps<{
    isLive: boolean;
    liveTime: number;
    isGodMode: boolean;
    demoMode: boolean;
    title: string;
    description: string;
    showSwarmMonitor: boolean;
    autoEmotionEnabled: boolean;
    autoAtmosphereEnabled: boolean;
    directorLog?: DirectorLogEntry[];
}>();

const emit = defineEmits([
    'toggle-god-mode', 'exit', 'toggle-demo', 'update:title', 'update:description',
    'toggle-swarm', 'toggle-auto-emotion', 'toggle-auto-atmosphere'
]);

const editingTitle = ref(false);
const editingDescription = ref(false);
const localTitle = ref(props.title);
const localDescription = ref(props.description);
const titleInput = ref<HTMLInputElement | null>(null);
const descriptionInput = ref<HTMLTextAreaElement | null>(null);

// Watch for prop changes to sync local state
watch(() => props.title, (newVal) => localTitle.value = newVal);
watch(() => props.description, (newVal) => localDescription.value = newVal);

const startEditingTitle = () => {
    localTitle.value = props.title;
    editingTitle.value = true;
    nextTick(() => {
        titleInput.value?.focus();
        titleInput.value?.select();
    });
};

const saveTitle = () => {
    if (localTitle.value.trim() && localTitle.value !== props.title) {
        emit('update:title', localTitle.value.trim());
    }
    editingTitle.value = false;
};

const startEditingDescription = () => {
    localDescription.value = props.description;
    editingDescription.value = true;
    nextTick(() => {
        descriptionInput.value?.focus();
    });
};

const saveDescription = () => {
    if (localDescription.value !== props.description) {
        emit('update:description', localDescription.value);
    }
    editingDescription.value = false;
};

const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map(v => v < 10 ? '0' + v : v).filter((v, i) => v !== '00' || i > 0).join(':');
};

const formatLogTime = (ts: number) => {
    const date = new Date(ts);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
}
</script>

<style scoped lang="scss">
.studio-header {
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 32px;
    background: rgba(10, 10, 10, 0.4);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    z-index: 1000;

    .header-left,
    .header-right {
        min-width: 280px;
        display: flex;
        align-items: center;
        gap: 16px;
    }

    .header-right {
        justify-content: flex-end;
    }

    .live-indicator {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 6px 16px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 100px;
        font-size: 10px;
        font-weight: 950;
        letter-spacing: 0.2em;
        text-transform: uppercase;

        .orb {
            width: 8px;
            height: 8px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 50%;
            transition: all 0.3s;
        }

        &.active {
            color: #ff4d4f;
            background: rgba(255, 77, 79, 0.05);
            border-color: rgba(255, 77, 79, 0.2);

            .orb {
                background: #ff4d4f;
                box-shadow: 0 0 10px #ff4d4f;
                animation: pulse 2s infinite;
            }
        }
    }

    .timer {
        font-family: 'Fira Code', monospace;
        font-size: 13px;
        font-weight: 700;
        opacity: 0.4;
        letter-spacing: -0.5px;
    }

    .metadata-container {
        padding: 6px 16px;
        border-radius: 1rem;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border: 1px solid transparent;
        
        &:hover {
            background: rgba(255, 255, 255, 0.03);
            border-color: rgba(255, 255, 255, 0.05);
        }
    }

    .stream-title {
        font-size: 14px;
        font-weight: 950;
        text-transform: uppercase;
        letter-spacing: 0.2em;
        color: rgba(255, 255, 255, 0.9);
        text-align: center;
        max-width: 500px;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    .description-section {
        max-width: 400px;
    }

    .god-mode-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 16px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        cursor: pointer;
        position: relative;
        overflow: hidden;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

        &:hover {
            border-color: rgba(255, 255, 255, 0.3);
            background: rgba(255, 255, 255, 0.08);
        }

        &.active {
            background: rgba(30, 64, 175, 0.2);
            border-color: #3b82f6;
            color: #3b82f6;
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.2);
        }

        &.pulse {
            animation: swarm-pulse 3s infinite;
        }
    }

    .exit-btn {
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #fff;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;

        &:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.3);
            transform: translateY(-1px);
        }
    }
}

.studio-popover {
    background: rgba(13, 13, 13, 0.95) !important;
    backdrop-filter: blur(20px) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    border-radius: 16px !important;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8) !important;
    padding: 16px !important;
    color: white !important;

    .popover-content {
        .log-item {
            padding: 8px;
            background: rgba(255, 255, 255, 0.03);
            border-radius: 8px;
            border-left: 2px solid #3b82f6;
        }
    }
}

/* Custom Scrollbar */
.custom-scrollbar {
    &::-webkit-scrollbar {
        width: 4px;
    }
    &::-webkit-scrollbar-track {
        background: transparent;
    }
    &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
        &:hover {
            background: rgba(255, 255, 255, 0.2);
        }
    }
}

@keyframes pulse {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.5); opacity: 0.5; }
    100% { transform: scale(1); opacity: 1; }
}

@keyframes swarm-pulse {
    0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
    70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
    100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
}

.scanline {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 2px;
    background: rgba(59, 130, 246, 0.4);
    animation: scan 2s linear infinite;
    pointer-events: none;
}

@keyframes scan {
    from { transform: translateY(-10px); }
    to { transform: translateY(50px); }
}

/* Transitions */
.graphic-slide-enter-active, .graphic-slide-leave-active {
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
.graphic-slide-enter-from, .graphic-slide-leave-to {
    transform: translateY(20px);
    opacity: 0;
}
</style>
