import * as z from "zod";
import { ref, onMounted, onBeforeUnmount, computed } from "vue";

import { whitelistOrigins } from "video-editor/config/message";
import { useEditorStore } from "video-editor/store/editor";
import { EditorBrandSchema, EditorProductImageSchema, EditorProductSchema, EditorTemplateSchema } from "video-editor/schema/adapter";
import { createInstance } from "video-editor/lib/utils";
import type { EditorMode } from "video-editor/plugins/editor";
// import { EditorTemplate } from "video-editor/types/editor";

const Schema = z.object({
  product: EditorProductSchema,
  brand: EditorBrandSchema,
  objective: z.string(),
  adapter: z.union([z.literal("create"), z.literal("edit")]),
  ratio: z.string().optional(),
  headless: z.boolean().optional(),
  templateId: z.string().optional(),
  template: EditorTemplateSchema,
});

export function useInitializeEditor() {
  console.log("useInitializeEditor");
  const editor = useEditorStore();
  const isInitialized = ref(false);

  const mode = computed(() => {
    const params = createInstance(URLSearchParams, window.location.search);
    const mode = params.get("mode") as string || "creator";
    return mode;
  });

  const templateId = computed(() => {
    const params = createInstance(URLSearchParams, window.location.search);
    const templateId = params.get("templateId") as string || "";
    return templateId;
  });

  const headless = computed(() => {
    const params = createInstance(URLSearchParams, window.location.search);
    const headless = params.get("headless") as string || "false";
    return headless === "true";
  });

  const ratio = computed(() => {
    const params = createInstance(URLSearchParams, window.location.search);
    const ratio = params.get("ratio") as string || "landscape";
    return ratio;
  });

  const payload = computed(() => {
    const params = createInstance(URLSearchParams, window.location.search);
    const payload = params.get("payload") as string || "";
    return payload;
  });

  const handleEvent = (event: MessageEvent) => {
    if (isInitialized.value || !payload.value) return;
    try {
      const data = JSON.parse(atob(payload.value));
      if(data.product){
        const schema = Schema.parse(data);
        if (schema.headless) editor.isHeadless = true;
        if (schema.ratio) editor.targetRatio = schema.ratio;
        editor.adapter.initialize({ product: schema.product, objective: schema.objective, brand: schema.brand, mode: schema.adapter });
        editor.initialize("adapter");
        isInitialized.value = true;
      }else{
        console.log("handleEvent", data);
      }
    } catch (error) {
      editor.changeStatus("error");
      console.warn(error);
    }
  };

  onMounted(() => {
    console.log("onMounted", mode.value, templateId.value, headless.value, ratio.value);
    if (mode.value === "creator") {
      editor.initialize(mode.value);
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