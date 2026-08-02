<template>
  <div class="input-area">
    <!-- Dynamic Suggested Tool Chips -->
    <div v-if="currentSuggestions.length > 0" class="dynamic-chips">
      <button
        v-for="chip in currentSuggestions"
        :key="chip.text"
        class="chip-btn"
        @click="handleChipClick(chip)"
      >
        {{ chip.label }}
      </button>
    </div>

    <div class="input-wrapper">
      <textarea
        ref="inputRef"
        v-model="inputText"
        class="chat-input"
        :placeholder="t.inputPlaceholder"
        rows="1"
        :disabled="isLoading"
        @keydown.enter.exact.prevent="handleEnter"
        @input="autoResize"
      />
      <button
        class="send-btn"
        :disabled="!inputText.trim() || isLoading"
        @click="sendMessage()"
      >
        <send v-if="!isLoading" theme="filled" size="18" fill="white"/>
        <loading-four v-else theme="outline" size="18" fill="white" class="spin"/>
      </button>
    </div>
    <div class="input-hint">{{ t.inputHint }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useAntStudioAgent } from '@/composables/useAntStudioAgent';
import { useRoute } from 'vue-router';
import { Send, LoadingFour } from '@icon-park/vue-next';
import { useUserStore } from '@/stores/user';
import { storeToRefs } from 'pinia';

const userStore = useUserStore();
const { preferredLanguage: currentLang } = storeToRefs(userStore);

const { 
  messages, isLoading, inputText, sendMessage, isOpen,
  selectedProduct, showEditDialog, showAdDialog, isEditingProduct, isCreatingAd 
} = useAntStudioAgent();

const route = useRoute();

const inputRef = ref<HTMLTextAreaElement | null>(null);

const t = computed(() => {
  const isVn = currentLang.value === 'vi';
  return {
    inputPlaceholder: !isVn ? 'Type a command or ask a question...' : 'Nhập lệnh hoặc câu hỏi...',
    inputHint: !isVn ? 'Enter to send • Shift+Enter for new line' : 'Enter để gửi • Shift+Enter xuống dòng'
  };
});

// Focus input when sidebar opens
watch(isOpen, async (val) => {
  if (val) {
    await nextTick();
    inputRef.value?.focus();
  }
});

function handleEnter(e: KeyboardEvent) {
  if (!e.shiftKey) {
    sendMessage();
    // Reset textarea height after sending
    if (inputRef.value) {
      inputRef.value.style.height = 'auto';
    }
  }
}

function autoResize(e: Event) {
  const ta = e.target as HTMLTextAreaElement;
  ta.style.height = 'auto';
  ta.style.height = Math.min(ta.scrollHeight, 140) + 'px';
}

function handleChipClick(chip: any) {
  if (selectedProduct.value) {
    const label = chip.label;
    // Only open dialogs if they are NOT already open
    if (!isEditingProduct.value && !isCreatingAd.value) {
      if (label.includes('✏️') || label.includes('Sửa') || label.includes('Edit')) {
        showEditDialog.value = true;
        return;
      }
      if (label.includes('📢') || label.includes('Quảng cáo') || label.includes('Ads')) {
        showAdDialog.value = true;
        return;
      }
    }
  }

  const text = chip.text;
  // If the query text is action-prefix (ends in space/colon/preposition), just populate the textarea
  if (text.endsWith(' ') || text.endsWith(':') || text.endsWith('thành ') || text.endsWith('to ')) {
    inputText.value = text;
    nextTick(() => {
      inputRef.value?.focus();
    });
  } else {
    sendMessage(text);
  }
}

