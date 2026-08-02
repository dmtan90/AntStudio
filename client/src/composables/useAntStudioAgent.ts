/**
 * useAntStudioAgent composable
 * Manages chat state and API communication with the AntStudio AI Agent
 */

import { ref, computed, watch } from 'vue';
import { useUserStore } from '@/stores/user';
import { useRouter } from 'vue-router';
import { useMarketplaceStore } from '@/stores/marketplace';
import { storeToRefs } from 'pinia';

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'error';
    content: string;
    timestamp: Date;
    isLoading?: boolean;
}

const isOpen = ref(false);
const messages = ref<ChatMessage[]>([]);
const isLoading = ref(false);
const inputText = ref('');
const hasInitialized = ref(false);

// Reactive product-related context bridged with page view dialogs
const selectedProduct = ref<any>(null);
const showProductDialog = ref(false);
const showEditDialog = ref(false);
const showAdDialog = ref(false);
const adInitialUrl = ref('');
const isEditingProduct = ref(false);
const isCreatingAd = ref(false);
const closeAllDialogs = ref(false);

// Reactive other-page contexts bridged with workspace dialogs
const selectedProject = ref<any>(null);
const selectedInfluencer = ref<any>(null);
const selectedLiveSession = ref<any>(null);

// Generate unique ID for messages
function genId() {
    return Math.random().toString(36).substring(2, 9);
}

// Extract smart screen context
function getScreenContext(): string {
    // 1. Look for visible Element Plus overlays/dialogs
    const overlays = document.querySelectorAll('.el-overlay');
    for (let i = overlays.length - 1; i >= 0; i--) {
        const overlay = overlays[i] as HTMLElement;
        // Check if it's visible
        if (overlay.style.display !== 'none' && overlay.innerText.trim().length > 0) {
            return `[Open Dialog Content]:\n${overlay.innerText}`;
        }
    }
    
    // 2. Fallback to main app content
    const appEl = document.getElementById('app');
    if (appEl) {
        return `[Main Screen Content]:\n${appEl.innerText}`;
    }

    return document.body.innerText;
}

