<template>
  <el-drawer
    v-bind="attrs"
    :class="['g-drawer', $attrs.class]"
    :append-to-body="true"
  >
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { useAttrs } from 'vue'

defineOptions({
  inheritAttrs: false
})

const attrs = useAttrs()
</script>

<style lang="scss">
.g-drawer {
  background: rgba(10, 10, 10, 0.8) !important;
  backdrop-filter: blur(40px) !important;
  border-left: 1px solid rgba(255, 255, 255, 0.1) !important;
  box-shadow: -20px 0 50px rgba(0, 0, 0, 0.8) !important;

  .el-drawer__header {
    padding: 32px !important;
    margin-bottom: 0 !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
    
    .el-drawer__title {
      color: #fff !important;
      font-size: 20px !important;
      font-weight: 800 !important;
    }

    .el-drawer__close-btn {
      color: rgba(255, 255, 255, 0.5) !important;
      font-size: 20px !important;
      &:hover { color: #fff !important; }
    }
  }

  .el-drawer__body {
    padding: 32px !important;
    color: rgba(255, 255, 255, 0.9) !important;
  }

  .el-drawer__footer {
    padding: 24px 32px !important;
    border-top: 1px solid rgba(255, 255, 255, 0.05) !important;
    background: rgba(255, 255, 255, 0.02) !important;
  }
}
</style>
