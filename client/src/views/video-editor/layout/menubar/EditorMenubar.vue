<script setup lang="ts">
import { computed, ref, unref } from 'vue';
import { useMutation } from '@tanstack/vue-query';
import { toast } from 'vue-sonner';
import { storeToRefs } from "pinia";
import { cn } from 'video-editor/lib/utils';
import { getFileUrl } from '@/utils/api';

import {
  Down as ChevronDown,
  Left as ChevronLeft,
  Right as ChevronRight,
  Upload as CloudUpload,
  SettingTwo as Cog,
  SplitCells as Columns2,
  ImageFiles as Image,
  AllApplication as Menu,
  Redo,
  Undo,
  ZoomIn,
  ZoomOut,
  Config as Settings,
  Edit,
  Ticket
} from '@icon-park/vue-next';
import Spinner from 'video-editor/components/ui/spinner.vue';
import ThemeToggle from 'video-editor/components/ui/theme-toggle.vue';

import { useEditorStore } from 'video-editor/store/editor';
import { useProjectStore } from '@/stores/project';
import { useUserStore } from '@/stores/user';
import { useIsTablet } from 'video-editor/hooks/use-media-query';
import { createBase64Download, createFileDownload } from 'video-editor/lib/utils';
import { fetchExtensionByCodec } from 'video-editor/constants/recorder';
import { maxZoom, minZoom, formats } from 'video-editor/constants/editor';
import { useMockStore } from 'video-editor/constants/mock';
import type { EditorMode, EditorTemplate } from 'video-editor/store/editor';
import type { Dimension } from 'video-editor/plugins/editor'

const editor = useEditorStore();
const projectStore = useProjectStore();
const userStore = useUserStore();
const { user } = storeToRefs(userStore);
const { name, dimension } = storeToRefs(editor);
const codec = computed(() => fetchExtensionByCodec(editor.codec));
const isTablet = useIsTablet();
const mock = useMockStore();
const drawerOpen = ref(false);

const uploadTemplate = useMutation({
  mutationFn: async () => {
    const pages = await editor.exportTemplate();
    console.log("uploadTemplate", editor.name, editor.id, pages)
    const template: EditorTemplate = { name: editor.name, id: editor.id, pages };
    createBase64Download(template, "text/json", `template-${editor.name}-${Date.now()}.json`);
    return template;
  },
  onSuccess: (data) => mock.upload("template", data),
});

const handleExportVideo = async () => {
  try {
    editor.onTogglePreviewModal("open");
    const blob = await editor.exportVideo();
    const file = (editor.file || "output") + "." + codec.value.extension;
    createFileDownload(blob, file);
  } catch (e) {
    const error = e as Error;
    toast.error(error.message || "Failed to export video");
  }
};

const handleSaveTemplate = async () => {
  const promise = uploadTemplate.mutateAsync();
  toast.promise(promise, { loading: "The template is being saved...", success: "The template has been saved successfully", error: "Ran into an error while saving the template" });
};

const onChangeZoom = (zoom: number) => {
  if (zoom < minZoom * 100) {
    zoom = minZoom * 100;
  }
  else if (zoom > maxZoom * 100) {
    zoom = maxZoom * 100;
  }
  editor.canvas.workspace.changeZoom(zoom / 100)
};

import { ClickOutside as vClickOutside } from 'element-plus'

const popoverRef = ref()
const onClickOutside = () => {
  unref(popoverRef).popperRef?.delayHide?.()
}

const zoomValue = computed({
  get() {
    return Math.round(editor.canvas?.workspace?.zoom * 100);
  },

  set(percentage) {
    editor.canvas.workspace.changeZoom(percentage / 100)
  }
});

const fileName = computed({
  get() {
    return editor.name;
  },

  set(value) {
    console.log(value);
    editor.onChangeName(value);
  }
});

const resize = (size: Dimension) => {
  if (size?.width != dimension.value?.width || size?.height != dimension.value?.height) {
    editor.resize(size);
  }
};


const isFormat = (format) => {
  // console.log(format);
  const ratio = (dimension?.value?.width ?? 1920) / (dimension?.value?.height) ?? 1080;
  if (ratio == format.aspectRatio) {
    return true;
  }
  return false;
}

</script>

