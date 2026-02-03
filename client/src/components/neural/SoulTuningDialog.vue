<template>
    <el-dialog :model-value="modelValue" v-if="localArchive" @update:model-value="$emit('update:modelValue', $event)"
        :title="`NEURAL TUNING: ${localArchive.identity.name}`" width="800px" custom-class="tuning-dialog glass-dialog">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-10 p-4">
            <!-- Left: Identity & Memory -->
            <div class="space-y-8">
                <section>
                    <h4 class="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4">Core Identity</h4>
                    <el-form label-position="top">
                        <el-form-item label="Description (Neural Anchor)">
                            <el-input v-model="localArchive.identity.description" type="textarea" :rows="3"
                                class="glass-input" />
                        </el-form-item>
                    </el-form>
                </section>

                <section>
                    <h4 class="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4">Tactical Memory
                        (Last 3 Events)</h4>
                    <div class="space-y-3">
                        <div v-for="ev in localArchive.memory.keyEvents.slice(-3).reverse()" :key="ev.date"
                            class="p-3 bg-white/5 rounded-xl border border-white/5">
                            <p class="text-[10px] font-bold">{{ ev.description }}</p>
                            <p class="text-[8px] opacity-30 uppercase mt-1">{{ new
                                Date(ev.date).toLocaleDateString() }}</p>
                        </div>
                    </div>
                </section>

                <section>
                    <div class="flex justify-between items-center mb-4">
                        <h4 class="text-[10px] font-black uppercase tracking-widest opacity-40">Digital Double
                            (3D Visuals)</h4>
                        <span v-if="localArchive.visualIdentity?.lastGenerated"
                            class="text-[8px] text-green-400 font-black">SYNCED</span>
                    </div>
                    <div class="p-6 bg-white/5 border border-white/5 rounded-3xl text-center">
                        <div v-if="localArchive.visualIdentity?.textureMapUrl" class="mb-4">
                            <img :src="localArchive.visualIdentity.textureMapUrl"
                                class="w-24 h-24 mx-auto rounded-xl border border-white/10 object-cover" />
                            <p class="text-[8px] opacity-40 mt-2 lowercase">Generated Texture Map</p>
                        </div>
                        <div v-else class="py-4 opacity-20">
                            <three-three theme="outline" size="48" class="mx-auto" />
                            <p class="text-[10px] mt-2 font-bold uppercase">No 3D Visual Identity</p>
                        </div>

                        <input type="file" ref="avatarInput" style="display: none" accept="image/*"
                            @change="handleDigitalDoubleUpload" />
                        <el-button type="primary" size="small" class="w-full mt-4 glass-btn border-blue-500/20"
                            :loading="generatingDouble" @click="avatarInput?.click()">
                            <camera theme="outline" class="mr-2" />
                            {{ localArchive.visualIdentity?.textureMapUrl ? 'Update 3D Identity' : 'Initiate Digital
                            Double' }}
                        </el-button>
                    </div>
                </section>
            </div>

            <!-- Right Sidebar: Styles & Knowledge -->
            <div class="space-y-8">
                <section>
                    <div class="flex justify-between items-center mb-4">
                        <h4 class="text-[10px] font-black uppercase tracking-widest opacity-40">Stylistic Weights
                            (LoRAs)</h4>
                        <el-button type="primary" size="small" circle @click="addLora">+</el-button>
                    </div>
                    <div class="space-y-4 max-h-[200px] overflow-y-auto pr-2 scrollbar-hide">
                        <div v-for="(lora, idx) in localArchive.customization.loras" :key="idx"
                            class="lora-item p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl relative">
                            <div class="flex gap-4 items-center mb-3">
                                <el-input v-model="lora.id" placeholder="LoRA ID (e.g. pixar_v2)" size="small"
                                    class="glass-input flex-1" />
                                <button @click="localArchive.customization.loras.splice(idx, 1)"
                                    class="text-red-500/40 hover:text-red-500"><close-small /></button>
                            </div>
                            <div class="flex gap-4 items-center">
                                <span class="text-[10px] font-black uppercase w-20">Weight: {{ lora.weight }}</span>
                                <el-slider v-model="lora.weight" :min="0" :max="1.5" :step="0.1" class="flex-1" />
                            </div>
                        </div>
                    </div>
                </section>

                <section>
                    <div class="flex justify-between items-center mb-4">
                        <h4 class="text-[10px] font-black uppercase tracking-widest opacity-40">Knowledge Fragments
                        </h4>
                        <el-button type="primary" size="small" circle @click="addKnowledge">+</el-button>
                    </div>
                    <div class="space-y-3">
                        <div v-for="(k, idx) in localArchive.memory.knowledgeEntries" :key="idx"
                            class="p-3 bg-white/5 border border-white/5 rounded-xl group relative">
                            <div class="flex justify-between items-start mb-1">
                                <p class="text-[9px] font-bold text-blue-400 uppercase">{{ k.title }}</p>
                                <button @click="localArchive.memory.knowledgeEntries.splice(idx, 1)"
                                    class="opacity-0 group-hover:opacity-100 text-red-500 transition-all">
                                    <close-small />
                                </button>
                            </div>
                            <el-input v-model="k.content" type="textarea" :rows="2" class="glass-input text-[9px]" />
                        </div>
                        <div v-if="!localArchive.memory.knowledgeEntries?.length"
                            class="p-4 border border-dashed border-white/10 rounded-xl text-center opacity-30">
                            <p class="text-[8px] font-black uppercase">Semantic knowledge bank empty</p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
        <template #footer>
            <div class="flex justify-between items-center px-4 pb-4">
                <p class="text-[10px] italic opacity-30">Neural Sync: {{ new
                    Date(localArchive.lastUpdated).toLocaleDateString() }}</p>
                <div class="flex gap-4">
                    <el-button @click="$emit('update:modelValue', false)" class="glass-btn">Abort</el-button>
                    <el-button type="primary" @click="handleUpdateStyle" :loading="updating"
                        class="create-btn px-8">Update Soul</el-button>
                </div>
            </div>
        </template>
    </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { CloseSmall, Camera, ThreeThree } from '@icon-park/vue-next';
import { toast } from 'vue-sonner';
import { useNeuralStore } from '@/stores/neural';

const props = defineProps<{
    modelValue: boolean;
    archive: any;
}>();

const emit = defineEmits(['update:modelValue', 'update']);

const neuralStore = useNeuralStore();
const updating = ref(false);
const generatingDouble = ref(false);
const avatarInput = ref<HTMLInputElement | null>(null);
const localArchive = ref<any>(null);

watch(() => props.archive, (newVal) => {
    if (newVal) {
        localArchive.value = JSON.parse(JSON.stringify(newVal));
    }
}, { immediate: true });

const addLora = () => {
    if (!localArchive.value.customization.loras) localArchive.value.customization.loras = [];
    localArchive.value.customization.loras.push({ id: '', weight: 1.0, trigger: '' });
};

const addKnowledge = () => {
    if (!localArchive.value.memory.knowledgeEntries) localArchive.value.memory.knowledgeEntries = [];
    localArchive.value.memory.knowledgeEntries.push({ title: 'Untitled Fragment', content: 'Neural data pending...' });
};

const handleUpdateStyle = async () => {
    updating.value = true;
    try {
        await neuralStore.updateArchive(localArchive.value.entityId, {
            identity: localArchive.value.identity,
            loras: localArchive.value.customization.loras,
            knowledgeEntries: localArchive.value.memory.knowledgeEntries
        });
        // Success toast is handled in the store
        emit('update:modelValue', false);
        emit('update');
    } catch (e: any) {
        // Error toast handled in store, but we can keep log or specific UI error state if needed
    } finally {
        updating.value = false;
    }
};

const handleDigitalDoubleUpload = async (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    generatingDouble.value = true;
    const formData = new FormData();
    formData.append('photo', file);

    try {
        const data = await neuralStore.createDigitalDouble(localArchive.value.entityId, formData);
        localArchive.value.visualIdentity = data.data;
        // Success toast handled in store
        emit('update');
    } catch (e: any) {
        // Error toast handled in store
    } finally {
        generatingDouble.value = false;
    }
};
</script>

<style lang="scss" scoped>
.glass-btn {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    color: #fff;

    &:hover {
        background: rgba(255, 255, 255, 0.08);
    }
}

.create-btn {
    background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
    border: none;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 1px;
}

:deep(.tuning-dialog) {
    .el-dialog__body {
        padding-top: 0;
    }
}

.lora-item {
    transition: 0.3s;

    &:hover {
        border-color: rgba(59, 130, 246, 0.5);
    }
}
</style>
