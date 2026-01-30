<script setup lang="ts">
import { provide, onMounted, watch, ref, toRaw } from 'vue';
import { EditorTemplate, useEditorStore } from 'video-editor/store/editor';
import { useThemeProvider, type ThemeProviderState } from 'video-editor/context/theme';
import { convertFlowToStudio, type StudioProject } from '@/utils/StudioAdapter';
import { useProjectStore } from '@/stores/project';
import EditorView from 'video-editor/views/Editor.vue';
import { Save, Download } from '@icon-park/vue-next';
import { toast } from 'vue-sonner';
import api from '@/utils/api'; // Keep existing API import as the provided snippet for `api` seems to be for a different context (upload.ts)

const props = defineProps<{
  project: StudioProject;
  template?: EditorTemplate
}>();

const editorStore = useEditorStore();
const projectStore = useProjectStore();
const themeProvider = useThemeProvider() as ThemeProviderState;
provide('theme', themeProvider);

const isSaving = ref(false);

onMounted(async () => {
  await editorStore.initialize('creator');
  if (props.project) {
    let template = null
    //generate project from template
    if (props.template) {
      template = props.template
    }
    else {
      template = convertFlowToStudio(props.project);
    }

    console.log("template", template);
    await editorStore.loadTemplate(template, 'reset');
  }
});

const handleSave = async () => {
  if (isSaving.value) return;
  isSaving.value = true;
  try {
    const pages = await editorStore.exportTemplate();
    const advancedEditorState = {
      id: props.project._id,
      name: props.project.title,
      is_pubished: false,
      pages: pages
    };

    // Sync thumbnails back to Storyboard
    const storyboard = JSON.parse(JSON.stringify(props.project.storyboard || { segments: [] }));
    const segments = storyboard.segments;

    for (const page of pages) {
      if (page.thumbnail && page.thumbnail.startsWith('data:image')) {
        const segment = segments.find((s: any) => s._id === page.id);
        if (segment) {
          try {
            // Convert base64 to Blob
            const res = await fetch(page.thumbnail);
            const blob = await res.blob();
            const file = new File([blob], `thumb_${page.id}.png`, { type: 'image/png' });

            const formData = new FormData();
            formData.append('file', file);
            formData.append('purpose', 'media');

            // Upload via store
            const uploadData = await projectStore.uploadMedia(formData);

            if (uploadData?.key) {
              segment.sceneImage = uploadData.key;
            }
          } catch (e) {
            console.warn('Failed to sync thumbnail for segment', page.id, e);
          }
        }
      }
    }

    await projectStore.updateProject({
      advancedEditorState,
      storyboard
    });
    toast.success('Project and Thumbnails saved successfully');
  } catch (error) {
    console.error('Failed to save project:', error);
    toast.error('Failed to save project');
  } finally {
    isSaving.value = false;
  }
};

const handleExport = async () => {
  try {
    toast.info('Exporting video... This may take a few minutes.');
    const blob = await editorStore.exportVideo();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${props.project.title || 'video'}.mp4`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Video exported successfully');
  } catch (error) {
    console.error('Export failed:', error);
    toast.error('Export failed');
  }
};

const lastProjectId = ref(props.project?._id || '');

watch(() => props.project?._id, (newId) => {
  if (newId && newId !== lastProjectId.value) {
    lastProjectId.value = newId;
    const template = convertFlowToStudio(props.project);
    editorStore.loadTemplate(template, 'reset');
  }
});
</script>

<template>
  <div class="studio-wrapper-container h-full w-full overflow-hidden bg-black relative">
    <!-- <div class="studio-actions-overlay absolute top-2 right-4 z-[9999] flex gap-2">
      <el-button 
        type="primary" 
        size="default" 
        @click="handleSave"
        :loading="isSaving"
      >
        <template #icon>
            <save v-if="!isSaving" />
        </template>
Save
</el-button>
<el-button type="success" size="default" @click="handleExport">
  <template #icon>
            <download />
        </template>
  Export MP4
</el-button>
</div> -->
    <EditorView />
  </div>
</template>

<style scoped>
.studio-wrapper-container {
  display: flex;
  flex-direction: column;
}

/* Ensure studio layout fits our container */
:deep(.h-\[100dvh\]) {
  height: 100% !important;
}

:deep(.h-\[calc\(100dvh-56px\)\]) {
  height: calc(100% - 56px) !important;
}
</style>
