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
  <el-button
    @click="handleAddClipPath"
    :class="cn(
      'group shrink-0 h-16 w-16 border flex items-center justify-center overflow-hidden rounded-md p-2 text-gray-800/80 dark:text-gray-100/80 transition-colors shadow-sm hover:bg-card hover:text-gray-800 dark:hover:text-gray-100',
      className,
    )"
  >
    <img :src="objectURL" :alt="element.name?.split('_').at(0)" />
  </el-button>
</template>