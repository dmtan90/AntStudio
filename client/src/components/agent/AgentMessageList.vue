<template>
  <div ref="messagesContainer" class="messages-container" @scroll="handleScroll">
    <div v-if="messages.length === 0" class="empty-state">
      <div class="empty-icon">✨</div>
      <p>{{ t.emptyState }}</p>
    </div>

    <TransitionGroup name="message" tag="div" class="messages-list">
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="msg-row"
        :class="msg.role"
      >
        <div v-if="msg.role !== 'user'" class="msg-avatar ai-avatar">AI</div>

        <div class="msg-bubble" :class="msg.role">
          <!-- Loading skeleton -->
          <div v-if="msg.isLoading" class="typing-indicator">
            <span /><span /><span />
          </div>
          <!-- Content -->
          <div
            v-else
            class="msg-content"
          >
            <template v-if="msg.role === 'assistant' && getProductTableData(msg.content)">
              <!-- Text Before Product Table -->
              <div v-html="renderMarkdown(getProductTableData(msg.content).textBefore)" />

              <!-- Beautiful Product Carousel -->
              <AgentProductCarousel :products="getProductTableData(msg.content).products" />

              <!-- Text After Product Table -->
              <div v-html="renderMarkdown(getProductTableData(msg.content).textAfter)" />
            </template>
            <template v-else>
              <div v-html="renderMarkdown(msg.content)" />
            </template>
          </div>
          <div class="msg-time">{{ formatTime(msg.timestamp) }}</div>
        </div>

        <div v-if="msg.role === 'user'" class="msg-avatar user-avatar">
          {{ userInitial }}
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useAntStudioAgent } from '@/composables/useAntStudioAgent';
import { useUserStore } from '@/stores/user';
import AgentProductCarousel from './AgentProductCarousel.vue';
import { storeToRefs } from 'pinia';

const { messages, isOpen } = useAntStudioAgent();
const userStore = useUserStore();
const { preferredLanguage: currentLang } = storeToRefs(userStore);

const messagesContainer = ref<HTMLElement | null>(null);
let autoScroll = true;

const t = computed(() => {
  const isVn = currentLang.value === 'vi';
  return {
    emptyState: !isVn ? 'Ask anything about AntStudio' : 'Hỏi bất kỳ điều gì về AntStudio'
  };
});

const userInitial = computed(() => {
  const name = userStore.user?.name || userStore.user?.email || 'U';
  return name.charAt(0).toUpperCase();
});

// Auto-scroll to bottom on new messages
watch(messages, async () => {
  if (autoScroll) {
    await nextTick();
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  }
}, { deep: true });

// Auto-scroll when sidebar is opened
watch(isOpen, async (val) => {
  if (val) {
    await nextTick();
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  }
});

function handleScroll() {
  if (!messagesContainer.value) return;
  const { scrollTop, scrollHeight, clientHeight } = messagesContainer.value;
  autoScroll = scrollHeight - scrollTop - clientHeight < 80;
}

function formatTime(date: Date): string {
  return currentLang.value == 'vi' ? 
    date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) 
    : date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function cleanMessageContent(text: string): string {
  if (!text) return '';
  return text.replace(/```json-suggestions\s*([\s\S]*?)\s*```/g, '').trim();
}