// ─── Dynamic Suggested Tools Chips ────────────
const pathSuggestions = computed(() => {
  const path = route.path;
  const isVn = currentLang.value === 'vi';
  // Active edit state suggestions
  if (isEditingProduct.value && selectedProduct.value) {
    const prodName = selectedProduct.value.name;
    return !isVn ? [
      { label: '✏️ Edit Name', text: `Edit name of "${prodName}"` },
      { label: '💰 Edit Price', text: `Edit price of "${prodName}"` },
      { label: '📦 Edit Stock', text: `Edit stock of "${prodName}"` },
      { label: '💾 Save changes', text: `Save changes for "${prodName}"` },
      { label: '❌ Close editor', text: `Close editor for "${prodName}"` }
    ] : [
      { label: '✏️ Sửa tên', text: `Sửa tên của "${prodName}"` },
      { label: '💰 Sửa giá', text: `Sửa giá của "${prodName}"` },
      { label: '📦 Sửa tồn kho', text: `Sửa tồn kho của "${prodName}"` },
      { label: '💾 Lưu thay đổi', text: `Lưu thay đổi của "${prodName}"` },
      { label: '❌ Đóng trình soạn thảo', text: `Đóng trình soạn thảo của "${prodName}"` }
    ];
  }

  // Active product context takes top priority for suggesting tools
  if (selectedProduct.value) {
    const prodName = selectedProduct.value.name;
    return !isVn ? [
      { label: `✏️ Edit: ${prodName}`, text: `Edit product "${prodName}"` },
      { label: `📢 Create Ads: ${prodName}`, text: `Create ads for "${prodName}"` },
      { label: `📈 Stock: ${prodName}`, text: `Update stock for "${prodName}"` },
      { label: `🗑️ Delete: ${prodName}`, text: `Delete product "${prodName}"` }
    ] : [
      { label: `✏️ Sửa: ${prodName}`, text: `Sửa thông tin sản phẩm "${prodName}"` },
      { label: `📢 Quảng cáo: ${prodName}`, text: `Tạo quảng cáo cho "${prodName}"` },
      { label: `📈 Tồn kho: ${prodName}`, text: `Cập nhật tồn kho sản phẩm "${prodName}"` },
      { label: `🗑️ Xóa: ${prodName}`, text: `Xóa sản phẩm "${prodName}"` }
    ];
  }

  if (path.includes('/merchants')) {
    return !isVn ? [
      { label: '➕ Create Product', text: 'Create a new product' },
      { label: '🔍 List Products', text: 'List my products' },
      { label: '🔍 Product Details', text: 'View details of a product' },
      { label: '📈 Update Stock', text: 'Update stock for my product' },
      { label: '🗑️ Delete Product', text: 'Delete a product' }
    ] : [
      { label: '➕ Tạo sản phẩm', text: 'Tạo một sản phẩm mới' },
      { label: '🔍 Danh sách sản phẩm', text: 'Hiển thị danh sách sản phẩm' },
      { label: '🔍 Chi tiết sản phẩm', text: 'Xem chi tiết một sản phẩm' },
      { label: '📈 Cập nhật tồn kho', text: 'Cập nhật tồn kho sản phẩm' },
      { label: '🗑️ Xóa sản phẩm', text: 'Xóa sản phẩm' }
    ];
  }

  if (path.includes('/projects')) {
    return !isVn ? [
      { label: '🎬 New Project', text: 'Create a new project' },
      { label: '📝 Write Script', text: 'Write script for video' },
      { label: '🖼️ Create Storyboard', text: 'Create storyboard' }
    ] : [
      { label: '🎬 Tạo dự án mới', text: 'Tạo một dự án mới' },
      { label: '📝 Viết kịch bản', text: 'Viết kịch bản video AI' },
      { label: '🖼️ Tạo Storyboard', text: 'Tạo Storyboard cho kịch bản' }
    ];
  }

  return !isVn ? [
    { label: '📦 Manage Products', text: 'Manage my products' },
    { label: '🎬 Video Projects', text: 'Manage my video projects' },
    { label: '🤖 AI Influencers', text: 'Manage AI influencers' },
    { label: '📡 Setup livestream', text: 'Setup a new live stream' }
  ] : [
    { label: '📦 Quản lý sản phẩm', text: 'Quản lý sản phẩm của tôi' },
    { label: '🎬 Dự án video', text: 'Quản lý dự án video' },
    { label: '🤖 AI Influencer', text: 'Quản lý AI influencer' },
    { label: '📡 Setup livestream', text: 'Cài đặt livestream mới' }
  ];
});

function parseAssistantSuggestions(text: string): { label: string; text: string }[] {
  if (!text) return [];

  // 1. Try parsing JSON Suggestions Block first (Preferred & Robust)
  const suggestionsBlockRegex = /```json-suggestions\s*([\s\S]*?)\s*```/g;
  const match = suggestionsBlockRegex.exec(text);
  if (match) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (Array.isArray(parsed)) {
        return parsed.map(item => ({
          label: String(item.label || ''),
          text: String(item.text || '')
        })).filter(s => s.label && s.text).slice(0, 5);
      }
    } catch (e) {
      // Ignore parsing errors and fallback to bullet points
    }
  }

  // 2. Fallback to parsing bullet list suggestions
  const suggestions: { label: string; text: string }[] = [];
  const lines = text.split('\n');

  const ignoreList = [
    'name', 'price', 'stock', 'status', 'brand', 'tên', 'giá', 'tồn', 'trạng thái', 'nhãn', 'id', 'uuid', 'created'
  ];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('+')) {
      let content = trimmed.substring(1).trim();
      content = content.replace(/^[\u{1F300}-\u{1F6FF}|\u{2600}-\u{26FF}]/u, '').trim();

      const boldMatch = content.match(/\*\*(.*?)\*\*/);
      if (boldMatch) {
        const label = boldMatch[1].trim();
        const cleanLabelLower = label.toLowerCase().replace(/:/g, '').trim();
        
        // Skip metadata attribute keys
        if (ignoreList.some(ig => cleanLabelLower === ig || cleanLabelLower.startsWith(ig))) {
          continue;
        }

        const query = content.replace(/\*\*/g, '').trim();
        if (label.length > 2 && label.length < 30) {
          suggestions.push({ label: `✨ ${label}`, text: query });
        }
      } else {
        const query = content.trim();
        const queryLower = query.toLowerCase();
        // Check if query is action-oriented or a question before proposing it as a chip
        const isAction = queryLower.startsWith('xem') || queryLower.startsWith('sửa') || queryLower.startsWith('tạo') || 
                        queryLower.startsWith('xóa') || queryLower.startsWith('show') || queryLower.startsWith('edit') || 
                        queryLower.startsWith('create') || queryLower.startsWith('delete') || query.endsWith('?');
        if (isAction && query.length > 2 && query.length < 40) {
          suggestions.push({ label: `👉 ${query}`, text: query });
        }
      }
    }
  }
  return suggestions.slice(0, 5);
}

