<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Edit, Delete, Magic, CloseOne, Left, Right, 
    Pic, Link, Eyes as Eye, FourArrows 
} from '@icon-park/vue-next';
import { getFileUrl } from '@/utils/api';
import { useUIStore } from '@/stores/ui';

const uiStore = useUIStore();

const props = defineProps<{
    modelValue: boolean;
    product: any;
}>();

const emit = defineEmits(['update:modelValue', 'edit', 'remove', 'create-ad']);

const visible = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
});

// Gallery state
const activeGalleryIndex = ref(0);

const galleryImages = computed(() => {
    if (!props.product) return [];
    const imgs: string[] = [];
    if (props.product.image) imgs.push(props.product.image);
    if (props.product.images?.length) {
        props.product.images.forEach((img: string) => {
            if (img && !imgs.includes(img)) imgs.push(img);
        });
    }
    return imgs;
});

watch(() => props.modelValue, (val) => {
    if (val) activeGalleryIndex.value = 0;
});

const prevImage = () => {
    if (activeGalleryIndex.value > 0) activeGalleryIndex.value--;
    else activeGalleryIndex.value = galleryImages.value.length - 1;
};

const nextImage = () => {
    if (activeGalleryIndex.value < galleryImages.value.length - 1) activeGalleryIndex.value++;
    else activeGalleryIndex.value = 0;
};

const handleEdit = () => {
    emit('edit', props.product);
    visible.value = false;
};

const handleRemove = () => {
    emit('remove', props.product);
    visible.value = false;
};

const createAd = () => {
    emit('create-ad', props.product);
    visible.value = false;
};

const landingUrl = computed(() => {
    if (!props.product) return '';
    return `${uiStore.domain}/p/${props.product._id}`;
});

const copyLink = () => {
    navigator.clipboard.writeText(landingUrl.value);
};
</script>

