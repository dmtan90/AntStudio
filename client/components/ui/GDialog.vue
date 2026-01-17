<script setup lang="ts">
import { useAttrs, computed } from 'vue'

defineOptions({
  inheritAttrs: false
})

const attrs = useAttrs()
</script>

<template>
  <el-dialog
    v-bind="attrs"
    :class="['g-dialog', $attrs.class]"
    :append-to-body="true"
  >
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
  </el-dialog>
</template>

<style lang="scss">
.g-dialog {
  background: rgba(10, 10, 10, 0.85) !important;
  backdrop-filter: blur(50px) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 28px !important;
  box-shadow: 0 50px 100px rgba(0, 0, 0, 0.9) !important;
  overflow: hidden !important;

  .el-dialog__header {
    padding: 32px 40px 24px !important;
    margin-right: 0 !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;

    .el-dialog__title {
      color: #fff !important;
      font-size: 24px !important;
      font-weight: 800 !important;
      letter-spacing: -0.5px !important;
    }

    .el-dialog__headerbtn {
      top: 32px !important;
      right: 32px !important;
      width: 32px !important;
      height: 32px !important;
      
      .el-dialog__close {
        color: rgba(255, 255, 255, 0.5) !important;
        font-size: 20px !important;
        transition: all 0.3s !important;
        &:hover {
          color: #fff !important;
          transform: rotate(90deg) !important;
        }
      }
    }
  }

  .el-dialog__body {
    padding: 40px !important;
    color: rgba(255, 255, 255, 0.9) !important;
  }

  .el-dialog__footer {
    padding: 24px 40px 32px !important;
    border-top: 1px solid rgba(255, 255, 255, 0.05) !important;
    background: none !important;
  }
}

// Ensure the overlay is also darkened
.el-overlay-dialog {
  background-color: rgba(0, 0, 0, 0.8) !important;
  backdrop-filter: blur(10px) !important;
}
</style>
