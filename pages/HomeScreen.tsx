import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Share, Alert, ActivityIndicator, StatusBar, RefreshControl, TouchableOpacity, Text, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

// Hooks
import { useHomeData } from '../hooks/useHomeData';
import { useMedications } from '../hooks/useMedications';
import { useGuardian } from '../hooks/useGuardian';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useNotifications } from '../hooks/useNotifications';
import { useActiveChild } from '../context/ActiveChildContext';
import { useScrollTracking } from '../context/ScrollTrackingContext';

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
import SleepCalculatorModal from '../components/Tools/SleepCalculatorModal';
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
import { doc, updateDoc } from 'firebase/firestore';
import { saveEventToFirebase, formatTimeFromTimestamp } from '../services/firebaseService';
import { useToast } from '../context/ToastContext';
import { undoService } from '../services/undoService';
import { getBabyDataById } from '../services/babyService';
import { Timestamp } from 'firebase/firestore';
import { logger } from '../utils/logger';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

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

    // --- Active Child from Context ---
    const { activeChild, allChildren } = useActiveChild();

    // State for birth date and gender
    const [birthDate, setBirthDate] = useState<Date | null>(null);
    const [gender, setGender] = useState<'boy' | 'girl' | 'other' | undefined>(undefined);

    // Fetch birth date and gender when active child changes
    useEffect(() => {
        const fetchBabyData = async () => {
            if (!activeChild?.childId) {
                setBirthDate(null);
                setGender(undefined);
                return;
            }
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
        };
        fetchBabyData();
    }, [activeChild?.childId]);

    // Derive profile from active child
    const profile = useMemo(() => {
        if (!activeChild) {
            return { id: '', name: 'הבייבי שלי', birthDate: new Date(), ageMonths: 0, photoUrl: undefined, parentId: '' };
        }

        // Calculate age in months if we have birth date
        let ageMonths = 0;
        if (birthDate) {
            const now = new Date();
            ageMonths = (now.getFullYear() - birthDate.getFullYear()) * 12 +
                (now.getMonth() - birthDate.getMonth());
            if (now.getDate() < birthDate.getDate()) {
                ageMonths--;
            }
            ageMonths = Math.max(0, ageMonths);
        }

        return {
            id: activeChild.childId,
            name: activeChild.childName,
            birthDate: birthDate || new Date(),
            ageMonths,
            photoUrl: activeChild.photoUrl,
            parentId: auth.currentUser?.uid || '',
            gender,
        };
    }, [activeChild, birthDate]);

    // Calculate greeting
    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return t('home.greeting.morning');
        if (hour >= 12 && hour < 18) return t('home.greeting.afternoon');
        if (hour >= 18 && hour < 22) return t('home.greeting.evening');
        return t('home.greeting.night');
    }, []);

    // --- Custom Hooks (using active child ID) ---
    const {
        lastFeedTime,
        lastSleepTime,
        dailyStats,
        growthStats,
        refresh: refreshHomeData,
    } = useHomeData(profile.id, profile.name, profile.ageMonths, profile.parentId);
    const { meds, toggleMed, syncStatus, refresh: refreshMeds } = useMedications(profile.id);
    const { currentGuardian, setCurrentGuardian, availableRoles, isPremium } = useGuardian();
    const { scheduleFeedingReminder } = useNotifications();

    // --- Local State ---
    const [isCalmModeOpen, setIsCalmModeOpen] = useState(false);
    const [isNightLightOpen, setIsNightLightOpen] = useState(false);
    const [isTeethOpen, setIsTeethOpen] = useState(false);
    const [isNextNapOpen, setIsNextNapOpen] = useState(false);
    const [isChecklistOpen, setIsChecklistOpen] = useState(false);
    const [isQuickReminderOpen, setIsQuickReminderOpen] = useState(false);
    const [isWhiteNoiseOpen, setIsWhiteNoiseOpen] = useState(false);
    const [isSupplementsOpen, setIsSupplementsOpen] = useState(false);
    const [isHealthOpen, setIsHealthOpen] = useState(false);
    const [isGrowthOpen, setIsGrowthOpen] = useState(false);
    const [isMilestonesOpen, setIsMilestonesOpen] = useState(false);
    const [isAddCustomOpen, setIsAddCustomOpen] = useState(false);
    const [isPaywallOpen, setIsPaywallOpen] = useState(false);
    const [isMagicMomentsOpen, setIsMagicMomentsOpen] = useState(false);
    const [customActions, setCustomActions] = useState<CustomAction[]>([]);
    const [trackingModalType, setTrackingModalType] = useState<TrackingType>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [timelineRefresh, setTimelineRefresh] = useState(0);
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
    const [editingChild, setEditingChild] = useState<any>(null);
    const [isEditChildModalOpen, setIsEditChildModalOpen] = useState(false);
    const user = auth.currentUser;

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
            refreshHomeData(),
            refreshMeds(),
        ]);
        setRefreshing(false);
    }, [refreshHomeData, refreshMeds]);

    // --- Focus Effect ---
    useFocusEffect(
        useCallback(() => {
            if (profile.id) {
                refreshHomeData();
                refreshMeds();
            }
        }, [profile.id, refreshHomeData, refreshMeds])
    );


    // --- Handlers ---
    const { showToast, showSuccess, showError } = useToast();
    const handleSaveTracking = useCallback(async (data: any) => {
        logger.debug('📥', 'handleSaveTracking called with:', JSON.stringify(data, null, 2));

        if (!user) {
            logger.error('❌ No user found');
            showError(t('errors.loginRequired'));
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
            logger.debug('✅', 'Saved successfully, eventId:', eventId);

            // Store for undo
            undoService.setLastAction({
                eventId,
                type: 'create',
                data,
                timestamp: new Date(),
            });

            // Show success toast with undo
            showToast({
                message: t('common.savedSuccess'),
                type: 'success',
                duration: 5000,
                action: {
                    label: t('common.undo'),
                    onPress: async () => {
                        const success = await undoService.undo();
                        if (success) {
                            showSuccess(t('common.undone'));
                            refreshHomeData();
                        } else {
                            showError(t('errors.cannotUndo'));
                        }
                    },
                },
            });

            // Schedule feeding reminder if this was a food event
            if (data.type === 'food') {
                scheduleFeedingReminder(new Date());
            }
        } catch (error) {
            showError(t('errors.saveError'));
        }

        refreshHomeData();
        setTimelineRefresh(prev => prev + 1);
    }, [user, profile.id, refreshHomeData, scheduleFeedingReminder]);

    const shareMessage = useMemo(() =>
        `עדכון מ-Calmino:\n👶 ${profile.name}\n🍼 אכל/ה לאחרונה: ${lastFeedTime}\n😴 ישן/ה לאחרונה: ${lastSleepTime}`,
        [profile.name, lastFeedTime, lastSleepTime]
    );

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

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

                <Animated.ScrollView
                    contentContainerStyle={[
                        styles.scrollContent,
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

                            <View>
                                <QuickActions
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
                                        const side = timerType === 'breast_left' ? 'שמאל' : timerType === 'breast_right' ? 'ימין' : '';
                                        await handleSaveTracking({
                                            type: 'food',
                                            subType,
                                            note: side ? `${side}: ${timeStr}` : `זמן: ${timeStr}`,
                                            timestamp: new Date()
                                        });
                                    }}
                                    onSleepTimerStop={async (seconds) => {
                                        const mins = Math.floor(seconds / 60);
                                        const secs = seconds % 60;
                                        const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
                                        await handleSaveTracking({
                                            type: 'sleep',
                                            note: `משך שינה: ${timeStr}`,
                                            duration: seconds,
                                            timestamp: new Date()
                                        });
                                    }}
                                    meds={meds}
                                    dynamicStyles={dynamicStyles}
                                />
                            </View>

                            <HealthCard dynamicStyles={dynamicStyles} visible={isHealthOpen} onClose={() => setIsHealthOpen(false)} />

                            <DailyTimeline refreshTrigger={timelineRefresh} childId={profile.id} showOnlyToday={true} />

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
                <SleepCalculatorModal visible={isNextNapOpen} onClose={() => setIsNextNapOpen(false)} />
                <ChecklistModal visible={isChecklistOpen} onClose={() => setIsChecklistOpen(false)} />
                <QuickReminderModal visible={isQuickReminderOpen} onClose={() => setIsQuickReminderOpen(false)} />
                <WhiteNoiseModal visible={isWhiteNoiseOpen} onClose={() => setIsWhiteNoiseOpen(false)} />
                <SupplementsModal
                    visible={isSupplementsOpen}
                    onClose={() => setIsSupplementsOpen(false)}
                    meds={meds}
                    onToggle={toggleMed}
                    onRefresh={() => setTimelineRefresh(prev => prev + 1)}
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
                    type={trackingModalType}
                    onClose={() => setTrackingModalType(null)}
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
                                await updateDoc(doc(db, 'children', editingChild.childId), {
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
                                Alert.alert('נוסף!', `"${action.name}" נשמר בהצלחה`);
                            } catch (error) {
                                logger.error('Failed to save custom action:', error);
                                Alert.alert('שגיאה בשמירה');
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
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
        paddingBottom: 140,
    },
    scrollContentCentered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100%',
    },
});