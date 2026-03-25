/**
 * LanguageContext.tsx
 *
 * Wraps i18next to provide the same useLanguage() API to the entire app.
 * Components never import i18next directly — they use useLanguage().
 *
 * External API (unchanged from previous implementation):
 *   const { t, language, setLanguage, isRTL } = useLanguage();
 *   t('common.save')                           → "שמור" | "Save"
 *   t('baby.welcomeMessage', { name: 'Eden' }) → "ברוכים הבאים Eden!"
 */

import { logger } from '../utils/logger';
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { I18nManager, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../services/firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import i18n from '../services/i18n';
import { Language } from '../types';

const LANGUAGE_STORAGE_KEY = '@CalmParent:language';

// ── RTL languages ─────────────────────────────────────────────────────────
const RTL_LANGUAGES: Language[] = ['he', 'ar'];

// ── Supported languages (must match i18n.ts) ──────────────────────────────
const SUPPORTED_LANGUAGES: Language[] = ['he', 'en', 'es', 'ar', 'fr', 'de'];

// ── Context shape ─────────────────────────────────────────────────────────
interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
  isRTL: boolean;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────────
export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(
    (i18n.language as Language) ?? 'he'
  );

  // ── Load persisted language on mount ─────────────────────────────────
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        // 1. AsyncStorage (fastest, works offline)
        const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (stored && (SUPPORTED_LANGUAGES as string[]).includes(stored)) {
          applyLanguage(stored as Language);
          return;
        }

        // 2. Firestore (sync across devices)
        const user = auth.currentUser;
        if (user) {
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const lang = userSnap.data()?.settings?.language;
            if (lang && (SUPPORTED_LANGUAGES as string[]).includes(lang)) {
              applyLanguage(lang as Language);
              await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
              return;
            }
          }
        }

        // 3. i18next already detected device language on init — just sync state
        const detected = i18n.language as Language;
        if (detected && (SUPPORTED_LANGUAGES as string[]).includes(detected)) {
          setLanguageState(detected);
          applyRTL(detected);
        }
      } catch (error) {
        logger.warn('Error loading language preference:', error);
      }
    };

    loadLanguage();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Apply language: update i18next + RTL ─────────────────────────────
  const applyLanguage = useCallback((lang: Language) => {
    i18n.changeLanguage(lang);
    setLanguageState(lang);
    applyRTL(lang);
  }, []);

  // ── RTL handling ──────────────────────────────────────────────────────
  // Note: I18nManager.forceRTL requires an app restart to fully take effect.
  // The app defaults to RTL (Hebrew). Switching to LTR (English) shows a
  // restart prompt in FullSettingsScreen if needed.
  const applyRTL = (lang: Language) => {
    const shouldBeRTL = RTL_LANGUAGES.includes(lang);
    // On Android, the app uses manual RTL styles (row-reverse, textAlign: 'right').
    // Enabling I18nManager.forceRTL on Android causes the system to DOUBLE-FLIP
    // these manual styles, making the layout look LTR. So we skip it on Android.
    // On iOS, forceRTL is safe because UIKit handles text direction natively.
    if (Platform.OS === 'ios' && I18nManager.isRTL !== shouldBeRTL) {
      I18nManager.allowRTL(shouldBeRTL);
      I18nManager.forceRTL(shouldBeRTL);
      I18nManager.swapLeftAndRightInRTL(false);
      // App restart is handled by FullSettingsScreen (shows Alert + Updates.reloadAsync)
    }
  };

  // ── Public setLanguage (called from settings) ─────────────────────────
  const setLanguage = useCallback(async (lang: Language) => {
    applyLanguage(lang);

    // Persist locally
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      // Non-critical — language is already applied in memory
    }

    // Sync to Firestore (cross-device)
    try {
      const user = auth.currentUser;
      if (user) {
        await setDoc(
          doc(db, 'users', user.uid),
          { settings: { language: lang } },
          { merge: true }
        );
      }
    } catch {
      // Non-critical — local state is already updated
    }
  }, [applyLanguage]);

  // ── Translation function ──────────────────────────────────────────────
  // Delegates to i18next. Same signature as before.
  // Missing keys fall back to the key string itself (i18next default).
  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      return i18n.t(key, params) as string;
    },
    // Re-memoize whenever language changes so components re-render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [language]
  );

  const isRTL = RTL_LANGUAGES.includes(language);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
};

// ── Hook ──────────────────────────────────────────────────────────────────
export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
