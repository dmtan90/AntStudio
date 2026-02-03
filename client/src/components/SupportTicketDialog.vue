<template>
    <div v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in">
        <div
            class="bg-[#0a0a0c] border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative">

            <!-- Header -->
            <div
                class="p-8 border-b border-white/5 flex justify-between items-start bg-gradient-to-r from-blue-900/20 to-transparent">
                <div>
                    <h2 class="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                        <help theme="outline" size="24" class="text-blue-400" />
                        TACTICAL SUPPORT
                    </h2>
                    <p class="text-[10px] uppercase font-bold text-gray-500 mt-2 tracking-widest">Direct Line to Master
                        Command</p>
                </div>
                <button @click="$emit('update:modelValue', false)"
                    class="text-gray-500 hover:text-white transition-colors">
                    <close theme="outline" size="24" />
                </button>
            </div>

            <!-- Body -->
            <div class="p-8 space-y-6 max-h-[70vh] overflow-y-auto">

                <!-- Subject & Priority -->
                <div class="grid grid-cols-3 gap-6">
                    <div class="col-span-2 space-y-2">
                        <label class="text-[10px] font-black uppercase text-gray-500">Mission Objective
                            (Subject)</label>
                        <input v-model="form.subject" type="text" placeholder="e.g., Render Engine Latency"
                            class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 focus:outline-none transition-colors" />
                    </div>
                    <div class="space-y-2">
                        <label class="text-[10px] font-black uppercase text-gray-500">Urgency Level</label>
                        <select v-model="form.priority"
                            class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 focus:outline-none transition-colors">
                            <option value="low">Low (Query)</option>
                            <option value="medium">Medium (Standard)</option>
                            <option value="high">High (Urgent)</option>
                            <option value="critical">Critical (Outage)</option>
                        </select>
                    </div>
                </div>

                <!-- Description -->
                <div class="space-y-2">
                    <label class="text-[10px] font-black uppercase text-gray-500">Sitrep (Description)</label>
                    <textarea v-model="form.description" rows="5" placeholder="Describe the anomaly in detail..."
                        class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 focus:outline-none transition-colors resize-none"></textarea>
                </div>

                <!-- Attachment Zone -->
                <div class="space-y-2">
                    <label class="text-[10px] font-black uppercase text-gray-500 flex justify-between">
                        <span>Tactical Data Attachments</span>
                        <span class="text-blue-400 cursor-pointer hover:underline" @click="generateLogBundle">Extract
                            Local Logs</span>
                    </label>

                    <div
                        class="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center hover:border-blue-500/30 transition-colors bg-white/[0.01] relative">
                        <input type="file" multiple @change="handleFileSelect"
                            class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        <div v-if="attachments.length === 0">
                            <upload-one theme="outline" size="32" class="text-gray-600 mb-2 mx-auto" />
                            <p class="text-xs text-gray-400">Drag files or click to upload</p>
                            <p class="text-[10px] text-gray-600 mt-1 uppercase">Supports: Logs, PNG, JPG, JSON</p>
                        </div>
                        <div v-else class="space-y-2 relative z-10 pointer-events-none">
                            <div v-for="(file, idx) in attachments" :key="idx"
                                class="flex items-center justify-between bg-white/5 p-2 rounded-lg pointer-events-auto">
                                <span class="text-xs text-gray-300 truncate max-w-[80%]">{{ file.name }}</span>
                                <button @click.stop="removeAttachment(idx)" class="text-red-400 hover:text-red-300">
                                    <delete theme="outline" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Consent Checkbox -->
                <div class="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex gap-4 items-start">
                    <input type="checkbox" v-model="form.dataConsent" id="consent" class="mt-1" />
                    <label for="consent" class="text-xs text-blue-200 leading-relaxed cursor-pointer select-none">
                        <strong>Explicit Data Authorization:</strong> I authorize the transfer of the provided
                        information (including attached logs and system telemetry) to the AntStudio Master Command for
                        diagnostic purposes. I understand this data effectively leaves my private Enclave.
                    </label>
                </div>

            </div>

            <!-- Footer -->
            <div class="p-8 border-t border-white/5 flex justify-end gap-4 bg-black/20">
                <button @click="$emit('update:modelValue', false)"
                    class="px-6 py-3 rounded-xl text-xs font-bold uppercase text-gray-500 hover:text-white hover:bg-white/5 transition-all">Cancel</button>
                <button @click="submitTicket" :disabled="!isValid || submitting"
                    class="px-8 py-3 rounded-xl text-xs font-black uppercase bg-blue-600 text-white hover:bg-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20 flex items-center gap-2">
                    <loading v-if="submitting" theme="outline" class="animate-spin" />
                    {{ submitting ? 'Transmitting...' : 'Submit Ticket' }}
                </button>
            </div>

        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue';
import { Help, Close, UploadOne, Delete, Loading } from '@icon-park/vue-next';
import { toast } from 'vue-sonner';
import { useSupportStore } from '@/stores/support';
import { useAdminStore } from '@/stores/admin';

const props = defineProps<{
    modelValue: boolean;
    stats?: any;
}>();

const emit = defineEmits(['update:modelValue']);

const supportStore = useSupportStore();
const adminStore = useAdminStore();

const submitting = ref(false);
const attachments = ref<File[]>([]);
const form = reactive({
    subject: '',
    priority: 'medium',
    description: '',
    dataConsent: false
});

const isValid = computed(() => {
    return form.subject.length > 5 &&
        form.description.length > 10 &&
        form.dataConsent === true;
});

const handleFileSelect = (e: Event) => {
    const files = (e.target as HTMLInputElement).files;
    if (files) {
        attachments.value.push(...Array.from(files));
    }
};

const removeAttachment = (idx: number) => {
    attachments.value.splice(idx, 1);
};

const generateLogBundle = async () => {
    try {
        toast.info('Compiling local telemetry...');
        const res = await adminStore.exportDiagnostics();
        // adminStore.exportDiagnostics returns the Axios response with blob
        const file = new File([res.data], 'tactical_logs_bundle.zip', { type: 'application/zip' });
        attachments.value.push(file);
        toast.success('Log bundle attached successfully.');
    } catch (e) {
        // Error handling already in store, but we can add specific user feedback here if needed
    }
};

const submitTicket = async () => {
    submitting.value = true;
    try {
        // 1. Upload Attachments (Mock for now, normally presigned S3)
        // In a real scenario, this logic might be moved to a store action "uploadAttachments"
        const uploadedFiles = attachments.value.map(f => ({
            fileName: f.name,
            s3Key: `support/uploads/${Date.now()}_${f.name}`,
            fileType: f.name.endsWith('.zip') ? 'log-bundle' : 'config'
        }));

        // 2. Submit Ticket Metadata
        await supportStore.createTicket({
            ...form,
            attachments: uploadedFiles,
            instanceId: 'edge-local-01', // Would come from config
            category: 'technical' // Default category
        } as any);

        // Success toast is handled in supportStore
        emit('update:modelValue', false);

        // Reset
        form.subject = '';
        form.description = '';
        form.dataConsent = false;
        attachments.value = [];
    } catch (e: any) {
        // Error toast handled in store
    } finally {
        submitting.value = false;
    }
};
</script>

<style scoped>
.animate-in {
    animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: scale(0.98);
    }

    to {
        opacity: 1;
        transform: scale(1);
    }
}
</style>
