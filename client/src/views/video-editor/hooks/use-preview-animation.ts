import { onMounted, onBeforeUnmount, watch } from "vue";
import { debounce } from "lodash";
import { useCanvasStore } from "video-editor/store/canvas";
import { storeToRefs } from "pinia";

export function usePreviewAnimation(element: any, type: any) {
  console.log("usePreviewAnimation", element);
  let object: any = null;
  let anim = JSON.stringify(element?.anim ?? {});
  // const editor = useEditorStore();
  const canvasStore = useCanvasStore();
  const { animations, selectionActive: active, instance } = storeToRefs(canvasStore);

  const previewAnimation = debounce((obj) => {
    // console.log("previewAnimation");
    animations.value.dispose(obj);
    if (obj) animations.value.preview(obj, type, obj.anim);
  }, 250);

  const destroy = () => {
    // console.log("destroy");
    previewAnimation.cancel();
    animations.value.dispose(object);
    object = null;
  };

  onMounted(() => {
    console.log("onMounted");
    object = instance.value.getItemByName(element.name);
    previewAnimation(object);
  });

  watch(active, (value: any) => {
    if(active.value && anim != JSON.stringify(active.value.anim)){
      anim = JSON.stringify(active.value.anim);
      // destroy();
      object = instance.value.getItemByName(active.value.name);
      previewAnimation(object);
    }
  });

  onBeforeUnmount(() => {
    destroy();
  });
}