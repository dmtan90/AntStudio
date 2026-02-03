<template>
    <div class="support-command p-8 animate-in">
        <header class="flex justify-between items-start mb-12">
            <div>
                <h1 class="text-4xl font-black tracking-tighter text-white mb-2">SUPPORT COMMAND</h1>
                <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-500">Tactical Assistance & Log
                    Forensics</p>
            </div>
            <div class="flex gap-4">
                <div class="text-right">
                    <p class="text-[8px] font-black opacity-40 uppercase">Open Incidents</p>
                    <p class="text-2xl font-black text-red-400">{{ openCount }}</p>
                </div>
            </div>
        </header>

        <div class="grid grid-cols-12 gap-8 h-[calc(100vh-200px)]">

            <!-- LEFT: Ticket List -->
            <div class="col-span-4 bg-white/5 border border-white/5 rounded-3xl overflow-hidden flex flex-col">
                <div class="p-6 border-b border-white/5 bg-black/20">
                    <input v-model="search" placeholder="Search operational logs..."
                        class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:border-purple-500 outline-none" />
                </div>
                <div class="flex-1 overflow-y-auto p-4 space-y-2">
                    <div v-for="ticket in filteredTickets" :key="ticket._id" @click="selectTicket(ticket)"
                        :class="['p-4 rounded-xl cursor-pointer border transition-all',
                            selectedId === ticket._id ? 'bg-purple-900/20 border-purple-500/50' : 'bg-transparent border-transparent hover:bg-white/5']">
                        <div class="flex justify-between items-start mb-2">
                            <span
                                :class="['px-2 py-0.5 rounded text-[8px] font-black uppercase', getPriorityClass(ticket.priority)]">
                                {{ ticket.priority }}
                            </span>
                            <span class="text-[10px] opacity-40">{{ timeAgo(ticket.createdAt) }}</span>
                        </div>
                        <h4 class="text-sm font-bold text-white mb-1 truncate">{{ ticket.subject }}</h4>
                        <p class="text-[10px] text-gray-400 truncate">{{ ticket.userId?.email || 'Unknown Agent' }}</p>
                    </div>
                </div>
            </div>

            <!-- RIGHT: Ticket Detail -->
            <div class="col-span-8 bg-white/5 border border-white/5 rounded-3xl overflow-hidden flex flex-col relative">
                <div v-if="selectedTicket" class="flex flex-col h-full">
                    <!-- Detail Header -->
                    <div class="p-8 border-b border-white/5 bg-black/20 flex justify-between items-start">
                        <div>
                            <h2 class="text-2xl font-black text-white mb-2">{{ selectedTicket.subject }}</h2>
                            <div class="flex gap-4 text-xs text-gray-400">
                                <span class="flex items-center gap-2">
                                    <user theme="outline" /> {{ selectedTicket.userId?.name }}
                                </span>
                                <span class="flex items-center gap-2 font-mono"><id-card theme="outline" /> {{
                                    selectedTicket.instanceId }}</span>
                            </div>
                        </div>
                        <div class="flex gap-2">
                            <select v-model="selectedTicket.status" @change="updateStatus"
                                class="bg-black border border-white/20 rounded-lg px-3 py-1 text-xs text-white uppercase font-bold">
                                <option value="open">Open</option>
                                <option value="in-progress">Tracking</option>
                                <option value="solved">Resolved</option>
                                <option value="closed">Archived</option>
                            </select>
                        </div>
                    </div>

                    <!-- Chat & Logs -->
                    <div class="flex-1 overflow-y-auto p-8 space-y-8">
                        <!-- Initial Description -->
                        <div class="bg-white/5 p-6 rounded-2xl border border-white/5">
                            <p class="text-sm leading-relaxed text-gray-300">{{ selectedTicket.description }}</p>

                            <!-- Attachments -->
                            <div v-if="selectedTicket.attachments.length" class="mt-6 pt-6 border-t border-white/5">
                                <p class="text-[10px] font-black uppercase text-gray-500 mb-2">Tactical Data Bundles</p>
                                <div class="flex gap-2">
                                    <div v-for="file in selectedTicket.attachments" :key="file.s3Key"
                                        class="flex items-center gap-2 px-3 py-2 bg-black/40 rounded-lg border border-white/10 hover:border-purple-500/50 cursor-pointer group">
                                        <file-zip v-if="file.fileName.endsWith('.zip')" theme="outline"
                                            class="text-purple-400" />
                                        <pic v-else theme="outline" class="text-blue-400" />
                                        <span class="text-xs font-mono">{{ file.fileName }}</span>
                                        <download theme="outline"
                                            class="opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
                                    </div>
                                </div>
                                <div v-if="selectedTicket.dataSharingConsent"
                                    class="mt-2 flex items-center gap-2 text-green-400 text-[10px] font-bold uppercase">
                                    <check-one theme="outline" /> Data Transfer Authorized
                                </div>
                            </div>
                        </div>

                        <!-- Messages -->
                        <div v-for="msg in selectedTicket.messages" :key="msg._id"
                            :class="['flex gap-4 max-w-[80%]', msg.isAdmin ? 'ml-auto flex-row-reverse' : '']">
                            <div
                                :class="['w-8 h-8 rounded-full flex items-center justify-center border', msg.isAdmin ? 'bg-purple-600 border-purple-400' : 'bg-gray-700 border-gray-600']">
                                <user theme="outline" size="14" class="text-white" />
                            </div>
                            <div
                                :class="['p-4 rounded-2xl text-sm border', msg.isAdmin ? 'bg-purple-900/20 border-purple-500/20 text-purple-100 rounded-tr-none' : 'bg-white/5 border-white/5 text-gray-300 rounded-tl-none']">
                                {{ msg.text }}
                                <p class="text-[9px] opacity-30 mt-2 text-right uppercase">{{ timeAgo(msg.timestamp) }}
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Input -->
                    <div class="p-6 border-t border-white/5 bg-black/20">
                        <div class="relative">
                            <input v-model="replyText" @keyup.enter="sendReply" placeholder="Transmit response..."
                                class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 pr-12 text-sm text-white focus:border-purple-500 outline-none" />
                            <button @click="sendReply"
                                class="absolute right-2 top-2 p-2 bg-purple-600 rounded-lg text-white hover:bg-purple-500 transition-colors">
                                <send theme="outline" size="16" />
                            </button>
                        </div>
                    </div>

                </div>
                <div v-else class="flex flex-col items-center justify-center h-full opacity-20">
                    <folder-close theme="outline" size="64" class="mb-4" />
                    <p class="text-xs font-black uppercase tracking-widest">Select an incident to investigate</p>
                </div>
            </div>

        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { User, IdCard, FileZip, Pic, Download, CheckOne, Send, FolderClose } from '@icon-park/vue-next';