<template>
    <el-dialog
        v-model="visible"
        width="95%"
        class="cinematic-dialog product-preview-dialog"
        :show-close="false"
        destroy-on-close
    >
        <div v-if="product" class="product-preview-container font-outfit">
            <!-- Close Button -->
            <button @click="visible = false" class="absolute top-4 right-4 z-50 w-9 h-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white/60 hover:bg-white hover:text-black transition-all duration-300">
                <close-one size="16" />
            </button>

            <!-- Main Split Layout -->
            <div class="flex flex-col lg:flex-row min-h-0">
                
                <!-- ═══════ LEFT: Gallery ═══════ -->
                <div class="lg:w-[55%] flex flex-col md:flex-row bg-[#08080a]">
                    
                    <!-- Vertical Thumbnail Strip (Desktop) -->
                    <div v-if="galleryImages.length > 1" class="hidden md:flex flex-col gap-2 p-3 w-[80px] shrink-0 overflow-y-auto scrollbar-hide">
                        <button 
                            v-for="(img, i) in galleryImages" :key="i" 
                            @click="activeGalleryIndex = i"
                            class="shrink-0 w-[56px] h-[56px] rounded-xl overflow-hidden border-2 transition-all duration-300"
                            :class="activeGalleryIndex === i ? 'border-blue-500 ring-1 ring-blue-500/40' : 'border-white/5 hover:border-white/20 opacity-50 hover:opacity-100'"
                        >
                            <img :src="getFileUrl(img)" class="w-full h-full object-cover" />
                        </button>
                    </div>
                    
                    <!-- Main Image Viewer -->
                    <div class="flex-1 relative flex items-center justify-center p-4 md:p-6 min-h-[280px] md:min-h-[480px]">
                        <!-- Navigation Arrows -->
                        <button v-if="galleryImages.length > 1" @click="prevImage" class="absolute left-2 md:left-4 z-10 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white transition-all">
                            <left size="16" />
                        </button>
                        <button v-if="galleryImages.length > 1" @click="nextImage" class="absolute right-2 md:right-4 z-10 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white transition-all">
                            <right size="16" />
                        </button>

                        <!-- Video or Image -->
                        <div class="w-full h-full flex items-center justify-center">
                            <video 
                                v-if="product.video"
                                :src="getFileUrl(product.video)" 
                                autoplay muted loop
                                class="max-w-full max-h-[460px] rounded-2xl object-contain"
                            ></video>
                            <transition v-else name="gallery-fade" mode="out-in">
                                <el-image 
                                    :key="activeGalleryIndex" 
                                    :src="galleryImages.length ? getFileUrl(galleryImages[activeGalleryIndex]) : ''"
                                    fit="contain"
                                    class="max-w-full max-h-[460px] rounded-2xl"
                                    :preview-src-list="galleryImages.map(i => getFileUrl(i))"
                                    :initial-index="activeGalleryIndex"
                                >
                                    <template #error>
                                        <div class="w-full h-[300px] flex flex-col items-center justify-center text-gray-600 gap-2">
                                            <Pic size="40" />
                                            <span class="text-[10px] font-bold uppercase tracking-widest">No Image</span>
                                        </div>
                                    </template>
                                </el-image>
                            </transition>
                        </div>

                        <!-- Image Counter -->
                        <div v-if="galleryImages.length > 1" class="absolute bottom-3 right-3 md:bottom-5 md:right-5 px-3 py-1 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10 text-[10px] font-black text-gray-300">
                            {{ activeGalleryIndex + 1 }} / {{ galleryImages.length }}
                        </div>
                    </div>

                    <!-- Horizontal Thumbnail Strip (Mobile) -->
                    <div v-if="galleryImages.length > 1" class="md:hidden flex gap-2 px-4 pb-4 overflow-x-auto scrollbar-hide">
                        <button 
                            v-for="(img, i) in galleryImages" :key="i" 
                            @click="activeGalleryIndex = i"
                            class="shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all duration-300"
                            :class="activeGalleryIndex === i ? 'border-blue-500 ring-1 ring-blue-500/40' : 'border-white/5 opacity-50 hover:opacity-100'"
                        >
                            <img :src="getFileUrl(img)" class="w-full h-full object-cover" />
                        </button>
                    </div>
                </div>
                
                <!-- ═══════ RIGHT: Product Info ═══════ -->
                <div class="lg:w-[45%] p-6 md:p-8 lg:p-10 bg-[#0a0a0c] overflow-y-auto lg:max-h-[80vh] space-y-6 border-l border-white/5">
                    
                    <!-- Brand Badge -->
                    <div class="flex items-center gap-3">
                        <div class="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-black text-sm border border-white/20 shrink-0">
                            {{ product.brand_name ? product.brand_name[0] : 'P' }}
                        </div>
                        <div class="flex flex-col min-w-0">
                            <span class="text-[9px] font-black uppercase tracking-[0.15em] text-blue-400 truncate">{{ product.brand_slogan || 'Product' }}</span>
                            <span class="text-sm font-black uppercase tracking-tight truncate">{{ product.brand_name || 'AntStudio' }}</span>
                        </div>
                    </div>

                    <!-- Title & Description -->
                    <div>
                        <h1 class="text-2xl md:text-3xl font-black tracking-tighter leading-none uppercase mb-3">{{ product.name }}</h1>
                        <p class="text-gray-400 text-sm leading-relaxed line-clamp-4">{{ product.description }}</p>
                    </div>

                    <!-- Price Block -->
                    <div class="p-5 rounded-2xl bg-white/5 border border-white/5 relative overflow-hidden group">
                        <div class="absolute -top-8 -right-8 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000"></div>
                        <div class="relative z-10 flex justify-between items-end">
                            <div>
                                <div class="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">Price</div>
                                <div class="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                                    {{ product.currency }} {{ product.price }}
                                </div>
                            </div>
                            <div class="text-right">
                                <div class="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">Stock</div>
                                <div class="text-lg font-black" :class="product.stock < 5 ? 'text-red-500 animate-pulse' : 'text-white'">
                                    {{ product.stock }} units
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Stats Row -->
                    <div class="grid grid-cols-3 gap-2">
                        <div class="text-center p-3 rounded-xl bg-white/5 border border-white/5">
                            <div class="text-lg font-black text-blue-400">{{ product.views || 0 }}</div>
                            <div class="text-[8px] font-black uppercase tracking-widest text-gray-500 mt-0.5">Views</div>
                        </div>
                        <div class="text-center p-3 rounded-xl bg-white/5 border border-white/5">
                            <div class="text-lg font-black text-purple-400">{{ product.clicks || 0 }}</div>
                            <div class="text-[8px] font-black uppercase tracking-widest text-gray-500 mt-0.5">Clicks</div>
                        </div>
                        <div class="text-center p-3 rounded-xl bg-white/5 border border-white/5">
                            <div class="text-lg font-black text-green-400">{{ product.sales || 0 }}</div>
                            <div class="text-[8px] font-black uppercase tracking-widest text-gray-500 mt-0.5">Sales</div>
                        </div>
                    </div>

                    <!-- Features -->
                    <div v-if="product.features?.length" class="flex flex-wrap gap-2">
                        <span v-for="feat in product.features" :key="feat" class="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[9px] font-black uppercase tracking-widest text-gray-400">
                            {{ feat }}
                        </span>
                    </div>

                    <!-- Brand Colors -->
                    <div v-if="product.primary_colors?.length" class="flex items-center gap-2"> 
                        <span class="text-[9px] font-black uppercase tracking-widest text-gray-600 mr-1">Brand</span>
                        <div v-for="c in product.primary_colors" :key="c" class="w-5 h-5 rounded-md border border-white/10 shadow-inner cursor-pointer hover:scale-110 transition-transform" :style="{ background: c }"></div>
                    </div>

                    <!-- Divider -->
                    <div class="border-t border-white/5"></div>

                    <!-- Action Buttons -->
                    <div class="space-y-3">
                        <button @click="createAd" class="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 border border-blue-500 transition-all font-black text-xs uppercase tracking-widest text-white shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 hover:-translate-y-0.5">
                            <magic size="16" />
                            Launch Ad Wizard
                        </button>
                        <div class="grid grid-cols-3 gap-2">
                            <button @click="handleEdit" class="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all group">
                                <edit size="14" class="text-gray-400 group-hover:text-white" />
                                <span class="text-[8px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white">Edit</span>
                            </button>
                            <button @click="copyLink" class="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all group">
                                <link size="14" class="text-gray-400 group-hover:text-blue-400" />
                                <span class="text-[8px] font-black uppercase tracking-widest text-gray-400 group-hover:text-blue-400">Link</span>
                            </button>
                            <button @click="handleRemove" class="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-white/5 border border-white/5 hover:bg-red-500/10 hover:border-red-500/30 transition-all group">
                                <delete size="14" class="text-gray-400 group-hover:text-red-500" />
                                <span class="text-[8px] font-black uppercase tracking-widest text-gray-400 group-hover:text-red-500">Delete</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </el-dialog>
