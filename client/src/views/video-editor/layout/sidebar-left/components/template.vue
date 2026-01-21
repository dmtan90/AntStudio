<script setup lang="ts">
import { computed, ref } from 'vue';

import { Search, Close as X } from '@icon-park/vue-next';

import { ElButton, ElInput, ElTabs, ElTabPane } from 'element-plus';

import { useEditorStore } from 'video-editor/store/editor';

import CloudTemplateContent from './CloudTemplateContent.vue';
import LocalTemplateContent from './LocalTemplateContent.vue';

const editor = useEditorStore();

const activeTab = ref('cloud');

const options = [
  {
    value: 'cloud',
    label: 'Cloud'
  },
  {
    value: 'local',
    label: 'Local'
  }
];

</script>

<template>
  <div class="h-full w-full">
    <div class="flex items-center justify-between h-14 border-b px-4">
      <h2 class="font-semibold">Templates</h2>
      <el-button size="small" text bg circle class="bg-card h-7 w-7" @click="editor.setActiveSidebarLeft(null)">
        <X :size="16" />
      </el-button>
    </div>
    <section class="sidebar-container pb-4 px-3">
      <template v-if="editor.mode === 'creator'">
        <div class=" pt-4 pb-6 flex flex-col gap-4">
          <el-input placeholder="Search..." class="text-xs" >
            <template #prefix>
              <Search :size="15" class="text-foreground/60" />
            </template>
          </el-input>
        </div>
        <el-segmented v-model="activeTab" :options="options" block style="--el-border-radius-base: 20px;"/>
        <div class="flex flex-col gap-3 pt-3.5">
          <CloudTemplateContent v-if="activeTab == 'cloud'"/>
          <LocalTemplateContent v-else />
        </div>
        <!--<el-tabs v-model="activeTab" type="card" stretch class="px-3" size="small">
          <el-tab-pane name="cloud" label="Cloud">
            <CloudTemplateContent />
          </el-tab-pane>
          <el-tab-pane name="local" label="Local">
            <LocalTemplateContent />
          </el-tab-pane>
        </el-tabs>-->
      </template>

      <template v-else-if="editor.mode === 'adapter'">
        <div class="px-3 pt-4 pb-6 flex flex-col gap-4">
          <el-input placeholder="Search..." class="text-xs" >
            <template #prefix>
              <Search :size="15" />
            </template>
          </el-input>
        </div>
        <CloudTemplateContent />
      </template>

      <template v-else>
        <div>Unknown editor mode</div>
      </template>
    </section>
  </div>
</template>
