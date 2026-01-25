import 'react-native-gesture-handler';
import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, TouchableOpacity, Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Home, BarChart2, User, Settings, Lock, Baby, UserCheck } from 'lucide-react-native';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import * as LocalAuthentication from 'expo-local-authentication';
import { BlurView } from 'expo-blur';
import { Canvas, LinearGradient, Rect, vec } from '@shopify/react-native-skia';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import LiquidGlassTabBar from './components/LiquidGlassTabBar';
import { auth, db } from './services/firebaseConfig';
import { useLanguage } from './context/LanguageContext';

// ייבוא המסכים הקיימים
import HomeScreen from './pages/HomeScreen';
import ReportsScreen from './pages/ReportsScreen';
import ProfileScreen from './pages/ProfileScreen';
import SettingsScreen from './pages/SettingsScreen';
import FullSettingsScreen from './pages/FullSettingsScreen';
import LoginScreen from './pages/LoginScreen';
import BabyProfileScreen from './pages/BabyProfileScreen';
import NotificationsScreen from './pages/NotificationsScreen';

// מסכי הבייביסיטר
import BabySitterScreen from './pages/BabySitterScreen';
import SitterProfileScreen from './pages/SitterProfileScreen';
import SitterRegistrationScreen from './pages/SitterRegistrationScreen';
import SitterDashboardScreen from './pages/SitterDashboardScreen';
import MyReviewsScreen from './pages/MyReviewsScreen';
import ChatScreen from './pages/ChatScreen';
import ParentBookingsScreen from './pages/ParentBookingsScreen';

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
// Removed in-app DynamicIsland - using native iOS Live Activity instead
import ErrorBoundary from './components/ErrorBoundary';
import { navigationRef, navigateFromNotification } from './services/navigationService';
import { registerForPushNotifications } from './services/pushNotificationService';
import * as Notifications from 'expo-notifications';
import { notificationStorageService } from './services/notificationStorageService';



const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const AccountStack = createNativeStackNavigator();
// ✅ יצירת Stack לבייביסיטר
const BabysitterStack = createNativeStackNavigator();

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

const CustomTabIcon = ({ focused, color, icon: Icon, label }: any) => {
  return (
    <View style={{
      alignItems: 'center',
      justifyContent: 'center',
      top: Platform.OS === 'ios' ? 14 : 0,
      width: 60
    }}>
      <Icon color={color} size={24} strokeWidth={focused ? 2.5 : 2} />
      <Text numberOfLines={1} style={{
        color: color, fontSize: 10, marginTop: 6,
        fontWeight: focused ? '600' : '400', textAlign: 'center', width: '100%'
      }}>
        {label}
      </Text>
    </View>
  );
};

// --- Main App Navigator (uses theme and role-based permissions) ---
function MainAppNavigator() {
  const { theme, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const { canAccessProfile, canAccessReports, canAccessBabysitter } = useActiveChild();

  const homeTabName = t('navigation.home');
  const accountTabName = t('navigation.account');
  const reportsTabName = t('navigation.reports');
  const babysitterTabName = t('navigation.babysitter');

  return (
    <Tab.Navigator
      id="MainTabs"
      initialRouteName={homeTabName}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarBackground: () => <LiquidGlassTabBar isDarkMode={isDarkMode} />,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: Platform.OS === 'ios' ? 90 : 72,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          overflow: 'hidden', // Critical for liquid glass effect
        },
        tabBarItemStyle: {
          backgroundColor: 'transparent',
        },
      }}
    >
      {/* Account - always visible (renamed from Settings) */}
      <Tab.Screen name={accountTabName} component={AccountStackScreen} options={{
        tabBarIcon: ({ color, focused }) => <CustomTabIcon focused={focused} color={color} icon={User} label={t('navigation.account')} />
      }} />



      {/* Reports - only for parents */}
      {canAccessReports && (
        <Tab.Screen name={reportsTabName} component={ReportsScreen} options={{
          tabBarIcon: ({ color, focused }) => <CustomTabIcon focused={focused} color={color} icon={BarChart2} label={t('navigation.reports')} />
        }} />
      )}

      {/* Babysitter - only for parents */}
      {canAccessBabysitter && (
        <Tab.Screen name={babysitterTabName} component={BabysitterStackScreen} options={{
          tabBarIcon: ({ color, focused }) => <CustomTabIcon focused={focused} color={color} icon={UserCheck} label={t('navigation.babysitter')} />
        }} />
      )}

      {/* Home - always visible */}
      <Tab.Screen name={homeTabName} component={HomeStackScreen} options={{
        tabBarIcon: ({ color, focused }) => <CustomTabIcon focused={focused} color={color} icon={Home} label={t('navigation.home')} />
      }} />

    </Tab.Navigator>
  );
}

