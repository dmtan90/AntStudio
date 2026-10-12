
import { watch } from 'vue';
import { createI18n } from 'vue-i18n';
import en from './locales/en.json';

export type Locale = 'en' | 'vi' | 'zh' | 'ja' | 'es';

// English is bundled (it is also the fallback); other locales (~250KB each) load on demand
const localeLoaders: Record<Exclude<Locale, 'en'>, () => Promise<{ default: any }>> = {
  vi: () => import('./locales/vi.json'),
  ja: () => import('./locales/ja.json'),
  zh: () => import('./locales/zh.json'),
  es: () => import('./locales/es.json')
};

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
    en
  }
});

/** Loads a locale's messages if they aren't registered yet. Safe to call repeatedly. */
export async function loadLocaleMessages(locale: string): Promise<void> {
  if (i18n.global.availableLocales.includes(locale as any)) return;
  const loader = localeLoaders[locale as Exclude<Locale, 'en'>];
  if (!loader) return;
  try {
    const messages = await loader();
    i18n.global.setLocaleMessage(locale as any, messages.default);
  } catch (err) {
    console.error(`[i18n] Failed to load locale "${locale}":`, err);
  }
}

// Components switch language by assigning `locale.value` directly; load messages whenever it changes
// (vue-i18n falls back to English until they arrive).
watch(i18n.global.locale, (locale) => { loadLocaleMessages(locale as string); });

/** Resolves once the startup locale is loaded; main.ts waits on it before mounting. */
export const i18nReady = loadLocaleMessages(initialLocale);

export default i18n;
