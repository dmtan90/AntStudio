<script setup lang="ts">
import { SunOne as Sun, Moon, Sun as SunMoon } from '@icon-park/vue-next';
import { ElButton, ElDropdown, ElDropdownMenu, ElDropdownItem } from 'element-plus';
import { useTheme } from 'video-editor/hooks/use-theme';
import type { Theme } from 'video-editor/context/theme';

const { theme, setTheme } = useTheme();

const handleThemeChange = (value: Theme) => {
  setTheme(value);
};
</script>

<template>
  <el-dropdown trigger="click">
    <el-button type="primary" text bg circle icon>
      <Sun v-if="theme === 'light'" :size="15" />
      <Moon v-else-if="theme === 'dark'" :size="15" />
      <SunMoon v-else :size="15" />
    </el-button>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item @click="handleThemeChange('light')">Light</el-dropdown-item>
        <el-dropdown-item @click="handleThemeChange('dark')">Dark</el-dropdown-item>
        <el-dropdown-item @click="handleThemeChange('system')">System</el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>
