<template>
  <el-timeline
    v-bind="attrs"
    :class="['g-timeline', $attrs.class]"
  >
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>

    <!-- Support items prop for backward compatibility -->
    <template v-if="items && items.length > 0">
      <el-timeline-item
        v-for="(item, idx) in items"
        :key="idx"
        :timestamp="item.timestamp"
        :type="item.type"
        :color="item.color"
        :hollow="item.hollow"
        :placement="item.placement"
      >
        <template #default>
          <slot :name="`content-${idx}`" :item="item">
            {{ item.content }}
          </slot>
        </template>
        
        <template #dot v-if="$slots[`dot-${idx}`]">
           <slot :name="`dot-${idx}`" :item="item" />
        </template>
      </el-timeline-item>
    </template>
  </el-timeline>
</template>

<script setup lang="ts">
import { useAttrs } from 'vue'

defineOptions({
  inheritAttrs: false
})

defineProps({
  items: {
    type: Array as () => Array<{ 
      content: string, 
      timestamp?: string, 
      type?: 'primary' | 'success' | 'warning' | 'danger' | 'info',
      color?: string,
      hollow?: boolean,
      placement?: 'top' | 'bottom'
    }>,
    default: () => []
  }
})

const attrs = useAttrs()
</script>

<style lang="scss" scoped>
.g-timeline {
  padding-left: 4px !important;

  :deep(.el-timeline-item__tail) {
    border-left: 2px solid rgba(255, 255, 255, 0.1) !important;
  }

  :deep(.el-timeline-item__node) {
    background-color: rgba(255, 255, 255, 0.2) !important;
    border: none !important;

    &.el-timeline-item__node--primary {
      background-color: #fff !important;
      box-shadow: 0 0 10px rgba(255, 255, 255, 0.5) !important;
    }
    &.el-timeline-item__node--success { background-color: #00e676 !important; }
    &.el-timeline-item__node--warning { background-color: #ffab00 !important; }
    &.el-timeline-item__node--danger { background-color: #ff5252 !important; }
  }

  :deep(.el-timeline-item__content) {
    color: #fff !important;
    font-size: 14px !important;
  }

  :deep(.el-timeline-item__timestamp) {
    color: rgba(255, 255, 255, 0.5) !important;
    font-size: 12px !important;
  }
}
</style>
