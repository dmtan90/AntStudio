<template>
    <el-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)"
        title="MANIFEST NEW SOUL" width="500px" custom-class="glass-dialog">
        <div class="p-6">
            <el-form label-position="top">
                <el-form-item label="Persona Name">
                    <el-input v-model="newSoul.name" placeholder="E.g. Digital Alchemist" class="glass-input" />
                </el-form-item>
                <el-form-item label="Primary Objective">
                    <el-input v-model="newSoul.description" type="textarea" :rows="3"
                        placeholder="Define the soul's purpose..." class="glass-input" />
                </el-form-item>
                <el-form-item label="Neural Traits">
                    <div class="flex flex-wrap gap-2">
                        <el-checkbox-group v-model="newSoul.traits">
                            <el-checkbox-button v-for="t in presetTraits" :key="t" :label="t">{{ t
                            }}</el-checkbox-button>
                        </el-checkbox-group>
                    </div>
                </el-form-item>
            </el-form>
        </div>
        <template #footer>
            <div class="flex gap-4 p-4 pt-0">
                <el-button @click="$emit('update:modelValue', false)" class="glass-btn flex-1">Abort</el-button>
                <el-button type="primary" @click="handleManifest" :loading="loading"
                    class="create-btn flex-1">Initialize Pattern</el-button>
            </div>
        </template>
    </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { toast } from 'vue-sonner';
import { useNeuralStore } from '@/stores/neural';

const props = defineProps<{
    modelValue: boolean;
}>();

const emit = defineEmits(['update:modelValue', 'success']);

const neuralStore = useNeuralStore();
const loading = ref(false);
const newSoul = ref({
    name: '',
    description: '',
    traits: [] as string[]
});

const presetTraits = ['LOGICAL', 'CREATIVE', 'AGGRESSIVE', 'EMPATHETIC', 'CYNIC', 'OPTIMIST'];

const handleManifest = async () => {
    if (!newSoul.value.name || !newSoul.value.description) return;
    loading.value = true;
    try {
        await neuralStore.fetchSoulManifest(newSoul.value.name);
        toast.success(`Successful manifestation of ${newSoul.value.name}.`);
        emit('update:modelValue', false);
        emit('success');
        // Reset form
        newSoul.value = { name: '', description: '', traits: [] };
    } catch (e) {
        // Error toast handled in store, but we catch generic fail here if needed
    } finally {
        loading.value = false;
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
</style>
