import 'react-native-gesture-handler';
import { I18nManager } from 'react-native';
import * as Updates from 'expo-updates';

// Global error handler — catches JS errors before they become non-std C++ exceptions
const originalHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error, isFatal) => {
  console.error('[GLOBAL ERROR]', isFatal ? 'FATAL' : 'non-fatal', error?.message, error?.stack);
  if (!__DEV__) {
    try {
      const crashlytics = require('@react-native-firebase/crashlytics').default;
      crashlytics().setAttribute('isFatal', String(isFatal)).catch(() => {});
      crashlytics().recordError(error).catch(() => {});
    } catch (_) {}
  }
  if (originalHandler) originalHandler(error, isFatal);
});

// EXTREMELY IMPORTANT:
// React Native 0.76+ auto-enables RTL if the device is in Hebrew.
// Since this app was built with manual `flexDirection: 'row-reverse'` styles,
// automatic RTL flips those styles back to LTR!
// We MUST force the app to stay in LTR so the manual styles work correctly.
if (I18nManager.isRTL || I18nManager.doLeftAndRightSwapInRTL) {
  I18nManager.allowRTL(false);
  I18nManager.forceRTL(false);
  I18nManager.swapLeftAndRightInRTL(false);

  if (__DEV__) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DevSettings } = require('react-native');
    try { DevSettings.reload(); } catch (e) { }
  } else {
    Updates.reloadAsync().catch(() => { });
  }
}

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform, AppState, NativeModules, Modal, useColorScheme } from 'react-native';
import PremiumLoader from './components/Common/PremiumLoader';
import * as SplashScreen from 'expo-splash-screen';
import AnimatedSplashScreen from './components/Premium/AnimatedSplashScreen';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Home, BarChart2, User, Settings, Lock, Baby } from 'lucide-react-native';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import * as LocalAuthentication from 'expo-local-authentication';
// Utility to race network promises against a strict timeout for poor cellular connection resilience
const fetchWithTimeout = <T,>(promise: Promise<T>, ms: number, defaultVal: T): Promise<T> => {
  return Promise.race([
    promise.catch((err) => {
      console.warn(`[fetchWithTimeout] Promise rejected (likely offline), returning default:`, err?.message || err);
      return defaultVal;
    }),
    new Promise<T>((resolve) => setTimeout(() => resolve(defaultVal), ms))
  ]);
};
import { BlurView } from 'expo-blur';
import { Canvas, LinearGradient, Rect, vec } from '@shopify/react-native-skia';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import LiquidGlassTabBar from './components/LiquidGlass/LiquidGlassTabBar';
import LiquidGlassBackground from './components/LiquidGlass/LiquidGlassBackground';
import { auth, db } from './services/firebaseConfig';
import { useLanguage } from './context/LanguageContext';

// ייבוא המסכים הקיימים
import HomeScreen from './pages/HomeScreen';
import ReportsScreen from './pages/ReportsScreen';
import ProfileScreen from './pages/ProfileScreen';
import SettingsScreen from './pages/SettingsScreen';
import FullSettingsScreen from './pages/FullSettingsScreen';
import BlockedUsersScreen from './pages/BlockedUsersScreen';
import LoginScreen from './pages/LoginScreen';
import BabyProfileScreen from './pages/BabyProfileScreen';
import NotificationsScreen from './pages/NotificationsScreen';
import OnboardingCarousel, { ONBOARDING_KEY } from './components/Onboarding/OnboardingCarousel';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { checkIfBabyExists } from './services/babyService';
import { SleepTimerProvider, useSleepTimer } from './context/SleepTimerContext';
import { FoodTimerProvider, useFoodTimer } from './context/FoodTimerContext';
import { saveEventToFirebase } from './services/firebaseService';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { ActiveChildProvider, useActiveChild } from './context/ActiveChildContext';
import { QuickActionsProvider } from './context/QuickActionsContext';
import { LanguageProvider } from './context/LanguageContext';
import { ScrollTrackingProvider } from './context/ScrollTrackingContext';
import { ToastProvider } from './context/ToastContext';
import { PremiumProvider } from './context/PremiumContext';
import { AudioProvider, useAudio } from './context/AudioContext';
import { GuestProvider } from './context/GuestContext';
// Removed in-app DynamicIsland - using native iOS Live Activity instead
import ErrorBoundary from './components/ErrorBoundary';
import GuestLoginPrompt from './components/GuestLoginPrompt';
import {
  AnimatedHomeIcon,
  AnimatedTimelineIcon,
  AnimatedAccountIcon
} from './components/AnimatedTabIcons';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { navigationRef, navigateFromNotification } from './services/navigationService';
import { registerForPushNotifications } from './services/pushNotificationService';
import * as Notifications from 'expo-notifications';
import { notificationStorageService } from './services/notificationStorageService';
import { notificationService } from './services/notificationService';
import { setupGlobalPresenceListener } from './services/presenceService';
import { logger } from './utils/logger';
import analytics from '@react-native-firebase/analytics';
import { setAnalyticsUser, clearAnalyticsUser } from './services/analyticsService';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';

