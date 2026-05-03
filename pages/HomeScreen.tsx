import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import InlineLoader from '../components/Common/InlineLoader';
import { View, StyleSheet, ScrollView, Share, Alert,  StatusBar, RefreshControl, TouchableOpacity, Text, Animated, Platform, useWindowDimensions, InteractionManager, AppState } from 'react-native';
import { WifiOff, Clock } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useHomeData } from '../hooks/useHomeData';
import { useMedications } from '../hooks/useMedications';
import { useGuardian } from '../hooks/useGuardian';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useNotifications } from '../hooks/useNotifications';
import { useActiveChild } from '../context/ActiveChildContext';
import { useScrollTracking } from '../context/ScrollTrackingContext';
import { useGuest } from '../context/GuestContext';

// Components
import HeaderSection from '../components/Home/HeaderSection';
import QuickActions from '../components/Home/QuickActions';
import ShareStatusButton from '../components/Home/ShareStatusButton';
import HealthCard from '../components/Home/HealthCard';
import ChildPicker from '../components/Home/ChildPicker';
import AddBabyPlaceholder from '../components/Home/AddBabyPlaceholder';

import DailyTimeline from '../components/DailyTimeline';
import CalmModeModal from '../components/CalmModeModal';
import TrackingModal from '../components/TrackingModal';
import ChecklistModal from '../components/ChecklistModal';
import NightLightModal from '../components/NightLightModal';
import QuickReminderModal from '../components/Home/QuickReminderModal';
import TeethTrackerModal from '../components/Tools/TeethTrackerModal';
import WhiteNoiseModal from '../components/WhiteNoiseModal';
import SupplementsModal from '../components/Home/SupplementsModal';
import GrowthModal from '../components/Home/GrowthModal';
import MilestonesModal from '../components/Home/MilestonesModal';
import AddCustomActionModal, { CustomAction } from '../components/Home/AddCustomActionModal';
import { JoinFamilyModal } from '../components/Family/JoinFamilyModal';
import MagicMomentsModal from '../components/Home/MagicMomentsModal';
import { EditBasicInfoModal } from '../components/Profile';
import DynamicPromoModal from '../components/Premium/DynamicPromoModal';
import PremiumPaywall from '../components/Premium/PremiumPaywall';
// Services
import { auth, db } from '../services/firebaseConfig';
import { doc, updateDoc, collection, query, getDocs, limit } from 'firebase/firestore';
import { saveEventToFirebase, formatTimeFromTimestamp } from '../services/firebaseService';
import { useToast } from '../context/ToastContext';
import { useQuickActions } from '../context/QuickActionsContext';
import { undoService } from '../services/undoService';
import { getBabyDataById } from '../services/babyService';
import { Timestamp } from 'firebase/firestore';
import { logger } from '../utils/logger';
import { liveActivityService } from '../services/liveActivityService';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Modal } from 'react-native';
import { getWrappedData, WrappedData } from '../services/wrappedService';
import CinematicReviewScreen from './CinematicReviewScreen';
import MagicMomentsStoryScreen, { StoryPhoto } from './MagicMomentsStoryScreen';

// Types
import { TrackingType, DynamicStyles } from '../types/home';

// Navigation types
type HomeStackParamList = {
    Home: undefined;
    CreateBaby: undefined;
    Notifications: undefined;
};

type HomeScreenNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'Home'>;

/**
 * HomeScreen - Main dashboard with modular architecture
 * Reduced from 535 lines to ~180 lines
 */
