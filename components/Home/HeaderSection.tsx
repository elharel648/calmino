import React, { memo, useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, Alert, ScrollView, Modal, Pressable, Animated as RNAnimated } from 'react-native';
import { BlurView } from 'expo-blur';
import { Camera, Cloud, Plus, X, Link2, UserPlus, Moon, Utensils, Baby as BabyIcon, Pill, Bell, Award, Heart, TrendingUp } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { auth, db } from '../../services/firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import { ChildProfile, MedicationsState } from '../../types/home';
import { useWeather } from '../../hooks/useWeather';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useActiveChild, ActiveChild } from '../../context/ActiveChildContext';
import { notificationStorageService } from '../../services/notificationStorageService';
import { logger } from '../../utils/logger';

interface DailyStats {
    feedCount: number;
    sleepMinutes: number;
    diaperCount: number;
}

interface GrowthStats {
    currentWeight?: string;
    lastWeightDiff?: string;
    currentHeight?: string;
    lastHeightDiff?: string;
    lastMeasuredDate?: Date;
}

interface HeaderSectionProps {
    greeting: string;
    profile: ChildProfile;
    onProfileUpdate?: () => void;
    dynamicStyles: { text: string; textSub: string };
    dailyStats?: DailyStats;
    growthStats?: GrowthStats;
    lastFeedTime?: string;
    lastSleepTime?: string;
    meds?: MedicationsState;
    navigation?: any;
    onAddChild?: () => void;
    onJoinWithCode?: () => void;
    onEditChild?: (child: ActiveChild) => void;
}

// Module-level flag to prevent double animation on tab switch
let hasInitialAnimationRun = false;

/**
 * Premium Minimalist Header - With child avatars row
 */
