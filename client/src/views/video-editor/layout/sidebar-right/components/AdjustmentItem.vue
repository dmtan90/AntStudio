<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { PreviewOpen as Eye, PreviewCloseOne as EyeOff } from '@icon-park/vue-next';
import Toggle from 'video-editor/components/ui/toggle.vue';
import Label  from 'video-editor/components/ui/label.vue';
import { cn } from '@/utils/ui';
import { filters, adjustments, BlendModes, GrayScaleModes } from 'video-editor/constants/filters';
import { colors } from 'video-editor/constants/color';
import { onClickOutside } from '@vueuse/core';
// import { useCanvasStore } from 'video-editor/store/canvas';
// import { storeToRefs } from "pinia";

// const canvasStore = useCanvasStore();
// const { selectionActive: selected } = storeToRefs(canvasStore);

const props = defineProps<{ adjustment: any; selected: any; onChange: (value: any) => void; onToggle: (value: boolean) => void }>();
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
  <div class="flex flex-col gap-3 group">
    <div :class="cn('flex items-center justify-between transition-opacity duration-300', active ? 'opacity-100' : 'opacity-40')">
      <div class="flex items-center gap-3">
        <Toggle v-model="active" circle class="h-5 w-5 border-white/10" @toggle="(value) => onToggle(value)">
          <template v-if="active">
            <Eye :size="10" />
          </template>
          <template v-else>
            <EyeOff :size="10" />
          </template>
        </Toggle>
        <span class="text-[11px] font-bold text-white/90 uppercase tracking-widest group-hover:text-brand-primary transition-colors cursor-default">{{ name }}</span>
      </div>

      <!-- Adjustment Controls -->
      <div class="flex items-center gap-3" v-if="active">
        <template v-if="name == 'RemoveColor'">
          <el-popover
            :visible="activePopup"
            placement="bottom-end"
            width="280px"
            popper-class="cinematic-popover p-0 overflow-hidden border-white/10"
            @hide="activePopup = false"
          >
            <template #reference>
              <button class="w-8 h-8 rounded-lg border border-white/10 overflow-hidden shadow-sm hover:scale-110 transition-transform" :style="{ backgroundColor: removeColor.color }" @click="activePopup = !activePopup" />
            </template>
            
            <div class="bg-[#0d0d0d]/95 backdrop-blur-2xl">
              <!-- Popover Header -->
              <div class="px-5 py-3 border-b border-white/5 bg-white/5">
                <span class="text-[9px] font-bold text-white/40 uppercase tracking-widest">Remove Color</span>
              </div>
              
              <div class="p-5 flex flex-col gap-6" ref="popup">
                <div class="space-y-4">
                  <div class="flex items-center justify-between">
                    <Label class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Color</Label>
                    <el-color-picker v-model="removeColor.color" color-format="hex" :predefine="colors" @change="onChange" />
                  </div>
                  <div class="space-y-3">
                    <div class="flex justify-between">
                        <Label class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Tolerance</Label>
                        <span class="text-[10px] font-bold font-mono text-white/60 bg-white/5 px-1.5 rounded">{{ (removeColor.alpha * 100).toFixed(0) }}%</span>
                    </div>
                    <el-slider :min="0" :max="1" :step="0.01" v-model="removeColor.alpha" @change="onChange" class="cinematic-slider" />
                  </div>
                </div>
              </div>
            </div>
          </el-popover>
        </template>

        <template v-else-if="name == 'BlendColor'">
           <el-popover
            :visible="activePopup"
            placement="bottom-end"
            width="280px"
            popper-class="cinematic-popover p-0 overflow-hidden border-white/10"
            @hide="activePopup = false"
          >
            <template #reference>
              <button class="w-8 h-8 rounded-lg border border-white/10 overflow-hidden shadow-sm hover:scale-110 transition-transform" :style="{ backgroundColor: blendColor.color }" @click="activePopup = !activePopup" />
            </template>
            
            <div class="bg-[#0d0d0d]/95 backdrop-blur-2xl">
              <div class="px-5 py-3 border-b border-white/5 bg-white/5">
                <span class="text-[9px] font-bold text-white/40 uppercase tracking-widest">Blend Controls</span>
              </div>
              
              <div class="p-5 flex flex-col gap-6">
                <div class="space-y-5">
                  <div class="flex items-center justify-between gap-4">
                    <Label class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Mode</Label>
                    <el-select class="cinematic-select w-32" popper-class="cinematic-popover" v-model="blendColor.mode" @change="onChange">
                      <el-option v-for="item in BlendModes" :key="item.value" :label="item.name" :value="item.value" />
                    </el-select>
                  </div>
                  <div class="flex items-center justify-between">
                    <Label class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Color</Label>
                    <el-color-picker v-model="blendColor.color" color-format="hex" :predefine="colors" @change="onChange" />
                  </div>
                  <div class="space-y-3">
                    <div class="flex justify-between">
                        <Label class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Opacity</Label>
                        <span class="text-[10px] font-bold font-mono text-white/60 bg-white/5 px-1.5 rounded">{{ (blendColor.alpha * 100).toFixed(0) }}%</span>
                    </div>
                    <el-slider :min="0" :max="1" :step="0.01" v-model="blendColor.alpha" @change="onChange" class="cinematic-slider" />
                  </div>
                </div>
              </div>
            </div>
          </el-popover>
        </template>

        <template v-else-if="name == 'Grayscale'">
          <el-select size="small" class="cinematic-select w-28" popper-class="cinematic-popover" v-model="grayScale.mode" v-if="grayScale" @change="onChange">
            <el-option v-for="item in GrayScaleModes" :key="item.value" :label="item.name" :value="item.value" />
          </el-select>
        </template>

        <template v-else-if="name == 'Noise' || name == 'Pixelate' || name == 'Blur' || !excludeSliders.includes(name)">
            <span class="text-[10px] font-bold font-mono text-white/40 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">{{ intensity }}</span>
        </template>
      </div>
    </div>

    <!-- Collapsible Intensity Slider for common adjustments -->
    <div v-if="active && (name == 'Noise' || name == 'Pixelate' || name == 'Blur' || !excludeSliders.includes(name))" class="pl-8 pr-2">
        <el-slider 
            v-if="name == 'Noise'" 
            :min="0" :max="1000" :step="10" 
            v-model="intensity" 
            class="cinematic-slider" 
        />
        <el-slider 
            v-else-if="name == 'Pixelate'" 
            :min="0" :max="20" :step="1" 
            v-model="intensity" 
            class="cinematic-slider" 
        />
        <el-slider 
            v-else-if="name == 'Blur'" 
            :min="0" :max="100" :step="1" 
            v-model="intensity" 
            class="cinematic-slider" 
        />
        <el-slider 
            v-else-if="!excludeSliders.includes(name)" 
            :min="-100" :max="100" :step="1" 
            v-model="intensity" 
            @change="onChange" 
            class="cinematic-slider" 
        />
    </div>

    <!-- Duotone Specific Controls -->
    <template v-if="name == 'Duotone' && active && doutone">
      <div class="flex flex-col gap-4 pl-8 py-3 bg-white/5 rounded-2xl border border-white/5 mt-1 mx-2 p-4">
        <div class="flex items-center justify-between">
          <Label class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Light</Label>
          <div class="flex items-center gap-3">
             <el-popover placement="bottom-end" width="280px" popper-class="cinematic-popover p-0 overflow-hidden border-white/10" @hide="activePopup = false">
                <template #reference>
                   <button class="w-7 h-7 rounded-lg border border-white/10 shadow-sm" :style="{ backgroundColor: doutone[1].color }" @click="activePopup = !activePopup" />
                </template>
                <div class="bg-[#0d0d0d]/95 backdrop-blur-2xl p-5 flex flex-col gap-5">
                   <div class="flex items-center justify-between gap-4">
                      <Label class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Mode</Label>
                      <el-select class="cinematic-select w-32" popper-class="cinematic-popover" v-model="doutone[1].mode" @change="onChange">
                        <el-option v-for="item in BlendModes" :key="item.value" :label="item.name" :value="item.value" />
                      </el-select>
                   </div>
                   <div class="flex items-center justify-between">
                      <Label class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Color</Label>
                      <el-color-picker v-model="doutone[1].color" color-format="hex" :predefine="colors" @change="onChange" />
                   </div>
                </div>
             </el-popover>
          </div>
        </div>

        <div class="flex items-center justify-between">
          <Label class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Dark</Label>
          <div class="flex items-center gap-3">
            <el-popover placement="bottom-end" width="280px" popper-class="cinematic-popover p-0 overflow-hidden border-white/10" @hide="activePopup2 = false">
                <template #reference>
                   <button class="w-7 h-7 rounded-lg border border-white/10 shadow-sm" :style="{ backgroundColor: doutone[2].color }" @click="activePopup2 = !activePopup2" />
                </template>
                <div class="bg-[#0d0d0d]/95 backdrop-blur-2xl p-5 flex flex-col gap-5">
                   <div class="flex items-center justify-between gap-4">
                      <Label class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Mode</Label>
                      <el-select class="cinematic-select w-32" popper-class="cinematic-popover" v-model="doutone[2].mode" @change="onChange">
                        <el-option v-for="item in BlendModes" :key="item.value" :label="item.name" :value="item.value" />
                      </el-select>
                   </div>
                   <div class="flex items-center justify-between">
                      <Label class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Color</Label>
                      <el-color-picker v-model="doutone[2].color" color-format="hex" :predefine="colors" @change="onChange" />
                   </div>
                </div>
             </el-popover>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