// Simple markdown-like rendering
function renderMarkdown(rawText: string): string {
  const text = cleanMessageContent(rawText);
  return text
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Headers
    .replace(/^### (.*?)$/gm, '<h4>$1</h4>')
    .replace(/^## (.*?)$/gm, '<h3>$1</h3>')
    .replace(/^# (.*?)$/gm, '<h2>$1</h2>')
    // Bullet lists
    .replace(/^[-*] (.*)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    // Line breaks
    .replace(/\n/g, '<br>')
    // Escape potential XSS in code blocks
    .replace(/<code>(.*?)<\/code>/g, (_, c) => `<code>${c.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>`);
}

// ─── AI Product Table Parser ─────────────────
interface ParsedProduct {
  name: string;
  price: string;
  stock: string;
}

function getProductTableData(rawText: string) {
  if (!rawText) return null;
  const text = cleanMessageContent(rawText);

  // 1. Try parsing JSON Markdown Block first (Preferred & Robust)
  const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/g;
  let match;
  while ((match = jsonBlockRegex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].name && parsed[0].price !== undefined) {
        const blockStartIndex = match.index;
        const blockEndIndex = match.index + match[0].length;
        
        const textBefore = text.slice(0, blockStartIndex).trim();
        const textAfter = text.slice(blockEndIndex).trim();
        
        return {
          textBefore,
          products: parsed.map(p => ({
            name: p.name,
            price: String(p.price),
            stock: String(p.stock !== undefined ? p.stock : '0')
          })),
          textAfter
        };
      }
    } catch (e) {
      // Ignore parsing errors and keep searching
    }
  }

  // 2. Fallback to Multilingual Markdown Table Parser (Backup)
  const lines = text.split('\n');
  const tableStartIndex = lines.findIndex(line => {
    const clean = line.toLowerCase();
    return clean.includes('|') && (
      clean.includes('product') ||
      clean.includes('sản phẩm') ||
      clean.includes('tên') ||
      clean.includes('name') ||
      clean.includes('price') ||
      clean.includes('giá') ||
      clean.includes('stock') ||
      clean.includes('tồn kho')
    );
  });
  if (tableStartIndex === -1) return null;

  let tableEndIndex = tableStartIndex + 1;
  while (tableEndIndex < lines.length && lines[tableEndIndex].trim().startsWith('|')) {
    tableEndIndex++;
  }

  const tableLines = lines.slice(tableStartIndex, tableEndIndex);
  const products: ParsedProduct[] = [];

  for (let i = 2; i < tableLines.length; i++) {
    const line = tableLines[i].trim();
    if (!line) continue;
    const cells = line.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
    if (cells.length >= 3) {
      const name = cells[0].replace(/\*\*/g, '').trim();
      const price = cells[1].trim();
      const stock = cells[2].trim();
      if (name && price) {
        products.push({ name, price, stock });
      }
    }
  }

  if (products.length === 0) return null;

  const textBefore = lines.slice(0, tableStartIndex).join('\n');
  const textAfter = lines.slice(tableEndIndex).join('\n');

  return { textBefore, products, textAfter };
}
</script>

<style scoped lang="scss">
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  background: rgba(15, 23, 42, 0.4);

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }
}

.empty-state {
  margin: auto;
  text-align: center;
  color: #64748b;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  max-width: 260px;

  .empty-icon {
    font-size: 32px;
    filter: drop-shadow(0 0 10px rgba(99, 102, 241, 0.4));
    animation: float 3s ease-in-out infinite;
  }

  p {
    font-size: 13px;
    line-height: 1.5;
  }
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.msg-row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  max-width: 90%;
  width: 100%;
  min-width: 0;

  &.user {
    align-self: flex-end;
    flex-direction: row-reverse;
  }

  &.assistant {
    align-self: flex-start;
  }
}

.msg-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);

  &.ai-avatar {
    background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
    color: #ffffff;
  }

  &.user-avatar {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: #ffffff;
  }
}

.msg-bubble {
  padding: 10px 14px;
  border-radius: 16px;
  font-size: 13px;
  line-height: 1.6;
  position: relative;
  word-break: break-word;
  max-width: 100%;
  min-width: 0;

  &.user {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: #ffffff;
    border-top-right-radius: 2px;
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
  }

  &.assistant {
    background: rgba(30, 41, 59, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: #e2e8f0;
    border-top-left-radius: 2px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  &.error {
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #fca5a5;
    border-top-left-radius: 2px;
  }
}

.msg-content {
  :deep(strong) {
    color: #a5b4fc;
    font-weight: 700;
  }

  :deep(em) {
    color: #cbd5e1;
    font-style: italic;
  }

  :deep(code) {
    background: rgba(0, 0, 0, 0.3);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: monospace;
    color: #f43f5e;
    font-size: 12px;
  }

  :deep(ul) {
    margin: 8px 0 8px 16px;
    list-style-type: disc;
  }

  :deep(li) {
    margin-bottom: 4px;
  }
}

.msg-time {
  font-size: 9px;
  color: #64748b;
  margin-top: 4px;
  text-align: right;
}

.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 4px 0;

  span {
    width: 6px;
    height: 6px;
    background: #6366f1;
    border-radius: 50%;
    animation: blink 1.4s infinite both;

    &:nth-child(2) { animation-delay: 0.2s; }
    &:nth-child(3) { animation-delay: 0.4s; }
  }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

// ─── Transitions ──────────────────────────────
.message-enter-active,
.message-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.message-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
.message-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}
</style>