import { useSupportStore } from '@/stores/support';
import { toast } from 'vue-sonner';

const supportStore = useSupportStore();

const tickets = ref<any[]>([]);
const search = ref('');
const selectedId = ref<string | null>(null);
const replyText = ref('');

const filteredTickets = computed(() => {
    if (!search.value) return tickets.value;
    return tickets.value.filter(t =>
        t.subject.toLowerCase().includes(search.value.toLowerCase()) ||
        t.instanceId?.toLowerCase().includes(search.value.toLowerCase())
    );
});

const selectedTicket = computed(() => tickets.value.find(t => t._id === selectedId.value));
const openCount = computed(() => tickets.value.filter(t => t.status === 'open').length);

const fetchTickets = async () => {
    try {
        const data = await supportStore.fetchAdminTickets();
        tickets.value = data.tickets;
    } catch (e) { }
};

const selectTicket = (ticket: any) => {
    selectedId.value = ticket._id;
};

const updateStatus = async () => {
    // Mock status update call
    toast.success('Incident status updated.');
};

const sendReply = async () => {
    if (!replyText.value.trim() || !selectedId.value) return;
    try {
        await supportStore.replyToTicket(selectedId.value, { message: replyText.value });
        // In real app, push response to list. Here we refresh or mock.
        const ticket = tickets.value.find(t => t._id === selectedId.value);
        if (ticket) {
            ticket.messages.push({
                text: replyText.value,
                timestamp: new Date(),
                isAdmin: true
            });
        }
        replyText.value = '';
    } catch (e) {
        // Error handled in store but we can catch logic here if needed
    }
};

const getPriorityClass = (p: string) => {
    switch (p) {
        case 'critical': return 'bg-red-500/20 text-red-400 border border-red-500/30';
        case 'high': return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
        case 'medium': return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
        default: return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
    }
};

const timeAgo = (date: string) => {
    // Simple time ago
    return new Date(date).toLocaleTimeString();
};

onMounted(fetchTickets);
</script>

<style scoped>
.support-command {
    min-height: 100vh;
    background: radial-gradient(circle at top right, rgba(168, 85, 247, 0.05), transparent 40%);
}
</style>
