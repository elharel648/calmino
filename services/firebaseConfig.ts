// services/firebaseConfig.ts
import { logger } from '../utils/logger';
import { Platform } from 'react-native';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth } from 'firebase/auth';
// @ts-ignore - getReactNativePersistence exists but TypeScript may not recognize it
import { getReactNativePersistence } from '@firebase/auth';
import { getFirestore, initializeFirestore, memoryLocalCache } from 'firebase/firestore';
import { initializeAppCheck, CustomProvider } from 'firebase/app-check'; // JS SDK
import rnFunctions from '@react-native-firebase/functions';
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
    localCache: memoryLocalCache()
  });
} catch (error) {
  // If already initialized, fallback to getFirestore
  firestoreDb = getFirestore(app);
}

export const db = firestoreDb;

// Firebase Functions — use native React Native Firebase SDK
// (JS SDK's getFunctions crashes in Metro with 'Service functions is not available')
export const callFirebaseFunction = async (name: string, data?: object): Promise<unknown> => {
  const fn = rnFunctions().httpsCallable(name);
  const result = await fn(data);
  return result.data;
};