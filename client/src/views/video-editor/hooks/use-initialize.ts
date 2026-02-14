import * as z from "zod";
import { ref, onMounted, onBeforeUnmount, computed } from "vue";

import { whitelistOrigins } from "video-editor/config/message";
import { useEditorStore } from "video-editor/store/editor";
import { EditorBrandSchema, EditorProductSchema } from "video-editor/schema/adapter";
import { createInstance } from "video-editor/lib/utils";
import type { EditorMode } from "video-editor/plugins/editor";

const Schema = z.object({
  product: EditorProductSchema,
  objective: z.string(),
  brand: EditorBrandSchema,
  adapter: z.union([z.literal("create"), z.literal("edit")]),
  ratio: z.string().optional(),
  headless: z.boolean().optional(),
});

export function useInitializeEditor() {
  console.log("useInitializeEditor");
  const editor = useEditorStore();
  const isInitialized = ref(false);

  const mode = computed(() => {
    const params = createInstance(URLSearchParams, window.location.search);
    const mode = params.get("mode") as EditorMode | null;
    return mode || "creator";
  });

  const handleEvent = (event: MessageEvent) => {
    if (!whitelistOrigins.includes(event.origin) || isInitialized.value) return;
    try {
      const payload = Schema.parse(JSON.parse(event.data));
      if (payload.headless) editor.isHeadless = true;
      if (payload.ratio) editor.targetRatio = payload.ratio;
      
      editor.adapter.initialize({ product: payload.product, objective: payload.objective, brand: payload.brand, mode: payload.adapter });
      editor.initialize("adapter");
      isInitialized.value = true;
    } catch (error) {
      editor.changeStatus("error");
      console.warn(error);
    }
  };

  onMounted(() => {
    console.log("onMounted", mode.value)
    if (mode.value === "creator") {
      editor.initialize();
    } else {
      window.addEventListener("message", handleEvent);
      window.parent.postMessage(JSON.stringify({ action: "ready" }), "*");
    }

  });

  onBeforeUnmount(() => {
    window.removeEventListener("message", handleEvent);
  });

  return isInitialized;
}