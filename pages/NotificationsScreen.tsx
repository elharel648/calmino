import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Bell, ChevronRight, Clock, Utensils, Moon, Pill, CheckCircle2, X, Trash2, Sparkles } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { notificationStorageService, StoredNotification } from '../services/notificationStorageService';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { logger } from '../utils/logger';
import { useLanguage } from '../context/LanguageContext';

export default function NotificationsScreen() {
    const { t } = useLanguage();
    const navigation = useNavigation();
    const { theme, isDarkMode } = useTheme();
    const [refreshing, setRefreshing] = useState(false);
    const [notifications, setNotifications] = useState<StoredNotification[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch notifications from Firebase
    const fetchNotifications = useCallback(async () => {
        try {
            const data = await notificationStorageService.getNotifications();
            setNotifications(data);
        } catch (error) {
            logger.log('Failed to fetch notifications:', error);
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

    // Monochromatic design - no colors needed
    const getIconColor = () => {
        return isDarkMode ? '#fff' : '#000';
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
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('notifications.deleteAll'),
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
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ChevronRight size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>{t('notifications.title')}</Text>
                <View style={styles.headerActions}>
                    {unreadCount > 0 && (
                        <TouchableOpacity onPress={markAllAsRead} style={styles.markAllBtn}>
                            <Text style={[styles.markAllText, { color: theme.textPrimary }]}>סמן הכל</Text>
                        </TouchableOpacity>
                    )}
                    {notifications.length > 0 && (
                        <TouchableOpacity onPress={clearAllNotifications} style={styles.clearBtn}>
                            <Trash2 size={18} color={theme.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Notifications List */}
            <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    notifications.length > 0 && styles.listContainer,
                    { backgroundColor: notifications.length > 0 ? theme.card : 'transparent' }
                ]}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <View style={{
                            width: 80, height: 80, borderRadius: 40,
                            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F3F4F6',
                            alignItems: 'center', justifyContent: 'center', marginBottom: 20,
                            borderWidth: 1, borderColor: theme.border
                        }}>
                            <Bell size={32} color={theme.textSecondary} strokeWidth={1.5} />
                        </View>
                        <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>אין התראות מיוחדות</Text>
                        <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                            ההתראות שלך יופיעו כאן כשיגיעו
                        </Text>
                    </View>
                }
                renderItem={({ item: notification, index }) => {
                    const Icon = getIcon(notification.type);
                    const iconColor = getIconColor();

                    return (
                        <Animated.View
                            style={[
                                styles.notificationCard,
                                !notification.isRead && { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : '#F0F9FF' },
                                notification.isUrgent && styles.notificationUrgent,
                                { backgroundColor: theme.card, borderBottomColor: theme.border },
                                index === 0 && { borderTopLeftRadius: 20, borderTopRightRadius: 20 },
                                index === notifications.length - 1 && { borderBottomLeftRadius: 20, borderBottomRightRadius: 20, borderBottomWidth: 0 },
                            ]}
                        >
                            <TouchableOpacity
                                style={styles.notificationTouchable}
                                onPress={() => markAsRead(notification.id)}
                                activeOpacity={0.7}
                            >
                                {/* Icon - Monochromatic */}
                                <View style={[
                                    styles.iconContainer,
                                    { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)' },
                                ]}>
                                    <Icon size={18} color={iconColor} strokeWidth={2} />
                                </View>

                                {/* Content */}
                                <View style={styles.notificationContent}>
                                    <View style={styles.notificationTitleRow}>
                                        {!notification.isRead && (
                                            <View style={[styles.unreadDot, { backgroundColor: isDarkMode ? '#fff' : '#000' }]} />
                                        )}
                                        <Text style={[styles.notificationTitle, { color: theme.textPrimary }]}>
                                            {notification.title}
                                        </Text>
                                    </View>
                                    <Text style={[styles.notificationMessage, { color: theme.textSecondary }]}>
                                        {notification.message}
                                    </Text>
                                    <View style={styles.notificationMeta}>
                                        <Text style={[styles.notificationTime, { color: theme.textTertiary }]}>
                                            {formatTime(notification.timestamp)}
                                        </Text>
                                        <Clock size={12} color={theme.textTertiary} />
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
                                <X size={18} color={theme.textTertiary} />
                            </TouchableOpacity>
                        </Animated.View>
                    );
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backBtn: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 34,
        fontWeight: '700',
        letterSpacing: 0.37,
    },
    markAllBtn: {
        padding: 4,
    },
    markAllText: {
        fontSize: 15,
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
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 13,
        fontWeight: '400',
        letterSpacing: -0.08,
        marginTop: 4,
    },
    notificationCard: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginBottom: 0,
        borderRadius: 0,
        borderWidth: 0,
        borderBottomWidth: StyleSheet.hairlineWidth,
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
    },
    notificationMessage: {
        fontSize: 13,
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
        fontWeight: '400',
        letterSpacing: -0.08,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
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
