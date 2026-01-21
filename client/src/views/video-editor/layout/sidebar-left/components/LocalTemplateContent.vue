<script setup lang="ts">
import { watch, computed, ref } from 'vue';
import { useMutation } from '@tanstack/vue-query';
import { toast } from 'vue-sonner';
import { storeToRefs } from "pinia";

import { Plus } from '@icon-park/vue-next';
import { ElButton, ElSkeleton, ElUpload } from 'element-plus';

import { useEditorStore } from 'video-editor/store/editor';
import { useMockStore } from 'video-editor/constants/mock';
import { createInstance, createPromise } from 'video-editor/lib/utils';
import type { EditorTemplate } from 'video-editor/types/editor';

const editor = useEditorStore();
const mock = useMockStore();
const { templates } = storeToRefs(mock); 

watch(templates, (value) => {
  console.log("templates", value);
});

const loadTemplate = (template: EditorTemplate, mode: string) => {
  editor.loadTemplate(template, mode);
};

const loadJSON = useMutation({
  mutationFn: async (file: File) => {
    return createPromise<EditorTemplate | EditorTemplate[]>((resolve, reject) => {
      const reader = createInstance(FileReader);
      reader.addEventListener("load", async () => {
        if (!reader.result) return reject();
        resolve(JSON.parse(reader.result as string));
      });
      reader.addEventListener("error", () => {
        reject();
      });
      reader.readAsText(file);
    });
  },
  onSuccess: (template) => {
    if (Array.isArray(template)) {
      template.map((t) => mock.upload("template", t));
    } else {
      mock.upload("template", template);
      loadTemplate(template, "reset");
    }
  },
});

const handleLoadJSON = async (options: any) => {
  const file = options.file;
  if (!file) return;
  await loadJSON.mutateAsync(file);
};
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center gap-2">
      <h4 class="text-xs font-semibold line-clamp-1">Templates</h4>
      <el-upload
        :show-file-list="false"
        :http-request="handleLoadJSON"
        accept="application/json"
        class="ml-auto"
      >
        <el-button size="small" type="primary" text bg round class="h-7 ml-auto bg-card gap-1 pl-2">
          <Plus :size="14" />
          <span>Load JSON</span>
        </el-button>
      </el-upload>
    </div>
    <div class="grid grid-cols-2 gap-2.5 items-center overflow-y-scroll scrollbar-hidden relative">
      <template v-if="templates.length">
        <button v-for="template in templates" :key="template.id" class="w-full aspect-square rounded-md overflow-hidden group border" @click="loadTemplate(template, 'replace')">
          <img :src="template.pages[0].thumbnail" :alt="template.name" class="group-hover:scale-110 transition-transform" />
        </button>
      </template>
      <template v-else>
        <el-skeleton v-for="(_, index) in 6" :key="index" class="w-full aspect-square rounded-md" />
        <span class="text-xs font-semibold text-foreground/60 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 line-clamp-1">No local templates</span>
      </template>
    </div>
  </div>
  <!--<div class="grid grid-cols-2 gap-x-4 gap-y-2 px-3">
    <el-upload
      :show-file-list="false"
      :http-request="handleLoadJSON"
      accept="application/json"
      class="w-full"
    >
      <el-button text bg round class="h-7 bg-card gap-1 pl-2 w-full">
        <Plus :size="14" />
        <span>Load JSON</span>
      </el-button>
    </el-upload>
    <el-button text bg round class="h-7 bg-card gap-1 pl-2 w-full opacity-50 pointer-events-none">
      <label>
        <Plus :size="14" />
        <span>Load PSD</span>
      </label>
    </el-button>
  </div>
  <div class="px-3 grid grid-cols-2 gap-4 relative">
    <template v-if="templates.length">
      <button v-for="template in templates" :key="template.id" class="w-full aspect-square rounded-md overflow-hidden group border" @click="loadTemplate(template, 'replace')">
        <img :src="template.pages[0].thumbnail" :alt="template.name" class="group-hover:scale-110 transition-transform" />
      </button>
    </template>
    <template v-else>
      <el-skeleton v-for="(_, index) in 6" :key="index" class="w-full aspect-square rounded-md" />
      <span class="text-xs font-semibold text-foreground/60 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 line-clamp-1">No local templates</span>
    </template>
  </div>-->
</template>
