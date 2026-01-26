import React, { useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Animated as RNAnimated, Dimensions, Platform, Linking, PanResponder } from 'react-native';
import { X, ListChecks, Clock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import Reanimated, { FadeInDown } from 'react-native-reanimated';

interface ToolsModalProps {
    visible: boolean;
    onClose: () => void;
    onChecklistPress: () => void;
    onNextNapPress: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const RNAnimatedView = RNAnimated.createAnimatedComponent(View);

export default function ToolsModal({
    visible,
    onClose,
    onChecklistPress,
    onNextNapPress
}: ToolsModalProps) {
    const { theme, isDarkMode } = useTheme();
    const slideAnim = useRef(new RNAnimated.Value(SCREEN_HEIGHT)).current;
    const fadeAnim = useRef(new RNAnimated.Value(0)).current;
    const isDragging = useRef(false);

    useEffect(() => {
        if (visible) {
            slideAnim.setValue(SCREEN_HEIGHT);
            fadeAnim.setValue(0);
            RNAnimated.parallel([
                RNAnimated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 65,
                    friction: 11,
                }),
                RNAnimated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            slideAnim.setValue(SCREEN_HEIGHT);
            fadeAnim.setValue(0);
        }
    }, [visible]);

    // Swipe down to dismiss
    const panResponder = useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
            const isDraggingDown = gestureState.dy > 20;
            const isVerticalSwipe = Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.5;
            
            if (isDraggingDown && isVerticalSwipe && !isDragging.current) {
                isDragging.current = true;
                if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                return true;
            }
            return false;
        },
        onPanResponderMove: (_, gestureState) => {
            if (gestureState.dy > 0) {
                slideAnim.setValue(gestureState.dy);
                const opacity = Math.max(0, 1 - (gestureState.dy / 300));
                fadeAnim.setValue(opacity);
            }
        },
        onPanResponderRelease: (_, gestureState) => {
            isDragging.current = false;
            const shouldDismiss = gestureState.dy > 100 || gestureState.vy > 0.4;
            
            if (shouldDismiss) {
                if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
                RNAnimated.parallel([
                    RNAnimated.spring(slideAnim, {
                        toValue: SCREEN_HEIGHT,
                        useNativeDriver: true,
                        tension: 65,
                        friction: 11,
                    }),
                    RNAnimated.timing(fadeAnim, {
                        toValue: 0,
                        duration: 200,
                        useNativeDriver: true,
                    }),
                ]).start(() => {
                    onClose();
                    slideAnim.setValue(SCREEN_HEIGHT);
                    fadeAnim.setValue(0);
                });
            } else {
                RNAnimated.parallel([
                    RNAnimated.spring(slideAnim, {
                        toValue: 0,
                        useNativeDriver: true,
                        tension: 65,
                        friction: 11,
                    }),
                    RNAnimated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 200,
                        useNativeDriver: true,
                    }),
                ]).start();
            }
        },
        onPanResponderTerminate: () => {
            isDragging.current = false;
            RNAnimated.parallel([
                RNAnimated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 65,
                    friction: 11,
                }),
                RNAnimated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        },
    }), [onClose, slideAnim, fadeAnim]);

    const handlePress = (action: () => void) => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onClose();
        setTimeout(action, 300); // Small delay to allow modal to close smoothly
    };

    const handleEmergency = () => {
        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
        // Could open a specific emergency modal or dialer
        Linking.openURL('tel:101'); // Magen David Adom in Israel
    };

    const tools = [
        {
            id: 'nextnap',
            title: 'מחשבון שינה',
            subtitle: 'מתי להשכיב לישון?',
            icon: Clock,
            color: '#0EA5E9',
            bg: isDarkMode ? 'rgba(14,165,233,0.15)' : '#E0F2FE',
            action: onNextNapPress,
        },
        {
            id: 'checklist',
            title: 'צ\'קליסט הרגעה',
            subtitle: 'תינוק בוכה? בוא נבדוק',
            icon: ListChecks,
            color: theme.primary,
            bg: isDarkMode ? 'rgba(139, 92, 246, 0.15)' : theme.primaryLight,
            action: onChecklistPress,
        },
    ];

    return (
        <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
            <RNAnimated.View style={[styles.overlay, { opacity: fadeAnim, backgroundColor: theme.modalOverlay }]}>
                {Platform.OS === 'ios' && (
                    <BlurView
                        intensity={20}
                        tint={isDarkMode ? 'dark' : 'light'}
                        style={StyleSheet.absoluteFill}
                    />
                )}
                <TouchableOpacity 
                    style={StyleSheet.absoluteFill} 
                    activeOpacity={1} 
                    onPress={onClose}
                />

                <RNAnimatedView
                    style={[
                        styles.container,
                        {
                            backgroundColor: theme.card,
                            transform: [{ translateY: slideAnim }],
                        }
                    ]}
                    {...panResponder.panHandlers}
                >
                    {/* Drag Handle */}
                    <View style={styles.dragHandle}>
                        <View style={[styles.dragHandleBar, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)' }]} />
                    </View>

                    {/* Header */}
                    <Reanimated.View 
                        entering={FadeInDown.duration(400).springify().damping(15)}
                        style={styles.header}
                    >
                        <TouchableOpacity 
                            onPress={onClose} 
                            style={[styles.closeButton, { backgroundColor: theme.inputBackground }]}
                            activeOpacity={0.7}
                        >
                            <X size={20} color={theme.textSecondary} strokeWidth={2.5} />
                        </TouchableOpacity>
                        <Text style={[styles.title, { color: theme.textPrimary }]}>ארגז כלים</Text>
                        <View style={{ width: 36 }} />
                    </Reanimated.View>

                    {/* Tools Grid - Premium Design */}
                    <View style={styles.grid}>
                        {tools.map((tool, index) => (
                            <Reanimated.View
                                key={tool.id}
                                entering={FadeInDown.duration(400).delay(100 + index * 100).springify().damping(15)}
                                style={styles.cardWrapper}
                            >
                                <TouchableOpacity
                                    style={[styles.card, { backgroundColor: theme.card }]}
                                    onPress={() => handlePress(tool.action)}
                                    activeOpacity={0.8}
                                >
                                    {Platform.OS === 'ios' && (
                                        <BlurView
                                            intensity={15}
                                            tint={isDarkMode ? 'dark' : 'light'}
                                            style={StyleSheet.absoluteFill}
                                        />
                                    )}
                                    <LinearGradient
                                        colors={isDarkMode 
                                            ? [theme.cardSecondary + '80', theme.cardSecondary + '40']
                                            : [tool.bg + '40', tool.bg + '20']
                                        }
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={StyleSheet.absoluteFill}
                                    />
                                    
                                    {/* Icon with gradient background */}
                                    <View style={styles.iconContainer}>
                                        <LinearGradient
                                            colors={[tool.color + '20', tool.color + '10']}
                                            style={styles.iconCircle}
                                        >
                                            <tool.icon size={32} color={tool.color} strokeWidth={2.5} />
                                        </LinearGradient>
                                    </View>
                                    
                                    {/* Content */}
                                    <View style={styles.cardContent}>
                                        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{tool.title}</Text>
                                        <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>{tool.subtitle}</Text>
                                    </View>
                                </TouchableOpacity>
                            </Reanimated.View>
                        ))}
                    </View>
                </RNAnimatedView>
            </RNAnimated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    container: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 20,
        paddingBottom: Platform.OS === 'ios' ? 50 : 40,
        paddingTop: 12,
        maxHeight: '90%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 12,
    },
    dragHandle: {
        alignItems: 'center',
        paddingTop: 8,
        paddingBottom: 12,
    },
    dragHandleBar: {
        width: 36,
        height: 5,
        borderRadius: 3,
    },
    header: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        paddingHorizontal: 4,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    grid: {
        gap: 16,
        marginBottom: 20,
    },
    cardWrapper: {
        width: '100%',
    },
    card: {
        width: '100%',
        padding: 24,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        minHeight: 140,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    iconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardContent: {
        alignItems: 'center',
        gap: 6,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
        letterSpacing: -0.3,
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 14,
        textAlign: 'center',
        letterSpacing: -0.2,
        opacity: 0.8,
    },
});
