/**
 * i18n.ts — Calmino Internationalization Setup
 *
 * Stack: i18next + react-i18next + expo-localization
 *
 * HOW TO ADD A NEW LANGUAGE (e.g. Arabic):
 *  1. Create locales/ar.json  (copy he.json, translate all values)
 *  2. Add `ar` to the `resources` object below
 *  3. Add `'ar'` to the Language type in types/index.ts
 *  4. Add the language option in FullSettingsScreen (language picker)
 *  5. Set isRTL = language === 'he' || language === 'ar' in LanguageContext
 *
 * INTERPOLATION:
 *  Uses single-brace syntax {param} to match the existing codebase.
 *  Example: t('baby.welcomeMessage', { name: 'Liam' })
 *           → JSON: "Welcome {name} to Calmino!"
 *           → Output: "Welcome Liam to Calmino!"
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { NativeModules, Platform } from 'react-native';

import he from '../locales/he.json';
import en from '../locales/en.json';
import es from '../locales/es.json';
import ar from '../locales/ar.json';
import fr from '../locales/fr.json';
import de from '../locales/de.json';

// ── Supported language codes ───────────────────────────────────────────────
const SUPPORTED_LANGUAGES = ['he', 'en', 'es', 'ar', 'fr', 'de'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

// ── Detect device language on first launch (pure RN — no native module needed)
function getDeviceLanguage(): SupportedLanguage {
  try {
    let raw: string | undefined;
    if (Platform.OS === 'ios') {
      raw =
        NativeModules.SettingsManager?.settings?.AppleLocale ??
        NativeModules.SettingsManager?.settings?.AppleLanguages?.[0];
    } else {
      raw = NativeModules.I18nManager?.localeIdentifier;
    }
    const lang = raw?.split(/[-_]/)[0];
    return (SUPPORTED_LANGUAGES as readonly string[]).includes(lang ?? '')
      ? (lang as SupportedLanguage)
      : 'he';
  } catch {
    return 'he';
  }
}

// ── i18next init (synchronous — resources are bundled) ─────────────────────
i18n.use(initReactI18next).init({
  resources: {
    he: { translation: he },
    en: { translation: en },
    es: { translation: es },
    ar: { translation: ar },
    fr: { translation: fr },
    de: { translation: de },
  },

  lng: getDeviceLanguage(), // overridden at runtime by LanguageContext
  fallbackLng: 'he',

  // Use single-brace interpolation {param} — keeps existing code unchanged
  interpolation: {
    escapeValue: false, // React Native is XSS-safe
    prefix: '{',
    suffix: '}',
  },

  // Required for React Native (no DOM, no XML entities)
  compatibilityJSON: 'v4',

  // Silence missing-key warnings in production
  missingKeyHandler: __DEV__
    ? (lng, ns, key) => console.warn(`[i18n] Missing key: "${key}" for lang "${lng}"`)
    : undefined,
});

export default i18n;
