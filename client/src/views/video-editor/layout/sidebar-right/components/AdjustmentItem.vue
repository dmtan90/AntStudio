<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { PreviewOpen as Eye, PreviewCloseOne as EyeOff } from '@icon-park/vue-next';
import Toggle from 'video-editor/components/ui/toggle.vue';
import Label  from 'video-editor/components/ui/label.vue';
import { cn } from 'video-editor/lib/utils';
import { filters, adjustments, BlendModes, GrayScaleModes } from 'video-editor/constants/filters';
import { colors } from 'video-editor/constants/color';
import { onClickOutside } from '@vueuse/core';
// import { useCanvasStore } from 'video-editor/store/canvas';
// import { storeToRefs } from "pinia";

// const canvasStore = useCanvasStore();
// const { selectionActive: selected } = storeToRefs(canvasStore);

const props = defineProps<{ adjustment: any; selected: any; onChange: (value: number) => void; onToggle: (value: boolean) => void }>();
const name = computed(() => props.adjustment?.name);
// const activeAdj = computed(() => selected.value?.adjustments?.[name.value]);
const active = computed(() => !!props.selected?.adjustments?.[name.value]);
const index = computed(() => props.selected?.adjustments?.[name.value]?.index);
const filter = computed(() => props.selected?.filters?.[index.value]);

// const intensity = computed(() => props.selected?.adjustments?.[name.value]?.intensity ?? 50);
const intensity = computed({
  get(){
    return props.selected?.adjustments?.[name.value]?.intensity || 50
  },

  set(value){
    console.log("intensity", value);
    if(props.onChange){
      props.onChange({intensity:value});
    }
  }
});
const blendColor = computed(() => props.selected?.adjustments?.[name.value]);
const removeColor = computed(() => props.selected?.adjustments?.[name.value]);
const grayScale = computed(() => props.selected?.adjustments?.[name.value]);
const doutone = computed(() => filter.value?.subFilters);

const onChange = (values) => {
  console.log("onChange", values);
  if(props.onChange == undefined){
    return;
  }

  nextTick(() => {
    if(name.value == "RemoveColor"){
      let color = removeColor.value?.color ?? "#000000";
      let alpha = removeColor.value?.alpha ?? 0.5;
      props.onChange({color, intensity: alpha});
    }
    else if(name.value == "Grayscale"){
      let mode = grayScale.value?.mode ?? "average";
      props.onChange({mode});
    }
    else if(name.value == "BlendColor"){
      let color = blendColor.value?.color ?? "#FFFFFF";
      let mode = blendColor.value?.mode ?? "overlay";
      let alpha = blendColor.value?.alpha ?? 0.5;
      props.onChange({mode, color, intensity: alpha});
    }
    else if(name.value == "Duotone"){
      let lightColor = doutone.value?.[1]?.color ?? "#fffb00";
      let lightMode = doutone.value?.[1]?.mode ?? "multiply";
      let lightAlpha = doutone.value?.[1]?.alpha ?? 1;
      let darkColor = doutone.value?.[2]?.color ?? "#c90300";
      let darkMode = doutone.value?.[2]?.mode ?? "lighten";
      let darkAlpha = doutone.value?.[2]?.alpha ?? 1;
      props.onChange({lightMode, lightColor, lightAlpha, darkMode, darkColor, darkAlpha});
    }
    else{
      let value = intensity.value || 0.5;
      props.onChange({intensity:value});
    }
  });
}

const excludeSliders = ['Invert', 'Sepia', 'BlackWhite', 'Brownie', 'Vintage', 'Kodachrome', 'Technicolor', 'Polaroid', 'Duotone'];

const popup = ref(null);
const popup2 = ref(null);

const activePopup = ref(false);
const activePopup2 = ref(false);

// watch(popup, (value) => {
//   if(value){
//     onClickOutside(value, () => {
//       activePopup.value = false;
//     });
//   }
// });

// watch(popup2, (value) => {
//   if(value){
//     onClickOutside(value, () => {
//       activePopup2.value = false;
//     });
//   }
// });

</script>

