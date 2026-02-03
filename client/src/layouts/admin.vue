<template>
  <div class="admin-layout">
    <el-container style="height: 100vh">
      <el-aside width="240px" class="admin-aside">
        <div class="logo">
          <h2>AntStudio Admin</h2>
        </div>
        <el-menu
          router
          :default-active="route.path"
          class="admin-menu"
          background-color="#1e293b"
          text-color="#94a3b8"
          active-text-color="#fff"
        >
          <el-menu-item index="/admin">
            <el-icon><dashboard-icon theme="outline" size="18" /></el-icon>
            <span>Dashboard</span>
          </el-menu-item>
          <el-menu-item index="/admin/users">
            <el-icon><people-icon theme="outline" size="18" /></el-icon>
            <span>Users</span>
          </el-menu-item>
          <el-menu-item index="/admin/payments">
            <el-icon><payment-icon theme="outline" size="18" /></el-icon>
            <span>Payments</span>
          </el-menu-item>
          <el-menu-item index="/admin/settings">
            <el-icon><setting-icon theme="outline" size="18" /></el-icon>
            <span>System Settings</span>
          </el-menu-item>
          <div class="menu-divider"></div>
          <el-menu-item index="/">
            <el-icon><back-icon theme="outline" size="18" /></el-icon>
            <span>Back to Site</span>
          </el-menu-item>
        </el-menu>
      </el-aside>
      
      <el-container>
        <el-header class="admin-header">
          <div class="header-left">
            <breadcrumb-icon theme="outline" size="20" />
            <span class="current-page">Admin Control Panel</span>
          </div>
          <div class="header-right">
            <el-avatar :size="32" src="https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png" />
          </div>
        </el-header>
        
        <el-main class="admin-main">
          <slot />
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useUIStore } from '@/stores/ui'
import {
  DashboardOne as DashboardIcon,
  Peoples as PeopleIcon,
  PayCodeOne as PaymentIcon,
  SettingTwo as SettingIcon,
  Back as BackIcon,
  Right as BreadcrumbIcon
} from '@icon-park/vue-next'

const route = useRoute()
const uiStore = useUIStore()
</script>

<style scoped>
.admin-layout {
  height: 100vh;
  overflow: hidden;
}

.admin-aside {
  background-color: #1e293b;
  color: #fff;
}

.logo {
  padding: 24px;
  text-align: center;
}

.logo h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(135deg, #60a5fa 0%, #2563eb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.admin-menu {
  border-right: none;
}

.menu-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 16px 0;
}

.admin-header {
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #64748b;
}

.current-page {
  font-weight: 600;
  color: #1e293b;
}

.admin-main {
  background: #f8fafc;
  padding: 24px;
}
</style>
