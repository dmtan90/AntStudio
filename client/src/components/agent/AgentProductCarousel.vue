<template>
  <div class="product-carousel-wrapper">
    <div class="product-carousel">
      <div
        v-for="prod in products"
        :key="prod.name"
        class="product-card"
        @click="handleProductClick(prod)"
      >
        <div class="prod-badge" :class="{ 'out-of-stock': prod.stock === '0' || prod.stock.toLowerCase() === '0' }">
          {{ prod.stock === '0' || prod.stock.toLowerCase() === '0' ? t.outOfStock : t.inStock(prod.stock) }}
        </div>
        <div class="prod-image-container">
          <img v-if="getProductImage(prod.name)" :src="getProductImage(prod.name)" class="prod-img" />
          <camera v-else theme="outline" size="24" fill="#818cf8" :strokeWidth="4"/>
        </div>
        <div class="prod-name" :title="prod.name">{{ prod.name }}</div>
        <div class="prod-price">{{ prod.price }}</div>
        <button class="prod-action-btn">
          {{ t.viewDetails }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useAntStudioAgent } from '@/composables/useAntStudioAgent';
import { useMarketplaceStore } from '@/stores/marketplace';
import { Camera } from '@icon-park/vue-next';
import { useUserStore } from '@/stores/user';
import { storeToRefs } from 'pinia';

const userStore = useUserStore();
const { preferredLanguage: currentLang } = storeToRefs(userStore);

interface ParsedProduct {
  name: string;
  price: string;
  stock: string;
}

defineProps<{
  products: ParsedProduct[];
}>();

const { sendMessage, selectedProduct, showProductDialog } = useAntStudioAgent();
const marketplaceStore = useMarketplaceStore();

onMounted(async () => {
  if (marketplaceStore.products.length === 0) {
    try {
      await marketplaceStore.fetchProducts();
    } catch (e) {
      console.error('Failed to pre-fetch products for Agent Chat images', e);
    }
  }
});

function getProductImage(prodName: string): string {
  const match = marketplaceStore.products.find(
    p => p.name.toLowerCase().trim() === prodName.toLowerCase().trim()
  );
  return match?.image || '';
}

function handleProductClick(prod: ParsedProduct) {
  // Find full product info from Vue store
  const match = marketplaceStore.products.find(
    p => p.name.toLowerCase().trim() === prod.name.toLowerCase().trim()
  );
  
  if (match) {
    selectedProduct.value = match;
  } else {
    // Basic fallback so UI doesn't crash if it hasn't loaded
    selectedProduct.value = {
      name: prod.name,
      price: parseFloat(prod.price.replace(/[^\d.]/g, '')) || 0,
      stock: parseInt(prod.stock, 10) || 0,
      description: '',
      currency: 'USD'
    };
  }
  
  // Set trigger to open the Preview Dialog
  showProductDialog.value = true;
  
  // Also send message to Agent to synchronize state context
  const isVn = currentLang.value === 'vi';
  sendMessage(!isVn ? `Show details for ${prod.name}` : `Xem chi tiết sản phẩm ${prod.name}`);
}

const t = computed(() => {
  const isVn = currentLang.value === 'vi';
  return {
    outOfStock: !isVn ? 'Out of stock' : 'Hết hàng',
    inStock: (stock: string) => !isVn ? `Stock: ${stock}` : `Còn: ${stock}`,
    viewDetails: !isVn ? 'View details' : 'Xem chi tiết'
  };
});
</script>

<style scoped lang="scss">
.product-carousel-wrapper {
  margin: 12px -14px;
  padding: 4px 14px;
  overflow: hidden;
  max-width: 100%;
}

.product-carousel {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 8px;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  max-width: 100%;

  &::-webkit-scrollbar {
    height: 4px;
  }
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.02);
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(99, 102, 241, 0.3);
    border-radius: 2px;
  }
}

.product-card {
  flex: 0 0 160px;
  scroll-snap-align: start;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;

  &:hover {
    transform: translateY(-2px);
    background: rgba(99, 102, 241, 0.05);
    border-color: rgba(99, 102, 241, 0.3);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1);

    .prod-action-btn {
      background: rgba(99, 102, 241, 0.2);
      color: #c4b5fd;
    }

    .prod-img {
      transform: scale(1.08);
    }
  }

  .prod-badge {
    position: absolute;
    top: 8px;
    right: 8px;
    font-size: 9px;
    padding: 2px 6px;
    border-radius: 8px;
    background: rgba(34, 197, 94, 0.15);
    color: #4ade80;
    font-weight: 600;
    z-index: 2;

    &.out-of-stock {
      background: rgba(239, 68, 68, 0.15);
      color: #fca5a5;
    }
  }

  .prod-image-container {
    width: 64px;
    height: 64px;
    border-radius: 8px;
    overflow: hidden;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.06);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 10px;
    margin-top: 6px;
    flex-shrink: 0;
  }

  .prod-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .prod-name {
    font-size: 12px;
    font-weight: 700;
    color: #f1f5f9;
    text-align: center;
    width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-bottom: 4px;
	max-width: 100px;
  }

  .prod-price {
    font-size: 13px;
    font-weight: 800;
    color: #818cf8;
    margin-bottom: 10px;
  }

  .prod-action-btn {
    width: 100%;
    padding: 5px 0;
    border: 1px solid rgba(99, 102, 241, 0.2);
    background: transparent;
    color: #a5b4fc;
    font-size: 10px;
    font-weight: 600;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
}
</style>