// --- Android Foreground Service Registration (Disabled) ---
// if (Platform.OS === 'android' && NativeModules.NotifeeApiModule) {
//   import('@notifee/react-native').then(({ default: notifee }) => {
//     // ... logic removed
//   }).catch(() => { /* notifee not available */ });
// }



const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const AccountStack = createNativeStackNavigator();

// --- רכיבים עזר ---

// Removed LoaderScreen - using native splash instead

const BiometricLockScreen = ({ onUnlock }: { onUnlock: () => void }) => {
  const { theme, isDarkMode } = useTheme();
  // Ensure we have language context, or fallback safely if used outside (though we will fix the wrap)
  const { t } = useLanguage();
  return (
    <View style={[styles.loaderContainer, { backgroundColor: theme.background }]}>
      <View style={[styles.lockIconContainer, { backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.2)' : '#EEF2FF' }]}>
        <Lock size={50} color={theme.primary} />
      </View>
      <Text style={[styles.lockTitle, { color: theme.textPrimary }]}>{t('biometric.appLocked')}</Text>
      <Text style={[styles.lockSubtitle, { color: theme.textSecondary }]}>{t('biometric.biometricRequired')}</Text>

      <TouchableOpacity style={[styles.unlockButton, { backgroundColor: theme.primary }]} onPress={onUnlock}>
        <Text style={[styles.unlockButtonText, { color: theme.card }]}>{t('biometric.clickToAuthenticate')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const CustomTabIcon = ({ focused, icon: AnimatedIconComponent, label }: any) => {
  const { isDarkMode } = useTheme();
  
  // Active = brand terracotta filled, Inactive = solid black (crisp, high-contrast)
  const activeColor = '#C8806A'; 
  const inactiveColor = isDarkMode ? '#FFFFFF' : '#000000'; 
  const currentColor = focused ? activeColor : inactiveColor;
  const iconSize = 26;

  const scale = useSharedValue(focused ? 1.05 : 1);

  React.useEffect(() => {
    scale.value = withSpring(focused ? 1.05 : 1, { damping: 10, stiffness: 250, mass: 0.8 });
  }, [focused, scale]);

  const animatedTextStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  return (
    <View style={{
      alignItems: 'center',
      justifyContent: 'center',
      width: Platform.OS === 'android' ? 80 : 72,
      overflow: 'visible',
    }}>
      {/* 
        We pass the dynamic color directly to our custom SVGs.
        Each SVG handles its own completely unique interaction choreography! 
      */}
      <AnimatedIconComponent focused={focused} color={currentColor} size={iconSize} />

      <Reanimated.Text numberOfLines={1} adjustsFontSizeToFit={Platform.OS === 'android'} minimumFontScale={0.8} style={[{
        color: currentColor,
        fontSize: 11,
        marginTop: 6,
        fontWeight: focused ? '800' : '700',
        textAlign: 'center',
        letterSpacing: -0.2,
      }, animatedTextStyle]}>
        {label}
      </Reanimated.Text>
    </View>
  );
};

// --- Main App Navigator (uses theme and role-based permissions) ---
function MainAppNavigator() {
  const { theme, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const { canAccessProfile, canAccessReports } = useActiveChild();

  const homeTabName = t('navigation.home');
  const accountTabName = t('navigation.account');
  const reportsTabName = t('navigation.reports');

  const initialTab = homeTabName;

  return (
    <Tab.Navigator
      id="MainTabs"
      initialRouteName={initialTab}
      tabBar={(props) => <LiquidGlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
      }}
    >
      {/* Account - always visible */}
      < Tab.Screen name={accountTabName} component={AccountStackScreen} options={{
        tabBarIcon: ({ focused }) => <CustomTabIcon focused={focused} icon={AnimatedAccountIcon} label={t('navigation.account')} />
      }} />

      {/* Reports - only for users with children */}
      {
        canAccessReports && (
          <Tab.Screen name={reportsTabName} component={ReportsScreen} options={{
            tabBarIcon: ({ focused }) => <CustomTabIcon focused={focused} icon={AnimatedTimelineIcon} label={t('navigation.reports')} />
          }} />
        )
      }

      {/* Home - always visible */}
      <Tab.Screen name={homeTabName} component={HomeStackScreen} options={{
        tabBarIcon: ({ focused }) => <CustomTabIcon focused={focused} icon={AnimatedHomeIcon} label={t('navigation.home')} />
      }} />

    </Tab.Navigator>
  );
}

// --- הגדרת ה-Stacks ---

function HomeStackScreen() {
  return (
    <HomeStack.Navigator
      id="HomeStack"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F8F6F4' }
      }}
    >
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen name="CreateBaby" component={CreateBabyScreen} />
      <HomeStack.Screen name="Notifications" component={NotificationsScreen} />
    </HomeStack.Navigator>
  );
}

// Account Stack Navigator
function AccountStackScreen() {
  return (
    <AccountStack.Navigator
      id="AccountStack"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FFFFFF' }
      }}
    >
      <AccountStack.Screen name="Account" component={SettingsScreen} />
      <AccountStack.Screen name="FullSettings" component={FullSettingsScreen} />
      <AccountStack.Screen name="BlockedUsers" component={BlockedUsersScreen} />
    </AccountStack.Navigator>
  );
}

function CreateBabyScreen({ navigation }: any) {
  const { refreshChildren } = useActiveChild();

  const handleProfileSaved = async () => {
    await refreshChildren(); // Refresh to show all tabs
    navigation.goBack();
  };

  return (
    <Modal visible={true} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => navigation.goBack()}>
      <BabyProfileScreen
        onProfileSaved={handleProfileSaved}
        onClose={() => navigation.goBack()}
      />
    </Modal>
  );
}

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();

