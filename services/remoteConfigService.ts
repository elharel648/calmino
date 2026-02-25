/**
 * remoteConfigService.ts
 *
 * ניהול פייוול מרחוק — ללא גרסה חדשה.
 *
 * איך לשנות ערכים:
 * Firebase Console → Remote Config → הוסף/ערוך פרמטר → Publish
 * השינוי נכנס לכל המשתמשים תוך שעה (בפיתוח — מיידי).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';
import { db } from './firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

// ─── Cache ───────────────────────────────────────────────────────────────────
const CACHE_KEY = '@remote_config_cache';
const LAST_FETCH_KEY = '@remote_config_last_fetch';
const FETCH_INTERVAL_MS = __DEV__ ? 0 : 3_600_000; // 1 hour in prod, 0 in dev
const FIREBASE_PROJECT_ID = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'calmparentapp';

// ─── ברירות מחדל (מה שרואים לפני fetch ראשון) ──────────────────────────────
let currentConfig: Record<string, string> = {
  // כותרות
  paywall_title: 'Calmino Premium',
  paywall_subtitle: 'גישה מלאה לכל התכונות המתקדמות',

  // כפתורי רכישה
  paywall_annual_cta: 'הירשם ל-Premium שנתי',
  paywall_monthly_cta: 'הירשם ל-Premium חודשי',

  // באנר אורגנטיות — מדליקים/כבים מהקונסול בלי גרסה
  paywall_show_banner: 'false',
  paywall_banner_text: '🔥 מבצע לזמן מוגבל — עד סוף השבוע!',
  paywall_banner_color: '#EF4444',

  // פיצ'רים (ניתן לשנות טקסט בלי גרסה)
  paywall_feature_1: 'דוחות מפורטים ותובנות',
  paywall_feature_2: 'ייצוא נתונים ל-PDF',
  paywall_feature_3: 'שיתוף ללא הגבלה למשפחה ובייביסיטר',
  paywall_feature_4: 'גיבוי אוטומטי ותמיכה VIP',
  paywall_feature_5: 'ללא פרסומות לעולם',

  // פופ-אפ דינמי (Dynamic Promo Modal)
  promo_active: 'false',
  promo_id: 'default_promo_1',
  promo_target_screen: 'All', // 'All', 'Home', 'Settings', 'Reports', etc.
  promo_image_url: '',
  promo_title: '✨ מבצע מיוחד!',
  promo_body: 'שדרגו ל-Premium וגלו את כל התכונות המתקדמות.',
  promo_cta_text: 'לפתיחת כל התכונות',
  promo_cta_action: 'Paywall', // 'Paywall' or 'Link'
  promo_link_url: '', // External URL if action is 'Link'
};

// ─── אתחול מ-Cache קיים (Local Storage) ──────────────────────────────────────────────────────────────
export const loadCachedConfig = async () => {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsedConfig = JSON.parse(cached);
      currentConfig = { ...currentConfig, ...parsedConfig };
      logger.info('Loaded cached config from AsyncStorage');
    }
  } catch (e) {
    logger.warn('Failed to load cached Remote Config', e);
  }
};

// ─── אתחול ───────────────────────────────────────────────────────────────────
export const initRemoteConfig = async (): Promise<void> => {
  try {
    await loadCachedConfig(); // Load cache first for immediate UI

    const lastFetchStr = await AsyncStorage.getItem(LAST_FETCH_KEY);
    const lastFetch = lastFetchStr ? parseInt(lastFetchStr, 10) : 0;
    const now = Date.now();

    if (now - lastFetch < FETCH_INTERVAL_MS) {
      logger.info('Using cached Remote Config. Next fetch in', (FETCH_INTERVAL_MS - (now - lastFetch)) / 1000, 'seconds');
      return;
    }

    // Fetch from Firestore instead of Remote Config REST API
    logger.info('Fetching Remote Config from Firestore...');

    const configRef = doc(db, 'app_settings', 'remote_config');
    const configSnap = await getDoc(configRef);

    if (configSnap.exists()) {
      const data = configSnap.data();

      // Parse the new config
      const newConfig: Record<string, string> = {};
      Object.keys(data).forEach(key => {
        newConfig[key] = String(data[key]); // ALWAYS take what's in Firestore
      });

      // Merge with existing defaults (Firestore takes precedence)
      currentConfig = { ...currentConfig, ...newConfig };

      // Save to cache
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(currentConfig));
      await AsyncStorage.setItem(LAST_FETCH_KEY, now.toString());
      logger.info('Remote Config successfully updated from Firestore', newConfig);

      // Debug
      // Alert.alert('Firestore Fetch', JSON.stringify({ id: currentConfig['promo_id'], active: currentConfig['promo_active'] }));
    } else {
      logger.warn(`Remote Config document not found in Firestore. Using defaults.`);
    }

  } catch (e) {
    // אם ה-fetch נכשל — ברירות המחדל (או הקאש) ימשיכו לפעול
    logger.error('Remote Config fetch failed completely:', e);
  }
};

// Helper for parsing values safely
const getVal = (key: string) => {
  // logger.info(`getVal(${key}): ${currentConfig[key]}`);
  return currentConfig[key] || '';
};
const getBool = (key: string) => {
  // logger.info(`getBool(${key}): ${currentConfig[key]} -> ${currentConfig[key] === 'true'}`);
  return currentConfig[key] === 'true';
};

// ─── Getters ─────────────────────────────────────────────────────────────────
export const getPaywallConfig = () => ({
  title: getVal('paywall_title'),
  subtitle: getVal('paywall_subtitle'),
  annualCta: getVal('paywall_annual_cta'),
  monthlyCta: getVal('paywall_monthly_cta'),
  showBanner: getBool('paywall_show_banner'),
  bannerText: getVal('paywall_banner_text'),
  bannerColor: getVal('paywall_banner_color'),
  features: [
    getVal('paywall_feature_1'),
    getVal('paywall_feature_2'),
    getVal('paywall_feature_3'),
    getVal('paywall_feature_4'),
    getVal('paywall_feature_5'),
  ],
});

export const getPromoConfig = () => ({
  isActive: getBool('promo_active'),
  id: getVal('promo_id'),
  targetScreen: getVal('promo_target_screen'),
  imageUrl: getVal('promo_image_url'),
  title: getVal('promo_title'),
  body: getVal('promo_body'),
  ctaText: getVal('promo_cta_text'),
  ctaAction: getVal('promo_cta_action'),
  linkUrl: getVal('promo_link_url'),
});
