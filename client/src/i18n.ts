
import { createI18n } from 'vue-i18n';
import en from './locales/en.json';
import vi from './locales/vi.json';
import ja from './locales/ja.json';
// Import other locales as needed

type MessageSchema = typeof en;

const i18n = createI18n<[MessageSchema], 'en' | 'vi' | 'ja'>({
  legacy: false, // use Composition API
  locale: 'en',
  fallbackLocale: 'en',
  globalInjection: true,
  messages: {
    en,
    vi: vi as any,
    ja: ja as any
  }
});

export default i18n;