// Component to handle URL Scheme deep links from Live Activity
function LiveActivityURLHandler() {
  const foodTimer = useFoodTimer();
  const sleepTimer = useSleepTimer();
  const { activeChild } = useActiveChild();
  const audio = useAudio();

  useEffect(() => {
    const handleURL = async (event: { url: string }) => {
      try {
        const url = new URL(event.url);
        const path = url.pathname || url.hostname;

        if (path === 'pause-timer' || url.href.includes('pause-timer')) {
          // Small delay so React context is hydrated after app wakes from background
          await new Promise(r => setTimeout(r, 250));
          try {
            if (foodTimer.pumpingIsRunning && !foodTimer.pumpingIsPaused) {
              await foodTimer.pausePumping();
            } else if (foodTimer.breastIsRunning && !foodTimer.breastIsPaused) {
              await foodTimer.pauseBreast();
            } else if (sleepTimer.isRunning && !sleepTimer.isPaused) {
              await sleepTimer.pause();
            }
          } catch (error) {
            logger.error('Error pausing timer from Live Activity:', error);
          }
        } else if (path === 'resume-timer' || url.href.includes('resume-timer')) {
          // Small delay so React context is hydrated after app wakes from background
          await new Promise(r => setTimeout(r, 250));
          try {
            if (foodTimer.pumpingIsRunning && foodTimer.pumpingIsPaused) {
              await foodTimer.resumePumping();
            } else if (foodTimer.breastIsRunning && foodTimer.breastIsPaused) {
              await foodTimer.resumeBreast();
            } else if (sleepTimer.isRunning && sleepTimer.isPaused) {
              await sleepTimer.resume();
            }
          } catch (error) {
            logger.error('Error resuming timer from Live Activity:', error);
          }
        } else if (path === 'save-timer' || path === 'stop-timer' || url.href.includes('save-timer') || url.href.includes('stop-timer')) {
          // Save timer data — use actual RN timer state for accuracy
          // Small delay so React context is hydrated after app wakes from background
          await new Promise(r => setTimeout(r, 400));
          const type = url.searchParams.get('type') || '';
          const side = url.searchParams.get('side') || '';

          if (!auth.currentUser || !activeChild?.childId) {
            logger.warn('⚠️ Cannot save timer: no user or active child');
            return;
          }

          try {
            const urlElapsed = parseInt(url.searchParams.get('elapsedSeconds') || '0', 10);
            let elapsedSeconds = urlElapsed;
            if (elapsedSeconds <= 0) {
              if (type.includes('הנקה') || type.includes('breast') || type.includes('breastfeeding')) {
                elapsedSeconds = foodTimer.breastElapsedSeconds;
              } else if (type.includes('שאיבה') || type.includes('pump')) {
                elapsedSeconds = foodTimer.pumpingElapsedSeconds;
              } else if (type.includes('בקבוק') || type.includes('bottle')) {
                elapsedSeconds = foodTimer.bottleElapsedSeconds;
              } else if (type.includes('שינה') || type.includes('sleep')) {
                elapsedSeconds = sleepTimer.elapsedSeconds;
              }
            }

            // --- LIVE ACTIVITY MAX DURATION CAP (12 HOURS) ---
            const MAX_DURATION_SECS = 43200; // 12 hours
            if (elapsedSeconds > MAX_DURATION_SECS) {
              logger.warn(`⚠️ Timer exceeded 12-hour limit (${elapsedSeconds}s). Capping to 12 hours to prevent histogram corruption.`);
              elapsedSeconds = MAX_DURATION_SECS;
            }

            const mins = Math.floor(elapsedSeconds / 60);
            const secs = elapsedSeconds % 60;
            const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

            let data: any = {
              type: type.includes('הנקה') || type.includes('breast') ? 'food' : type.includes('שינה') || type.includes('sleep') ? 'sleep' : 'food',
              timestamp: new Date()
            };

            if (data.type === 'food') {
              if (type.includes('הנקה') || type.includes('breast')) {
                data.subType = 'breast';
                data.note = side ? `${side}: ${timeStr}` : `זמן: ${timeStr}`;
              } else if (type.includes('שאיבה') || type.includes('pump')) {
                data.subType = 'pumping';
                data.note = `זמן: ${timeStr}`;
              } else if (type.includes('בקבוק') || type.includes('bottle')) {
                data.subType = 'bottle';
                data.note = `זמן: ${timeStr}`;
              }
            } else if (data.type === 'sleep') {
              data.duration = elapsedSeconds;
            }

            await saveEventToFirebase(auth.currentUser.uid, activeChild.childId, data);

            // Stop the in-app timer
            if (type.includes('הנקה') || type.includes('breast')) {
              if (foodTimer.breastIsRunning) foodTimer.stopBreast();
            } else if (type.includes('שאיבה') || type.includes('pump')) {
              if (foodTimer.pumpingIsRunning) foodTimer.stopPumping();
            } else if (type.includes('בקבוק') || type.includes('bottle')) {
              if (foodTimer.bottleIsRunning) foodTimer.stopBottle();
            } else if (type.includes('שינה') || type.includes('sleep')) {
              if (sleepTimer.isRunning) sleepTimer.stop();
            }

            // Stop Live Activity
            if (Platform.OS === 'ios') {
              try {
                const { liveActivityService } = await import('./services/liveActivityService');
                if (type.includes('הנקה') || type.includes('breast')) {
                  await liveActivityService.stopBreastfeedingTimer();
                } else if (type.includes('שאיבה') || type.includes('pump')) {
                  await liveActivityService.stopPumpingTimer();
                } else if (type.includes('בקבוק') || type.includes('bottle')) {
                  await liveActivityService.stopBottleTimer();
                } else if (type.includes('שינה') || type.includes('sleep')) {
                  await liveActivityService.stopSleepTimer();
                }
              } catch (laError) {
                logger.error('Error stopping Live Activity:', laError);
              }
            }
          } catch (error) {
            logger.error('Error saving timer from Live Activity:', error);
          }
        } else if (path === 'discard-timer' || url.href.includes('discard-timer')) {
          // Discard timer — stop WITHOUT saving (user pressed X)
          await new Promise(r => setTimeout(r, 300));
          const type = url.searchParams.get('type') || '';
          try {
            // Stop in-app timer
            if (type.includes('הנקה') || type.includes('breast')) {
              if (foodTimer.breastIsRunning) foodTimer.stopBreast();
            } else if (type.includes('שאיבה') || type.includes('pump')) {
              if (foodTimer.pumpingIsRunning) foodTimer.stopPumping();
            } else if (type.includes('בקבוק') || type.includes('bottle')) {
              if (foodTimer.bottleIsRunning) foodTimer.stopBottle();
            } else if (type.includes('שינה') || type.includes('sleep')) {
              if (sleepTimer.isRunning) sleepTimer.stop();
            }
            // End Live Activity
            if (Platform.OS === 'ios') {
              const { liveActivityService } = await import('./services/liveActivityService');
              if (type.includes('הנקה') || type.includes('breast')) {
                await liveActivityService.stopBreastfeedingTimer();
              } else if (type.includes('שאיבה') || type.includes('pump')) {
                await liveActivityService.stopPumpingTimer();
              } else if (type.includes('בקבוק') || type.includes('bottle')) {
                await liveActivityService.stopBottleTimer();
              } else if (type.includes('שינה') || type.includes('sleep')) {
                await liveActivityService.stopSleepTimer();
              }
            }
            logger.info(`⏹ Timer discarded (no save): ${type}`);
          } catch (error) {
            logger.error('Error discarding timer from Live Activity:', error);
          }
        } else if (path === 'stop-whitenoise' || url.href.includes('stop-whitenoise')) {
          try {
            await audio.stopSound();
            if (Platform.OS === 'ios') {
              const { liveActivityService } = await import('./services/liveActivityService');
              await liveActivityService.stopWhiteNoise();
            }
          } catch (error) {
            logger.error('Error stopping white noise from Live Activity:', error);
          }
        } else if (path === 'pause-breastfeeding' || url.href.includes('pause-breastfeeding')) {
          try {
            if (foodTimer.breastIsRunning && !foodTimer.breastIsPaused) {
              await foodTimer.pauseBreast();
            }
          } catch (error) {
            logger.error('Error pausing breastfeeding from Live Activity:', error);
          }
        } else if (path === 'resume-breastfeeding' || url.href.includes('resume-breastfeeding')) {
          try {
            if (foodTimer.breastIsRunning && foodTimer.breastIsPaused) {
              await foodTimer.resumeBreast();
            }
          } catch (error) {
            logger.error('Error resuming breastfeeding from Live Activity:', error);
          }
        } else if (path === 'switch-side' || url.href.includes('switch-side')) {
          try {
            const newSide = url.searchParams.get('side') as 'left' | 'right';
            if (newSide && foodTimer.breastIsRunning) {
              // Start the new side (this handles switching internally)
              foodTimer.startBreast(newSide);
            }
          } catch (error) {
            logger.error('Error switching breastfeeding side from Live Activity:', error);
          }
        }
      } catch (error) {
        logger.error('Error handling URL:', error);
      }
    };

    const subscription = Linking.addEventListener('url', handleURL);

    // Handle initial URL if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleURL({ url });
      }
    });

    // Sync timer state when app comes to foreground (from background App Intents)
    const syncFromIntent = async () => {
      if (Platform.OS !== 'ios') return;
      try {
        const { liveActivityService } = await import('./services/liveActivityService');
        const pending = await liveActivityService.getPendingTimerAction();
        
        if (pending && pending.action) {
          logger.log('📱 Syncing pending App Intent:', pending.action, pending.timerType);
          
          if (pending.action === 'stop') {
            // STOP: Save the timer data to Firebase using elapsed seconds from Swift
            const timerType = pending.timerType || '';
            const elapsed = pending.elapsedSeconds || 0;
            
            // Build the save URL with full data
            const fauxUrl = `calmino://save-timer?type=${encodeURIComponent(timerType)}&elapsedSeconds=${elapsed}`;
            await handleURL({ url: fauxUrl });
            
          } else if (pending.action === 'pause') {
            // PAUSE: Sync in-app timer pause state  
            const fauxUrl = 'calmino://pause-timer';
            await handleURL({ url: fauxUrl });
            
          } else if (pending.action === 'resume') {
            const fauxUrl = 'calmino://resume-timer';
            await handleURL({ url: fauxUrl });
            
          } else if (pending.action === 'switchSide') {
            const fauxUrl = 'calmino://switch-side';
            await handleURL({ url: fauxUrl });
          }
          
          await liveActivityService.clearPendingTimerAction();
        }
      } catch (err) {
        logger.warn('Failed to sync pending App Intent:', err);
      }
    };

    // Cold launch retry: AppState starts as 'active' so 'change' never fires on first open.
    // We retry until activeChild is ready (it loads async from Firebase).
    // Max 10 retries × 800ms = 8 seconds window.
    // 'cancelled' flag prevents stale loops from running after effect cleanup.
    let cancelled = false;
    let coldLaunchAttempts = 0;
    const maxColdLaunchAttempts = 10;
    let coldLaunchTimer: ReturnType<typeof setTimeout> | null = null;

    const tryColdLaunchSync = async () => {
      if (cancelled || coldLaunchAttempts >= maxColdLaunchAttempts) return;
      coldLaunchAttempts++;

      // If activeChild isn't ready yet, retry after a short delay
      if (!activeChild?.childId || !auth.currentUser) {
        logger.log(`⏳ Cold launch sync waiting for activeChild (attempt ${coldLaunchAttempts})...`);
        coldLaunchTimer = setTimeout(tryColdLaunchSync, 800);
        return;
      }

      // activeChild is ready — run the sync
      if (!cancelled) await syncFromIntent();
    };

    // Start the cold launch sync after a brief initial delay
    coldLaunchTimer = setTimeout(tryColdLaunchSync, 500);

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncFromIntent();
    });

    return () => {
      cancelled = true;
      if (coldLaunchTimer) clearTimeout(coldLaunchTimer);
      subscription.remove();
      appStateSubscription.remove();
    };
  }, [foodTimer, sleepTimer, activeChild]);

  return null;
}

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [hasBabyProfile, setHasBabyProfile] = useState<boolean | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [childrenReady, setChildrenReady] = useState(false);
  const handleChildrenReady = useCallback(() => setChildrenReady(true), []);
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);
  const biometricsEnabledRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);
  const colorScheme = useColorScheme();
  const themeBgColor = colorScheme === 'dark' ? '#0F0F0F' : '#F8F6F4';

  // Request ATT (App Tracking Transparency) permission for Meta Ads attribution
  useEffect(() => {
    if (Platform.OS !== 'ios' || showAnimatedSplash || !user) return;
    const timer = setTimeout(async () => {
      try {
        await requestTrackingPermissionsAsync();
      } catch (e) {
        logger.warn('ATT request failed:', e);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [showAnimatedSplash, user]);

  // Clean up any stuck Live Activities / Android notifications from previous session on cold launch
  useEffect(() => {
    if (Platform.OS === 'ios') {
      import('./services/liveActivityService').then(({ liveActivityService }) => {
        liveActivityService.stopAllLiveActivities().catch(() => {});
      });
    } else if (Platform.OS === 'android') {
      import('./services/androidTimerNotificationService').then(({ androidTimerNotificationService }) => {
        androidTimerNotificationService.stopAll().catch(() => {});
      });
    }
  }, []);

  // Handle Android notification action button presses when app is in foreground
  useEffect(() => {
    if (Platform.OS !== 'android' || !NativeModules.NotifeeApiModule) return;
    let unsubscribe: (() => void) | undefined;
    import('@notifee/react-native').then(({ default: notifee, EventType: ET }) => {
      unsubscribe = notifee.onForegroundEvent(async ({ type, detail }) => {
        if (type === ET.ACTION_PRESS) {
          const actionId = detail.pressAction?.id;
          const { androidTimerNotificationService } = await import('./services/androidTimerNotificationService');
          if (actionId === 'stop') {
            await androidTimerNotificationService.stopTimer();
          } else if (actionId === 'pause') {
            await androidTimerNotificationService.pauseTimer();
          } else if (actionId === 'resume') {
            await androidTimerNotificationService.resumeTimer();
          }
        }
      });
    }).catch(() => {});
    return () => { unsubscribe?.(); };
  }, []);

  // Configure notification handler on app start
  useEffect(() => {
    // Set notification handler for when app is in foreground/background
    // This handler is called for ALL notifications (local + push)
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        // Always show notification
        const shouldShow = {
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        };

        // Try to save to Firebase (but don't block notification if it fails)
        const userId = auth.currentUser?.uid;
        if (userId) {
          // Fire-and-forget save to Firebase without risking background suspension via setTimeout
          (async () => {
            try {
              const notificationData = notification.request.content.data as any;
              const notificationType = notificationData?.type || 'reminder';
              const typeMap: Record<string, 'feed' | 'sleep' | 'medication' | 'reminder' | 'achievement'> = {
                'feeding_reminder': 'feed',
                'sleep_reminder': 'sleep',
                'supplement_reminder': 'medication',
                'vaccine_reminder': 'medication',
                'daily_summary': 'reminder',
                'custom_reminder': 'reminder',
                'family_join': 'reminder',
                'family_removed': 'reminder',
              };

              // Save notification to Firebase
              await notificationStorageService.saveNotification({
                userId,
                type: typeMap[notificationType] || 'reminder',
                title: notification.request.content.title || 'התראה',
                message: notification.request.content.body || '',
                timestamp: new Date(),
                isRead: false,
                isUrgent: notificationType === 'vaccine_reminder',
              });
            } catch (error) {
              logger.error('Failed to save notification:', error);
              // Don't throw - notification should still show
            }
          })();
        }

        return shouldShow;
      },
    });

    // Handle notification taps (when user taps on notification from background/closed)
    // This listener is set here in App.tsx to ensure it works globally
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const type = (response.notification.request.content.data as any)?.type as string;
      const data = response.notification.request.content.data;

      // Save to Firebase so it appears in NotificationsScreen (covers background/closed case)
      const userId = auth.currentUser?.uid;
      if (userId) {
        const typeMap: Record<string, 'feed' | 'sleep' | 'medication' | 'reminder' | 'achievement'> = {
          'feeding_reminder': 'feed',
          'sleep_reminder': 'sleep',
          'supplement_reminder': 'medication',
          'vaccine_reminder': 'medication',
          'daily_summary': 'reminder',
          'custom_reminder': 'reminder',
          'family_join': 'reminder',
          'family_removed': 'reminder',
        };
        notificationStorageService.saveNotification({
          userId,
          type: typeMap[type] || 'reminder',
          title: response.notification.request.content.title || 'התראה',
          message: response.notification.request.content.body || '',
          timestamp: new Date(),
          isRead: false,
          isUrgent: type === 'vaccine_reminder',
        }).catch((e) => logger.warn('Failed to save tapped notification:', e));
      }

      // Navigate based on notification type
      if (type) {
        // Poll until navigation is ready instead of a fixed delay
        const tryNavigate = (attempts = 0) => {
          if (navigationRef.isReady()) {
            navigateFromNotification(type, data);
          } else if (attempts < 20) {
            setTimeout(() => tryNavigate(attempts + 1), 100);
          }
        };
        tryNavigate();
      }
    });

    // Sync missed background notifications on app resume
    // When notifications arrive while app is in background, the foreground handler
    // doesn't fire. This catches them by reading the OS notification tray.
    const syncBackgroundNotifications = async () => {
      try {
        const userId = auth.currentUser?.uid;
        if (!userId) return;

        const presented = await Notifications.getPresentedNotificationsAsync();
        if (presented.length === 0) return;

        const typeMap: Record<string, 'feed' | 'sleep' | 'medication' | 'reminder' | 'achievement'> = {
          'feeding_reminder': 'feed',
          'sleep_reminder': 'sleep',
          'supplement_reminder': 'medication',
          'vaccine_reminder': 'medication',
          'daily_summary': 'reminder',
          'custom_reminder': 'reminder',
          'family_join': 'reminder',
          'family_removed': 'reminder',
        };

        for (const notification of presented) {
          const content = notification.request.content;
          const notificationData = content.data as any;
          const notificationType = notificationData?.type || 'reminder';

          // Save each missed notification (duplicate check in service prevents re-saves)
          await notificationStorageService.saveNotification({
            userId,
            type: typeMap[notificationType] || 'reminder',
            title: content.title || 'התראה',
            message: content.body || '',
            timestamp: notification.date ? new Date(notification.date * 1000) : new Date(),
            isRead: false,
            isUrgent: notificationType === 'vaccine_reminder',
          });
        }

        logger.log(`🔔 Synced ${presented.length} background notification(s)`);
      } catch (error) {
        logger.log('Failed to sync background notifications:', error);
      }
    };

    // Run sync immediately and also on app returning from background
    syncBackgroundNotifications();

    return () => {
      responseSubscription.remove();
    };
  }, []);

  // Determine if we are ready to hide splash
  const shouldHideSplash = !isAppLoading && (
    !user || // Login screen ready
    (user && !hasBabyProfile) || // Baby profile creation ready
    (user && hasBabyProfile && childrenReady) // Main app ready
  );

  // Hide splash when app is FULLY ready (auth + children loaded)
  const onLayoutRootView = useCallback(async () => {
    // Native splash hiding is now explicitly handled by the handoff effect below
  }, [shouldHideSplash]);

  // Crucial fix: onLayout only fires once on mount. If offline queries timeout AFTER mount, 
  // onLayout is never re-triggered. This ensures the splash lifts the exact ms state is ready.
  useEffect(() => {
    // We only hide the system splash when our custom animated splash is already mounted
    if (shouldHideSplash && showAnimatedSplash) {
      setTimeout(() => {
        SplashScreen.hideAsync().catch(() => {});
      }, 50);
    }
  }, [shouldHideSplash, showAnimatedSplash]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // Reload user to ensure we have the latest emailVerified status
      if (currentUser) {
        try {
          // Bound user reload to 2000ms to heavily prioritize getting offline users past the splash screen
          await fetchWithTimeout(currentUser.reload(), 2000, undefined);
        } catch (e) {
          // If reload fails (e.g. network timeout), we continue with cached value
          logger.log('User reload failed/timed out:', e);
        }
      }

      // OAuth providers (Apple, Google) verify identity at provider level
      // Only require emailVerified for email/password accounts
      if (currentUser) {
        const isOAuthUser = currentUser.providerData.some(
          p => p.providerId === 'apple.com' || p.providerId === 'google.com'
        );
        if (currentUser.emailVerified || isOAuthUser) {
          setHasBabyProfile(null); // Ensure no flicker of BabyProfileScreen while fetching
          setUser(currentUser);
          setAnalyticsUser(currentUser.uid, currentUser.displayName || undefined);
          await checkBiometricSettingsAndProfile(currentUser.uid);

          // Register for push notifications
          registerForPushNotifications().catch((err) => {
            logger.log('Push registration:', err);
          });

          // Initialize notification service and schedule recurring reminders (once per login)
          notificationService.initialize().then((success) => {
            if (success) {
              notificationService.scheduleSupplementReminder();
              notificationService.scheduleSleepReminder();
              notificationService.scheduleDailySummary();
            }
          }).catch((err) => {
            logger.log('Notification init:', err);
          });
        } else {
          // Email/password user who hasn't verified email yet
          setChildrenReady(false);
          setUser(null);
          setHasBabyProfile(null);
          setIsLocked(false);
          setIsAppLoading(false);
        }
      } else {
        clearAnalyticsUser();
        setChildrenReady(false);
        setUser(null);
        setHasBabyProfile(null);
        setIsLocked(false);
        setIsAppLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  // Set up global presence tracking when user is logged in
  useEffect(() => {
    if (user && user.emailVerified) {
      const cleanupPresence = setupGlobalPresenceListener();
      return () => {
        cleanupPresence();
      };
    }
  }, [user]);

  // Re-lock app with biometrics every time it comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextState === 'active' &&
        biometricsEnabledRef.current &&
        user
      ) {
        setIsLocked(true);
        setTimeout(() => authenticateUser(), 150);
      }
      appStateRef.current = nextState;
    });
    return () => subscription.remove();
  }, [user]);

  const checkBiometricSettingsAndProfile = async (uid: string) => {
    try {
      const userRef = doc(db, 'users', uid);

      // 2000ms timeout for loading user profile, defaults to null
      const userSnap = await fetchWithTimeout(getDoc(userRef), 2000, null);

      let needsUnlock = false;

      if (userSnap && userSnap.exists()) {
        const data = userSnap.data();
        const settings = data.settings;
        if (settings && settings.biometricsEnabled) {
          needsUnlock = true;
          setIsLocked(true);
          biometricsEnabledRef.current = true;
        } else {
          biometricsEnabledRef.current = false;
        }
      }

      // 2000ms timeout for checking baby exists, defaults to true (assuming returning users mostly have babies)
      const babyExists = await fetchWithTimeout(checkIfBabyExists(), 2000, true);
      setHasBabyProfile(babyExists);
      setIsAppLoading(false);
      if (needsUnlock) setTimeout(() => authenticateUser(), 100);

    } catch (error) {
      logger.log('Error during startup checks:', error);
      setIsAppLoading(false);
    }
  };

  const authenticateUser = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) { setIsLocked(false); return; }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'ברוך שובך ל-Calmino',
        fallbackLabel: 'השתמש בסיסמה',
        disableDeviceFallback: false,
      });

      if (result.success) setIsLocked(false);
    } catch (e) { logger.log('Authentication error:', e); }
  };

  // Keep splash visible while loading - return null to not render anything
  if (isAppLoading) {
    // Splash screen is still visible
    return null;
  }

  // Don't hide splash yet - we'll hide it when children are loaded via onReady callback

  if (isLocked) {
    return (
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <LanguageProvider>
          <ThemeProvider>
            <BiometricLockScreen onUnlock={authenticateUser} />
          </ThemeProvider>
        </LanguageProvider>
      </View>
    );
  }

  if (!user && !isGuestMode) {
    return (
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <LanguageProvider>
          <ThemeProvider>
            <SafeAreaProvider>
              <ToastProvider>
                <LoginScreen
                  onLoginSuccess={() => {
                    // Removed setIsAppLoading(true) because onAuthStateChanged handles state reactively
                    // and setting it here caused a race condition resulting in an endless white screen.
                    logger.debug('✅', 'LoginScreen reported success');
                  }}
                  onGuestMode={() => {
                    setIsGuestMode(true);
                    SplashScreen.hideAsync();
                  }}
                />
              </ToastProvider>
            </SafeAreaProvider>
          </ThemeProvider>
        </LanguageProvider>
      </View>
    );
  }

  // Show premium loading state while checking baby profile to prevent white screen flash
  if (!isGuestMode && hasBabyProfile === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: themeBgColor }}>
        <LiquidGlassBackground />
        <PremiumLoader size={48} />
      </View>
    ); // Keep splash visible natively, but show Liquid Glass if splash was already hidden (e.g. after login)
  }

  // Only force BabyProfileScreen for parents (non-guests).
  if (user && hasBabyProfile === false) {
    return (
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <LanguageProvider>
          <ThemeProvider>
            <SafeAreaProvider>
              <BabyProfileScreen
                onProfileSaved={async () => {
                  // __DEV__: always show onboarding for easy testing — REMOVE before release
                  if (__DEV__) {
                    await AsyncStorage.removeItem(ONBOARDING_KEY);
                  }
                  const done = await AsyncStorage.getItem(ONBOARDING_KEY);
                  if (!done) {
                    // Show onboarding first — stay in this branch until it completes
                    setShowOnboarding(true);
                  } else {
                    // Already seen onboarding — go straight to main app
                    setHasBabyProfile(true);
                  }
                }}
                onSkip={() => setHasBabyProfile(true)}
              />
              <OnboardingCarousel
                visible={showOnboarding}
                onDone={() => {
                  setShowOnboarding(false);
                  setHasBabyProfile(true);
                }}
              />
            </SafeAreaProvider>
          </ThemeProvider>
        </LanguageProvider>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <ErrorBoundary>
        <ScrollTrackingProvider>
          <LanguageProvider>
            <ThemeProvider>
              <ToastProvider>
                <GuestProvider initialIsGuest={isGuestMode} onExitGuest={() => setIsGuestMode(false)}>
                <ActiveChildProvider onReady={handleChildrenReady}>
                  <QuickActionsProvider>
                    <SleepTimerProvider>
                      <FoodTimerProvider>
                        <AudioProvider>
                          <PremiumProvider>
                            <LiveActivityURLHandler />
                            <SafeAreaProvider>
                              {(!user || isGuestMode || childrenReady) ? (
                                <NavigationContainer
                                  ref={navigationRef}
                                  onStateChange={async () => {
                                    const route = navigationRef.current?.getCurrentRoute();
                                    if (route?.name) {
                                      analytics().logScreenView({
                                        screen_name: route.name,
                                        screen_class: route.name,
                                      }).catch(() => {});
                                    }
                                  }}
                                  linking={{
                                    prefixes: ['calmino://', 'calminoapp://', 'https://calmino.app'],
                                    config: {
                                      screens: {
                                        Home: {
                                          screens: {
                                            Home: 'home',
                                            CreateBaby: 'create-baby',
                                            Notifications: 'notifications',
                                          },
                                        },
                                        Account: {
                                          screens: {
                                            Account: 'account',
                                            FullSettings: 'settings',
                                          },
                                        },
                                      },
                                    },
                                  }}
                                >
                                  <MainAppNavigator />
                                </NavigationContainer>
                              ) : (
                                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: themeBgColor }}>
                                  <LiquidGlassBackground />
                                  <PremiumLoader size={48} />
                                </View>
                              )}
                            </SafeAreaProvider>
                          </PremiumProvider>
                        </AudioProvider>
                      </FoodTimerProvider>
                    </SleepTimerProvider>
                  </QuickActionsProvider>
                </ActiveChildProvider>
                <GuestLoginPrompt onLoginPress={() => setIsGuestMode(false)} />
                {showAnimatedSplash && (
                  <AnimatedSplashScreen 
                    isReadyToStart={shouldHideSplash}
                    onAnimationComplete={() => setShowAnimatedSplash(false)}
                  />
                )}
                </GuestProvider>
              </ToastProvider>
            </ThemeProvider>
          </LanguageProvider>
        </ScrollTrackingProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderText: { marginTop: 10, fontSize: 16, fontWeight: '600' },
  lockIconContainer: { marginBottom: 20, padding: 20, borderRadius: 50 },
  lockTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  lockSubtitle: { fontSize: 16, marginBottom: 30 },
  unlockButton: { paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25 },
  unlockButtonText: { fontSize: 16, fontWeight: 'bold' }
});