<script setup lang="ts">
import { provide, onMounted, watch, ref, toRaw, type Ref } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { EditorMode, EditorTemplate, useEditorStore } from 'video-editor/store/editor';
import { useThemeProvider, type ThemeProviderState } from 'video-editor/context/theme';
import { convertFlowToStudio, convertStudioToFlow, type StudioProject } from '@/utils/StudioAdapter';
import { useProjectStore } from '@/stores/project';
import EditorView from 'video-editor/views/Editor.vue';
import { Save, Download } from '@icon-park/vue-next';
import { toast } from 'vue-sonner';
import api from '@/utils/api'; // Keep existing API import as the provided snippet for `api` seems to be for a different context (upload.ts)
import { useUserStore } from '@/stores/user';
import { useMarketplaceStore } from '@/stores/marketplace';

const props = defineProps<{
  id: string;
  templateId?: string;
  ratio?: string;//square, portrait, landscape
  mode?: EditorMode;//adapter, creator
  template?: EditorTemplate;
  headless?: boolean;
}>();

const { t } = useI18n();
const route = useRoute()
const projectId = ref<string>('');
const userStore = useUserStore();
const editorStore = useEditorStore();
const projectStore = useProjectStore();
const themeProvider = useThemeProvider() as ThemeProviderState;
const editorMode = ref<EditorMode>('creator');
provide('theme', themeProvider);

const isSaving = ref(false);

const template: Ref<EditorTemplate | null> = ref(null);
const project: Ref<any | null> = ref(null);

onMounted(async () => {
  console.log("query", route.query)
  projectId.value = (route.params.id || route.query.id || props.id) as string;
  const ratio = (props.ratio || route.query.ratio || "landscape");
  const templateId = (props.templateId || route.query.templateId || '') as string;
  const mode = (props.mode || route.query.mode || 'creator') as EditorMode;
  const headless = (props.headless || route.query.headless || false) as boolean;
  if (templateId) {
    const data = await useMarketplaceStore().useTemplate(templateId);
    template.value = data?.template;
    if(ratio){
      template.value.pages = template.value.pages.filter((page: any) => {
        if (page.data.orientation == ratio) {
          return true;
        }
        return false;
      });
    }
    console.log("template", template.value)
  }

  if (mode) {
    editorMode.value = mode
  }

  if(headless){
    editorMode.value = 'adapter';
  }

  // await editorStore.initialize(editorMode.value);

  if (projectId.value) {
      const data = await projectStore.fetchProject(projectId.value);
      project.value = data.project;
  }
  else{
      const data = await projectStore.createProject({
          title: template.value?.name || t('projects.studio.untitled'),
          description: template.value?.description || '',
          mode: "blank",
          aspectRatio: ratio == 'square' ? '1:1' : (ratio == 'portrait' ? '9:16' : '16:9')
      });
      project.value = data.project;
  }

  if(template.value && project.value){
    template.value.id = project.value._id
  }
  else if(template.value){
    template.value.id = projectId.value
  }

  if(project.value){
    editorStore.instance.id = project.value._id;
    editorStore.instance.name = project.value.title;
    if(template.value){
      editorStore.resize({
        width: template.value.pages[0].data.width,
        height: template.value.pages[0].data.height
      }, true);
    }
    else if(project.value.pages && project.value.pages.length > 0){
      editorStore.resize({
        width: project.value.pages[0].data.width,
        height: project.value.pages[0].data.height
      }, true);
    }
    else if(project.value.aspectRatio){
      let width = 1920;
      let height = 1080;
      if(project.value.aspectRatio == '1:1'){
        width = 1080;
        height = 1080;
      }
      else if(project.value.aspectRatio == '9:16'){
        width = 1080;
        height = 1920;
      }
      editorStore.resize({
        width: width,
        height: height
      }, true);
    }
  }

  if(route.query?.payload){
      let editorProduct = null;
      let editorBrand = null;
      const payload = JSON.parse(atob(route.query.payload as string));
      if(payload?.product){
          editorProduct = payload.product;
      }

      if(payload?.brand){
          editorBrand = payload.brand;
      }
      console.log("editorProduct", editorProduct);
      console.log("editorBrand", editorBrand);
      // editorStore.adapter.update({
      //     product: editorProduct,
      //     brand: editorBrand,
      //     objective: payload.objective,
      //     mode: payload.headless ? 'creator' : 'edit'
      // });
  }

  // If project has no saved pages, auto-convert storyboard to studio format
  if (project.value && !project.value.pages && project.value.storyboard?.segments?.length) {
    const pageSamples = convertFlowToStudio(project.value as StudioProject);
    // template.value = studioTemplate;
    // if (template.value) {
    //   template.value.id = project.value._id;
    // }
    project.value.pages = pageSamples ? pageSamples : [];
    template.value = project.value;
  } else if (project.value?.pages && !template.value) {
    template.value = project.value;
  }

  if(project.value){
    //should add this to support auto save
    editorStore.instance.id = project.value._id;
  }

  console.log("template", template);
  await editorStore.loadTemplate(template.value, 'reset');
});

const handleSave = async () => {
  if (isSaving.value) return;
  isSaving.value = true;
  try {
    const pages = await editorStore.exportTemplate();

    // Sync thumbnails back to Storyboard
    // const storyboard = JSON.parse(JSON.stringify(props.project.storyboard || { segments: [] }));
    // const segments = storyboard.segments;

    // for (const page of pages) {
    //   if (page.thumbnail && page.thumbnail.startsWith('data:image')) {
    //     const segment = segments.find((s: any) => s._id === page.id);
    //     if (segment) {
    //       try {
    //         // Convert base64 to Blob
    //         const res = await fetch(page.thumbnail);
    //         const blob = await res.blob();
    //         const file = new File([blob], `thumb_${page.id}.png`, { type: 'image/png' });

    //         const formData = new FormData();
    //         formData.append('file', file);
    //         formData.append('purpose', 'media');

    //         // Upload via store
    //         const uploadData = await projectStore.uploadMedia(formData);

    //         if (uploadData?.key) {
    //           segment.sceneImage = uploadData.key;
    //         }
    //       } catch (e) {
    //         console.warn('Failed to sync thumbnail for segment', page.id, e);
    //       }
    //     }
    //   }
    // }

    await projectStore.updateProject({
      pages,
      ...(project.value ? convertStudioToFlow({ id: projectId.value, name: project.value.title, is_published: false, pages } as any, project.value as StudioProject) : {})
    });
    toast.success(t('projects.studio.toasts.saveSuccess'));
  } catch (error) {
    console.error('Failed to save project:', error);
    toast.error(t('projects.studio.toasts.saveFailed'));
  } finally {
    isSaving.value = false;
  }
};

const handleExport = async () => {
  try {
    toast.info(t('projects.studio.toasts.exporting'));
    const blob = await editorStore.exportVideo();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.value?.title || 'video'}.mp4`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('projects.studio.toasts.exportSuccess'));
  } catch (error) {
    console.error('Export failed:', error);
    toast.error(t('projects.studio.toasts.exportFailed'));
  }
};

// const lastProjectId = ref(project.value?._id || '');

// watch(() => project.value?._id, (newId) => {
//   if (newId && newId !== lastProjectId.value) {
//     lastProjectId.value = newId;
//     const template = convertFlowToStudio(project.value);
//     editorStore.loadTemplate(template, 'reset');
//   }
// });
</script>

<template>
  <div class="studio-wrapper-container h-full w-full overflow-hidden bg-black relative">
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
