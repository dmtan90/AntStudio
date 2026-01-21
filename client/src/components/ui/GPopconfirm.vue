<template>
  <el-popconfirm
    v-bind="attrs"
    :popper-class="`g-popconfirm-popper ${$attrs['popper-class'] || ''}`"
  >
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
  </el-popconfirm>
</template>

<script setup lang="ts">
import { useAttrs } from 'vue'

defineOptions({
  inheritAttrs: false
})

const attrs = useAttrs()
</script>

<style lang="scss">
.g-popconfirm-popper {
  background: rgba(10, 10, 10, 0.95) !important;
  backdrop-filter: blur(40px) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 12px !important;
  padding: 16px !important;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8) !important;

  .el-popconfirm__main {
    color: #fff !important;
    font-size: 14px !important;
    margin-bottom: 12px !important;
    
    .el-popconfirm__icon {
      color: #ffcc00 !important; 
    }
  }

  .el-popconfirm__action {
    margin-top: 0 !important;
    display: flex !important;
    justify-content: flex-end !important;
    gap: 8px !important;

    .el-button {
      height: 28px !important;
      padding: 0 12px !important;
      border-radius: 6px !important;
      font-size: 12px !important;
      margin-left: 0 !important;
    }

    .el-button--info {
      background: transparent !important;
      border: 1px solid rgba(255, 255, 255, 0.2) !important;
      color: rgba(255, 255, 255, 0.7) !important;
      &:hover {
        border-color: #fff !important;
        color: #fff !important;
      }
    }

    .el-button--primary {
      background: #fff !important;
      color: #000 !important;
      border: none !important;
      &:hover {
        opacity: 0.9 !important;
      }
    }
  }
}
</style>
