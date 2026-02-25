<template>
    <div class="whiteboard-launchpad w-full h-full flex flex-col items-center justify-center bg-black/40 backdrop-blur-xl rounded-[2rem] border border-white/5 overflow-hidden p-12">
        <div class="text-center mb-12 animate-fade-in">
             <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 mb-6">
                 <div class="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
                 <span class="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em]">Whiteboard Engine</span>
             </div>
             <h2 class="text-4xl font-black text-white mb-4 tracking-tighter">Collaborative Workspace</h2>
             <p class="text-white/40 text-sm max-w-md mx-auto">Share your slides to collaborate with your audience.</p>
        </div>

        <div class="text-center">
            <!-- Screen Share -->
            <!-- <button @click="$emit('share-screen')" class="launch-card group">
                <div class="icon-box">
                    <monitor theme="outline" size="32" class="group-hover:scale-110 transition-transform" />
                </div>
                <div class="flex flex-col gap-0.5">
                    <span class="label">Screen Share</span>
                    <span class="sub-label">Window Capture</span>
                </div>
            </button> -->

            <!-- Import PDF -->
            <button @click="$emit('import-file', 'pdf')" class="launch-card group text-center flex flex-row justify-center">
                <div class="icon-box">
                    <file-pdf theme="outline" size="32" class="group-hover:scale-110 transition-transform" />
                </div>
                <div class="flex flex-col gap-0.5 justify-center">
                    <span class="label">Import PPT/PDF</span>
                    <span class="sub-label">Slides & Docs</span>
                </div>
            </button>

            <!-- Import PPT -->
            <!-- <button @click="$emit('import-file', 'ppt')" class="launch-card group">
                <div class="icon-box">
                    <file-ppt theme="outline" size="32" class="group-hover:scale-110 transition-transform" />
                </div>
                <div class="flex flex-col gap-0.5">
                    <span class="label">Import PPT</span>
                    <span class="sub-label">Presentation</span>
                </div>
            </button> -->

            <!-- Import Video -->
            <!-- <button @click="$emit('import-file', 'video')" class="launch-card group">
                <div class="icon-box">
                    <video-two theme="outline" size="32" class="group-hover:scale-110 transition-transform" />
                </div>
                <div class="flex flex-col gap-0.5">
                    <span class="label">Import Video</span>
                    <span class="sub-label">Media & Reels</span>
                </div>
            </button> -->
        </div>

        <!-- Hint -->
        <div class="mt-16 flex items-center gap-6 opacity-20 hover:opacity-100 transition-opacity">
            <div class="flex items-center gap-2">
                <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
                <span class="text-[8px] font-bold text-white uppercase tracking-widest">Collaborative</span>
            </div>
            <div class="flex items-center gap-2">
                <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
                <span class="text-[8px] font-bold text-white uppercase tracking-widest">Interactive</span>
            </div>
            <div class="flex items-center gap-2">
                <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
                <span class="text-[8px] font-bold text-white uppercase tracking-widest">AI Powered</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { Monitor, FilePdf, FilePpt, VideoTwo } from '@icon-park/vue-next'

defineEmits<{
    (e: 'share-screen'): void
    (e: 'import-file', type: 'pdf' | 'ppt' | 'video'): void
}>()
</script>

<style lang="scss" scoped>
.whiteboard-launchpad {
    box-shadow: 0 0 100px rgba(0,0,0,0.5), inset 0 0 50px rgba(255,255,255,0.02);
}

.launch-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 2rem;
    padding: 2rem 1.5rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 1.5rem;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    
    &:hover {
        background: rgba(249, 115, 22, 0.1);
        border-color: rgba(249, 115, 22, 0.3);
        transform: translateY(-8px);
        box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        
        .icon-box {
            background: rgba(249, 115, 22, 0.2);
            color: #f97316;
            box-shadow: 0 0 20px rgba(249, 115, 22, 0.2);
        }
        
        .label {
            color: #fff;
        }
    }
    
    .icon-box {
        width: 64px;
        height: 64px;
        border-radius: 1.25rem;
        background: rgba(255, 255, 255, 0.05);
        display: flex;
        align-items: center;
        justify-content: center;
        color: rgba(255, 255, 255, 0.4);
        transition: all 0.4s ease;
    }
    
    .label {
        font-size: 14px;
        font-weight: 800;
        color: rgba(255, 255, 255, 0.8);
        text-align: center;
        transition: all 0.4s ease;
    }
    
    .sub-label {
        font-size: 8px;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.2);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        text-align: center;
    }
}

.animate-fade-in {
    animation: fadeIn 0.8s ease-out forwards;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>
