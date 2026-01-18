/**
 * ShiftTimerWidget - ווידג'ט טיימר משמרת לדף הבית
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { Play, Pause, CheckCircle, X, Clock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { auth, db } from '../../services/firebaseConfig';
import { doc, updateDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence,
} from 'react-native-reanimated';

interface ShiftTimerWidgetProps {
    shift: {
        id: string;
        bookingId: string;
        babysitterName: string;
        babysitterPhoto?: string;
        startedAt: Timestamp;
        isPaused: boolean;
        totalPausedSeconds: number;
        hourlyRate: number;
    };
    onShiftEnd?: () => void;
}

const ShiftTimerWidget: React.FC<ShiftTimerWidgetProps> = ({ shift, onShiftEnd }) => {
    const { theme, isDarkMode } = useTheme();
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [isPaused, setIsPaused] = useState(shift.isPaused);
    const [pauseStartTime, setPauseStartTime] = useState<Date | null>(null);
    const [totalPaused, setTotalPaused] = useState(shift.totalPausedSeconds);

    // Pulse animation for active timer
    const pulse = useSharedValue(1);

    useEffect(() => {
        if (!isPaused) {
            pulse.value = withRepeat(
                withSequence(
                    withTiming(1.05, { duration: 1000 }),
                    withTiming(1, { duration: 1000 })
                ),
                -1,
                true
            );
        } else {
            pulse.value = withTiming(1, { duration: 200 });
        }
    }, [isPaused]);

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulse.value }],
    }));

    // Calculate elapsed time
    useEffect(() => {
        const startTime = shift.startedAt.toDate();

        const interval = setInterval(() => {
            if (!isPaused) {
                const now = new Date();
                const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000) - totalPaused;
                setElapsedSeconds(Math.max(0, elapsed));
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [shift.startedAt, isPaused, totalPaused]);

    // Format time as HH:MM:SS
    const formatTime = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Calculate current payment
    const calculatePayment = () => {
        const hours = elapsedSeconds / 3600;
        return Math.round(hours * shift.hourlyRate * 100) / 100;
    };

    // Toggle pause
    const handleTogglePause = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        if (isPaused) {
            // Resume - add paused time to total
            if (pauseStartTime) {
                const pauseDuration = Math.floor((new Date().getTime() - pauseStartTime.getTime()) / 1000);
                setTotalPaused(prev => prev + pauseDuration);
            }
            setIsPaused(false);
            setPauseStartTime(null);
        } else {
            // Pause
            setIsPaused(true);
            setPauseStartTime(new Date());
        }

        try {
            await updateDoc(doc(db, 'activeShifts', shift.id), {
                isPaused: !isPaused,
                pausedAt: !isPaused ? serverTimestamp() : null,
            });
        } catch (e) {
            console.error('Failed to update pause state:', e);
        }
    };

    // End shift
    const handleEndShift = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        const payment = calculatePayment();
        const hours = elapsedSeconds / 3600;

        Alert.alert(
            '✅ סיום משמרת',
            `סה"כ זמן: ${formatTime(elapsedSeconds)}\nלתשלום: ₪${payment.toFixed(2)}`,
            [
                { text: 'ביטול', style: 'cancel' },
                {
                    text: 'סיים ודרג',
                    onPress: async () => {
                        try {
                            // Update booking as completed
                            await updateDoc(doc(db, 'bookings', shift.bookingId), {
                                status: 'completed',
                                actualEnd: serverTimestamp(),
                                totalMinutes: Math.round(elapsedSeconds / 60),
                                totalAmount: payment,
                                updatedAt: serverTimestamp(),
                            });

                            // Delete active shift
                            await deleteDoc(doc(db, 'activeShifts', shift.id));

                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            onShiftEnd?.();
                        } catch (e) {
                            console.error('Failed to end shift:', e);
                            Alert.alert('שגיאה', 'לא הצלחנו לסיים את המשמרת');
                        }
                    }
                }
            ]
        );
    };

    return (
        <Animated.View style={[
            styles.container, 
            { 
                backgroundColor: theme.card,
                shadowColor: theme.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
                elevation: 8,
            }, 
            pulseStyle
        ]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={[
                    styles.liveBadge, 
                    { backgroundColor: isPaused ? (isDarkMode ? 'rgba(255, 214, 10, 0.2)' : '#FEF3C7') : (isDarkMode ? 'rgba(48, 209, 88, 0.2)' : '#DCFCE7') }
                ]}>
                    <View style={[
                        styles.liveDot, 
                        { backgroundColor: isPaused ? theme.warning : theme.success }
                    ]} />
                    <Text style={[
                        styles.liveText,
                        { color: isPaused ? theme.warning : theme.success }
                    ]}>
                        {isPaused ? 'מושהה' : 'פעיל'}
                    </Text>
                </View>
                <Text style={[styles.babysitterName, { color: theme.textPrimary }]}>
                    👩 {shift.babysitterName || 'הבייביסיטר'} נמצאת אצלכם
                </Text>
            </View>

            {/* Timer Display */}
            <View style={styles.timerSection}>
                <Clock size={24} color={theme.primary} />
                <Text style={[styles.timerText, { color: theme.textPrimary }]}>
                    {formatTime(elapsedSeconds)}
                </Text>
            </View>

            {/* Payment */}
            <View style={styles.paymentSection}>
                <Text style={[styles.paymentLabel, { color: theme.textSecondary }]}>לתשלום</Text>
                <Text style={[styles.paymentAmount, { color: theme.success }]}>₪{calculatePayment().toFixed(2)}</Text>
                <Text style={[styles.paymentRate, { color: theme.textTertiary }]}>(₪{shift.hourlyRate}/שעה)</Text>
            </View>

            {/* Controls */}
            <View style={styles.controls}>
                <TouchableOpacity
                    style={[styles.controlBtn, isPaused ? { backgroundColor: theme.success } : { backgroundColor: theme.warning }]}
                    onPress={handleTogglePause}
                >
                    {isPaused ? (
                        <Play size={20} color="#fff" fill="#fff" />
                    ) : (
                        <Pause size={20} color="#fff" fill="#fff" />
                    )}
                    <Text style={styles.controlBtnText}>
                        {isPaused ? 'המשך' : 'עצור'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.endBtn, { backgroundColor: theme.primary }]}
                    onPress={handleEndShift}
                >
                    <CheckCircle size={20} color="#fff" />
                    <Text style={styles.controlBtnText}>סיים משמרת</Text>
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
    },
    header: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    babysitterName: {
        fontSize: 15,
        fontWeight: '600',
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    liveBadgePaused: {
        // Will be set dynamically
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    liveDotPaused: {
        // Will be set dynamically
    },
    liveText: {
        fontSize: 12,
        fontWeight: '600',
    },
    timerSection: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    timerText: {
        fontSize: 42,
        fontWeight: '800',
        fontVariant: ['tabular-nums'],
    },
    paymentSection: {
        flexDirection: 'row-reverse',
        justifyContent: 'center',
        alignItems: 'baseline',
        gap: 8,
        marginBottom: 20,
    },
    paymentLabel: {
        fontSize: 14,
    },
    paymentAmount: {
        fontSize: 24,
        fontWeight: '800',
    },
    paymentRate: {
        fontSize: 12,
    },
    controls: {
        flexDirection: 'row',
        gap: 12,
    },
    controlBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 14,
    },
    playBtn: {
        // Will be set dynamically
    },
    pauseBtn: {
        // Will be set dynamically
    },
    endBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 14,
    },
    controlBtnText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
});

export default ShiftTimerWidget;
