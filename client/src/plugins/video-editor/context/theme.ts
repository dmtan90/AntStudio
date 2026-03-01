import { ref, watch, type Ref } from 'vue'

export type Theme = 'dark' | 'light' | 'system'

export interface ThemeProviderState {
  theme: Ref<Theme>
  setTheme: (theme: Theme) => void
}

export function useThemeProvider(storageKey = 'theme', defaultTheme: Theme = 'system'): ThemeProviderState {
  const theme = ref<Theme>((localStorage.getItem(storageKey) as Theme) || defaultTheme)

  const setTheme = (newTheme: Theme) => {
    localStorage.setItem(storageKey, newTheme)
    theme.value = newTheme
  }

  watch(
    theme,
    (newTheme) => {
      const root = window.document.documentElement
      root.classList.remove('light', 'dark')
      if (newTheme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        root.classList.add(systemTheme)
        return
      }
      root.classList.add(newTheme)
    },
    { immediate: true },
  )

  return {
    theme,
    setTheme,
  }
}