export function useAntStudioAgent() {
    const userStore = useUserStore();
    const { preferredLanguage: currentLang } = storeToRefs(userStore);
    const router = useRouter();

    const updateWelcomeMessage = () => {
        if (!hasInitialized.value || messages.value.length > 1) return;

        const lang = currentLang.value;
        const isVn = lang === 'vi';
        const path = router.currentRoute.value.path;

        let welcomeMsg = '';
        if (isEditingProduct.value && selectedProduct.value) {
            const prodName = selectedProduct.value.name;
            welcomeMsg = !isVn
                ? `📝 You are now editing **${prodName}**!\n\nI can help you update details directly:\n- ✏️ **Edit Name** (e.g. change name to X)\n- 💰 **Edit Price** (e.g. change price to Y)\n- 📦 **Edit Stock** (e.g. change stock to Z)\n- 💾 **Save changes** to apply\n- ❌ **Close editor** when done`
                : `📝 Bạn đang chỉnh sửa sản phẩm **${prodName}**!\n\nTôi có thể giúp bạn cập nhật các thông tin:\n- ✏️ **Sửa tên** (ví dụ: đổi tên thành X)\n- 💰 **Sửa giá** (ví dụ: đổi giá thành Y)\n- 📦 **Sửa tồn kho** (ví dụ: đổi tồn kho thành Z)\n- 💾 **Lưu thay đổi** để áp dụng\n- ❌ **Đóng trình soạn thảo** khi hoàn tất`;
        } else if (selectedProduct.value) {
            const prodName = selectedProduct.value.name;
            welcomeMsg = !isVn
                ? `👋 I see you are viewing **${prodName}**! I am the **AntStudio AI Assistant**, here to help you manage this product.\n\nWhat would you like to do with **${prodName}**?\n- ✏️ **Edit & update** its details or inventory\n- 📢 **Create custom ads** & scripts for it\n- 🗑️ **Delete** this product from your inventory\n- 💬 **Ask me** anything about its current status`
                : `👋 Tôi thấy bạn đang xem sản phẩm **${prodName}**! Tôi là **AntStudio AI Assistant**, sẵn sàng hỗ trợ bạn thao tác với sản phẩm này.\n\nBạn muốn thực hiện tác vụ nào cho **${prodName}**?\n- ✏️ **Sửa & cập nhật** thông tin hoặc tồn kho\n- 📢 **Tạo quảng cáo** & kịch bản live stream cho sản phẩm\n- 🗑️ **Xóa sản phẩm** này khỏi cửa hàng\n- 💬 **Đặt câu hỏi** cho tôi về trạng thái sản phẩm`;
        } else if (path.includes('/merchants')) {
            welcomeMsg = !isVn
                ? `👋 Welcome to the **Merchant Hub**! I am the **AntStudio AI Assistant**, ready to help you manage your store.\n\nHere are some tasks I can help you with on this page:\n- 📦 **List & view** your product inventory\n- ➕ **Create** a new product with custom details\n- ✏️ **Edit & update** product details or stock\n- 🗑️ **Delete** unused products from your catalog\n- 📢 **Generate creative Ads** & scripts for any product\n\nWhat would you like to do with your store today?`
                : `👋 Chào mừng bạn đến với **Merchant Hub**! Tôi là **AntStudio AI Assistant**, luôn sẵn sàng hỗ trợ quản lý cửa hàng của bạn.\n\nDưới đây là một số việc tôi có thể giúp bạn trên trang này:\n- 📦 **Xem danh sách** & chi tiết kho hàng\n- ➕ **Tạo sản phẩm mới** với đầy đủ thuộc tính\n- ✏️ **Cập nhật & sửa đổi** thông tin hoặc tồn kho sản phẩm\n- 🗑️ **Xóa sản phẩm** không dùng tới khỏi danh mục\n- 📢 **Tạo kịch bản quảng cáo** sáng tạo cho bất kỳ sản phẩm nào\n\nHôm nay bạn muốn thao tác gì với cửa hàng của mình?`;
        } else if (path.includes('/projects')) {
            welcomeMsg = !isVn
                ? `👋 Welcome to your **Video Projects Workspace**! I am the **AntStudio AI Assistant**, ready to help you craft amazing videos.\n\nHere are some tasks I can help you with on this page:\n- 🎬 **Manage & edit** your AI video projects\n- 📝 **Write creative scripts** with AI actors\n- 🖼️ **Generate storyboards** for your scenes\n- 📺 **Convert scripts** into dynamic live streams\n\nWhat project are we building today?`
                : `👋 Chào mừng bạn đến với **Không gian dự án Video**! Tôi là **AntStudio AI Assistant**, luôn sẵn sàng đồng hành cùng bạn để sáng tạo những thước phim đột phá.\n\nDưới đây là một số việc tôi có thể giúp bạn trên trang này:\n- 🎬 **Quản lý & chỉnh sửa** các dự án video AI của bạn\n- 📝 **Viết kịch bản** hấp dẫn tích hợp nhân vật ảo AI\n- 🖼️ **Tạo Storyboard** chi tiết cho từng khung hình\n- 📺 **Chuyển đổi kịch bản** thành phiên phát sóng livestream trực tiếp\n\nHôm nay chúng ta sẽ bắt đầu dự án nào đây?`;
        } else {
            welcomeMsg = !isVn
                ? `👋 Hello! I am the **AntStudio AI Assistant**.\n\nI can help you with:\n- 📦 Product management\n- 🎬 Video project & script creation\n- 🤖 AI influencer management\n- 📱 Platform connectivity\n- 📺 Live stream control\n\nWhat would you like to do today?`
                : `👋 Xin chào! Tôi là **AntStudio AI Assistant**.\n\nTôi có thể giúp bạn:\n- 📦 Quản lý sản phẩm\n- 🎬 Tạo dự án & kịch bản video\n- 🤖 Quản lý influencer AI\n- 📱 Kết nối platform\n- 📺 Điều khiển live stream\n\nBạn muốn làm gì hôm nay?`;
        }

        if (messages.value.length === 1) {
            messages.value[0].content = welcomeMsg;
        } else if (messages.value.length === 0) {
            messages.value.push({
                id: genId(),
                role: 'assistant',
                content: welcomeMsg,
                timestamp: new Date(),
            });
        }
    };

    const toggleSidebar = () => {
        isOpen.value = !isOpen.value;
        if (isOpen.value) {
            if (!hasInitialized.value) {
                hasInitialized.value = true;
            }
            updateWelcomeMessage();
        }
    };

    // Reactively watch for product details selection, editing state, or route switches to immediately morph greeting
    watch([selectedProduct, isEditingProduct, () => router.currentRoute.value.path], () => {
        updateWelcomeMessage();
    }, { immediate: true });

    // Reactively append context-specific guiding messages to the bottom of the chat when dialog states open
    watch(showProductDialog, (newVal) => {
        if (newVal && selectedProduct.value) {
            const prodName = selectedProduct.value.name || '';
            const lang = currentLang.value;
            const isVn = lang == 'vi';
            // Check if last message is already showing this product preview guidance
            const lastMsg = messages.value[messages.value.length - 1];
            const isDuplicate = lastMsg && lastMsg.role === 'assistant' && 
                (lastMsg.content.includes(prodName) && (lastMsg.content.includes('viewing') || lastMsg.content.includes('đang xem')));
                
            if (!isDuplicate) {
                messages.value.push({
                    id: genId(),
                    role: 'assistant',
                    content: !isVn
                        ? `👋 I see you are viewing **${prodName}**!\n\nI can help you manage or promote this product:\n- ✏️ **Edit & update** its details or inventory\n- 📢 **Create custom ads** & scripts for it\n- 🗑️ **Delete** this product from your inventory\n- 💬 **Ask me** anything about its status\n\n\`\`\`json-suggestions\n[\n  { "label": "✏️ Edit Product", "text": "Edit product ${prodName}" },\n  { "label": "📢 Create Video Ads", "text": "Create ads for ${prodName}" },\n  { "label": "❌ Close Preview", "text": "Close preview" }\n]\n\`\`\``
                        : `👋 Tôi thấy bạn đang xem sản phẩm **${prodName}**!\n\nTôi có thể hỗ trợ bạn thao tác hoặc quảng bá:\n- ✏️ **Sửa & cập nhật** thông tin hoặc tồn kho\n- 📢 **Tạo quảng cáo** & kịch bản cho sản phẩm\n- 🗑️ **Xóa sản phẩm** này khỏi cửa hàng\n- 💬 **Đặt câu hỏi** cho tôi về trạng thái\n\n\`\`\`json-suggestions\n[\n  { "label": "✏️ Sửa sản phẩm", "text": "Sửa sản phẩm ${prodName}" },\n  { "label": "📢 Tạo quảng cáo", "text": "Tạo quảng cáo cho ${prodName}" },\n  { "label": "❌ Đóng", "text": "Đóng" }\n]\n\`\`\``,
                    timestamp: new Date()
                });
            }
        }
    });

    watch(isEditingProduct, (newVal) => {
        if (newVal && selectedProduct.value) {
            const prodName = selectedProduct.value.name || '';
            const lang = currentLang.value;
            const isVn = lang == 'vi';
            const lastMsg = messages.value[messages.value.length - 1];
            const isDuplicate = lastMsg && lastMsg.role === 'assistant' && 
                (lastMsg.content.includes(prodName) && (lastMsg.content.includes('editor') || lastMsg.content.includes('soạn thảo')));
                
            if (!isDuplicate) {
                messages.value.push({
                    id: genId(),
                    role: 'assistant',
                    content: !isVn
                        ? `📝 I have opened the editor for **${prodName}**!\n\nYou can type commands like *'change name to X'* or *'change price to Y'* directly in the chat, and I will update the form fields instantly for you!\n\n\`\`\`json-suggestions\n[\n  { "label": "✏️ Edit Name", "text": "change product name to " },\n  { "label": "💰 Edit Price", "text": "change price to " },\n  { "label": "📦 Edit Stock", "text": "change stock to " },\n  { "label": "💾 Save Changes", "text": "Save changes" },\n  { "label": "❌ Close Editor", "text": "Close editor" }\n]\n\`\`\``
                        : `📝 Tôi đã mở trình soạn thảo cho sản phẩm **${prodName}**!\n\nBạn có thể nhập các câu lệnh như *'đổi tên thành X'* hoặc *'đổi giá thành Y'* trực tiếp tại đây để tôi cập nhật tức thì giúp bạn!\n\n\`\`\`json-suggestions\n[\n  { "label": "✏️ Sửa tên", "text": "đổi tên sản phẩm thành " },\n  { "label": "💰 Sửa giá", "text": "đổi giá sản phẩm thành " },\n  { "label": "📦 Sửa tồn kho", "text": "đổi tồn kho sản phẩm thành " },\n  { "label": "💾 Lưu thay đổi", "text": "Lưu thay đổi" },\n  { "label": "❌ Đóng trình soạn thảo", "text": "Đóng trình soạn thảo" }\n]\n\`\`\``,
                    timestamp: new Date()
                });
            }
        }
    });

    watch(isCreatingAd, (newVal) => {
        if (newVal && selectedProduct.value) {
            const prodName = selectedProduct.value.name || '';
            const lang = currentLang.value;
            const isVn = lang == 'vi';
            const lastMsg = messages.value[messages.value.length - 1];
            const isDuplicate = lastMsg && lastMsg.role === 'assistant' && 
                (lastMsg.content.includes(prodName) && (lastMsg.content.includes('advertising') || lastMsg.content.includes('quảng cáo')));
                
            if (!isDuplicate) {
                messages.value.push({
                    id: genId(),
                    role: 'assistant',
                    content: !isVn
                        ? `📢 I have opened the advertising workspace for **${prodName}**!\n\nWe can write video marketing scripts or generate high-quality product preview videos together. Let me know what kind of ad script you want to write!\n\n\`\`\`json-suggestions\n[\n  { "label": "📝 Generate Script", "text": "generate video ad script for product " },\n  { "label": "🎬 Generate Video", "text": "create video preview for product " },\n  { "label": "❌ Close Ad Dialog", "text": "Close preview" }\n]\n\`\`\``
                        : `📢 Tôi đã mở không gian quảng cáo cho sản phẩm **${prodName}**!\n\nChúng ta có thể cùng nhau soạn thảo kịch bản video marketing hoặc tạo video giới thiệu sản phẩm chất lượng cao. Hãy cho tôi biết bạn muốn viết kịch bản quảng cáo như thế nào nhé!\n\n\`\`\`json-suggestions\n[\n  { "label": "📝 Tạo kịch bản", "text": "viết kịch bản quảng cáo cho sản phẩm " },\n  { "label": "🎬 Tạo video", "text": "tạo video preview quảng cáo cho " },\n  { "label": "❌ Đóng trình quảng cáo", "text": "Đóng preview" }\n]\n\`\`\``,
                    timestamp: new Date()
                });
            }
        }
    });

    const sendMessage = async (text?: string) => {
        const messageText = (text || inputText.value).trim();
        if (!messageText || isLoading.value) return;

        inputText.value = '';

        // Add user message
        const userMsg: ChatMessage = {
            id: genId(),
            role: 'user',
            content: messageText,
            timestamp: new Date(),
        };
        messages.value.push(userMsg);

        // Add loading placeholder
        const loadingMsg: ChatMessage = {
            id: genId(),
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            isLoading: true,
        };
        messages.value.push(loadingMsg);
        isLoading.value = true;

        try {
            const token = userStore.token || localStorage.getItem('token') || '';
            const language = currentLang.value;

            const res = await fetch('/api/agent/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ 
                    message: messageText,
                    language: language,
                    currentPath: router.currentRoute.value.path,
                    screenText: getScreenContext().substring(0, 4000),
                    selectedProduct: selectedProduct.value ? {
                        id: selectedProduct.value._id || selectedProduct.value.id,
                        name: selectedProduct.value.name,
                        price: selectedProduct.value.price,
                        stock: selectedProduct.value.stock
                    } : null,
                    selectedProject: selectedProject.value ? {
                        id: selectedProject.value._id || selectedProject.value.id,
                        title: selectedProject.value.title,
                        status: selectedProject.value.status
                    } : null,
                    selectedInfluencer: selectedInfluencer.value ? {
                        id: selectedInfluencer.value._id || selectedInfluencer.value.id,
                        name: selectedInfluencer.value.identity?.name || selectedInfluencer.value.name,
                        style: selectedInfluencer.value.visual?.style
                    } : null,
                    selectedLiveSession: selectedLiveSession.value ? {
                        id: selectedLiveSession.value._id || selectedLiveSession.value.id,
                        sessionId: selectedLiveSession.value.sessionId,
                        status: selectedLiveSession.value.status
                    } : null
                }),
            });

            const data = await res.json();

            // Handle navigation if suggested by AI
            if (data.success && data.data.navigation) {
                router.push(data.data.navigation);
            }

            // Capture returned product context from server
            if (data.success) {
                const userMsgLower = messageText.toLowerCase();
                const hasAdIntent = userMsgLower.includes('ad') || userMsgLower.includes('quảng cáo') || userMsgLower.includes('marketing') || userMsgLower.includes('preview video');
                const urlRegex = /(https?:\/\/[^\s]+)/g;
                const urlMatch = messageText.match(urlRegex);
                const extractedUrl = urlMatch ? urlMatch[0] : '';

                if (data.data.selectedProduct) {
                    selectedProduct.value = data.data.selectedProduct;
                    
                    // Trigger catalog refresh on merchants page if product updated
                    if (router.currentRoute.value.path.includes('/merchants')) {
                        const marketplaceStore = useMarketplaceStore();
                        marketplaceStore.fetchProducts();
                    }

                    if (userMsgLower.includes('view') || userMsgLower.includes('xem') || userMsgLower.includes('details') || userMsgLower.includes('chi tiết') || userMsgLower.includes('show') || userMsgLower.includes('hiển thị')) {
                        showProductDialog.value = true;
                    } else if (hasAdIntent) {
                        adInitialUrl.value = extractedUrl;
                        showAdDialog.value = true;
                    } else if (userMsgLower.includes('edit') || userMsgLower.includes('sửa') || userMsgLower.includes('update') || userMsgLower.includes('cập nhật')) {
                        if (!userMsgLower.includes('save') && !userMsgLower.includes('lưu')) {
                            showEditDialog.value = true;
                        }
                    }
                } else if (hasAdIntent && extractedUrl) {
                    // Fallback to URL-based creation if there's no database product but user supplied a URL
                    adInitialUrl.value = extractedUrl;
                    showAdDialog.value = true;
                }

                if (data.data.selectedProject) {
                    selectedProject.value = data.data.selectedProject;
                }
                if (data.data.selectedInfluencer) {
                    selectedInfluencer.value = data.data.selectedInfluencer;
                }
                if (data.data.selectedLiveSession) {
                    selectedLiveSession.value = data.data.selectedLiveSession;
                }
            }

            // Detect close dialog intent from user query or agent's acknowledgment
            const userMsgLower = messageText.toLowerCase();
            const resMsgLower = (data.success ? data.data.response : '').toLowerCase();
            const hasCloseIntent = userMsgLower.includes('close') || userMsgLower.includes('đóng') || userMsgLower.includes('cancel') ||
                                   resMsgLower.includes('close') || resMsgLower.includes('đóng');
            if (hasCloseIntent) {
                closeAllDialogs.value = true;
            }

            // Remove loading placeholder
            const idx = messages.value.findIndex(m => m.id === loadingMsg.id);
            if (idx !== -1) {
                messages.value[idx] = {
                    id: loadingMsg.id,
                    role: 'assistant',
                    content: data.success ? data.data.response : `❌ ${data.error}`,
                    timestamp: new Date(),
                };
            }
        } catch (e: any) {
            const idx = messages.value.findIndex(m => m.isLoading);
            if (idx !== -1) {
                messages.value[idx] = {
                    id: messages.value[idx].id,
                    role: 'error',
                    content: '❌ Can\'t connect to AI Agent. Please check server.',
                    timestamp: new Date(),
                };
            }
        } finally {
            isLoading.value = false;
        }
    };

    const clearChat = async () => {
        messages.value = [];
        hasInitialized.value = false;
        selectedProduct.value = null;
        selectedProject.value = null;
        selectedInfluencer.value = null;
        selectedLiveSession.value = null;
        try {
            const token = userStore.token || localStorage.getItem('token') || '';
            await fetch('/api/agent/session', {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
        } catch { }
    };

    const quickActions = computed(() => {
        const lang = currentLang.value;
        const isVn = lang == 'vi';
        const path = router.currentRoute.value.path;

        if (path.includes('/merchants')) {
            return !isVn ? [
                { label: '👁️ View products', text: 'View my products' },
                { label: '✏️ Edit products', text: 'Edit my products' },
                { label: '🗑️ Delete product', text: 'Delete a product' },
                { label: '📢 Generate ads', text: 'Generate ads for my product' },
            ] : [
                { label: '👁️ Xem sản phẩm', text: 'Xem danh sách sản phẩm' },
                { label: '✏️ Cập nhật sản phẩm', text: 'Cập nhật thông tin sản phẩm' },
                { label: '🗑️ Xóa sản phẩm', text: 'Xóa một sản phẩm' },
                { label: '📢 Tạo quảng cáo', text: 'Tạo quảng cáo cho sản phẩm' },
            ];
        }

        if (path.includes('/projects')) {
            return !isVn ? [
                { label: '🎬 New project', text: 'Create a new project' },
                { label: '📜 Generate script', text: 'Generate script from topic' },
                { label: '🖼️ Storyboard', text: 'Generate storyboard' },
            ] : [
                { label: '🎬 Dự án mới', text: 'Tạo dự án mới' },
                { label: '📜 Viết kịch bản', text: 'Tạo kịch bản từ chủ đề' },
                { label: '🖼️ Storyboard', text: 'Tạo storyboard' },
            ];
        }

        // Default Dashboard suggestions
        return !isVn ? [
            { label: '📦 Manage products', text: 'Manage my products' },
            { label: '🎬 Video projects', text: 'Manage my video projects' },
            { label: '🤖 Influencers', text: 'Manage AI influencers' },
            { label: '📱 Platforms', text: 'Manage connected platforms' },
            { label: '📺 Live streams', text: 'Manage live streams' },
        ] : [
            { label: '📦 Quản lý sản phẩm', text: 'Quản lý sản phẩm của tôi' },
            { label: '🎬 Dự án video', text: 'Quản lý dự án video' },
            { label: '🤖 Influencers', text: 'Quản lý AI influencer' },
            { label: '📱 Nền tảng', text: 'Quản lý kết nối nền tảng' },
            { label: '📺 Live stream', text: 'Quản lý phiên live stream' },
        ];
    });

    return {
        isOpen,
        messages,
        isLoading,
        inputText,
        quickActions,
        toggleSidebar,
        sendMessage,
        clearChat,
        selectedProduct,
        selectedProject,
        selectedInfluencer,
        selectedLiveSession,
        showProductDialog,
        showEditDialog,
        showAdDialog,
        adInitialUrl,
        isEditingProduct,
        isCreatingAd,
        closeAllDialogs,
    };
}