const HeaderSection = memo<HeaderSectionProps>(({
    greeting,
    profile,
    onProfileUpdate,
    dynamicStyles,
    dailyStats,
    growthStats,
    lastFeedTime,
    lastSleepTime,
    meds,
    navigation,
    onAddChild,
    onJoinWithCode,
    onEditChild,
}) => {
    const { t } = useLanguage();
    const { theme, isDarkMode } = useTheme();
    const { allChildren, activeChild, setActiveChild } = useActiveChild();
    const [uploading, setUploading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const { weather } = useWeather();
    const [unreadCount, setUnreadCount] = useState(0);
    const bellScale = useRef(new RNAnimated.Value(1)).current;
    const pulseAnim = useRef(new RNAnimated.Value(1)).current;

    // Calculate age - Better format with "בן" or "בת"
    const ageText = useMemo(() => {
        if (!profile.birthDate) return '';
        let birth: Date;
        if ((profile.birthDate as any)?.seconds) {
            birth = new Date((profile.birthDate as any).seconds * 1000);
        } else if (profile.birthDate instanceof Date) {
            birth = profile.birthDate;
        } else {
            return '';
        }
        const now = new Date();
        const diffMs = now.getTime() - birth.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        // Determine gender prefix
        const genderPrefix = profile.gender === 'girl' ? 'בת' : profile.gender === 'boy' ? 'בן' : '';

        // Special cases
        if (diffDays === 0) {
            return ''; // Don't show anything for day 0
        }
        if (diffDays === 1) {
            return genderPrefix ? `${genderPrefix} יום אחד` : 'יום אחד';
        }
        if (diffDays < 7) {
            return genderPrefix ? `${genderPrefix} ${diffDays} ימים` : `${diffDays} ימים`;
        }
        if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            const weekText = weeks === 1 ? 'שבוע' : `${weeks} שבועות`;
            return genderPrefix ? `${genderPrefix} ${weekText}` : weekText;
        }
        const months = Math.floor(diffDays / 30);
        if (months < 12) {
            const monthText = months === 1 ? 'חודש' : `${months} חודשים`;
            return genderPrefix ? `${genderPrefix} ${monthText}` : monthText;
        }
        const years = Math.floor(months / 12);
        const remainingMonths = months % 12;
        if (remainingMonths > 0) {
            const yearText = `${years} ${years === 1 ? 'שנה' : 'שנים'} ו-${remainingMonths} חודשים`;
            return genderPrefix ? `${genderPrefix} ${yearText}` : yearText;
        }
        const yearText = `${years} ${years === 1 ? 'שנה' : 'שנים'}`;
        return genderPrefix ? `${genderPrefix} ${yearText}` : yearText;
    }, [profile.birthDate, profile.gender]);

    // Photo upload handler
    const handlePhotoPress = async () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                Alert.alert(t('common.error'), t('header.galleryPermission'));
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });
            if (!result.canceled && result.assets[0].uri) {
                setUploading(true);
                const user = auth.currentUser;
                if (user && profile.id) {
                    await updateDoc(doc(db, 'children', profile.id), {
                        photoUrl: result.assets[0].uri,
                    });
                    onProfileUpdate?.();
                }
                setUploading(false);
            }
        } catch (e) {
            // Error handled silently - user will see upload failed state
            setUploading(false);
        }
    };

    // Handle child selection
    const handleSelectChild = (child: ActiveChild) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setActiveChild(child);
    };

    // Handle plus button
    const handlePlusPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setShowAddModal(true);
    };

    // Handle add new child
    const handleAddNewChild = () => {
        setShowAddModal(false);
        onAddChild?.();
    };

    // Handle join with code
    const handleJoinWithCode = () => {
        setShowAddModal(false);
        onJoinWithCode?.();
    };

    // Handle edit child (long press)
    const handleEditChild = (child: ActiveChild) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onEditChild?.(child);
    };

    // Get initials from name
    const getInitials = (name: string) => {
        return name?.charAt(0) || '?';
    };

    // Format sleep time
    const sleepHours = dailyStats?.sleepMinutes
        ? `${Math.floor(dailyStats.sleepMinutes / 60)}:${String(dailyStats.sleepMinutes % 60).padStart(2, '0')}`
        : '0:00';

    // Smart Reminders & Achievements Cards - Only show 1-2 most relevant
    const smartCards = useMemo(() => {
        const cards: Array<{
            type: string;
            icon: any;
            color: string;
            bgColor: string;
            title: string;
            subtitle: string;
            isUrgent?: boolean;
            priority: number; // Lower = higher priority
        }> = [];

        // Calculate time since last feed
        const getTimeSinceLastFeed = () => {
            if (!lastFeedTime || lastFeedTime === '--:--') return null;
            const [hours, minutes] = lastFeedTime.split(':').map(Number);
            const now = new Date();
            const lastFeed = new Date();
            lastFeed.setHours(hours, minutes, 0, 0);
            if (lastFeed > now) lastFeed.setDate(lastFeed.getDate() - 1);
            const diffMs = now.getTime() - lastFeed.getTime();
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            return { hours: diffHours, mins: diffMins };
        };

        // Priority: Show supplements first if missing, then feed reminders

        // 1. Vitamin D Reminder (Priority 1 - Always show if missing)
        if (!meds?.vitaminD) {
            cards.push({
                type: 'vitamin_reminder',
                icon: Pill,
                color: theme.primary,
                bgColor: '#F3E8FF',
                title: t('notifications.vitaminD'),
                subtitle: t('notifications.notYetToday'),
                isUrgent: true,
                priority: 1,
            });
        }

        // 2. Iron Reminder (Priority 2 - Show if missing)
        if (!meds?.iron) {
            cards.push({
                type: 'iron_reminder',
                icon: Pill,
                color: theme.danger,
                bgColor: '#FEE2E2',
                title: t('notifications.iron'),
                subtitle: t('notifications.notYetToday'),
                isUrgent: true,
                priority: 2,
            });
        }

        // 3. Next Feed Reminder (Priority 3 - Only if no supplements missing)
        if (cards.length === 0) {
            const feedTime = getTimeSinceLastFeed();
            if (feedTime) {
                const isOverdue = feedTime.hours >= 3;
                cards.push({
                    type: 'feed_reminder',
                    icon: Utensils,
                    color: '#F59E0B', // Same orange as Quick Actions
                    bgColor: isOverdue ? '#FEE2E2' : '#FEF3C7',
                    title: isOverdue ? t('notifications.feedReminder') : t('notifications.lastFeed'),
                    subtitle: feedTime.hours > 0
                        ? t('time.hoursAgo', { count: feedTime.hours }) + ' ' + t('time.minutesAgo', { count: feedTime.mins })
                        : t('time.minutesAgo', { count: feedTime.mins }),
                    isUrgent: isOverdue,
                    priority: 3,
                });
            } else {
                cards.push({
                    type: 'feed_reminder',
                    icon: Utensils,
                    color: '#F59E0B', // Same orange as Quick Actions
                    bgColor: '#FEF3C7',
                    title: t('notifications.firstFeed'),
                    subtitle: t('notifications.notYetToday'),
                    priority: 3,
                });
            }
        }

        // Return all cards sorted by priority
        const sortedCards = cards.sort((a, b) => {
            // Urgent cards first
            if (a.isUrgent && !b.isUrgent) return -1;
            if (!a.isUrgent && b.isUrgent) return 1;
            // Then by priority
            return a.priority - b.priority;
        });
        return sortedCards;
    }, [lastFeedTime, meds, dailyStats]);

    // Toast notification - show if there are any cards
    const hasNotifications = smartCards.length > 0;
    
    // Rotate between notifications every 4 seconds
    const [currentNotificationIndex, setCurrentNotificationIndex] = useState(0);
    const notificationSlideAnim = useRef(new RNAnimated.Value(0)).current;
    const notificationOpacity = useRef(new RNAnimated.Value(1)).current;
    
    useEffect(() => {
        if (smartCards.length <= 1) {
            setCurrentNotificationIndex(0);
            notificationSlideAnim.setValue(0);
            notificationOpacity.setValue(1);
            return;
        }
        
        const interval = setInterval(() => {
            // Slide out down and fade out
            RNAnimated.parallel([
                RNAnimated.timing(notificationSlideAnim, {
                    toValue: 100,
                    duration: 400,
                    useNativeDriver: true,
                }),
                RNAnimated.timing(notificationOpacity, {
                    toValue: 0,
                    duration: 400,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                // Change notification
                setCurrentNotificationIndex((prev) => (prev + 1) % smartCards.length);
                // Reset position (start from bottom)
                notificationSlideAnim.setValue(-50);
                // Slide in from bottom and fade in (slow animation)
                RNAnimated.parallel([
                    RNAnimated.timing(notificationSlideAnim, {
                        toValue: 0,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                    RNAnimated.timing(notificationOpacity, {
                        toValue: 1,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                ]).start();
            });
        }, 4000); // Change every 4 seconds
        
        return () => clearInterval(interval);
    }, [smartCards.length, notificationSlideAnim, notificationOpacity]);
    
    const currentNotification = smartCards[currentNotificationIndex] || smartCards[0];

    // Animations for toast slide-up effect
    const toastTranslateY = useRef(new RNAnimated.Value(hasInitialAnimationRun ? 0 : 30)).current;
    const toastOpacity = useRef(new RNAnimated.Value(hasInitialAnimationRun ? 1 : 0)).current;

    // Smooth slide-up animation for toast notifications
    useEffect(() => {
        if (!hasNotifications) {
            // Hide if no notifications
            toastOpacity.setValue(0);
            return;
        }

        // Only run initial entry animation once (not on every tab switch)
        if (!hasInitialAnimationRun) {
            hasInitialAnimationRun = true;
            RNAnimated.parallel([
                RNAnimated.timing(toastTranslateY, {
                    toValue: 0,
                    duration: 350,
                    useNativeDriver: true,
                }),
                RNAnimated.timing(toastOpacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else if (hasNotifications) {
            // Show if notification appears
            RNAnimated.parallel([
                RNAnimated.timing(toastTranslateY, {
                    toValue: 0,
                    duration: 350,
                    useNativeDriver: true,
                }),
                RNAnimated.timing(toastOpacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [hasNotifications, toastTranslateY, toastOpacity]);

    const NotificationIcon = currentNotification?.icon;

    // Fetch unread notification count
    useEffect(() => {
        const fetchUnreadCount = async () => {
            try {
                const count = await notificationStorageService.getUnreadCount();
                setUnreadCount(count);
            } catch (error) {
                if (__DEV__) console.log('Failed to fetch unread count:', error);
            }
        };

        fetchUnreadCount();
        
        // Refresh every 10 seconds (more frequent for better UX)
        const interval = setInterval(fetchUnreadCount, 10000);
        return () => clearInterval(interval);
    }, []);

    // Listen for new notifications to update count
    useEffect(() => {
        const subscription = Notifications.addNotificationReceivedListener(async () => {
            // Refresh count when new notification arrives
            const count = await notificationStorageService.getUnreadCount();
            setUnreadCount(count);
        });

        return () => {
            subscription.remove();
        };
    }, []);

    // Pulse animation when there are unread notifications
    useEffect(() => {
        if (unreadCount > 0) {
            const pulse = RNAnimated.loop(
                RNAnimated.sequence([
                    RNAnimated.timing(pulseAnim, {
                        toValue: 1.15,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    RNAnimated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            );
            pulse.start();
            return () => pulse.stop();
        } else {
            pulseAnim.setValue(1);
        }
    }, [unreadCount, pulseAnim]);

    return (
        <View style={styles.container}>
            {/* Top Row: Greeting + Weather */}
            <View style={styles.topRow}>
                <View style={styles.greetingSection}>
                    <Text style={[styles.greetingLarge, { color: theme.textPrimary }]}>
                        {greeting}, {profile.name}
                    </Text>
                    {ageText ? (
                        <Text style={[styles.ageText, { color: theme.textSecondary }]}>
                            {ageText}
                        </Text>
                    ) : null}
                </View>

                {/* Weather + Notification Group */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {/* Premium Notification Bell */}
                    <TouchableOpacity
                        style={styles.notificationBell}
                        activeOpacity={0.7}
                        onPress={() => {
                            if (Platform.OS !== 'web') {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }
                            // Animate bell press
                            RNAnimated.sequence([
                                RNAnimated.timing(bellScale, {
                                    toValue: 0.9,
                                    duration: 100,
                                    useNativeDriver: true,
                                }),
                                RNAnimated.timing(bellScale, {
                                    toValue: 1,
                                    duration: 100,
                                    useNativeDriver: true,
                                }),
                            ]).start();
                            navigation?.navigate('Notifications');
                        }}
                    >
                        <RNAnimated.View style={{ transform: [{ scale: bellScale }] }}>
                            <View style={[
                                styles.bellContainer, 
                                { backgroundColor: theme.inputBackground },
                                unreadCount > 0 && [styles.bellContainerActive, { backgroundColor: isDarkMode ? 'rgba(139,92,246,0.2)' : theme.primaryLight }]
                            ]}>
                                <Bell 
                                    size={22} 
                                    color={unreadCount > 0 ? theme.primary : theme.textTertiary} 
                                    strokeWidth={2.5}
                                    fill={unreadCount > 0 ? (isDarkMode ? 'rgba(59,130,246,0.2)' : '#3B82F620') : "none"}
                                />
                            </View>
                        </RNAnimated.View>
                        {/* Badge with count */}
                        {unreadCount > 0 && (
                            <RNAnimated.View 
                                style={[
                                    styles.notificationBadge,
                                    { 
                                        backgroundColor: theme.danger,
                                        borderColor: theme.card,
                                        shadowColor: theme.danger,
                                        transform: [{ scale: pulseAnim }] 
                                    }
                                ]}
                            >
                                <Text style={[styles.badgeText, { color: theme.card }]}>
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </Text>
                            </RNAnimated.View>
                        )}
                    </TouchableOpacity>

                    {weather && (
                        <View style={[styles.weatherBadge, { backgroundColor: theme.cardSecondary }]}>
                            <Cloud size={14} color={theme.textTertiary} />
                            <Text style={[styles.weatherText, { color: theme.textSecondary }]}>{weather.city} {weather.temp}°</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Children Avatars Row - Only show if 2+ children */}
            {allChildren.length > 1 && (
                <View style={styles.childrenRow}>
                    {/* Avatars container - Scrollable for multiple children */}
                    <View style={styles.avatarsScrollView}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.avatarsScrollContent}
                        >
                            {allChildren.map((child) => {
                                const isActive = activeChild?.childId === child.childId;
                                return (
                                    <TouchableOpacity
                                        key={child.childId}
                                        style={[
                                            styles.childAvatar,
                                            isActive && styles.childAvatarActive
                                        ]}
                                        onPress={() => handleSelectChild(child)}
                                        onLongPress={() => handleEditChild(child)}
                                        delayLongPress={300}
                                        activeOpacity={0.7}
                                    >
                                        {child.photoUrl ? (
                                            <Image 
                                                source={{ uri: child.photoUrl }} 
                                                style={styles.childAvatarImage}
                                                onError={() => {
                                                    // Image failed to load - will show placeholder
                                                }}
                                            />
                                        ) : (
                                            <View style={[
                                                styles.childAvatarPlaceholder,
                                                { backgroundColor: isActive ? theme.textPrimary : theme.border }
                                            ]}>
                                                <Text style={[
                                                    styles.childInitial,
                                                    { color: isActive ? theme.card : theme.textSecondary }
                                                ]}>
                                                    {getInitials(child.childName)}
                                                </Text>
                                            </View>
                                        )}
                                        {isActive && (
                                            <View style={styles.activeIndicator} />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>

                    {/* Plus Button */}
                    <TouchableOpacity
                        style={[styles.addChildBtn, { borderColor: theme.border }]}
                        onPress={handlePlusPress}
                        activeOpacity={0.7}
                    >
                        <Plus size={18} color={theme.textTertiary} />
                    </TouchableOpacity>
                </View>
            )}

            {/* Single child - show add button inline */}
            {allChildren.length === 1 && (
                <TouchableOpacity
                    style={styles.singleChildAddBtn}
                    onPress={handlePlusPress}
                    activeOpacity={0.7}
                >
                    <Plus size={16} color={theme.textTertiary} />
                    <Text style={styles.singleChildAddText}>{t('header.addChild')}</Text>
                </TouchableOpacity>
            )}

            {/* Toast-Style Notification - Rotating between cards */}
            {hasNotifications && currentNotification && (
                <RNAnimated.View
                    style={[
                        styles.toastNotification,
                        {
                            opacity: RNAnimated.multiply(toastOpacity, notificationOpacity),
                            transform: [
                                { translateY: RNAnimated.add(toastTranslateY, notificationSlideAnim) }
                            ],
                            backgroundColor: theme.card,
                            borderColor: theme.border,
                        }
                    ]}
                >
                    {/* Icon */}
                    <View style={[styles.toastIcon, { backgroundColor: currentNotification.bgColor, borderColor: theme.border || '#E5E7EB', borderWidth: 1.5 }]}>
                        {Platform.OS === 'ios' && (
                            <BlurView
                                intensity={60}
                                tint={isDarkMode ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterialLight'}
                                style={StyleSheet.absoluteFill}
                            />
                        )}
                        <View style={[
                            styles.toastIconGlass,
                            { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.6)' }
                        ]} />
                        <NotificationIcon size={16} color={currentNotification.color} strokeWidth={2} />
                    </View>

                    {/* Content */}
                    <View style={styles.toastContent}>
                        <Text style={[styles.toastTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                            {currentNotification.title}
                        </Text>
                    </View>

                    {/* Time Badge */}
                    <Text style={[styles.toastTime, { color: theme.textSecondary }]} numberOfLines={1}>
                        {currentNotification.subtitle}
                    </Text>
                </RNAnimated.View>
            )}


            {/* Add Child Modal */}
            <Modal visible={showAddModal} transparent animationType="fade">
                <Pressable style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay }]} onPress={() => setShowAddModal(false)}>
                    <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                        <TouchableOpacity
                            style={styles.modalClose}
                            onPress={() => setShowAddModal(false)}
                        >
                            <X size={20} color={theme.textSecondary} />
                        </TouchableOpacity>

                        <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{t('header.addChildTitle')}</Text>

                        {/* Option 1: New Child */}
                        <TouchableOpacity
                            style={[styles.modalOption, { backgroundColor: theme.cardSecondary }]}
                            onPress={handleAddNewChild}
                            activeOpacity={0.7}
                        >
                            <View style={[
                                styles.modalOptionIcon, 
                                { 
                                    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.6)',
                                    borderColor: theme.border || '#E5E7EB',
                                    borderWidth: 1.5
                                }
                            ]}>
                                {Platform.OS === 'ios' && (
                                    <BlurView
                                        intensity={60}
                                        tint={isDarkMode ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterialLight'}
                                        style={StyleSheet.absoluteFill}
                                    />
                                )}
                                <View style={[
                                    styles.modalOptionIconGlass,
                                    { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.6)' }
                                ]} />
                                <UserPlus size={24} color={theme.primary} />
                            </View>
                            <View style={styles.modalOptionText}>
                                <Text style={[styles.modalOptionTitle, { color: theme.textPrimary }]}>{t('header.registerNewChild')}</Text>
                                <Text style={[styles.modalOptionSubtitle, { color: theme.textSecondary }]}>{t('header.registerNewChildSubtitle')}</Text>
                            </View>
                        </TouchableOpacity>

                        {/* Option 2: Join with Code */}
                        <TouchableOpacity
                            style={[styles.modalOption, { backgroundColor: theme.cardSecondary }]}
                            onPress={handleJoinWithCode}
                            activeOpacity={0.7}
                        >
                            <View style={[
                                styles.modalOptionIcon, 
                                { 
                                    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.6)',
                                    borderColor: theme.border || '#E5E7EB',
                                    borderWidth: 1.5
                                }
                            ]}>
                                {Platform.OS === 'ios' && (
                                    <BlurView
                                        intensity={60}
                                        tint={isDarkMode ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterialLight'}
                                        style={StyleSheet.absoluteFill}
                                    />
                                )}
                                <View style={[
                                    styles.modalOptionIconGlass,
                                    { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.6)' }
                                ]} />
                                <Link2 size={24} color={theme.success} />
                            </View>
                            <View style={styles.modalOptionText}>
                                <Text style={[styles.modalOptionTitle, { color: theme.textPrimary }]}>{t('header.joinWithCode')}</Text>
                                <Text style={[styles.modalOptionSubtitle, { color: theme.textSecondary }]}>{t('header.joinWithCodeSubtitle')}</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>
        </View >
    );
});

HeaderSection.displayName = 'HeaderSection';

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },

    // Top Row
    topRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    greetingSection: {
        alignItems: 'flex-end',
        flex: 1,
    },
    greetingLarge: {
        fontSize: 17,
        fontWeight: '600',
        letterSpacing: -0.3,
        marginBottom: 0,
    },
    ageText: {
        fontSize: 14,
        fontWeight: '400',
        letterSpacing: -0.2,
        marginTop: 2,
    },
    greetingSubtitle: {
        fontSize: 15,
        fontWeight: '400',
    },
    greeting: {
        fontSize: 14,
        fontWeight: '500',
    },

    // Weather
    weatherBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
    },
    weatherText: {
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: -0.2,
    },

    // Children Row - RTL aligned to right side
    childrenRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginBottom: 12,
    },
    singleChildAddBtn: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.02)',
        alignSelf: 'flex-start',
        marginBottom: 12,
    },
    singleChildAddText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#9CA3AF',
    },
    avatarsContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
    },
    avatarsScrollView: {
        flexShrink: 0,
    },
    avatarsScrollContent: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 4,
    },

    // Adjust children scroll content spacing for names
    childrenScrollContent: {
        flexDirection: 'row',
        paddingHorizontal: 4,
        gap: 10,
    },
    childAvatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
    },
    childAvatarActive: {
        borderWidth: 2,
        borderColor: '#374151',
    },
    childAvatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 21,
    },
    childAvatarPlaceholder: {
        width: '100%',
        height: '100%',
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
    },
    childInitial: {
        fontSize: 16,
        fontWeight: '600',
    },
    activeIndicator: {
        position: 'absolute',
        bottom: -3,
        left: '50%',
        marginLeft: -3,
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#10B981',
    },
    addChildBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },

    // Toast Notification - Single Pill Style
    toastNotification: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 24,
        borderWidth: 1,
        gap: 10,
    },
    toastIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    toastIconGlass: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 16,
    },
    toastContent: {
        flex: 1,
        alignItems: 'flex-end',
    },
    toastTitle: {
        fontSize: 14,
        fontWeight: '600',
    },
    toastTime: {
        fontSize: 12,
        fontWeight: '500',
    },
    notificationBell: {
        padding: 8,
        position: 'relative',
    },
    bellContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bellContainerActive: {
    },
    notificationBadge: {
        position: 'absolute',
        top: 2,
        right: 2,
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '700',
        textAlign: 'center',
    },

    // Modal
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        borderRadius: 28,
        padding: 28,
        width: '100%',
        maxWidth: 360,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
        elevation: 12,
    },
    modalClose: {
        position: 'absolute',
        top: 16,
        left: 16,
        zIndex: 10,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 24,
        letterSpacing: -0.5,
    },
    modalOption: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        padding: 18,
        borderRadius: 18,
        marginBottom: 12,
    },
    modalOptionIcon: {
        width: 52,
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    modalOptionIconGlass: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 14,
    },
    modalOptionText: {
        flex: 1,
        marginRight: 14,
        alignItems: 'flex-end',
    },
    modalOptionTitle: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    modalOptionSubtitle: {
        fontSize: 13,
        marginTop: 4,
        letterSpacing: -0.2,
    },
});

export default HeaderSection;
