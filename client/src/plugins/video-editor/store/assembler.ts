import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useVideoAssembler, type ExportOptions } from '@/composables/useVideoAssembler';

export const useVideoAssemblerStore = defineStore('videoAssembler', () => {
    const assembler = useVideoAssembler();

    // Bridge the assembler state
    const isAssembling = assembler.isAssembling;
    const progress = assembler.progress;
    const status = assembler.status;
    const result = assembler.result;
    const error = assembler.error;

    const assemble = async (options: ExportOptions, projectOverride?: any) => {
        return await assembler.assemble(options, projectOverride);
    };

    const cancel = () => {
        assembler.cancel();
    };

    return {
        isAssembling,
        progress,
        status,
        result,
        error,
        assemble,
        cancel
    };
});
