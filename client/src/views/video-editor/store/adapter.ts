import { defineStore, storeToRefs } from 'pinia';
import { ref, computed, reactive } from 'vue';
import { useEditorStore } from 'video-editor/store/editor';
import { type AdapterProps } from "video-editor/plugins/adapter"
import { Adapter } from "video-editor/plugins/adapter";

type EditorStoreInstance = ReturnType<typeof useEditorStore>;

export const useAdapterStore = defineStore('adapter', {
  state: () => ({
    editor: reactive<EditorStoreInstance>(null),
  }),

  getters: {
    adapter() : Adapter {
      return this.editor?.adapter as Adapter;
    }
  },

  actions: {
    initialize(props: AdapterProps){
      this.editor = useEditorStore();
      this.adapter.initialize(props);
    },

    update(props: Partial<AdapterProps>){
      this.adapter.update(props);
    }
  }
});