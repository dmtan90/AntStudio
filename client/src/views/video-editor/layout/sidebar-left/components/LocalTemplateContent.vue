<script setup lang="ts">
import { watch, computed, ref } from 'vue';
import { useMutation } from '@tanstack/vue-query';
import { toast } from 'vue-sonner';
import { storeToRefs } from "pinia";
import { getFileUrl } from '@/utils/api';
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
    <div class="flex items-center justify-between">
      <h4 class="text-[10px] font-bold text-white/40 uppercase tracking-widest">Local Templates</h4>
      <el-upload
        :show-file-list="false"
        :http-request="handleLoadJSON"
        accept="application/json"
      >
        <button class="h-6 px-2.5 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-brand-primary hover:bg-brand-primary/20 transition-all">
          <Plus :size="10" :stroke-width="4" />
          <span>Load JSON</span>
        </button>
      </el-upload>
    </div>
    
    <div class="grid grid-cols-2 gap-4 items-center overflow-y-auto custom-scrollbar relative">
      <template v-if="templates.length">
        <button v-for="template in templates" :key="template.id" 
          class="w-full aspect-square rounded-xl overflow-hidden group border border-white/5 bg-white/5 transition-all duration-300 hover:border-white/20 hover:scale-[1.02] shadow-sm hover:shadow-xl hover:shadow-purple-500/5" 
          @click="loadTemplate(template, 'replace')"
        >
          <img :src="getFileUrl(template.pages[0].thumbnail)" :alt="template.name" class="h-full w-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-500 group-hover:scale-110" />
          
          <div class="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <span class="text-[9px] font-bold text-white uppercase tracking-wider line-clamp-1">{{ template.name }}</span>
          </div>
        </button>
      </template>
      <template v-else>
        <el-skeleton v-for="(_, index) in 4" :key="index" animated class="w-full aspect-square rounded-xl !bg-white/5" />
        <div class="absolute inset-0 flex items-center justify-center">
          <span class="text-[10px] font-bold text-white/20 uppercase tracking-widest">No local templates</span>
        </div>
      </template>
    </div>
  </div>
</template>