export default function HomeScreen({ navigation }: { navigation: HomeScreenNavigationProp }) {
    // --- Theme & Language ---
    const { theme, isDarkMode } = useTheme();
    const { t } = useLanguage();
    const { height: screenH } = useWindowDimensions();

    // --- Active Child from Context ---
    const { activeChild, allChildren } = useActiveChild();

    // State for birth date and gender
    const [birthDate, setBirthDate] = useState<Date | null>(null);
    const [gender, setGender] = useState<'boy' | 'girl' | 'other' | undefined>(undefined);

    const fetchBabyData = useCallback(async () => {
        if (!activeChild?.childId) return;
        try {
            const babyData = await getBabyDataById(activeChild.childId);
            if (babyData?.birthDate) {
                // Handle Firebase Timestamp or Date
                let date: Date;
                if (babyData.birthDate instanceof Timestamp) {
                    date = babyData.birthDate.toDate();
                } else if (babyData.birthDate?.seconds) {
                    date = new Date(babyData.birthDate.seconds * 1000);
                } else if (babyData.birthDate instanceof Date) {
                    date = babyData.birthDate;
                } else {
                    date = new Date(babyData.birthDate);
                }
                setBirthDate(date);
            } else {
                setBirthDate(null);
            }

            // Set gender
            if (babyData?.gender) {
                setGender(babyData.gender);
            } else {
                setGender(undefined);
            }
        } catch (error) {
            logger.error('Error fetching baby data:', error);
            setBirthDate(null);
            setGender(undefined);
        }
    }, [activeChild?.childId]);

    // Fetch birth date and gender when active child changes
    useEffect(() => {
        fetchBabyData();
    }, [fetchBabyData]);

    // Derive profile from active child
    const profile = useMemo(() => {
        if (!activeChild) {
            return { id: '', name: t('home.defaultBabyName'), birthDate: new Date(), ageMonths: 0, photoUrl: undefined, parentId: '' };
        }

        let activeBirth: Date | null = null;
        if (birthDate) {
            activeBirth = birthDate;
        } else if ((activeChild as any)?.birthDate) {
            activeBirth = new Date((activeChild as any).birthDate);
        }

        // Calculate age in months if we have birth date
        let ageMonths = 0;
        if (activeBirth) {
            const now = new Date();
            ageMonths = (now.getFullYear() - activeBirth.getFullYear()) * 12 +
                (now.getMonth() - activeBirth.getMonth());
            if (now.getDate() < activeBirth.getDate()) {
                ageMonths--;
            }
            ageMonths = Math.max(0, ageMonths);
        }

        return {
            id: activeChild.childId,
            name: activeChild.childName,
            birthDate: (activeChild as any)?.birthDate ? new Date((activeChild as any).birthDate) : (birthDate || new Date()),
            ageMonths,
            photoUrl: activeChild.photoUrl,
            parentId: auth.currentUser?.uid || '',
            gender: (activeChild as any)?.gender || gender,
        };
    }, [activeChild, birthDate]);

    // Calculate greeting
    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return t('home.greeting.morning');
        if (hour >= 12 && hour < 18) return t('home.greeting.afternoon');
        if (hour >= 18 && hour < 22) return t('home.greeting.evening');
        return t('home.greeting.night');
    }, [t]);

    // --- Custom Hooks (using active child ID) ---
    const {
        lastFeedTime,
        lastSleepTime,
        dailyStats,
        growthStats,
        refresh: refreshHomeData,
        isError: homeDataError,
        guestExpiresAt,
    } = useHomeData(profile.id, profile.name, profile.ageMonths, profile.parentId);
    const { meds, toggleMed, syncStatus, refresh: refreshMeds, customSupplements, addCustomSupplement, removeCustomSupplement, totalCount, takenCount } = useMedications(profile.id);
    const { currentGuardian, setCurrentGuardian, availableRoles, isPremium } = useGuardian();
    const { scheduleFeedingReminder } = useNotifications();

    // --- Local State ---
    const [isCalmModeOpen, setIsCalmModeOpen] = useState(false);
    const [isNightLightOpen, setIsNightLightOpen] = useState(false);
    const [isTeethOpen, setIsTeethOpen] = useState(false);
    const [isChecklistOpen, setIsChecklistOpen] = useState(false);
    const [isQuickReminderOpen, setIsQuickReminderOpen] = useState(false);
    const [reminderCount, setReminderCount] = useState(0);
    const [isWhiteNoiseOpen, setIsWhiteNoiseOpen] = useState(false);
    const [isSupplementsOpen, setIsSupplementsOpen] = useState(false);
    const [isHealthOpen, setIsHealthOpen] = useState(false);
    const [healthInitialScreen, setHealthInitialScreen] = useState<'menu' | 'vaccines' | 'doctor' | 'illness' | 'temperature' | 'medications' | 'medications_add' | 'history' | 'tipat_halav' | 'allergies'>('menu');
    const [isGrowthOpen, setIsGrowthOpen] = useState(false);
    const [isMilestonesOpen, setIsMilestonesOpen] = useState(false);
    const [isAddCustomOpen, setIsAddCustomOpen] = useState(false);
    const [isPaywallOpen, setIsPaywallOpen] = useState(false);
    const [isMagicMomentsOpen, setIsMagicMomentsOpen] = useState(false);
    const [customActions, setCustomActions] = useState<CustomAction[]>([]);
    const [trackingModalType, setTrackingModalType] = useState<TrackingType>(null);
    const [editingEvent, setEditingEvent] = useState<any>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [timelineRefresh, setTimelineRefresh] = useState(0);
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
    const [editingChild, setEditingChild] = useState<any>(null);
    const [isEditChildModalOpen, setIsEditChildModalOpen] = useState(false);
    const user = auth.currentUser;
    const { isGuest, promptLogin } = useGuest();
    const { pendingFABAction, clearFABAction } = useQuickActions();

    // Execute pending FAB action when screen is focused
    useEffect(() => {
        if (!pendingFABAction) return;
        const actionMap: Record<string, () => void> = {
            food:          () => setTrackingModalType('food'),
            sleep:         () => setTrackingModalType('sleep'),
            diaper:        () => setTrackingModalType('diaper'),
            magicMoments:  () => setIsMagicMomentsOpen(true),
            health:              () => { setHealthInitialScreen('menu');        setIsHealthOpen(true); },
            healthDoctor:        () => { setHealthInitialScreen('doctor');      setIsHealthOpen(true); },
            healthVaccines:      () => { setHealthInitialScreen('vaccines');    setIsHealthOpen(true); },
            healthIllness:       () => { setHealthInitialScreen('illness');     setIsHealthOpen(true); },
            healthTemperature:   () => { setHealthInitialScreen('temperature'); setIsHealthOpen(true); },
            healthMedications:   () => { setHealthInitialScreen('medications'); setIsHealthOpen(true); },
            healthTipatHalav:    () => { setHealthInitialScreen('tipat_halav');setIsHealthOpen(true); },
            healthAllergies:     () => { setHealthInitialScreen('allergies');   setIsHealthOpen(true); },
            healthHistory:       () => { setHealthInitialScreen('history');     setIsHealthOpen(true); },
            growth:        () => setIsGrowthOpen(true),
            milestones:    () => setIsMilestonesOpen(true),
            sos:           () => setIsCalmModeOpen(true),
            nightLight:    () => setIsNightLightOpen(true),
            quickReminder: () => setIsQuickReminderOpen(true),
        };
        const fn = actionMap[pendingFABAction];
        if (fn) {
            setTimeout(() => { fn(); clearFABAction(); }, 200);
        } else {
            clearFABAction();
        }
    }, [pendingFABAction]);

    // Cinematic Wrapped state (to be converted to Periodic Journey later)
    const [showWrapped, setShowWrapped] = useState(false);
    const [wrappedData, setWrappedData] = useState<WrappedData | null>(null);
    const [wrappedLoading, setWrappedLoading] = useState(false);

    // Magic Moments Story State
    const [showStory, setShowStory] = useState(false);
    const [storyPhotos, setStoryPhotos] = useState<StoryPhoto[]>([]);

    const handleOpenStory = useCallback((photos: StoryPhoto[]) => {
        setStoryPhotos(photos);
        setIsMagicMomentsOpen(false);
        setTimeout(() => {
            setShowStory(true);
        }, 400);
    }, []);

    const handleOpenWrapped = useCallback(() => {
        logger.log('🎬 handleOpenWrapped called');
        const emptyData: WrappedData = {
            totalDiapers: 0, totalSleepHours: 0, totalFeedings: 0,
            longestSleepHours: 0, firstEventDate: null, totalBottleMl: 0, albumPhotos: [],
        };
        setWrappedData(prev => prev ?? emptyData);
        // ← Close MagicMomentsModal FIRST (iOS can't stack 2 independent modals)
        setIsMagicMomentsOpen(false);
        // Wait for dismiss animation, then open Cinematic
        setTimeout(() => {
            setShowWrapped(true);
            // Load real Firestore data in background
            const childId = activeChild?.childId || profile.id;
            if (childId) {
                getWrappedData(childId)
                    .then(d => { if (d) setWrappedData(d); })
                    .catch(() => {});
            }
        }, 400);
    }, [activeChild?.childId, profile.id]);

    // Fetch reminder count
    const fetchReminderCount = useCallback(async () => {
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        try {
            const snap = await getDocs(query(collection(db, `users/${uid}/reminders`), limit(500)));
            setReminderCount(snap.size);
        } catch { /* silent */ }
    }, []);

    useEffect(() => { fetchReminderCount(); }, [fetchReminderCount]);

    // Refresh data when active child changes
    useEffect(() => {
        if (activeChild?.childId) {
            refreshHomeData();
            refreshMeds();
            setTimelineRefresh(prev => prev + 1);
        }
    }, [activeChild?.childId]);

    // --- Dynamic Styles (now from global theme) ---
    const dynamicStyles: DynamicStyles = useMemo(() => ({
        bg: theme.background,
        text: theme.textPrimary,
        textSub: theme.textSecondary,
        aiBg: isDarkMode ? '#1A0000' : '#f5f3ff',
        aiBorder: isDarkMode ? '#550000' : '#ddd6fe',
        aiTextNight: isDarkMode ? '#FCA5A5' : '#5b21b6',
    }), [theme, isDarkMode]);



    // --- Pull to Refresh ---
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([
            fetchBabyData(),
            refreshHomeData(),
            refreshMeds(),
        ]);
        setRefreshing(false);
    }, [fetchBabyData, refreshHomeData, refreshMeds]);

    // --- Focus Effect ---
    const [quickActionsFocusKey, setQuickActionsFocusKey] = useState(0);
    const checkPendingLiveActivityActionRef = useRef<(() => void) | null>(null);

    useFocusEffect(
        useCallback(() => {
            if (profile.id) {
                fetchBabyData();
                refreshHomeData();
                refreshMeds();
            }
            setQuickActionsFocusKey(k => k + 1);
            checkPendingLiveActivityActionRef.current?.();
        }, [profile.id, fetchBabyData, refreshHomeData, refreshMeds])
    );

    // Listen for app coming to foreground
    useEffect(() => {
        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active') {
                checkPendingLiveActivityActionRef.current?.();
            }
        });
        return () => sub.remove();
    }, []);


    // --- Handlers ---
    const { showToast, showSuccess, showError } = useToast();
    const handleSaveTracking = useCallback(async (data: any) => {
        const t0 = Date.now();
        logger.log('⏱️ [PERF] handleSaveTracking START', { type: data.type });

        if (isGuest || !user) {
            if (isGuest) {
                promptLogin();
            } else {
                logger.error('❌ No user found');
                showError(t('errors.loginRequired'));
            }
            return;
        }

        if (!profile.id) {
            logger.error('❌ No profile.id found');
            showError(t('errors.noChildProfile'));
            return;
        }

        try {
            logger.debug('💾', 'Saving to Firebase:', { userId: user.uid, childId: profile.id, dataType: data.type });
            const eventId = await saveEventToFirebase(user.uid, profile.id, data);
            logger.log(`⏱️ [PERF] saveEventToFirebase done in ${Date.now() - t0}ms`);

            showSuccess(t('common.savedSuccess'));

            // Schedule feeding reminder if this was a food event
            if (data.type === 'food') {
                scheduleFeedingReminder(new Date());
                logger.log(`⏱️ [PERF] scheduleFeedingReminder done in ${Date.now() - t0}ms`);
            }
        } catch (error) {
            showError(t('errors.saveError'));
        }

        logger.log(`⏱️ [PERF] handleSaveTracking DONE in ${Date.now() - t0}ms, deferring refresh`);
        // Defer refresh so it doesn't block the dismiss animation
        InteractionManager.runAfterInteractions(() => {
            refreshHomeData();
            setTimelineRefresh(prev => prev + 1);
        });
    }, [user, profile.id, refreshHomeData, scheduleFeedingReminder]);

    // --- Live Activity Intent Handler ---
    const checkPendingLiveActivityAction = useCallback(async () => {
        try {
            const pending = await liveActivityService.getPendingTimerAction();
            if (!pending || pending.action !== 'stop') return;
            await liveActivityService.clearPendingTimerAction();
            if (!user || !profile.id) return;
            const typeMap: Record<string, string> = {
                sleep: 'sleep', food: 'food', bottle: 'food',
                בקבוק: 'food', הנקה: 'food', white_noise: 'sleep',
            };
            const mappedType = typeMap[pending.timerType] || pending.timerType;
            if (!mappedType) return;
            await handleSaveTracking({
                type: mappedType,
                duration: pending.elapsedSeconds,
                timestamp: new Date(),
                note: '',
            });
        } catch (e) {
            logger.warn('checkPendingLiveActivityAction error:', e);
        }
    }, [user, profile.id, handleSaveTracking]);

    useEffect(() => {
        checkPendingLiveActivityActionRef.current = checkPendingLiveActivityAction;
    }, [checkPendingLiveActivityAction]);

    const shareMessage = useMemo(() => {
        const today = new Date();
        const dateStr = today.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });

        // Age formatting
        const ageStr = profile.ageMonths < 12
            ? `${profile.ageMonths} ${t('home.share.months')}`
            : `${Math.floor(profile.ageMonths / 12)} ${t('home.share.years')}${profile.ageMonths % 12 > 0 ? ` ${t('home.share.yearsAnd', { months: profile.ageMonths % 12 })}` : ''}`;

        // Sleep duration formatting
        const sleepH = Math.floor(dailyStats.sleepMinutes / 60);
        const sleepM = dailyStats.sleepMinutes % 60;
        const sleepStr = sleepH > 0
            ? `${sleepH} ${t('home.share.hoursOnly', { hours: sleepH })}${sleepM > 0 ? ` ${t('home.share.hoursAnd', { hours: sleepH, minutes: sleepM })}` : ''}`
            : sleepM > 0 ? t('home.minutesDuration', { count: sleepM }) : t('home.notRecorded');

        let msg = `${t('home.share.dailySummary', { name: profile.name })}\n`;
        msg += `📅 ${dateStr}`;
        if (ageStr) msg += ` · ${t('home.share.age')}: ${ageStr}`;
        msg += `\n\n`;

        msg += `${t('home.share.todayStats')}\n`;
        msg += `${t('home.share.feeding')}: ${dailyStats.feedCount > 0 ? t('home.feedCountTimes', { count: dailyStats.feedCount }) : t('home.feedNotRecorded')}\n`;
        msg += `${t('home.share.totalSleep')}: ${sleepStr}\n`;
        msg += `${t('home.share.diaperChanges')}: ${dailyStats.diaperCount > 0 ? t('home.diaperCountTimes', { count: dailyStats.diaperCount }) : t('home.notRecorded')}\n`;

        msg += `\n${t('home.share.lastActivity')}\n`;
        msg += `${t('home.share.lastFeed')}: ${lastFeedTime}\n`;
        msg += `${t('home.share.lastSleep')}: ${lastSleepTime}\n`;

        if (growthStats?.currentWeight || growthStats?.currentHeight) {
            msg += `\n${t('home.share.measurements')}\n`;
            if (growthStats.currentHeight) msg += `${t('home.share.height')}: ${growthStats.currentHeight}\n`;
            if (growthStats.currentWeight) msg += `${t('home.share.weight')}: ${growthStats.currentWeight}\n`;
        }

        msg += `\n${t('home.share.sentFrom')}`;
        return msg;
    }, [profile.name, profile.ageMonths, lastFeedTime, lastSleepTime, dailyStats, growthStats]);

    const shareStatus = useCallback(async () => {
        await Share.share({ message: shareMessage });
    }, [shareMessage]);

    // --- Scroll tracking for tab bar ---
    const { scrollY, scrollX } = useScrollTracking();

    const scrollHandler = Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: true }
    );

    // Get loading state from context (but don't show loading screen)
    const { isLoading: contextLoading } = useActiveChild();

    // Format guest time remaining for banner
    const guestTimeRemaining = useMemo(() => {
        if (!guestExpiresAt) return null;
        const now = new Date();
        const diffMs = guestExpiresAt.getTime() - now.getTime();
        if (diffMs <= 0) return null;
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        if (hours > 0) return t('home.guestHoursRemaining', { count: hours });
        return t('home.guestMinutesRemaining', { count: minutes });
    }, [guestExpiresAt, t]);

    return (
        <View style={styles.container}>
            {/* Enhanced Background - Minimalist Apple Style */}
            <LinearGradient
                colors={isDarkMode
                    ? ['#0F0F0F', '#1C1C1E', '#0A0A0A', '#0F0F0F']
                    : ['#FAFAFA', '#F7F7F7', '#F3F3F3', '#FAFAFA']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                locations={[0, 0.3, 0.7, 1]}
                style={StyleSheet.absoluteFill}
            />

            {/* Radial Glow at Top - Warm Pink */}
            <LinearGradient
                colors={isDarkMode
                    ? ['rgba(200, 128, 106, 0.10)', 'transparent']
                    : ['rgba(200, 128, 106, 0.06)', 'transparent']
                }
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 0.6 }}
                style={StyleSheet.absoluteFill}
            />

            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

                <Animated.ScrollView
                    contentContainerStyle={[
                        styles.scrollContent,
                        { paddingBottom: screenH < 700 ? 100 : 140 },
                        !profile.id && !contextLoading && styles.scrollContentCentered
                    ]}
                    showsVerticalScrollIndicator={false}
                    onScroll={scrollHandler}
                    scrollEventThrottle={16}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                >
                    {/* When NO baby profile AND not loading - show only Add Baby Placeholder */}
                    {!profile.id && !contextLoading && (
                        <AddBabyPlaceholder
                            onCreateBaby={() => navigation.navigate('CreateBaby')}
                            onJoinWithCode={() => setIsJoinModalOpen(true)}
                        />
                    )}

                    {/* When HAVE baby profile - show full home screen */}
                    {profile.id && (
                        <>
                            <View>
                                <HeaderSection
                                    greeting={greeting}
                                    profile={profile}
                                    onProfileUpdate={onRefresh}
                                    dynamicStyles={dynamicStyles}
                                    dailyStats={dailyStats}
                                    growthStats={growthStats}
                                    lastFeedTime={lastFeedTime}
                                    lastSleepTime={lastSleepTime}
                                    meds={meds}
                                    navigation={navigation}
                                    onAddChild={() => navigation.navigate('CreateBaby')}
                                    onJoinWithCode={() => { logger.debug('🔗', 'HomeScreen: Opening JoinModal'); setIsJoinModalOpen(true); }}
                                    onEditChild={(child) => {
                                        setEditingChild(child);
                                        setIsEditChildModalOpen(true);
                                    }}
                                />
                            </View>

                            {/* Network error banner */}
                            {false && homeDataError && (
                                <View style={styles.errorBanner}>
                                    <WifiOff size={14} color="#fff" strokeWidth={2} />
                                    <Text style={styles.errorBannerText}>{t('home.connectionError')}</Text>
                                </View>
                            )}

                            {/* Guest expiry countdown banner */}
                            {guestTimeRemaining && (
                                <View style={styles.guestBanner}>
                                    <Clock size={14} color="#fff" strokeWidth={2} />
                                    <Text style={styles.guestBannerText}>{guestTimeRemaining}</Text>
                                </View>
                            )}

                            <View style={{ marginBottom: 8 }}>
                                <QuickActions
                                    focusKey={quickActionsFocusKey}
                                    lastFeedTime={lastFeedTime}
                                    lastSleepTime={lastSleepTime}
                                    onFoodPress={() => setTrackingModalType('food')}
                                    onSleepPress={() => setTrackingModalType('sleep')}
                                    onDiaperPress={() => setTrackingModalType('diaper')}
                                    onWhiteNoisePress={() => setIsWhiteNoiseOpen(true)}
                                    onSOSPress={() => setIsCalmModeOpen(true)}
                                    onSupplementsPress={() => setIsSupplementsOpen(true)}
                                    onHealthPress={() => setIsHealthOpen(true)}
                                    onGrowthPress={() => setIsGrowthOpen(true)}
                                    onMilestonesPress={() => setIsMilestonesOpen(true)}

                                    onMagicMomentsPress={() => setIsMagicMomentsOpen(true)}
                                    // onChecklistPress={() => setIsChecklistOpen(true)} // Moved to Tools
                                    onTeethPress={() => setIsTeethOpen(true)}
                                    onNightLightPress={() => setIsNightLightOpen(true)}
                                    onCustomPress={() => setIsAddCustomOpen(true)}
                                    onQuickReminderPress={() => setIsQuickReminderOpen(true)}
                                    reminderCount={reminderCount}
                                    onFoodTimerStop={async (seconds, timerType) => {
                                        const mins = Math.floor(seconds / 60);
                                        const secs = seconds % 60;
                                        const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
                                        const subTypeMap: Record<string, string> = {
                                            'breast_left': 'breast',
                                            'breast_right': 'breast',
                                            'pumping': 'pumping'
                                        };
                                        const subType = subTypeMap[timerType] || 'breast';
                                        const side = timerType === 'breast_left' ? t('tracking.left') : timerType === 'breast_right' ? t('tracking.right') : '';
                                        await handleSaveTracking({
                                            type: 'food',
                                            subType,
                                            note: side ? `${side}: ${timeStr}` : `${t('home.share.time')}: ${timeStr}`,
                                            timestamp: new Date()
                                        });
                                    }}
                                    onSleepTimerStop={async (seconds) => {
                                        const mins = Math.floor(seconds / 60);
                                        const secs = seconds % 60;
                                        const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
                                        await handleSaveTracking({
                                            type: 'sleep',
                                            note: `${t('home.share.sleepDuration')}: ${timeStr}`,
                                            duration: seconds,
                                            timestamp: new Date()
                                        });
                                    }}
                                    meds={meds}
                                    supplementsTakenCount={takenCount}
                                    supplementsTotalCount={totalCount}
                                    dynamicStyles={dynamicStyles}
                                />
                            </View>

                            <HealthCard dynamicStyles={dynamicStyles} visible={isHealthOpen} onClose={() => { setIsHealthOpen(false); setHealthInitialScreen('menu'); }} initialScreen={healthInitialScreen} />

                            <DailyTimeline 
                                refreshTrigger={timelineRefresh} 
                                childId={profile.id} 
                                showOnlyToday={true} 
                                onEditEvent={(event) => {
                                    if (event.type === 'food' || event.type === 'sleep' || event.type === 'diaper') {
                                        setEditingEvent(event);
                                        setTrackingModalType(event.type);
                                    }
                                }}
                            />

                            <ShareStatusButton onShare={shareStatus} message={shareMessage} />
                        </>
                    )}
                </Animated.ScrollView>

                {/* Modals */}
                {/* Restored SOS Modal (Numbers) */}
                <CalmModeModal
                    visible={isCalmModeOpen}
                    onClose={() => setIsCalmModeOpen(false)}
                />
                <NightLightModal visible={isNightLightOpen} onClose={() => setIsNightLightOpen(false)} />
                <TeethTrackerModal visible={isTeethOpen} onClose={() => setIsTeethOpen(false)} />
                <ChecklistModal visible={isChecklistOpen} onClose={() => setIsChecklistOpen(false)} />
                <QuickReminderModal visible={isQuickReminderOpen} onClose={() => { setIsQuickReminderOpen(false); fetchReminderCount(); }} />
                <WhiteNoiseModal visible={isWhiteNoiseOpen} onClose={() => setIsWhiteNoiseOpen(false)} />
                <SupplementsModal
                    visible={isSupplementsOpen}
                    onClose={() => setIsSupplementsOpen(false)}
                    meds={meds}
                    onToggle={toggleMed}
                    onRefresh={() => setTimelineRefresh(prev => prev + 1)}
                    customSupplements={customSupplements}
                    onAddCustom={addCustomSupplement}
                    onRemoveCustom={removeCustomSupplement}
                    takenCount={takenCount}
                    totalCount={totalCount}
                />
                <GrowthModal
                    visible={isGrowthOpen}
                    onClose={() => setIsGrowthOpen(false)}
                    childId={activeChild?.childId}
                />
                <MilestonesModal
                    visible={isMilestonesOpen}
                    onClose={() => setIsMilestonesOpen(false)}
                />
                <TrackingModal
                    visible={!!trackingModalType}
                    type={trackingModalType || 'food'}
                    editingEvent={editingEvent}
                    onClose={() => {
                        setTrackingModalType(null);
                        setEditingEvent(null);
                    }}
                    onSave={handleSaveTracking}
                />
                <JoinFamilyModal
                    visible={isJoinModalOpen}
                    onClose={() => setIsJoinModalOpen(false)}
                    onSuccess={() => {
                        setIsJoinModalOpen(false);
                        onRefresh();
                    }}
                />
                {editingChild && (
                    <EditBasicInfoModal
                        visible={isEditChildModalOpen}
                        initialData={{
                            name: editingChild.childName || '',
                            gender: editingChild.gender || 'boy',
                            birthDate: editingChild.birthDate ? new Date(editingChild.birthDate) : new Date(),
                            photoUrl: editingChild.photoUrl,
                        }}
                        onSave={async (data) => {
                            try {
                                await updateDoc(doc(db, 'babies', editingChild.childId), {
                                    name: data.name,
                                    gender: data.gender,
                                    birthDate: data.birthDate,
                                    photoUrl: data.photoUrl || null,
                                });
                                onRefresh();
                            } catch (e) {
                                logger.error('Failed to update child:', e);
                            }
                        }}
                        onClose={() => {
                            setIsEditChildModalOpen(false);
                            setEditingChild(null);
                        }}
                    />
                )}
                <MagicMomentsModal
                    visible={isMagicMomentsOpen}
                    onClose={() => setIsMagicMomentsOpen(false)}
                    onOpenStory={handleOpenStory}
                    onOpenWrapped={handleOpenWrapped}
                />
                <AddCustomActionModal
                    visible={isAddCustomOpen}
                    onClose={() => setIsAddCustomOpen(false)}
                    onAdd={async (action) => {
                        // Save to local state
                        setCustomActions(prev => [...prev, action]);

                        // Save to Firebase timeline
                        if (user && profile.id) {
                            try {
                                await saveEventToFirebase(user.uid, profile.id, {
                                    type: 'custom',
                                    note: action.name,
                                    subType: action.icon,
                                });
                                setTimelineRefresh(prev => prev + 1);
                                Alert.alert(t('home.customActionAdded'), t('home.customActionSaved', { name: action.name }));
                            } catch (error) {
                                logger.error('Failed to save custom action:', error);
                                Alert.alert(t('misc.saveError'));
                            }
                        }
                    }}
                />
                <DynamicPromoModal
                    currentScreenName="Home"
                    onNavigateToPaywall={() => setIsPaywallOpen(true)}
                />
                <PremiumPaywall
                    visible={isPaywallOpen}
                    onClose={() => setIsPaywallOpen(false)}
                    trigger="promo_modal_home"
                />

                {/* Cinematic Wrapped - top level modal */}
                <Modal
                    visible={showWrapped}
                    animationType="slide"
                    presentationStyle="fullScreen"
                    onRequestClose={() => setShowWrapped(false)}
                >
                    {showWrapped && wrappedData && (
                        <CinematicReviewScreen
                            data={wrappedData}
                            childName={activeChild?.childName || ''}
                            babyAgeMonths={profile.ageMonths}
                            onClose={() => setShowWrapped(false)}
                        />
                    )}
                </Modal>

                {/* Magic Moments Photo Story - top level modal */}
                <Modal
                    visible={showStory}
                    animationType="slide"
                    presentationStyle="fullScreen"
                    onRequestClose={() => setShowStory(false)}
                >
                    {showStory && (
                        <MagicMomentsStoryScreen
                            photos={storyPhotos}
                            childName={activeChild?.childName || ''}
                            onClose={() => setShowStory(false)}
                        />
                    )}
                </Modal>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    errorBanner: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#EF4444',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        marginBottom: 12,
    },
    errorBannerText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
        flex: 1,
        textAlign: 'right',
    },
    guestBanner: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#C8806A',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        marginBottom: 12,
    },
    guestBannerText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
        flex: 1,
        textAlign: 'right',
    },
    safeArea: {
        flex: 1,
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: 20,
    },
    scrollContentCentered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100%',
    },
});