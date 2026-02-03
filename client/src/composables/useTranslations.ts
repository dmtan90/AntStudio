import { ref } from 'vue'

export type Locale = 'en' | 'vi' | 'zh' | 'ja' | 'es'

// Import translation JSON files
import enTranslations from '@/locales/en.json'
import viTranslations from '@/locales/vi.json'
import zhTranslations from '@/locales/zh.json'
import jaTranslations from '@/locales/ja.json'
import esTranslations from '@/locales/es.json'

const translations: Record<Locale, any> = {
    en: enTranslations,
    vi: viTranslations,
    zh: zhTranslations,
    ja: jaTranslations,
    es: esTranslations
}

const currentLocale = ref<Locale>('en')

// Initialize from localStorage if on client
if (typeof window !== 'undefined') {
    const savedLocale = localStorage.getItem('preferred-language') as Locale
    if (savedLocale && ['en', 'vi', 'zh', 'ja', 'es'].includes(savedLocale)) {
        currentLocale.value = savedLocale
    }
}

export function useTranslations() {
    const t = (path: string, params?: Record<string, string>) => {
        const keys = path.split('.')

        // Try current locale
        let current = translations[currentLocale.value]
        let found = true
        for (const key of keys) {
            if (!current || typeof current !== 'object' || !current[key]) {
                found = false
                break
            }
            current = current[key]
        }

        let result = path
        if (found && typeof current === 'string') {
            result = current
        } else if (currentLocale.value !== 'en') {
            // Fallback to English
            let fallback = translations['en']
            for (const key of keys) {
                if (!fallback || typeof fallback !== 'object' || !fallback[key]) {
                    fallback = null
                    break
                }
                fallback = fallback[key]
            }
            if (typeof fallback === 'string') result = fallback
        }

        // Replace parameters
        if (params && typeof result === 'string') {
            Object.entries(params).forEach(([key, value]) => {
                result = result.replace(new RegExp(`{${key}}`, 'g'), value)
            })
        }

        return result
    }

    const setLocale = (locale: Locale) => {
        currentLocale.value = locale
        if (typeof window !== 'undefined') {
            localStorage.setItem('preferred-language', locale)
        }
    }

    return {
        t,
        setLocale,
        currentLocale
    }
}