// --- הגדרת ה-Stacks ---

function HomeStackScreen() {
  return (
    <HomeStack.Navigator id="HomeStack" screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen name="CreateBaby" component={CreateBabyScreen} />
      <HomeStack.Screen name="Notifications" component={NotificationsScreen} />
    </HomeStack.Navigator>
  );
}

// Account Stack Navigator
function AccountStackScreen() {
  return (
    <AccountStack.Navigator id="AccountStack" screenOptions={{ headerShown: false }}>
      <AccountStack.Screen name="Account" component={SettingsScreen} />
      <AccountStack.Screen name="FullSettings" component={FullSettingsScreen} />
    </AccountStack.Navigator>
  );
}

// Wrapper screen for creating baby from home
function CreateBabyScreen({ navigation }: any) {
  const { refreshChildren } = useActiveChild();

  const handleProfileSaved = async () => {
    await refreshChildren(); // Refresh to show all tabs
    navigation.navigate('Home');
  };

  return (
    <BabyProfileScreen
      onProfileSaved={handleProfileSaved}
      onClose={() => navigation.goBack()}
    />
  );
}

// ✅ Stack לבייביסיטר - מחבר את הרשימה, הפרופיל והצ'אט
function BabysitterStackScreen() {
  return (
    <BabysitterStack.Navigator id="BabysitterStack" screenOptions={{ headerShown: false }}>
      <BabysitterStack.Screen name="SitterList" component={BabySitterScreen} />
      <BabysitterStack.Screen name="SitterProfile" component={SitterProfileScreen} />
      <BabysitterStack.Screen name="SitterRegistration" component={SitterRegistrationScreen} />
      <BabysitterStack.Screen name="SitterDashboard" component={SitterDashboardScreen} />
      <BabysitterStack.Screen name="MyReviews" component={MyReviewsScreen} />
      <BabysitterStack.Screen name="ChatScreen" component={ChatScreen} />
      <BabysitterStack.Screen name="ParentBookings" component={ParentBookingsScreen} />
    </BabysitterStack.Navigator>
  );
}

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();

