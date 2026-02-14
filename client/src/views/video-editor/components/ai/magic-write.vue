<script setup lang="ts">
import { computed, ref } from 'vue';
import { Refresh as RefreshCcw } from '@icon-park/vue-next';

import { useEditorStore } from 'video-editor/store/editor';
import { generateCTA, generateHeadline, generateDescription, useGenerateCTASuggestions, useGenerateDescriptionSuggestions, useGenerateHeadlineSuggestions } from 'video-editor/api/ai';
import { cn } from 'video-editor/lib/utils';

// import Button from 'video-editor/components/ui/button.vue';

// Placeholder for AISelectPluginProps
interface AISelectPluginProps {}

// Placeholder for fabric.Textbox type
interface FabricTextbox {
  text?: string;
  meta?: { label: string };
}

import { type EditorProduct } from "video-editor/schema/adapter";

type QueryFunction = (product: EditorProduct, objective: string) => Promise<string[] | any>;

const magicWriteMap: Record<string, QueryFunction> = {
  "cta-text": generateCTA,
  "headline-text": generateHeadline,
  "description-text": generateDescription,
};

const editor = useEditorStore();
const selected = computed(() => editor.canvas.selection.active as FabricTextbox);

const suggestions = ref<string[]>([]);
const loading = ref(false);

const onChangeActiveTextboxProperty = (value: any) => {
  editor.canvas.onChangeActiveTextboxProperty("text", value);
};

const onGenerateText = async () => {
  loading.value = true;
  const label = selected.value?.meta?.label ?? "headline-text";
  const query = magicWriteMap[label];
  
  const product: EditorProduct = editor.adapter.product || {
    name: "Wyze Camera v4",
    currency: "USD",
    description: "Get unmatched security with Wyze Cam v4. Crystal-clear 2.5K QHD resolution, Enhanced Color Night Vision, and motion-activated spotlight keep your home safe day or night. Plus, 24/7 local recording, Wi-Fi 6 support, and compatibility with Alexa and Google Assistant for ultimate convenience. ",
    selling_price: 35.98,
    images: [],
  };

  try {
    const res = await query(product, selected.value?.text ?? product.name);
    console.log(res);
    if(res){
      // Handle both string[] and GenerateContentResponse
      if (Array.isArray(res)) {
        suggestions.value = res;
      } else {
        // Extract text from GenerateContentResponse
        suggestions.value = [];
      }
    }
  } catch(err) {
    console.error(err);
    suggestions.value = [];
  }
  loading.value = false;
};

</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex w-full items-center">
      <el-button type="primary" :icon="RefreshCcw" :loading="loading" text bg round class="inline-flex items-center gap-1 ml-auto" @click="onGenerateText">
        <span>Refresh</span>
      </el-button>
    </div>
    <template v-if="!suggestions || !suggestions.length || loading">
      <template v-if="loading">
        <el-skeleton v-for="(_, index) in 3" :key="index" class="w-full h-8" />
      </template>
      <template v-else>
        <p class="text-destructive text-xs text-center">Unable to generate suggestions</p>
      </template>
    </template>
    <template v-else>
      <div role="button" v-for="(suggestion, index) in suggestions" :key="suggestion + index" tabindex="0" class="text-xs border rounded-md font-medium p-3" @click="onChangeActiveTextboxProperty(suggestion)">
        {{ suggestion }}
      </div>
    </template>
  </div>
</template>