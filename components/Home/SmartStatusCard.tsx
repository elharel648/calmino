import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Baby, Utensils, Moon, AlertCircle, Clock, Sparkles } from 'lucide-react-native';
import { useSleepTimer } from '../../context/SleepTimerContext';
import { useTheme } from '../../context/ThemeContext';

interface SmartStatusCardProps {
    babyName: string;
    birthDate: any; // Firebase Timestamp or Date
    lastFeedTime: string;
    lastSleepTime: string;
    onPress?: () => void;
}

// Calculate age from birth date
const calculateAge = (birthDate: any): string => {
    if (!birthDate) return '';

    const now = new Date();
    let birth: Date;

    if (birthDate?.seconds) {
        birth = new Date(birthDate.seconds * 1000);
    } else if (birthDate instanceof Date) {
        birth = birthDate;
    } else {
        return '';
    }

    const diffMs = now.getTime() - birth.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 7) {
        return `${diffDays} ימים`;
    } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `${weeks} שבועות`;
    } else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        return `${months} חודשים`;
    } else {
        const years = Math.floor(diffDays / 365);
        const months = Math.floor((diffDays % 365) / 30);
        return months > 0 ? `שנה ו-${months} חודשים` : 'שנה';
    }
};

// Parse time string to get hours since event
const getHoursSince = (timeStr: string): number => {
    if (!timeStr || timeStr === '--:--') return -1;

    // Format is HH:MM
    const match = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (!match) return -1;

    const [_, hours, minutes] = match;
    const eventTime = new Date();
    eventTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    const now = new Date();
    const diffMs = now.getTime() - eventTime.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    // If negative, event was yesterday
    if (diffHours < 0) return diffHours + 24;
    return diffHours;
};

// Generate smart alert
const getSmartAlert = (lastFeedTime: string, lastSleepTime: string, isSleeping: boolean): { text: string; icon: any; color: string } | null => {
    if (isSleeping) {
        return null; // Don't show alerts while sleeping
    }

    const hoursSinceFeed = getHoursSince(lastFeedTime);
    const hoursSinceSleep = getHoursSince(lastSleepTime);

    // Priority: Feed > Sleep
    if (hoursSinceFeed >= 3) {
        return { text: '🍼 הגיע זמן לאכול?', icon: Utensils, color: '#F59E0B' };
    }

    if (hoursSinceSleep >= 2) {
        return { text: '😴 אולי הגיע זמן לנמנם?', icon: Moon, color: '#6366F1' };
    }

    return null;
};

const SmartStatusCard = memo(({
    babyName,
    birthDate,
    lastFeedTime,
    lastSleepTime,
    onPress
}: SmartStatusCardProps) => {
    const { theme, isDarkMode } = useTheme();
    const { isRunning, elapsedSeconds, formatTime } = useSleepTimer();

    const age = useMemo(() => calculateAge(birthDate), [birthDate]);
    const alert = useMemo(
        () => getSmartAlert(lastFeedTime, lastSleepTime, isRunning),
        [lastFeedTime, lastSleepTime, isRunning]
    );

    // Format last event
    const lastEventText = useMemo(() => {
        const parts: string[] = [];
        if (lastFeedTime && lastFeedTime !== '--:--') {
            parts.push(`🍼 ${lastFeedTime}`);
        }
        if (lastSleepTime && lastSleepTime !== '--:--') {
            parts.push(`😴 ${lastSleepTime}`);
        }
        return parts.length > 0 ? parts.join(' • ') : 'עדיין אין תיעודים';
    }, [lastFeedTime, lastSleepTime]);

    return (
        <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
            <LinearGradient
                colors={isRunning 
                    ? [theme.primary, theme.primaryLight] 
                    : isDarkMode 
                        ? [theme.card, theme.cardSecondary] 
                        : [theme.card, theme.cardSecondary]
                }
                style={styles.card}
            >
                {/* Main Info Row */}
                <View style={styles.mainRow}>
                    <View style={[styles.avatarCircle, { backgroundColor: isRunning ? 'rgba(255,255,255,0.25)' : (isDarkMode ? 'rgba(139,92,246,0.2)' : '#E0E7FF') }]}>
                        <Baby size={24} color={isRunning ? theme.card : theme.primary} />
                    </View>
                    <View style={styles.infoContainer}>
                        <Text style={[styles.babyName, { color: isRunning ? theme.card : theme.textPrimary }, isRunning && styles.whiteText]}>
                            {babyName} 👶
                        </Text>
                        {age ? (
                            <Text style={[styles.ageText, { color: isRunning ? 'rgba(255,255,255,0.8)' : theme.textSecondary }, isRunning && styles.whiteTextLight]}>
                                {age}
                            </Text>
                        ) : null}
                    </View>
                </View>

                {/* Sleep Timer Active */}
                {isRunning ? (
                    <View style={styles.sleepingRow}>
                        <Moon size={18} color="#fff" />
                        <Text style={styles.sleepingText}>
                            ישנ/ה כבר {formatTime(elapsedSeconds)}
                        </Text>
                    </View>
                ) : (
                    <>
                        {/* Last Events */}
                        <View style={[styles.eventsRow, { borderTopColor: theme.border }]}>
                            <Clock size={14} color={theme.textTertiary} />
                            <Text style={[styles.eventsText, { color: theme.textSecondary }]}>{lastEventText}</Text>
                        </View>

                        {/* Smart Alert */}
                        {alert && (
                            <View style={[styles.alertRow, { backgroundColor: `${alert.color}15` }]}>
                                <Sparkles size={16} color={alert.color} />
                                <Text style={[styles.alertText, { color: alert.color }]}>
                                    {alert.text}
                                </Text>
                            </View>
                        )}
                    </>
                )}
            </LinearGradient>
        </TouchableOpacity>
    );
});

SmartStatusCard.displayName = 'SmartStatusCard';

const styles = StyleSheet.create({
    card: {
        borderRadius: 22,
        padding: 18,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 0,
    },
    mainRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
    },
    avatarCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoContainer: {
        flex: 1,
        marginRight: 12,
        alignItems: 'flex-end',
    },
    babyName: {
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    whiteText: {
        color: '#fff',
    },
    whiteTextLight: {
        color: 'rgba(255,255,255,0.8)',
    },
    ageText: {
        fontSize: 14,
        marginTop: 2,
        letterSpacing: -0.2,
    },
    eventsRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    eventsText: {
        fontSize: 13,
        letterSpacing: -0.2,
    },
    sleepingRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.2)',
    },
    sleepingText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    alertRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        marginTop: 12,
        padding: 10,
        borderRadius: 12,
    },
    alertText: {
        fontSize: 14,
        fontWeight: '600',
    },
});

export default SmartStatusCard;
