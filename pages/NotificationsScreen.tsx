import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Bell, ChevronRight, Clock, Utensils, Moon, Pill, CheckCircle2, X, Trash2, Sparkles } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { notificationStorageService, StoredNotification } from '../services/notificationStorageService';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export default function NotificationsScreen() {
    const navigation = useNavigation();
    const { isDarkMode } = useTheme();
    const [refreshing, setRefreshing] = useState(false);
    const [notifications, setNotifications] = useState<StoredNotification[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch notifications from Firebase
    const fetchNotifications = useCallback(async () => {
        try {
            const data = await notificationStorageService.getNotifications();
            setNotifications(data);
        } catch (error) {
            if (__DEV__) console.log('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Load on mount
    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Listen for new notifications and refresh
    useEffect(() => {
        const subscription = Notifications.addNotificationReceivedListener(async (notification) => {
            // Refresh notifications list when new one arrives
            await fetchNotifications();
        });

        return () => {
            subscription.remove();
        };
    }, [fetchNotifications]);

    // Refresh when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            fetchNotifications();
        }, [fetchNotifications])
    );

    const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

    const getIcon = (type: StoredNotification['type']) => {
        switch (type) {
            case 'feed': return Utensils;
            case 'sleep': return Moon;
            case 'medication': return Pill;
            case 'achievement': return CheckCircle2;
            default: return Bell;
        }
    };

    const getIconColor = (type: StoredNotification['type']) => {
        switch (type) {
            case 'feed': return '#F59E0B';
            case 'sleep': return '#8B5CF6';
            case 'medication': return '#EF4444';
            case 'achievement': return '#10B981';
            default: return '#6366F1';
        }
    };

    const formatTime = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 60) return `לפני ${minutes} דקות`;
        if (hours < 24) return `לפני ${hours} שעות`;
        return `לפני ${days} ימים`;
    };

    const markAsRead = async (id: string) => {
        if (!id) return;
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        await notificationStorageService.markAsRead(id);
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, isRead: true } : n)
        );
    };

    const markAllAsRead = async () => {
        await notificationStorageService.markAllAsRead();
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    };

    const dismissNotification = async (id: string) => {
        if (!id) return;
        await notificationStorageService.deleteNotification(id);
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const clearAllNotifications = async () => {
        Alert.alert(
            'נקה הכל',
            'האם למחוק את כל ההתראות?',
            [
                { text: 'ביטול', style: 'cancel' },
                {
                    text: 'מחק הכל',
                    style: 'destructive',
                    onPress: async () => {
                        await notificationStorageService.clearAll();
                        setNotifications([]);
                    }
                }
            ]
        );
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchNotifications();
        setRefreshing(false);
    };

    return (
        <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ChevronRight size={24} color={isDarkMode ? '#fff' : '#1C1C1E'} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, isDarkMode && styles.textDark]}>התראות</Text>
                <View style={styles.headerActions}>
                    {unreadCount > 0 && (
                        <TouchableOpacity onPress={markAllAsRead} style={styles.markAllBtn}>
                            <Text style={styles.markAllText}>סמן הכל</Text>
                        </TouchableOpacity>
                    )}
                    {notifications.length > 0 && (
                        <TouchableOpacity onPress={clearAllNotifications} style={styles.clearBtn}>
                            <Trash2 size={18} color="#EF4444" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Notifications List */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {notifications.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Bell size={48} color={isDarkMode ? '#4B5563' : '#D1D5DB'} strokeWidth={1.5} />
                        <Text style={[styles.emptyTitle, isDarkMode && styles.textDark]}>אין התראות</Text>
                        <Text style={[styles.emptySubtitle, isDarkMode && styles.textSecondaryDark]}>
                            כאן יופיעו התראות ותזכורות
                        </Text>
                    </View>
                ) : (
                    <View style={[styles.listContainer, isDarkMode && { backgroundColor: '#2C2C2E' }]}>
                        {notifications.map((notification, index) => {
                            const Icon = getIcon(notification.type);
                            const iconColor = getIconColor(notification.type);

                            return (
                                <React.Fragment key={notification.id}>
                                    <Animated.View
                                        style={[
                                            styles.notificationCard,
                                            !notification.isRead && styles.notificationUnread,
                                            notification.isUrgent && styles.notificationUrgent,
                                            isDarkMode && styles.cardDark,
                                            index === 0 && { borderTopLeftRadius: 20, borderTopRightRadius: 20 },
                                            index === notifications.length - 1 && { borderBottomLeftRadius: 20, borderBottomRightRadius: 20, borderBottomWidth: 0 },
                                        ]}
                                    >
                                        <TouchableOpacity
                                            style={styles.notificationTouchable}
                                            onPress={() => markAsRead(notification.id)}
                                            activeOpacity={0.7}
                                        >
                                            {/* Icon */}
                                            <View style={[
                                                styles.iconContainer,
                                                { backgroundColor: `${iconColor}15` },
                                            ]}>
                                                <Icon size={18} color={iconColor} strokeWidth={2} />
                                            </View>

                                            {/* Content */}
                                            <View style={styles.notificationContent}>
                                                <View style={styles.notificationTitleRow}>
                                                    {!notification.isRead && (
                                                        <View style={[styles.unreadDot, { backgroundColor: iconColor }]} />
                                                    )}
                                                    <Text style={[styles.notificationTitle, isDarkMode && styles.textDark]}>
                                                        {notification.title}
                                                    </Text>
                                                </View>
                                                <Text style={[styles.notificationMessage, isDarkMode && styles.textSecondaryDark]}>
                                                    {notification.message}
                                                </Text>
                                                <View style={styles.notificationMeta}>
                                                    <Text style={[styles.notificationTime, isDarkMode && styles.textTertiaryDark]}>
                                                        {formatTime(notification.timestamp)}
                                                    </Text>
                                                    <Clock size={12} color={isDarkMode ? '#9CA3AF' : '#6B7280'} />
                                                </View>
                                            </View>
                                        </TouchableOpacity>

                                        {/* Dismiss button */}
                                        <TouchableOpacity
                                            style={styles.dismissBtn}
                                            onPress={() => {
                                                if (Platform.OS !== 'web') {
                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                }
                                                dismissNotification(notification.id);
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <X size={18} color={isDarkMode ? '#9CA3AF' : '#6B7280'} />
                                        </TouchableOpacity>
                                    </Animated.View>
                                </React.Fragment>
                            );
                        })}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    containerDark: {
        backgroundColor: '#1C1C1E',
    },
    header: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E5E7EB',
    },
    backBtn: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 34,
        fontWeight: '700',
        letterSpacing: 0.37,
        color: '#1C1C1E',
    },
    textDark: {
        color: '#FFFFFF',
    },
    markAllBtn: {
        padding: 4,
    },
    markAllText: {
        fontSize: 15,
        color: '#6366F1',
        fontWeight: '400',
        letterSpacing: -0.24,
    },
    headerActions: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 12,
    },
    clearBtn: {
        padding: 8,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 20,
    },
    listContainer: {
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 1,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
    },
    emptyTitle: {
        fontSize: 17,
        fontWeight: '400',
        letterSpacing: -0.41,
        color: '#6B7280',
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 13,
        fontWeight: '400',
        letterSpacing: -0.08,
        color: '#9CA3AF',
        marginTop: 4,
    },
    notificationCard: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginBottom: 0,
        backgroundColor: '#FFFFFF',
        borderRadius: 0,
        borderWidth: 0,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E5E7EB',
        shadowColor: 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
        overflow: 'visible',
    },
    notificationTouchable: {
        flex: 1,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
        minHeight: 56,
    },
    notificationUnread: {
        backgroundColor: '#F0F9FF',
    },
    notificationUrgent: {
        borderRightWidth: 3,
        borderRightColor: '#EF4444',
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    cardDark: {
        backgroundColor: '#2C2C2E',
        borderBottomColor: '#3A3A3C',
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
        position: 'relative',
    },
    iconGlow: {
        position: 'absolute',
        width: 32,
        height: 32,
        borderRadius: 8,
        opacity: 0.5,
    },
    notificationContent: {
        flex: 1,
        alignItems: 'flex-end',
    },
    notificationTitleRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        marginBottom: 2,
    },
    notificationTitle: {
        fontSize: 17,
        fontWeight: '400',
        letterSpacing: -0.41,
        color: '#1C1C1E',
    },
    notificationMessage: {
        fontSize: 13,
        color: '#6B7280',
        lineHeight: 18,
        marginBottom: 4,
        letterSpacing: -0.08,
    },
    notificationMeta: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 4,
    },
    notificationTime: {
        fontSize: 13,
        color: '#9CA3AF',
        fontWeight: '400',
        letterSpacing: -0.08,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#3B82F6',
    },
    textSecondaryDark: {
        color: '#9CA3AF',
    },
    textTertiaryDark: {
        color: '#6B7280',
    },
    emptyIconContainer: {
        position: 'relative',
        marginBottom: 20,
    },
    emptyIconGlow: {
        position: 'absolute',
        width: 80,
        height: 80,
        borderRadius: 40,
        top: -12,
        left: -12,
    },
    dismissBtn: {
        padding: 8,
        marginLeft: 8,
    },
});
