<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';
import { useEditorStore } from 'video-editor/store/editor';
import { cn } from 'video-editor/lib/utils';
// import { ElButton } from 'element-plus';

const props = defineProps<{ element: fabric.Object; className?: string }>();

const editor = useEditorStore();
const objectURL = ref("");

watch(() => props.element, (newElement) => {
  const object = editor.canvas.instance?.getItemByName(newElement.name);
  if (object) {
    object.clone((clone: fabric.Object) => {
      clone.opacity = 1;
      clone.visible = true;
      clone.clipPath = undefined;
      setObjectURL(clone.toDataURL({ format: "jpeg", quality: 0.75, withoutShadow: true, withoutTransform: true }));
    });
  }
}, { immediate: true });

const handleAddClipPath = () => {
  const object = editor.canvas.instance.getItemByName(props.element.name);
  if (object) editor.canvas.clipper.clipActiveObjectFromSceneElement(object);
};

function setObjectURL(url: string) {
  objectURL.value = url;
}
</script>

<template>
  <button
    @click="handleAddClipPath"
    :class="cn(
      'group shrink-0 h-[64px] w-[64px] border border-white/5 bg-white/5 flex items-center justify-center overflow-hidden rounded-xl p-2 transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:scale-[1.05] active:scale-95 shadow-lg shadow-black/20',
      className,
    )"
  >
    <img :src="objectURL" :alt="element.name?.split('_').at(0)" class="w-full h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity" />
  </button>
</template>