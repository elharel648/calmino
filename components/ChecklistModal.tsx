import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Animated, Dimensions, Platform } from 'react-native';
import { X, CheckCircle, Baby, Heart, Thermometer, Hand, BedDouble, Ear, Sparkles, ListChecks } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import Reanimated from 'react-native-reanimated';
import { ANIMATIONS } from '../utils/designSystem';
import { useLanguage } from '../context/LanguageContext';

interface ChecklistModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function ChecklistModal({
    visible, onClose }: ChecklistModalProps) {
    const { theme, isDarkMode } = useTheme();
  const { t } = useLanguage();
    const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

    // Animations
    const slideAnim = useRef(new Animated.Value(400)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            setCheckedItems(new Set());

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

    const toggleCheckItem = (index: number) => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        setCheckedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    const checklistItems = [
        { text: "האם החיתול נקי?", Icon: Baby },
        { text: "האם עברו פחות מ-3 שעות מהאוכל?", Icon: Heart },
        { text: "האם חם/קר לו מדי? (בדיקה בעורף)", Icon: Thermometer },
        { text: "האם יש שערה כרוכה באצבעות?", Icon: Hand },
        { text: "האם הוא פשוט עייף מדי?", Icon: BedDouble },
        { text: "האם כואב לו משהו? (אוזניים/שיניים)", Icon: Ear },
    ];

    const progress = checkedItems.size / checklistItems.length;

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
                        entering={ANIMATIONS.fadeInDown(0)}
                        style={[styles.header, { borderBottomColor: theme.border }]}
                    >
                        <TouchableOpacity 
                            onPress={onClose} 
                            style={[styles.closeButton, { backgroundColor: theme.inputBackground }]}
                            activeOpacity={0.7}
                        >
                            <X size={20} color={theme.textSecondary} strokeWidth={2} />
                        </TouchableOpacity>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={[styles.mainTitle, { color: theme.textPrimary }]}>צ'קליסט הרגעה</Text>
                            <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.15)' }]}>
                                <ListChecks size={18} color={theme.primary} strokeWidth={2} />
                            </View>
                        </View>

                        <View style={{ width: 36 }} />
                    </Reanimated.View>

                    {/* Content */}
                    <ScrollView
                            style={styles.content}
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                        {/* Progress - Minimal */}
                        <Reanimated.View 
                            entering={ANIMATIONS.fadeInDown(50)}
                            style={styles.progressContainer}
                        >
                            <View style={[styles.progressBar, { backgroundColor: theme.cardSecondary }]}>
                                <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: theme.primary }]} />
                            </View>
                            <Text style={[styles.progressText, { color: theme.textSecondary }]}>{checkedItems.size}/{checklistItems.length}</Text>
                        </Reanimated.View>

                        {/* Checklist - Ultra Clean */}
                        {checklistItems.map((item, index) => {
                            const isChecked = checkedItems.has(index);
                            const { Icon } = item;
                            return (
                                <Reanimated.View
                                    key={index}
                                    entering={ANIMATIONS.fadeInDown(100 + ANIMATIONS.stagger(index, 50))}
                                >
                                    <TouchableOpacity
                                        style={[styles.checkItem, { borderBottomColor: theme.border }, isChecked && styles.checkItemChecked]}
                                        onPress={() => toggleCheckItem(index)}
                                        activeOpacity={0.7}
                                    >
                                        <Animated.View style={[
                                            styles.checkCircle, 
                                            { borderColor: theme.border },
                                            isChecked && [styles.checkCircleChecked, { backgroundColor: '#C8806A', borderColor: '#C8806A' }]
                                        ]}>
                                            {isChecked && <CheckCircle size={16} color={theme.card} />}
                                        </Animated.View>
                                        <View style={styles.checkIconWrapper}>
                                            <Icon size={18} color={isChecked ? theme.textTertiary : theme.textSecondary} strokeWidth={1.5} />
                                        </View>
                                        <Text style={[
                                            styles.checkText, 
                                            { color: theme.textPrimary },
                                            isChecked && [styles.checkTextDone, { color: theme.textTertiary }]
                                        ]}>
                                            {item.text}
                                        </Text>
                                    </TouchableOpacity>
                                </Reanimated.View>
                            );
                        })}

                        {/* All Checked - Subtle */}
                        {checkedItems.size === checklistItems.length && (
                            <Reanimated.View 
                                entering={ANIMATIONS.fadeInDown(400)}
                                style={[styles.allCheckedCard, { backgroundColor: theme.cardSecondary }]}
                            >
                                <View style={[styles.sparklesIcon, { backgroundColor: 'rgba(200, 128, 106, 0.15)' }]}>
                                    <Sparkles size={24} color={'#C8806A'} strokeWidth={1.5} />
                                </View>
                                <Text style={[styles.allCheckedTitle, { color: theme.textPrimary }]}>בדקת הכל</Text>
                                <Text style={[styles.allCheckedText, { color: theme.textSecondary }]}>
                                    לפעמים תינוקות פשוט צריכים לבכות.{'\n'}נשום עמוק, אתה הורה מדהים.
                                </Text>
                            </Reanimated.View>
                        )}
                    </ScrollView>
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
        maxHeight: '92%',
        minHeight: '60%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 0,
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
    // Header - Minimal
    header: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    mainTitle: {
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: -0.3,
    },

    // Content
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 50,
    },

    // Progress - Minimal
    progressContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginBottom: 24,
        gap: 12,
    },
    progressBar: {
        flex: 1,
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    progressText: {
        fontSize: 13,
        fontWeight: '600',
    },

    // Checklist - Ultra Clean
    checkItem: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        gap: 12,
    },
    checkItemChecked: {
        opacity: 0.6,
    },
    checkCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkCircleChecked: {
    },
    checkIconWrapper: {
        width: 28,
        alignItems: 'center',
    },
    checkText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        textAlign: 'right',
        letterSpacing: -0.2,
    },
    checkTextDone: {
        textDecorationLine: 'line-through',
    },

    // All Checked - Subtle
    allCheckedCard: {
        padding: 24,
        borderRadius: 20,
        alignItems: 'center',
        marginTop: 24,
    },
    sparklesIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    allCheckedTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginTop: 4,
        letterSpacing: -0.3,
    },
    allCheckedText: {
        fontSize: 14,
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 22,
        letterSpacing: -0.2,
    },
});