<template>
  <header
    class="flex h-14 items-center px-4 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/5 shrink-0 z-50 shadow-2xl relative overflow-hidden">
    <!-- Background Glow -->
    <div class="absolute -top-10 left-1/4 w-96 h-20 bg-brand-primary/5 blur-[80px] rounded-full pointer-events-none">
    </div>

    <section id="left" class="flex items-center gap-3 relative z-10">
      <el-button @click="$router.push('/projects')"
        class="cinematic-button !h-9 !w-9 !p-0 !rounded-xl border-white/5 bg-white/5 hover:bg-white/10 group">
        <ChevronLeft :size="18" class="text-white/40 group-hover:text-white transition-colors" />
      </el-button>

      <div class="h-4 w-px bg-white/10 mx-1"></div>

      <div class="flex items-center gap-2">
        <el-popover placement="bottom-start" trigger="click" width="300px" popper-class="cinematic-popover">
          <template #reference>
            <button
              class="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-white/5 transition-all group max-w-[240px]">
              <span class="truncate text-white/90 text-[13px] font-bold tracking-tight">
                {{ fileName }}
              </span>
              <Edit :size="12" class="text-white/20 group-hover:text-brand-primary transition-all ml-1" />
            </button>
          </template>

          <div class="p-1 space-y-4">
            <div class="space-y-2">
              <span class="text-[9px] font-bold text-white/30 uppercase tracking-[0.2em] ml-1">Rename Project</span>
              <el-input v-model="fileName" placeholder="Enter name..." class="cinematic-input" />
            </div>
          </div>
        </el-popover>
      </div>

      <div class="h-4 w-px bg-white/10 mx-1"></div>

      <el-button-group class="cinematic-button-group">
        <el-tooltip content="Undo (Ctrl+Z)" placement="bottom" popper-class="cinematic-tooltip">
          <el-button @click="editor.canvas.history.undo()" :disabled="!editor.canvas?.history?.canUndo"
            class="cinematic-button !h-8 !px-3 !rounded-l-xl border-white/5">
            <Undo :size="14" />
          </el-button>
        </el-tooltip>
        <el-tooltip content="Redo (Ctrl+Y)" placement="bottom" popper-class="cinematic-tooltip">
          <el-button @click="editor.canvas.history.redo()" :disabled="!editor.canvas?.history?.canRedo"
            class="cinematic-button !h-8 !px-3 !rounded-r-xl border-l-0 border-white/5">
            <Redo :size="14" />
          </el-button>
        </el-tooltip>
      </el-button-group>
    </section>

    <section id="center" class="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
      <div v-if="user"
        class="credit-badge flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-orange-500/20 bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent backdrop-blur-md shadow-[0_0_15px_rgba(249,115,22,0.1)] group cursor-help transition-all hover:border-orange-500/40 hover:shadow-[0_0_20px_rgba(249,115,22,0.2)]">
        <div class="relative flex items-center justify-center">
          <div class="absolute inset-0 bg-orange-500 blur-md opacity-20 group-hover:opacity-40 transition-opacity">
          </div>
          <Ticket theme="filled" :size="12" class="text-orange-500 relative z-10" />
        </div>
        <span class="text-[11px] font-black text-orange-500 tracking-wider relative z-10">{{ user.credits?.balance || 0
          }}</span>
        <span class="text-[9px] font-bold text-orange-500/40 uppercase tracking-[0.1em] relative z-10">Credits</span>
      </div>
    </section>

    <section id="right" class="ml-auto flex items-center gap-3 relative z-10">
      <!-- Mode Toggle -->
      <el-button
        class="cinematic-button !h-9 !px-4 !rounded-xl border-brand-primary/20 text-brand-primary hover:!bg-brand-primary/10 transition-all font-bold flex items-center gap-2"
        @click="projectStore.editorMode = 'simple'">
        <CloudUpload :size="14" />
        <span class="text-[10px] uppercase tracking-[0.2em]">Flow</span>
        <ChevronRight :size="12" class="opacity-40" />
      </el-button>

      <div class="h-5 w-px bg-white/10 mx-1"></div>

      <el-button
        class="cinematic-button !h-9 !px-4 !rounded-xl border-white/10 bg-white/5 hover:bg-white/10 transition-all font-bold flex items-center gap-2"
        :loading="editor.saving" @click="handleSaveTemplate">
        <CloudUpload :size="14" class="text-white/40" />
        <span class="text-[10px] uppercase tracking-[0.15em] text-white/60">Save</span>
      </el-button>

      <el-button
        class="cinematic-button is-primary !h-9 !px-5 !rounded-xl !border-none !shadow-lg !shadow-brand-primary/20 flex items-center gap-2 transition-transform active:scale-95"
        @click="editor.onTogglePreviewModal('open')">
        <Image :size="14" />
        <span class="text-[10px] font-black uppercase tracking-[0.2em]">Export</span>
      </el-button>

      <div class="h-5 w-px bg-white/10 mx-1"></div>

      <el-dropdown trigger="click" popper-class="cinematic-dropdown">
        <div class="flex items-center gap-2 cursor-pointer group">
          <el-avatar v-if="user?.avatar" :size="32" :src="getFileUrl(user.avatar)"
            class="border border-white/10 group-hover:border-brand-primary transition-all" />
          <div v-else
            class="h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold group-hover:border-brand-primary transition-all">
            {{ user?.name?.charAt(0) || 'U' }}
          </div>
        </div>
        <template #dropdown>
          <el-dropdown-menu class="cinematic-dropdown-menu">
            <div class="px-4 py-2 border-b border-white/5 mb-1">
              <div class="text-[11px] font-bold text-white">{{ user?.name }}</div>
              <div class="text-[9px] text-white/40 truncate">{{ user?.email }}</div>
            </div>
            <el-dropdown-item @click="$router.push('/dashboard')">
              <span class="text-[10px] font-bold py-1">Dashboard</span>
            </el-dropdown-item>
            <el-dropdown-item @click="userStore.logout()" class="!text-red-400">
              <span class="text-[10px] font-bold py-1">Logout</span>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </section>
  </header>
</template>
