<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { 
  PreviewOpen as Eye, 
  PreviewCloseOne as EyeOff, 
  Lock, 
  Unlock,
  MoveOne as LayerIcon,
  GraphicDesign as ShapeIcon,
  Text as TextIcon,
  Picture as ImageIcon,
  VideoTwo as VideoIcon,
  Delete as TrashIcon
} from '@icon-park/vue-next';
import { useCanvasStore } from 'video-editor/store/canvas';
import { storeToRefs } from "pinia";
import { cn } from '@/utils/ui';

const canvasStore = useCanvasStore();
const { canvas, selectionActive: selected } = storeToRefs(canvasStore);

const objects = ref<any[]>([]);

const updateObjects = () => {
    if (!canvas.value?.instance) return;
    // Get objects and reverse them so the top layer is at the top of the list
    objects.value = [...canvas.value.instance.getObjects()].reverse();
};

const getIcon = (type: string) => {
    switch (type) {
        case 'textbox': return TextIcon;
        case 'image': return ImageIcon;
        case 'video': return VideoIcon;
        case 'rect':
        case 'circle':
        case 'triangle': return ShapeIcon;
        default: return LayerIcon;
    }
};

const toggleVisibility = (obj: any) => {
    obj.set('visible', !obj.visible);
    canvas.value.instance.renderAll();
    updateObjects();
};

const toggleLock = (obj: any) => {
    const isLocked = obj.lockMovementX;
    obj.set({
        lockMovementX: !isLocked,
        lockMovementY: !isLocked,
        lockScalingX: !isLocked,
        lockScalingY: !isLocked,
        lockRotation: !isLocked,
        hasControls: isLocked,
    });
    canvas.value.instance.renderAll();
    updateObjects();
};

const selectObject = (obj: any) => {
    canvas.value.instance.setActiveObject(obj);
    canvas.value.instance.renderAll();
};

const deleteObject = (obj: any) => {
    canvas.value.instance.remove(obj);
    canvas.value.instance.renderAll();
    updateObjects();
};

let timer: any = null;
onMounted(() => {
    updateObjects();
    // Simple polling for object updates if no clear event is available
    timer = setInterval(updateObjects, 1000);
});

onUnmounted(() => {
    if (timer) clearInterval(timer);
});

// Watch for selection changes to update the list
watch(selected, updateObjects);

</script>

<template>
  <section class="flex flex-col h-full overflow-y-auto custom-scrollbar relative px-5 pt-4 pb-20">
    <!-- Top Fade -->
    <div class="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-[#0a0a0a] to-transparent z-10 pointer-events-none opacity-40"></div>

    <div class="flex flex-col gap-2">
      <template v-if="objects.length === 0">
        <div class="flex flex-col items-center justify-center py-20 opacity-20">
            <LayerIcon :size="40" :stroke-width="2" />
            <span class="mt-4 text-[10px] font-bold uppercase tracking-[0.2em]">No Layers Found</span>
        </div>
      </template>
      <template v-else>
        <div 
            v-for="(obj, i) in objects" 
            :key="obj.id || i"
            @click="selectObject(obj)"
            :class="cn(
                'group flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 cursor-pointer',
                selected?.id === obj.id 
                    ? 'bg-brand-primary/10 border-brand-primary/30 shadow-lg shadow-brand-primary/5' 
                    : 'bg-white/2 border-white/5 hover:bg-white/5 hover:border-white/20'
            )"
        >
            <!-- Icon -->
            <div :class="cn(
                'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                selected?.id === obj.id ? 'bg-brand-primary text-white' : 'bg-white/5 text-white/40'
            )">
                <component :is="getIcon(obj.type)" :size="14" />
            </div>

            <!-- Name -->
            <div class="flex-1 min-w-0">
                <span :class="cn(
                    'text-[11px] font-bold uppercase tracking-wider truncate block',
                    selected?.id === obj.id ? 'text-white' : 'text-white/60'
                )">
                    {{ obj.name || obj.type || 'Unnamed Layer' }}
                </span>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                    @click.stop="toggleVisibility(obj)"
                    :class="cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center transition-all',
                        !obj.visible ? 'text-brand-primary bg-brand-primary/10' : 'text-white/30 hover:text-white hover:bg-white/10'
                    )"
                    :title="obj.visible ? 'Hide' : 'Show'"
                >
                    <Eye v-if="obj.visible" :size="12" />
                    <EyeOff v-else :size="12" />
                </button>
                <button 
                    @click.stop="toggleLock(obj)"
                    :class="cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center transition-all',
                        obj.lockMovementX ? 'text-brand-primary bg-brand-primary/10' : 'text-white/30 hover:text-white hover:bg-white/10'
                    )"
                    :title="obj.lockMovementX ? 'Unlock' : 'Lock'"
                >
                    <Lock v-if="obj.lockMovementX" :size="12" />
                    <Unlock v-else :size="12" />
                </button>
                <button 
                    @click.stop="deleteObject(obj)"
                    class="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all"
                    title="Delete"
                >
                    <TrashIcon :size="12" />
                </button>
            </div>
        </div>
      </template>
    </div>

    <!-- Bottom Fade -->
    <div class="absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-[#0a0a0a] to-transparent z-10 pointer-events-none opacity-80"></div>
  </section>
</template>