const currentSuggestions = computed(() => {
  // 1. If actively editing, always return specialized editing chips
  const isVn = currentLang.value === 'vi';
  if (isEditingProduct.value && selectedProduct.value) {
    return !isVn ? [
      { label: '✏️ Edit Name', text: `change product name to ` },
      { label: '💰 Edit Price', text: `change price to ` },
      { label: '📦 Edit Stock', text: `change stock to ` },
      { label: '💾 Save Changes', text: 'Save changes' },
      { label: '❌ Close Editor', text: 'Close editor' }
    ] : [
      { label: '✏️ Sửa tên', text: `đổi tên sản phẩm thành ` },
      { label: '💰 Sửa giá', text: `đổi giá sản phẩm thành ` },
      { label: '📦 Sửa tồn kho', text: `đổi tồn kho sản phẩm thành ` },
      { label: '💾 Lưu thay đổi', text: 'Lưu thay đổi' },
      { label: '❌ Đóng trình soạn thảo', text: 'Đóng trình soạn thảo' }
    ];
  }

  // 2. If actively creating ad, return specialized ad chips
  if (isCreatingAd.value && selectedProduct.value) {
    return !isVn ? [
      { label: '📝 Generate Script', text: `generate video ad script for product ` },
      { label: '🎬 Generate Video', text: `create video preview for product ` },
      { label: '❌ Close Ad Dialog', text: 'Close preview' }
    ] : [
      { label: '📝 Tạo kịch bản', text: `viết kịch bản quảng cáo cho sản phẩm ` },
      { label: '🎬 Tạo video', text: `tạo video preview quảng cáo cho ` },
      { label: '❌ Đóng trình quảng cáo', text: 'Đóng preview' }
    ];
  }

  // 3. Fallback to normal messages suggestions or pathSuggestions
  if (messages.value.length <= 1) {
    return pathSuggestions.value;
  }
  const lastMsg = messages.value[messages.value.length - 1];
  if (lastMsg && lastMsg.role === 'assistant' && !lastMsg.isLoading) {
    const parsed = parseAssistantSuggestions(lastMsg.content);
    if (parsed.length > 0) {
      return parsed;
    }
  }
  return pathSuggestions.value;
});
</script>

<style scoped lang="scss">
.input-area {
  padding: 16px;
  background: rgba(15, 23, 42, 0.6);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
}

.input-wrapper {
  display: flex;
  gap: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 8px 12px;
  align-items: flex-end;
  transition: border-color 0.2s ease;

  &:focus-within {
    border-color: rgba(99, 102, 241, 0.5);
  }
}

.chat-input {
  flex: 1;
  background: transparent;
  border: none;
  color: #f1f5f9;
  font-size: 13px;
  font-family: inherit;
  resize: none;
  max-height: 140px;
  outline: none;
  padding: 2px 0;
  line-height: 1.5;

  &::placeholder {
    color: #475569;
  }
}

.send-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #4f46e5;
  border: none;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    background: #6366f1;
    transform: scale(1.05);
  }

  &:disabled {
    background: rgba(255, 255, 255, 0.03);
    color: #475569;
    cursor: not-allowed;
  }
}

.input-hint {
  font-size: 10px;
  color: #475569;
  margin-top: 8px;
  text-align: center;
}

// ─── Suggested Chip Styles ────────────────────
.dynamic-chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 8px;
  margin-bottom: 10px;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none; // Firefox

  &::-webkit-scrollbar {
    display: none; // Chrome/Safari
  }
}

.chip-btn {
  flex: 0 0 auto;
  padding: 6px 12px;
  background: rgba(99, 102, 241, 0.08);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 16px;
  color: #a5b4fc;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;

  &:hover {
    background: rgba(99, 102, 241, 0.16);
    border-color: rgba(99, 102, 241, 0.5);
    color: #c4b5fd;
    transform: translateY(-1px);
  }
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
