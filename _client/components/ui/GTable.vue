<script setup lang="ts">
import { useAttrs, computed } from 'vue'

defineOptions({
  inheritAttrs: false
})

defineProps({
  columns: {
    type: Array as () => Array<{ title: string, key: string, width?: string }>,
    default: () => []
  }
})

const attrs = useAttrs()
</script>

<template>
  <el-table
    v-bind="attrs"
    :class="['g-table', $attrs.class]"
  >
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
    
    <!-- Support columns prop for backward compatibility -->
    <template v-if="columns && columns.length > 0">
      <el-table-column
        v-for="col in columns"
        :key="col.key"
        :prop="col.key"
        :label="col.title"
        :width="col.width"
      >
        <template #default="scope">
          <slot :name="`cell-${col.key}`" v-bind="scope">
            {{ scope.row[col.key] }}
          </slot>
        </template>
      </el-table-column>
    </template>
  </el-table>
</template>

<style lang="scss" scoped>
.g-table {
  --el-table-bg-color: transparent !important;
  --el-table-tr-bg-color: transparent !important;
  --el-table-header-bg-color: rgba(255, 255, 255, 0.03) !important;
  --el-table-row-hover-bg-color: rgba(255, 255, 255, 0.05) !important;
  --el-table-border-color: rgba(255, 255, 255, 0.08) !important;
  --el-table-text-color: #fff !important;
  --el-table-header-text-color: rgba(255, 255, 255, 0.5) !important;

  background: rgba(255, 255, 255, 0.02) !important;
  backdrop-filter: blur(10px) !important;
  border-radius: 12px !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  overflow: hidden !important;

  :deep(.el-table__inner-wrapper) {
    &::before { display: none !important; }
  }

  :deep(.el-table__header-wrapper) {
    th {
      font-weight: 700 !important;
      text-transform: uppercase !important;
      letter-spacing: 1px !important;
      font-size: 12px !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
    }
  }

  :deep(.el-table__body-wrapper) {
    td {
      border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
      padding: 16px 0 !important;
    }
    
    tr:last-child td {
      border-bottom: none !important;
    }
  }

  :deep(.el-table__empty-block) {
    background: transparent !important;
    .el-table__empty-text {
      color: rgba(255, 255, 255, 0.3) !important;
    }
  }
}
</style>
