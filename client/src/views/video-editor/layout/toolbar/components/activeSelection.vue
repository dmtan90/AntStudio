<script setup lang="ts">
import {
    AlignLeft,
    AlignTextCenter as AlignCenter,
    AlignRight,
    AlignTop,
    AlignTextMiddle as AlignMiddle,
    AlignBottom,
    DistributeHorizontally as DistributeHorizontal,
    DistributeVertically as DistributeVertical,
    Group, Ungroup, Delete
} from '@icon-park/vue-next';
import { useCanvasStore } from 'video-editor/store/canvas';
import { storeToRefs } from 'pinia';

const canvasStore = useCanvasStore();
const { canvas, selectionActive: selected } = storeToRefs(canvasStore);

const isGroup = computed(() => selected.value?.type === 'group');
const isMultiple = computed(() => selected.value?.type === 'activeSelection');

</script>

<template>
    <div
        class="flex items-center gap-1 h-full px-2 py-1.5 rounded-xl bg-white/5 border border-white/5 backdrop-blur-md">
        <!-- Alignment Group -->
        <div class="flex items-center gap-1 border-r border-white/10 pr-3 mr-2 ml-1">
            <el-tooltip content="Align Left" placement="top">
                <el-button text bg circle @click="canvas.alignment.alignObjects('left')"
                    class="!bg-transparent hover:!bg-white/10 !text-white/60 hover:!text-white border-none">
                    <AlignLeft :size="16" />
                </el-button>
            </el-tooltip>
            <el-tooltip content="Align Center" placement="top">
                <el-button text bg circle @click="canvas.alignment.alignObjects('center')"
                    class="!bg-transparent hover:!bg-white/10 !text-white/60 hover:!text-white border-none">
                    <AlignCenter :size="16" />
                </el-button>
            </el-tooltip>
            <el-tooltip content="Align Right" placement="top">
                <el-button text bg circle @click="canvas.alignment.alignObjects('right')"
                    class="!bg-transparent hover:!bg-white/10 !text-white/60 hover:!text-white border-none">
                    <AlignRight :size="16" />
                </el-button>
            </el-tooltip>
            <div class="w-px h-4 bg-white/10 mx-1"></div>
            <el-tooltip content="Align Top" placement="top">
                <el-button text bg circle @click="canvas.alignment.alignObjects('top')"
                    class="!bg-transparent hover:!bg-white/10 !text-white/60 hover:!text-white border-none">
                    <AlignTop :size="16" />
                </el-button>
            </el-tooltip>
            <el-tooltip content="Align Middle" placement="top">
                <el-button text bg circle @click="canvas.alignment.alignObjects('middle')"
                    class="!bg-transparent hover:!bg-white/10 !text-white/60 hover:!text-white border-none">
                    <AlignMiddle :size="16" />
                </el-button>
            </el-tooltip>
            <el-tooltip content="Align Bottom" placement="top">
                <el-button text bg circle @click="canvas.alignment.alignObjects('bottom')"
                    class="!bg-transparent hover:!bg-white/10 !text-white/60 hover:!text-white border-none">
                    <AlignBottom :size="16" />
                </el-button>
            </el-tooltip>
        </div>

        <!-- Distribution Group -->
        <div class="flex items-center gap-1 border-r border-white/10 pr-3 mr-2">
            <el-tooltip content="Distribute Horizontally" placement="top">
                <el-button text bg circle @click="canvas.alignment.distributeObjects('horizontal')"
                    class="!bg-transparent hover:!bg-white/10 !text-white/60 hover:!text-white border-none">
                    <DistributeHorizontal :size="16" />
                </el-button>
            </el-tooltip>
            <el-tooltip content="Distribute Vertically" placement="top">
                <el-button text bg circle @click="canvas.alignment.distributeObjects('vertical')"
                    class="!bg-transparent hover:!bg-white/10 !text-white/60 hover:!text-white border-none">
                    <DistributeVertical :size="16" />
                </el-button>
            </el-tooltip>
        </div>

        <!-- Grouping Group -->
        <div class="flex items-center gap-1 border-r border-white/10 pr-3 mr-2">
            <el-tooltip v-if="isMultiple" content="Group Objects" placement="top">
                <el-button text bg circle @click="canvas.onGroup()"
                    class="!bg-transparent hover:!bg-white/10 !text-white/60 hover:!text-white border-none">
                    <Group :size="16" />
                </el-button>
            </el-tooltip>
            <el-tooltip v-if="isGroup" content="Ungroup Objects" placement="top">
                <el-button text bg circle @click="canvas.onUngroup()"
                    class="!bg-transparent hover:!bg-white/10 !text-white/60 hover:!text-white border-none">
                    <Ungroup :size="16" />
                </el-button>
            </el-tooltip>
        </div>

        <!-- General Actions -->
        <div class="flex items-center gap-1 pr-1">
            <el-tooltip content="Delete Selection" placement="top">
                <el-button text bg circle @click="canvas.onDeleteActiveObject()"
                    class="!bg-transparent hover:!bg-red-500/20 !text-white/60 hover:!text-red-400 border-none">
                    <Delete :size="16" />
                </el-button>
            </el-tooltip>
        </div>
    </div>
</template>

<style scoped>
:deep(.el-button) {
    width: 32px;
    height: 32px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
}
</style>
