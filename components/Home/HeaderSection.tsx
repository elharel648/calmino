import React, { memo, useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, Alert, ScrollView, Modal, Pressable } from 'react-native';
import { Cloud, Plus, X, Link2, UserPlus, Utensils, Pill, Bell } from 'lucide-react-native';
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
import { TYPOGRAPHY, SPACING } from '../../utils/designSystem';

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


    // Fetch unread notification count
    useEffect(() => {
        const fetchUnreadCount = async () => {
            try {
                const count = await notificationStorageService.getUnreadCount();
                setUnreadCount(count);
            } catch (error) {
                logger.log('Failed to fetch unread count:', error);
            }
        };

        fetchUnreadCount();

        // Refresh every 60 seconds — new notifications trigger immediate update via listener below
        const interval = setInterval(fetchUnreadCount, 60000);
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

                {/* Notification + Weather */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {/* Simple Bell */}
                    <TouchableOpacity
                        style={styles.notificationBell}
                        activeOpacity={0.6}
                        onPress={() => {
                            if (Platform.OS !== 'web') {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }
                            navigation?.navigate('Notifications');
                        }}
                    >
                        <Bell size={22} color={theme.textSecondary} strokeWidth={1.5} />
                        {unreadCount > 0 && (
                            <View style={[styles.notificationDot, { backgroundColor: '#007AFF' }]} />
                        )}
                    </TouchableOpacity>

                    {weather && (
                        <Text style={[styles.weatherText, { color: theme.textTertiary }]}>
                            <Cloud size={13} color={theme.textTertiary} /> {weather.temp}°
                        </Text>
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
                    <Text style={[styles.singleChildAddText, { color: theme.textTertiary }]}>{t('header.addChild')}</Text>
                </TouchableOpacity>
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
                            activeOpacity={0.6}
                        >
                            <View style={[styles.modalOptionIcon, { backgroundColor: theme.primaryLight }]}>
                                <UserPlus size={22} color={theme.primary} strokeWidth={1.8} />
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
                            activeOpacity={0.6}
                        >
                            <View style={[styles.modalOptionIcon, { backgroundColor: theme.successLight }]}>
                                <Link2 size={22} color={theme.success} strokeWidth={1.8} />
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
        marginBottom: SPACING.xxl,
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
        fontSize: 22,
        fontWeight: '600',
        letterSpacing: -0.4,
    },
    ageText: {
        fontSize: 15,
        fontWeight: '400',
        marginTop: 2,
    },
    weatherText: {
        fontSize: 13,
        fontWeight: '400',
    },

    // Children Row - RTL aligned to right side
    childrenRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    singleChildAddBtn: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
        borderRadius: SPACING.md,
        backgroundColor: 'rgba(0,0,0,0.02)',
        alignSelf: 'flex-start',
        marginBottom: SPACING.md,
    },
    singleChildAddText: {
        ...TYPOGRAPHY.labelSmall,
        fontWeight: '500',
    },
    avatarsContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    avatarsScrollView: {
        flexShrink: 0,
    },
    avatarsScrollContent: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: SPACING.sm,
        paddingHorizontal: SPACING.xs,
    },

    // Adjust children scroll content spacing for names
    childrenScrollContent: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.xs,
        gap: 10,
    },
    childAvatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
    },
    childAvatarActive: {
        borderWidth: 2,
        borderColor: '#1C1C1E',
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
        ...TYPOGRAPHY.body,
        fontWeight: '600',
    },
    activeIndicator: {
        position: 'absolute',
        bottom: -4,
        alignSelf: 'center',
        left: '50%',
        marginLeft: -5,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#34C759',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    addChildBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: SPACING.sm,
    },

    // Notification Bell
    notificationBell: {
        padding: 6,
        position: 'relative',
    },
    notificationDot: {
        position: 'absolute',
        top: 2,
        right: 2,
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 1.5,
        borderColor: '#FFFFFF',
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#FFFFFF',
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
        ...TYPOGRAPHY.h3,
        textAlign: 'center',
        marginBottom: 24,
    },
    modalOption: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        padding: 18,
        borderRadius: 18,
        marginBottom: 12,
    },
    modalOptionIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalOptionText: {
        flex: 1,
        marginRight: 14,
        alignItems: 'flex-end',
    },
    modalOptionTitle: {
        ...TYPOGRAPHY.body,
        fontWeight: '700',
    },
    modalOptionSubtitle: {
        ...TYPOGRAPHY.labelSmall,
        fontWeight: '500',
        marginTop: 4,
    },
});

export default HeaderSection;
