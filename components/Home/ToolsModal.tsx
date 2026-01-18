import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Animated, Dimensions, Platform, Linking } from 'react-native';
import { X, ListChecks, Clock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../context/ThemeContext';
import Reanimated, { FadeInDown } from 'react-native-reanimated';

interface ToolsModalProps {
    visible: boolean;
    onClose: () => void;
    onChecklistPress: () => void;
    onNextNapPress: () => void;
}

export default function ToolsModal({
    visible,
    onClose,
    onChecklistPress,
    onNextNapPress
}: ToolsModalProps) {
    const { theme, isDarkMode } = useTheme();
    const slideAnim = useRef(new Animated.Value(400)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    damping: 22,
                    stiffness: 200,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            slideAnim.setValue(400);
            fadeAnim.setValue(0);
        }
    }, [visible]);

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
            color: '#60A5FA',
            bg: '#DBEAFE',
            action: onNextNapPress,
        },
        {
            id: 'checklist',
            title: 'צ\'קליסט הרגעה',
            subtitle: 'תינוק בוכה? בוא נבדוק',
            icon: ListChecks,
            color: '#8B5CF6',
            bg: '#EDE9FE',
            action: onChecklistPress,
        },
    ];

    return (
        <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
            <Animated.View style={[styles.overlay, { opacity: fadeAnim, backgroundColor: theme.modalOverlay }]}>
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

                <Animated.View
                    style={[
                        styles.container,
                        {
                            backgroundColor: theme.card,
                            transform: [{ translateY: slideAnim }],
                            opacity: fadeAnim
                        }
                    ]}
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

                    {/* Grid */}
                    <View style={styles.grid}>
                        {tools.map((tool, index) => (
                            <Reanimated.View
                                key={tool.id}
                                entering={FadeInDown.duration(400).delay(100 + index * 100).springify().damping(15)}
                            >
                                <TouchableOpacity
                                    style={[styles.card, { backgroundColor: theme.cardSecondary }]}
                                    onPress={() => handlePress(tool.action)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.2)' : tool.bg }]}>
                                        <tool.icon size={28} color={tool.color} strokeWidth={2} />
                                    </View>
                                    <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{tool.title}</Text>
                                    <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>{tool.subtitle}</Text>
                                </TouchableOpacity>
                            </Reanimated.View>
                        ))}
                    </View>
                </Animated.View>
            </Animated.View>
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
        paddingHorizontal: 24,
        paddingBottom: 40,
        paddingTop: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 12,
    },
    dragHandle: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 8,
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
        marginBottom: 28,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
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
        flexDirection: 'row-reverse',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 20,
    },
    card: {
        width: '100%',
        padding: 24,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTitle: {
        fontSize: 17,
        fontWeight: '700',
        textAlign: 'center',
        letterSpacing: -0.3,
    },
    cardSubtitle: {
        fontSize: 13,
        textAlign: 'center',
        letterSpacing: -0.2,
    },
});