</template>

<style lang="scss">
.product-preview-dialog {
    &.cinematic-dialog {
        background: transparent !important;
        box-shadow: none !important;
        .el-dialog__header { display: none; }
        .el-dialog__body { padding: 0; background: transparent; }
    }

    &.el-dialog {
        max-width: 1100px;
        margin: 1rem auto !important;
        @media (max-width: 768px) {
            width: 100% !important;
            max-width: 100%;
            margin: 0 !important;
            .el-dialog__body {
                max-height: 100dvh;
                overflow-y: auto;
            }
        }
    }
}

.product-preview-container {
    background: #0a0a0c;
    border-radius: 28px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    overflow: hidden;
    position: relative;
    box-shadow: 
        0 50px 100px -20px rgba(0, 0, 0, 0.7),
        0 0 0 1px rgba(255, 255, 255, 0.03) inset;

    @media (max-width: 768px) {
        border-radius: 0;
        border: none;
    }

    &::before {
        content: '';
        position: absolute;
        inset: 0;
        background-image: radial-gradient(circle at 2px 2px, rgba(255,255,255,0.015) 1px, transparent 0);
        background-size: 32px 32px;
        pointer-events: none;
        z-index: 0;
    }
}

.scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
    &::-webkit-scrollbar { display: none; }
}

.gallery-fade-enter-active,
.gallery-fade-leave-active {
    transition: opacity 0.2s ease;
}
.gallery-fade-enter-from,
.gallery-fade-leave-to {
    opacity: 0;
}

.font-outfit {
  font-family: 'Outfit', sans-serif;
}
</style>
