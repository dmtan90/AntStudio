
import { createI18n } from 'vue-i18n';
import en from './locales/en.json';
import vi from './locales/vi.json';
import ja from './locales/ja.json';
import zh from './locales/zh.json';
import es from './locales/es.json';

export type Locale = 'en' | 'vi' | 'zh' | 'ja' | 'es';

// Initialize from localStorage if on client
let initialLocale = 'en';
if (typeof window !== 'undefined') {
  const savedLocale = localStorage.getItem('preferred-language');
  if (savedLocale && ['en', 'vi', 'zh', 'ja', 'es'].includes(savedLocale)) {
    initialLocale = savedLocale;
  }
}

const i18n = createI18n({
  legacy: false, // use Composition API
  locale: initialLocale,
  fallbackLocale: 'en',
  globalInjection: true,
  messages: {
    en,
    vi: vi as any,
    ja: ja as any,
    zh: zh as any,
    es: es as any
  }
});

export default i18n;