// Component to handle URL Scheme deep links from Live Activity
function LiveActivityURLHandler() {
  const foodTimer = useFoodTimer();
  const sleepTimer = useSleepTimer();
  const { activeChild } = useActiveChild();

  useEffect(() => {
    const handleURL = async (event: { url: string }) => {
      try {
        const url = new URL(event.url);
        const path = url.pathname || url.hostname;

        if (path === 'pause-timer' || url.href.includes('pause-timer')) {
          // Pause timer based on current activity
          if (foodTimer.pumpingIsRunning && !foodTimer.pumpingIsPaused) {
            await foodTimer.pausePumping();
          } else if (foodTimer.breastIsRunning && !foodTimer.breastIsPaused) {
            await foodTimer.pauseBreast();
          } else if (sleepTimer.isRunning && !sleepTimer.isPaused) {
            await sleepTimer.pause();
          }
        } else if (path === 'resume-timer' || url.href.includes('resume-timer')) {
          // Resume timer
          if (foodTimer.pumpingIsRunning && foodTimer.pumpingIsPaused) {
            await foodTimer.resumePumping();
          } else if (foodTimer.breastIsRunning && foodTimer.breastIsPaused) {
            await foodTimer.resumeBreast();
          } else if (sleepTimer.isRunning && sleepTimer.isPaused) {
            await sleepTimer.resume();
          }
        } else if (path === 'save-timer' || url.href.includes('save-timer')) {
          // Save timer data
          const type = url.searchParams.get('type') || '';
          const elapsedSeconds = parseInt(url.searchParams.get('elapsedSeconds') || '0', 10);
          const childName = url.searchParams.get('childName') || '';
          const side = url.searchParams.get('side') || '';

          if (!auth.currentUser || !activeChild?.childId) return;

          try {
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
              }
            } else if (data.type === 'sleep') {
              data.duration = elapsedSeconds;
            }

            await saveEventToFirebase(auth.currentUser.uid, activeChild.childId, data);

            // Stop Live Activity
            if (Platform.OS === 'ios') {
              const { liveActivityService } = await import('./services/liveActivityService');
              if (type.includes('הנקה') || type.includes('breast')) {
                await liveActivityService.stopBreastfeedingTimer();
              } else if (type.includes('שאיבה') || type.includes('pump')) {
                await liveActivityService.stopPumpingTimer();
              } else if (type.includes('שינה') || type.includes('sleep')) {
                await liveActivityService.stopSleepTimer();
              }
            }
          } catch (error) {
            if (__DEV__) console.error('Error saving timer from Live Activity:', error);
          }
        }
      } catch (error) {
        if (__DEV__) console.error('Error handling URL:', error);
      }
    };

    const subscription = Linking.addEventListener('url', handleURL);

    // Handle initial URL if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleURL({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [foodTimer, sleepTimer, activeChild]);

  return null;
}

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [hasBabyProfile, setHasBabyProfile] = useState<boolean | null>(null);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [childrenReady, setChildrenReady] = useState(false);

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
        };

        // Try to save to Firebase (but don't block notification if it fails)
        const userId = auth.currentUser?.uid;
        if (userId) {
          // Use setTimeout to not block the notification handler
          setTimeout(async () => {
            try {
              const notificationType = notification.request.content.data?.type || 'reminder';
              const typeMap: Record<string, 'feed' | 'sleep' | 'medication' | 'reminder' | 'achievement'> = {
                'feeding_reminder': 'feed',
                'sleep_reminder': 'sleep',
                'supplement_reminder': 'medication',
                'vaccine_reminder': 'medication',
                'daily_summary': 'reminder',
                'booking_new': 'reminder',
                'booking_update': 'reminder',
                'booking_cancelled': 'reminder',
                'chat_message': 'reminder',
              };

              // Save notification to Firebase
              await notificationStorageService.saveNotification({
                userId,
                type: typeMap[notificationType] || 'reminder',
                title: notification.request.content.title || 'התראה',
                message: notification.request.content.body || '',
                timestamp: new Date(),
                isRead: false,
                isUrgent: notificationType === 'vaccine_reminder' || notificationType === 'booking_new',
              });
            } catch (error) {
              console.error('Failed to save notification:', error);
              // Don't throw - notification should still show
            }
          }, 0);
        }

        return shouldShow;
      },
    });

    // Handle notification taps (when user taps on notification)
    // This listener is set here in App.tsx to ensure it works globally
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const type = response.notification.request.content.data?.type as string;
      const data = response.notification.request.content.data;

      // Navigate based on notification type
      if (type) {
        // Small delay to ensure navigation is ready
        setTimeout(() => {
          navigateFromNotification(type, data);
        }, 100);
      }
    });

    return () => {
      responseSubscription.remove();
    };
  }, []);

  // Hide splash when app is FULLY ready (auth + children loaded)
  const onLayoutRootView = useCallback(async () => {
    // Determine if we are ready to hide splash
    const shouldHide = !isAppLoading && (
      !user || // Login screen ready
      (user && !hasBabyProfile) || // Baby profile creation ready
      (user && hasBabyProfile && childrenReady) // Main app ready
    );

    if (shouldHide) {
      await SplashScreen.hideAsync();
    }
  }, [isAppLoading, childrenReady, user, hasBabyProfile]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // Reload user to ensure we have the latest emailVerified status
      if (currentUser) {
        try {
          await currentUser.reload();
        } catch (e) {
          // If reload fails (e.g. network), we continue with cached value
          if (__DEV__) console.log('User reload failed:', e);
        }
      }

      if (currentUser && currentUser.emailVerified) {
        setUser(currentUser);
        await checkBiometricSettingsAndProfile(currentUser.uid);

        // Register for push notifications
        registerForPushNotifications().catch((err) => {
          if (__DEV__) console.log('Push registration:', err);
        });
      } else {
        setUser(null);
        setHasBabyProfile(false);
        setIsLocked(false);
        setIsAppLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const checkBiometricSettingsAndProfile = async (uid: string) => {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      let needsUnlock = false;
      if (userSnap.exists()) {
        const settings = userSnap.data().settings;
        if (settings && settings.biometricsEnabled) {
          needsUnlock = true;
          setIsLocked(true);
        }
      }

      const babyExists = await checkIfBabyExists();
      setHasBabyProfile(babyExists);
      setIsAppLoading(false);
      if (needsUnlock) setTimeout(() => authenticateUser(), 100);

    } catch (error) {
      if (__DEV__) console.log('Error during startup checks:', error);
      setIsAppLoading(false);
    }
  };

  const authenticateUser = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) { setIsLocked(false); return; }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'ברוך שובך ל-CalmParent',
        fallbackLabel: 'השתמש בסיסמה',
        disableDeviceFallback: false,
      });

      if (result.success) setIsLocked(false);
    } catch (e) { if (__DEV__) console.log('Authentication error:', e); }
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

  if (!user) {
    return (
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <LanguageProvider>
          <ThemeProvider>
            <SafeAreaProvider>
              <LoginScreen onLoginSuccess={() => {
                // Trigger auth state check - onAuthStateChanged will handle the rest
                setIsAppLoading(true);
              }} />
            </SafeAreaProvider>
          </ThemeProvider>
        </LanguageProvider>
      </View>
    );
  }

  // Show loading while checking baby profile
  if (hasBabyProfile === null) {
    return null; // Keep splash visible
  }



  if (user && hasBabyProfile === false) {
    return (
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <LanguageProvider>
          <ThemeProvider>
            <SafeAreaProvider>
              <BabyProfileScreen
                onProfileSaved={() => setHasBabyProfile(true)}
                onSkip={() => setHasBabyProfile(true)}
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
                <ActiveChildProvider onReady={() => {
                  setChildrenReady(true);
                  SplashScreen.hideAsync();
                }}>
                  <QuickActionsProvider>
                    <SleepTimerProvider>
                      <FoodTimerProvider>
                        <PremiumProvider>
                          <LiveActivityURLHandler />
                          <SafeAreaProvider>
                            <NavigationContainer
                              ref={navigationRef}
                              linking={{
                                prefixes: ['calmparent://', 'calmparentapp://', 'https://calmparent.app'],
                                config: {
                                  screens: {
                                    // Hebrew routes (for deep linking)
                                    'בית': 'home',
                                    'סטטיסטיקות': 'reports',
                                    'חשבון': 'account',
                                    'בייביסיטר': 'babysitter',
                                    // English routes (for deep linking)
                                    'Statistics': 'reports',
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
                                    Babysitter: {
                                      screens: {
                                        SitterList: 'babysitter',
                                        SitterProfile: 'babysitter/:sitterId',
                                        SitterDashboard: 'babysitter/dashboard',
                                      },
                                    },
                                  },
                                },
                              }}
                            >
                              <MainAppNavigator />
                            </NavigationContainer>
                          </SafeAreaProvider>
                        </PremiumProvider>
                      </FoodTimerProvider>
                    </SleepTimerProvider>
                  </QuickActionsProvider>
                </ActiveChildProvider>
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