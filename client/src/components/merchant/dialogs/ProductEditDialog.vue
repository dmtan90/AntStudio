<template>
  <el-dialog
    v-model="isVisible"
    :title="isEdit ? t('merchant.editDialog.titleEdit') : t('merchant.editDialog.titleAdd')"
    width="520px"
    class="product-edit-dialog glass-dark"
    :align-center="true"
    :append-to-body="true"
  >
    <div class="p-6 space-y-5">
      <div class="grid grid-cols-1 gap-4">
        <!-- Purchase URL + Auto Fill -->
        <div class="input-group">
          <label class="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 block">{{ t('merchant.editDialog.purchaseUrl') }}</label>
          <div class="flex gap-2">
            <el-input v-model="form.inventoryUrl" :placeholder="t('merchant.editDialog.placeholders.url')" class="glass-input flex-1" />
            <el-button 
              :loading="extracting" 
              @click="handleExtract"
              class="glass-btn !bg-violet-500/20 !border-violet-500/30 hover:!bg-violet-500/30 !px-4"
              :disabled="!form.inventoryUrl || extracting"
            >
              <template v-if="!extracting">
                <magic-wand theme="outline" size="14" class="mr-1" />
                <span class="text-[10px] font-black uppercase">{{ t('merchant.editDialog.autoFill') }}</span>
              </template>
              <template v-else>
                <span class="text-[10px] font-black uppercase">{{ t('merchant.editDialog.analyzing') }}</span>
              </template>
            </el-button>
          </div>
          <p class="text-[8px] opacity-25 mt-1.5">{{ t('merchant.editDialog.urlHint') }}</p>
        </div>

        <div class="input-group">
          <label class="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 block">{{ t('merchant.editDialog.productName') }}</label>
          <el-input v-model="form.name" :placeholder="t('merchant.editDialog.placeholders.name')" class="glass-input" />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="input-group">
            <label class="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 block">{{ t('merchant.editDialog.price') }}</label>
            <el-input-number v-model="form.price" :min="0" class="glass-input w-full" :controls="false" />
          </div>
          <div class="input-group">
            <label class="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 block">{{ t('merchant.editDialog.stock') }}</label>
            <el-input-number v-model="form.stock" :min="0" class="glass-input w-full" :controls="false" />
          </div>
        </div>

        <!-- Product Images Gallery -->
        <div class="input-group">
          <label class="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 block">{{ t('merchant.editDialog.images') }}</label>
          <div class="flex gap-2 mb-3">
            <el-input v-model="newImageUrl" :placeholder="t('merchant.editDialog.placeholders.image')" class="glass-input flex-1" size="small" @keyup.enter="addImage" />
            <el-button @click="addImage" size="small" :disabled="!newImageUrl" class="glass-btn !px-3">
              <plus theme="outline" size="14" />
            </el-button>
          </div>
          
          <!-- Image gallery grid -->
          <div v-if="form.images.length > 0" class="grid grid-cols-5 gap-2">
            <div 
              v-for="(img, idx) in form.images" 
              :key="idx" 
              class="image-thumb group relative rounded-xl overflow-hidden border border-white/10 aspect-square cursor-pointer"
              :class="{ 'ring-2 ring-violet-500 ring-offset-1 ring-offset-black': idx === 0 }"
              @click="setPrimaryImage(idx)"
            >
              <img :src="img" class="w-full h-full object-cover" @error="($event.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22/>'"/>
              <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                <button @click.stop="removeImage(idx)" class="p-1 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors">
                  <close-one theme="outline" size="10" fill="white" />
                </button>
              </div>
              <span v-if="idx === 0" class="absolute top-0.5 left-0.5 text-[7px] font-black bg-violet-500/90 px-1.5 py-0.5 rounded-br-lg rounded-tl-lg uppercase">{{ t('merchant.editDialog.mainLabel') }}</span>
            </div>
          </div>
          <p v-else class="text-[8px] opacity-25">{{ t('merchant.editDialog.imageHint') }}</p>
        </div>

        <div class="input-group">
          <label class="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 block">{{ t('merchant.editDialog.description') }}</label>
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            :placeholder="t('merchant.editDialog.placeholders.description')"
            class="glass-input"
          />
        </div>

        <!-- Features Section -->
        <div class="input-group">
          <label class="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 block">{{ t('merchant.adDialog.refineStep.keyFeatures') }}</label>
          <div class="flex flex-wrap gap-2 mb-2">
            <el-tag
              v-for="(feature, index) in form.features"
              :key="index"
              closable
              @close="form.features.splice(index, 1)"
              class="cinematic-tag"
            >
              {{ feature }}
            </el-tag>
          </div>
          <el-input
            v-model="newFeature"
            size="small"
            :placeholder="t('merchant.adDialog.refineStep.addFeaturePlaceholder')"
            class="glass-input-small"
            @keyup.enter="addFeature"
          >
            <template #suffix>
              <plus @click="addFeature" class="cursor-pointer opacity-50 hover:opacity-100" size="14" />
            </template>
          </el-input>
        </div>

        <el-divider class="cinematic-divider" />

        <!-- Brand Identity Section -->
        <div class="space-y-4">
          <h3 class="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400">{{ t('merchant.editDialog.brandIdentity') }}</h3>
          
          <div class="grid grid-cols-2 gap-4">
            <div class="input-group">
              <label class="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 block">{{ t('merchant.editDialog.brandName') }}</label>
              <el-input v-model="form.brand_name" :placeholder="t('merchant.editDialog.placeholders.brandName')" class="glass-input" />
            </div>
            <div class="input-group">
              <label class="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 block">{{ t('merchant.editDialog.brandLogo') }}</label>
              <el-input v-model="form.brand_logo" :placeholder="t('merchant.editDialog.placeholders.brandLogo')" class="glass-input" />
            </div>
          </div>

          <div class="input-group">
            <label class="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 block">{{ t('merchant.editDialog.brandSlogan') }}</label>
            <el-input v-model="form.brand_slogan" :placeholder="t('merchant.editDialog.placeholders.brandSlogan')" class="glass-input" />
          </div>

          <div class="input-group">
            <label class="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 block">{{ t('merchant.editDialog.videoUrl') }}</label>
            <el-input v-model="form.video" :placeholder="t('merchant.editDialog.placeholders.video')" class="glass-input">
               <template #suffix>
                  <video-file theme="outline" size="14" class="opacity-50" />
               </template>
            </el-input>
            <p v-if="form.video" class="text-[8px] text-blue-400 mt-1 cursor-pointer hover:underline" @click="openPreview">{{ t('merchant.editDialog.previewVideo') }}</p>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="input-group">
              <label class="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 block">{{ t('merchant.editDialog.primaryColors') }}</label>
              <div class="flex items-center gap-2">
                <div v-for="(color, idx) in form.primary_colors" :key="idx" class="relative group">
                  <div class="w-6 h-6 rounded-md border border-white/20" :style="{ backgroundColor: color }"></div>
                  <button @click="form.primary_colors.splice(idx, 1)" class="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 bg-red-500 rounded-full p-0.5 transition-opacity">
                    <close-one size="8" theme="outline" fill="white" />
                  </button>
                </div>
                <el-color-picker v-if="form.primary_colors.length < 3" size="small" @change="(val) => val && form.primary_colors.push(val)" />
              </div>
            </div>
            <div class="input-group">
              <label class="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 block">{{ t('merchant.editDialog.secondaryColors') }}</label>
              <div class="flex items-center gap-2">
                <div v-for="(color, idx) in form.secondary_colors" :key="idx" class="relative group">
                  <div class="w-6 h-6 rounded-md border border-white/20" :style="{ backgroundColor: color }"></div>
                  <button @click="form.secondary_colors.splice(idx, 1)" class="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 bg-red-500 rounded-full p-0.5 transition-opacity">
                    <close-one size="8" theme="outline" fill="white" />
                  </button>
                </div>
                <el-color-picker v-if="form.secondary_colors.length < 3" size="small" @change="(val) => val && form.secondary_colors.push(val)" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-3 p-6 border-t border-white/5 bg-white/[0.02]">
        <el-button @click="isVisible = false" class="glass-btn secondary text-[10px] font-black uppercase tracking-widest">{{ t('common.actions.cancel') }}</el-button>
        <el-button 
          type="primary" 
          @click="handleSave" 
          :loading="loading"
          class="glass-btn primary text-[10px] font-black uppercase tracking-widest"
          :disabled="!form.name || form.price === undefined"
        >
          {{ isEdit ? t('merchant.editDialog.updateProduct') : t('merchant.editDialog.createProduct') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { MagicWand, Plus, CloseOne, VideoFile } from '@icon-park/vue-next';
import { useMarketplaceStore } from '@/stores/marketplace';
import { toast } from 'vue-sonner';
import api, { getFileUrl } from '@/utils/api';
import { useI18n } from 'vue-i18n';

const { t } = useI18n()

const props = defineProps<{
  modelValue: boolean;
  product?: any;
}>();

const emit = defineEmits(['update:modelValue', 'saved']);

const marketplaceStore = useMarketplaceStore();
const loading = ref(false);
const extracting = ref(false);
const newImageUrl = ref('');
const newFeature = ref('');

const addFeature = () => {
    const val = newFeature.value.trim();
    if (val && !form.value.features.includes(val)) {
        form.value.features.push(val);
    }
    newFeature.value = '';
};

const openPreview = () => {
  if (form.value.video) {
    window.open(getFileUrl(form.value.video), '_blank');
  }
};

const isVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const isEdit = computed(() => !!props.product);

const form = ref({
  name: '',
  description: '',
  price: 0,
  currency: 'USD',
  image: '',
  images: [] as string[],
  stock: 0,
  inventoryUrl: '',
  isActive: true,
  features: [] as string[],
  brand_name: '',
  brand_logo: '',
  brand_slogan: '',
  primary_colors: [] as string[],
  secondary_colors: [] as string[],
  video: ''
});

watch(() => props.product, (val) => {
  if (val) {
    form.value = { 
      ...val,
      images: val.images || (val.image ? [val.image] : [])
    };
  } else {
    form.value = {
      name: '',
      description: '',
      price: 0,
      currency: 'USD',
      image: '',
      images: [],
      stock: 0,
      inventoryUrl: '',
      isActive: true,
      features: [],
      brand_name: '',
      brand_logo: '',
      brand_slogan: '',
      primary_colors: [],
      secondary_colors: [],
      video: ''
    };
  }
}, { immediate: true });

const addImage = () => {
  const url = newImageUrl.value.trim();
  if (!url) return;
  if (!form.value.images.includes(url)) {
    form.value.images.push(url);
    // First image becomes the primary
    if (form.value.images.length === 1) {
      form.value.image = url;
    }
  }
  newImageUrl.value = '';
};

const removeImage = (idx: number) => {
  form.value.images.splice(idx, 1);
  // Update primary image
  form.value.image = form.value.images[0] || '';
};

const setPrimaryImage = (idx: number) => {
  if (idx === 0) return;
  const [img] = form.value.images.splice(idx, 1);
  form.value.images.unshift(img);
  form.value.image = img;
};

const handleExtract = async () => {
  if (!form.value.inventoryUrl || extracting.value) return;
  
  extracting.value = true;
  try {
    const res: any = await api.post('/commerce/extract-product', { url: form.value.inventoryUrl });
    if (res.success && res.data) {
      const d = res.data;
      if (d.name) form.value.name = d.name;
      if (d.price) form.value.price = d.price;
      if (d.currency) form.value.currency = d.currency;
      if (d.description) form.value.description = d.description;
      // Handle images - prefer array, fallback to single
      if (d.images?.length) {
        form.value.images = d.images;
        form.value.image = d.images[0];
      } else if (d.image) {
        form.value.images = [d.image];
        form.value.image = d.image;
      }

      // New Extraction Fields
      if (d.features?.length) form.value.features = d.features;
      if (d.brand_name) form.value.brand_name = d.brand_name;
      if (d.brand_logo) form.value.brand_logo = d.brand_logo;
      if (d.brand_slogan) form.value.brand_slogan = d.brand_slogan;
      if (d.primary_colors?.length) form.value.primary_colors = d.primary_colors;
      if (d.secondary_colors?.length) form.value.secondary_colors = d.secondary_colors;

      toast.success(t('merchant.editDialog.extracted', { count: String(form.value.images?.length || 0) }));
    } else {
      toast.error(t('merchant.editDialog.extractError'));
    }
  } catch (e: any) {
    toast.error(e.message || t('merchant.editDialog.extractError'));
  } finally {
    extracting.value = false;
  }
};

const handleSave = async () => {
  loading.value = true;
  try {
    // Ensure image stays in sync with first gallery image
    form.value.image = form.value.images[0] || form.value.image || '';
    
    if (isEdit.value) {
      await marketplaceStore.updateProduct(props.product._id || props.product.id, form.value);
    } else {
      await marketplaceStore.createProduct(form.value);
    }
    emit('saved');
    isVisible.value = false;
  } catch (e) {
    // Error handled by store
  } finally {
    loading.value = false;
  }
};
</script>

<style lang="scss">
.product-edit-dialog {
  border-radius: 24px !important;
  overflow: hidden;
  background: rgba(15, 15, 15, 0.95) !important;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.05);

  .el-dialog__header {
    background: rgba(255, 255, 255, 0.02);
    margin: 0;
    padding: 24px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    
    .el-dialog__title {
      font-size: 14px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: white;
    }
  }

  .el-dialog__body {
    padding: 0;
  }

  .image-thumb {
    transition: all 0.2s ease;
    &:hover {
      border-color: rgba(255, 255, 255, 0.2);
    }
  }

  .cinematic-tag {
    background: rgba(139, 92, 246, 0.1) !important;
    border: 1px solid rgba(139, 92, 246, 0.2) !important;
    color: #a78bfa !important;
    font-size: 8px !important;
    font-weight: 900 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.05em !important;
    border-radius: 6px !important;
    .el-tag__close {
      color: #a78bfa !important;
      &:hover {
        background: rgba(139, 92, 246, 0.3) !important;
      }
    }
  }

  .glass-input-small {
    .el-input__wrapper {
        background: rgba(255, 255, 255, 0.03) !important;
        border: 1px solid rgba(255, 255, 255, 0.05) !important;
        box-shadow: none !important;
        border-radius: 8px !important;
        padding: 4px 8px !important;
        &:hover, &.is-focus {
            border-color: rgba(139, 92, 246, 0.3) !important;
        }
    }
    input {
        color: white !important;
        font-size: 10px !important;
        font-weight: 500 !important;
    }
  }

  .cinematic-divider {
    border-color: rgba(255, 255, 255, 0.05) !important;
    margin: 32px 0 !important;
  }
}

/* Color Picker Overrides */
.el-color-picker__trigger {
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    background: rgba(255, 255, 255, 0.02) !important;
}
</style>