<template>
  <div :class="cn('items-center grid grid-cols-12', active ? 'opacity-100' : 'opacity-50')">
    <Label class="text-xs font-medium col-span-6">
      <Toggle v-model="active" circle class="h-6 w-6 px-0 text-foreground shrink-0" @toggle="(value) => onToggle(value)">
        <template v-if="active">
          <Eye :size="12" />
        </template>
        <template v-else>
          <EyeOff :size="12" />
        </template>
      </Toggle>
      <span>{{ name }}</span>
    </Label>
    <div class="flex items-center col-span-6 gap-2" v-if="active">
      <template v-if="name == 'RemoveColor'">
        <el-popover
          :visible="activePopup"
          title="Remove Color"
          placement="top"
          width="250px"
          :disabled="!active"
          trigger="click"
        >
          <template #reference>
            <el-button text class="ml-0 p-[5px] border-1 rounded-md" @click="activePopup = !activePopup">
              <el-tag :color="removeColor.color" />
            </el-button>
          </template>
          <div class="items-center grid grid-cols-1 gap-2" ref="popup">
            <el-row :gutter="10">
              <el-col :span="12">
                <Label class="text-xs font-medium col-span-5">{{ 'Color' }}</Label>
              </el-col>
              <el-col :span="12">
                <el-color-picker v-model="removeColor.color" :disabled="!active" color-format="hex" :predefine="colors" @change="onChange" />
              </el-col>
            </el-row>
            <el-row :gutter="10">
              <el-col :span="12">
                <Label class="text-xs font-medium col-span-5">{{ 'Opacity' }}</Label>
              </el-col>
              <el-col :span="12">
                <el-slider :disabled="!active" :min="0" :max="1" :step="0.05" v-model="removeColor.alpha" @change="onChange" />
              </el-col>
            </el-row>
          </div>
        </el-popover>
      </template>
      <template v-else-if="name == 'BlendColor'">
        <el-popover
          :visible="activePopup"
          title="Blend Color"
          placement="top"
          width="250px"
          :disabled="!active"
          trigger="click"
        >
          <template #reference>
            <el-button text class="ml-0 p-[5px] border-1 rounded-md" @click="activePopup = !activePopup">
              <el-tag :color="blendColor.color" />
            </el-button>
          </template>
          <div class="items-center grid grid-cols-1 gap-2">
            <el-row :gutter="10">
              <el-col :span="12">
                <Label class="text-xs font-medium col-span-5">{{ 'Mode' }}</Label>
              </el-col>
              <el-col :span="12">
                <el-select class="w-full" v-model="blendColor.mode" @change="onChange">
                  <el-option v-for="item in BlendModes" :key="item.value" :label="item.name" :value="item.value" />
                </el-select>
              </el-col>
            </el-row>
            <el-row :gutter="10">
              <el-col :span="12">
                <Label class="text-xs font-medium col-span-5">{{ 'Color' }}</Label>
              </el-col>
              <el-col :span="12">
                <el-color-picker v-model="blendColor.color" :disabled="!active" color-format="hex" :predefine="colors" @change="onChange" />
              </el-col>
            </el-row>
            <el-row :gutter="10">
              <el-col :span="12">
                <Label class="text-xs font-medium col-span-5">{{ 'Opacity' }}</Label>
              </el-col>
              <el-col :span="12">
                <el-slider :disabled="!active" :min="0" :max="1" :step="0.05" v-model="blendColor.alpha" @change="onChange" />
              </el-col>
            </el-row>
          </div>
        </el-popover>
      </template>
      <template v-else-if="name == 'Grayscale'">
        <el-select class="w-full" v-model="grayScale.mode" v-if="grayScale">
          <el-option v-for="item in GrayScaleModes" :key="item.value" :label="item.name" :value="item.value" />
        </el-select>
      </template>
      <template v-else-if="name == 'Noise'">
        <el-slider :disabled="!active" :min="0" :max="1000" :step="10" v-model="intensity" />
      </template>
      <template v-else-if="name == 'Pixelate'">
        <el-slider :disabled="!active" :min="0" :max="20" :step="1" v-model="intensity" />
      </template>
      <template v-else-if="name == 'Blur'">
        <el-slider :disabled="!active" :min="0" :max="100" :step="5" v-model="intensity" />
      </template>
      <template v-else-if="!excludeSliders.includes(name)">
        <el-slider :disabled="!active" :min="-100" :max="100" :step="1" v-model="intensity" @change="onChange"/>
      </template>
    </div>
  </div>
  <!--<template v-if="name == 'BlendColor' && active">
    <div :class="cn('items-center grid grid-cols-12', active ? 'opacity-100' : 'opacity-50')">
      <Label class="text-xs font-medium col-span-5">{{ 'Mode' }}</Label>
      <div class="flex items-center col-span-7 gap-2">
        <el-select class="w-full" v-model="blendMode">
          <el-option v-for="item in BlendModes" :key="item.value" :label="item.name" :value="item.value" />
        </el-select>
      </div>
    </div>
    <div :class="cn('items-center grid grid-cols-12', active ? 'opacity-100' : 'opacity-50')">
      <Label class="text-xs font-medium col-span-5">{{ 'Color' }}</Label>
      <div class="flex items-center col-span-7 gap-2">
        <el-color-picker v-model="blendColor" :disabled="!active" color-format="hex" :predefine="colors" />
      </div>
    </div>
  </template>-->
  <template v-if="name == 'Duotone' && active && doutone">
    <div :class="cn('items-center grid grid-cols-12', active ? 'opacity-100' : 'opacity-50')">
      <Label class="text-xs font-medium col-span-5">{{ 'Background' }}</Label>
      <div class="flex items-center col-span-7 gap-2">
        <el-popover
          :visible="activePopup"
          title="Background"
          placement="top"
          width="250px"
          trigger="click"
        >
          <template #reference>
            <el-button text class="p-[5px] border-1 rounded-md" @click="activePopup = !activePopup">
              <el-tag :color="doutone[1].color" />
            </el-button>
          </template>
          <div class="items-center grid grid-cols-1 gap-2" ref="popup">
            <el-row :gutter="10">
              <el-col :span="12">
                <Label class="text-xs font-medium col-span-5">{{ 'Mode' }}</Label>
              </el-col>
              <el-col :span="12">
                <el-select class="w-full" v-model="doutone[1].mode" @change="onChange">
                  <el-option v-for="item in BlendModes" :key="item.value" :label="item.name" :value="item.value" />
                </el-select>
              </el-col>
            </el-row>
            <el-row :gutter="10">
              <el-col :span="12">
                <Label class="text-xs font-medium col-span-5">{{ 'Color' }}</Label>
              </el-col>
              <el-col :span="12">
                <el-color-picker v-model="doutone[1].color" :disabled="!active" color-format="hex" :predefine="colors" @change="onChange" />
              </el-col>
            </el-row>
            <el-row :gutter="10">
              <el-col :span="12">
                <Label class="text-xs font-medium col-span-5">{{ 'Opacity' }}</Label>
              </el-col>
              <el-col :span="12">
                <el-slider :disabled="!active" :min="0" :max="1" :step="0.05" v-model="doutone[1].alpha" @change="onChange" />
              </el-col>
            </el-row>
          </div>
        </el-popover>
      </div>
    </div>
    <div :class="cn('items-center grid grid-cols-12', active ? 'opacity-100' : 'opacity-50')">
      <Label class="text-xs font-medium col-span-5">{{ 'Overlay' }}</Label>
      <div class="flex items-center col-span-7 gap-2">
        <el-popover
          :visible="activePopup2"
          title="Overlay"
          placement="top"
          width="250px"
          trigger="click"
        >
          <template #reference>
            <el-button text class="p-[5px] border-1 rounded-md" @click="activePopup2 = !activePopup2">
              <el-tag :color="doutone[2].color" />
            </el-button>
          </template>
          <div class="items-center grid grid-cols-1 gap-2" ref="popup2">
            <el-row :gutter="10">
              <el-col :span="12">
                <Label class="text-xs font-medium col-span-5">{{ 'Mode' }}</Label>
              </el-col>
              <el-col :span="12">
                <el-select class="w-full" v-model="doutone[2].mode" @change="onChange">
                  <el-option v-for="item in BlendModes" :key="item.value" :label="item.name" :value="item.value" />
                </el-select>
              </el-col>
            </el-row>
            <el-row :gutter="10">
              <el-col :span="12">
                <Label class="text-xs font-medium col-span-5">{{ 'Color' }}</Label>
              </el-col>
              <el-col :span="12">
                <el-color-picker v-model="doutone[2].color" :disabled="!active" color-format="hex" :predefine="colors" @change="onChange" />
              </el-col>
            </el-row>
            <el-row :gutter="10">
              <el-col :span="12">
                <Label class="text-xs font-medium col-span-5">{{ 'Opacity' }}</Label>
              </el-col>
              <el-col :span="12">
                <el-slider :disabled="!active" :min="0" :max="1" :step="0.05" v-model="doutone[1].alpha" @change="onChange" />
              </el-col>
            </el-row>
          </div>
        </el-popover>
      </div>
    </div>
  </template>
  <!--<template v-if="name == 'RemoveColor' && active">
    <div :class="cn('items-center grid grid-cols-12', active ? 'opacity-100' : 'opacity-50')">
      <Label class="text-xs font-medium col-span-5">{{ 'Color' }}</Label>
      <div class="flex items-center col-span-7 gap-2">
        <el-color-picker v-model="removeColor" :disabled="!active" color-format="hex" :predefine="colors" />
      </div>
    </div>
  </template>-->
  <el-divider class="my-0"/>
</template>
