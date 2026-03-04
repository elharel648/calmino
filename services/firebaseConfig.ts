// services/firebaseConfig.ts

import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth } from 'firebase/auth';
// @ts-ignore - getReactNativePersistence exists but TypeScript may not recognize it
import { getReactNativePersistence } from '@firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { initializeAppCheck, CustomProvider } from 'firebase/app-check'; // JS SDK
import NativeFirebaseApp from '@react-native-firebase/app'; // Native SDK
import rnAppCheck from '@react-native-firebase/app-check'; // Native SDK
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  // measurementId לא חובה במובייל
};

// אתחול ה-App פעם אחת (Web SDK)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// React Native Firebase auto-initializes using GoogleService-Info.plist and google-services.json


// App Check Integration
// We bridge the Native React Native Firebase App Check into the Web Firebase SDK we use for Firestore
const appCheckCustomProvider = new CustomProvider({
  getToken: async () => {
    try {
      const { token } = await rnAppCheck().getToken(false);
      // The native SDK doesn't expose the expiration time, so we give the JS SDK a 1-hour validity window.
      // The JS SDK will auto-refresh the token natively 1 hour from now.
      const expireTimeMillis = Date.now() + 60 * 60 * 1000;
      return { token, expireTimeMillis };
    } catch (e) {
      console.warn('App Check Native Token Error:', e);
      return { token: '', expireTimeMillis: 0 };
    }
  }
});

// Initialize App Check for the Web SDK BEFORE initializing Firestore/Auth
const appCheck = initializeAppCheck(app, {
  provider: appCheckCustomProvider,
  isTokenAutoRefreshEnabled: true,
});

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
export const db = getFirestore(app);
export const storage = getStorage(app);