// services/firebaseConfig.ts
import { logger } from '../utils/logger';
import { Platform } from 'react-native';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth } from 'firebase/auth';
// @ts-ignore - getReactNativePersistence exists but TypeScript may not recognize it
import { getReactNativePersistence } from '@firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache } from 'firebase/firestore';
import { initializeAppCheck, CustomProvider } from 'firebase/app-check'; // JS SDK
import NativeFirebaseApp from '@react-native-firebase/app'; // Native SDK
import rnAppCheck from '@react-native-firebase/app-check'; // Native SDK
import AsyncStorage from '@react-native-async-storage/async-storage';

// Platform-specific Firebase config:
// Android needs the Android API key from google-services.json;
// iOS/web use the web API key from .env
const firebaseConfig = Platform.select({
  android: {
    apiKey: 'AIzaSyBx1NPMwIcedexasiHfQHPdCrmzlRv33f0',
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'baby-app-42b3b.firebaseapp.com',
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'baby-app-42b3b',
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'baby-app-42b3b.appspot.com',
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '16421819020',
    appId: '1:16421819020:android:20bcb67741688c2d99a1a9',
  },
  default: {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  },
})!;

// אתחול ה-App פעם אחת (Web SDK)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// React Native Firebase auto-initializes using GoogleService-Info.plist and google-services.json


// App Check Integration
// In dev/simulator, debug token exchange is broken and causes an infinite 429/403 loop.
// We still need to initialize App Check (otherwise Firestore hangs waiting for it),
// but in dev mode we use a dummy provider that returns immediately.
if (!__DEV__) {
  // Production: bridge native App Check tokens to JS SDK
  const appCheckCustomProvider = new CustomProvider({
    getToken: async () => {
      try {
        const { token } = await rnAppCheck().getToken(false);
        const expireTimeMillis = Date.now() + 60 * 60 * 1000;
        return { token, expireTimeMillis };
      } catch (e) {
        logger.warn('App Check Native Token Error:', e);
        const backoffMillis = Date.now() + 5 * 60 * 1000;
        return { token: '', expireTimeMillis: backoffMillis };
      }
    }
  });

  initializeAppCheck(app, {
    provider: appCheckCustomProvider,
    isTokenAutoRefreshEnabled: true,
  });
} else {
  // Development: dummy provider that returns immediately (no native SDK calls)
  logger.log('⚠️ App Check disabled in development mode');
  const devProvider = new CustomProvider({
    getToken: async () => {
      return { token: 'dev-dummy-token', expireTimeMillis: Date.now() + 60 * 60 * 1000 };
    }
  });

  initializeAppCheck(app, {
    provider: devProvider,
    isTokenAutoRefreshEnabled: false,
  });
}

// Auth with AsyncStorage persistence (persists login between app restarts)
let auth: ReturnType<typeof getAuth>;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (error) {
  // Auth already initialized, get existing instance
  auth = getAuth(app);
}

export { auth };

let firestoreDb: ReturnType<typeof getFirestore>;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache()
  });
} catch (error) {
  // If already initialized, fallback to getFirestore
  firestoreDb = getFirestore(app);
}

export const db = firestoreDb;

// Firebase Functions — Bypass Native Module requirement by utilizing the standard fetch API REST wrapper
// for Firebase Callable Functions (solves missing native module panics on OTA updates).
export const callFirebaseFunction = async (name: string, data?: object): Promise<unknown> => {
  try {
    const user = auth.currentUser;
    // CRITICAL: Bypassing getIdToken() for sendVerificationEmail to avoid a known React Native
    // Android bug where native persistence sync causes indefinite hangs after user creation.
    let token = '';
    if (user && name !== 'sendVerificationEmail') {
        token = await user.getIdToken();
    }

    // App Check token — protects Cloud Functions from unauthorized callers
    let appCheckToken = '';
    if (!__DEV__) {
      try {
        const rnAppCheck = require('@react-native-firebase/app-check').default;
        const { token: acToken } = await rnAppCheck().getToken(false);
        appCheckToken = acToken;
      } catch (_) {}
    }

    const url = `https://us-central1-baby-app-42b3b.cloudfunctions.net/${name}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(appCheckToken ? { 'X-Firebase-AppCheck': appCheckToken } : {}),
      },
      // Callable Protocol expects payload to be wrapped in "data"
      body: JSON.stringify({ data: data || {} })
    });
    
    // The response can sometimes be empty or HTML if it crashes hard, but valid Callable responses return JSON.
    let responseData: any;
    try {
      responseData = await response.json();
    } catch (_) {
      throw new Error(`Function ${name} returned non-JSON response (status ${response.status})`);
    }

    if (!response.ok || responseData?.error) {
      logger.error(`Error calling ${name}:`, responseData?.error?.message || responseData);
      throw new Error(responseData?.error?.message || `Function ${name} failed`);
    }

    // Callable functions always return data wrapped in {"data": ...}
    return responseData.data;
  } catch (err) {
    logger.error(`Firebase function fetch error (${name}):`, err);
    throw err;
  }
};