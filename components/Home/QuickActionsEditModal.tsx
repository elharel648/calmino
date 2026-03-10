import React, { memo, useCallback, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Platform, Dimensions, ScrollView, Animated as RNAnimated, TouchableWithoutFeedback } from 'react-native';
import { X, Eye, EyeOff, RotateCcw, ChevronUp, ChevronDown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useQuickActions, QuickActionKey } from '../../context/QuickActionsContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { QUICK_ACTION_BASE_CONFIG } from './quickActionsConfig';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface QuickActionsEditModalProps {
    visible: boolean;
    onClose: () => void;
}

const QuickActionsEditModal: React.FC<QuickActionsEditModalProps> = memo(({ visible, onClose }) => {
    const { actionOrder, hiddenActions, toggleActionVisibility, resetToDefault, isProtected, setActionOrder } = useQuickActions();
    const { theme, isDarkMode } = useTheme();
    const { t } = useLanguage();
    const [localOrder, setLocalOrder] = useState<QuickActionKey[]>([]);
    const slideAnim = useRef(new RNAnimated.Value(SCREEN_HEIGHT)).current;

    useEffect(() => {
        if (visible) {
            setLocalOrder([...actionOrder]);
            RNAnimated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 65,
                friction: 11,
            }).start();
        } else {
            slideAnim.setValue(SCREEN_HEIGHT);
        }
    }, [visible, actionOrder]);

    const handleClose = () => {
        RNAnimated.timing(slideAnim, {
            toValue: SCREEN_HEIGHT,
            duration: 250,
            useNativeDriver: true,
        }).start(onClose);
    };

    const moveItem = useCallback((key: QuickActionKey, direction: 'up' | 'down') => {
        setLocalOrder(prev => {
            const idx = prev.indexOf(key);
            if (idx === -1) return prev;
            if (direction === 'up' && idx === 0) return prev;
            if (direction === 'down' && idx === prev.length - 1) return prev;

            const newOrder = [...prev];
            const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
            [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
            setActionOrder(newOrder);
            return newOrder;
        });
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    }, [setActionOrder]);

    const handleToggleVisibility = useCallback((key: QuickActionKey) => {
        if (isProtected(key)) return;
        toggleActionVisibility(key);
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    }, [toggleActionVisibility, isProtected]);

    const handleReset = useCallback(() => {
        resetToDefault();
        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    }, [resetToDefault]);

    return (
        <Modal
            visible={visible}
            animationType="none"
            transparent={true}
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <TouchableWithoutFeedback onPress={handleClose}>
                    <View style={styles.backdrop} />
                </TouchableWithoutFeedback>

                <RNAnimated.View style={[
                    styles.modalContainer,
                    {
                        backgroundColor: theme.card,
                        transform: [{ translateY: slideAnim }],
                    }
                ]}>
                    {/* Drag Handle */}
                    <View style={styles.handleContainer}>
                        <View style={[styles.handle, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)' }]} />
                    </View>

                    {/* Header */}
                    <View style={[styles.header, { borderBottomColor: theme.border, flexDirection: 'row-reverse' }]}>
                        <TouchableOpacity style={[styles.closeBtn, { backgroundColor: isDarkMode ? '#222' : '#F3F4F6' }]} onPress={handleClose}>
                            <X size={22} color={theme.textPrimary} />
                        </TouchableOpacity>
                        <Text style={[styles.title, { color: theme.textPrimary }]}>עריכת פעולות מהירות</Text>
                        <TouchableOpacity style={[styles.resetBtn, { backgroundColor: isDarkMode ? '#1E1040' : '#EEF2FF' }]} onPress={handleReset}>
                            <RotateCcw size={18} color={theme.primary} />
                        </TouchableOpacity>
                    </View>

                    {/* Instructions */}
                    <View style={styles.instructionsRow}>
                        <Text style={[styles.instructionsText, { color: theme.textTertiary }]}>השתמש בחצים כדי לשנות סדר</Text>
                    </View>

                    {/* List */}
                    <ScrollView
                        style={styles.listContainer}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {localOrder.map((key, index) => {
                            const Icon = QUICK_ACTION_BASE_CONFIG[key].icon;
                            const labelKey = QUICK_ACTION_BASE_CONFIG[key].labelKey;
                            const colors = theme.actionColors[key as keyof typeof theme.actionColors];
                            const isHidden = hiddenActions.includes(key);
                            const isItemProtected = isProtected(key);

                            // Fallback color if not found in theme
                            const iconColor = colors?.accentColor || theme.primary;

                            return (
                                <View
                                    key={key}
                                    style={[
                                        styles.itemContainer,
                                        {
                                            backgroundColor: isDarkMode ? '#1E1E1E' : '#F9FAFB',
                                            borderColor: isDarkMode ? '#333' : '#E5E7EB',
                                        },
                                        isHidden && {
                                            opacity: 0.5,
                                            backgroundColor: isDarkMode ? '#2A1515' : '#FEE2E2',
                                            borderColor: isDarkMode ? '#4A2020' : '#FECACA',
                                        },
                                    ]}
                                >
                                    {/* Move Arrows */}
                                    <View style={styles.arrowsColumn}>
                                        <TouchableOpacity
                                            onPress={() => moveItem(key, 'up')}
                                            disabled={index === 0}
                                            style={styles.arrowBtn}
                                            hitSlop={{ top: 8, bottom: 4, left: 8, right: 8 }}
                                        >
                                            <ChevronUp size={18} color={index === 0 ? (isDarkMode ? '#444' : '#D1D5DB') : theme.primary} strokeWidth={2.5} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => moveItem(key, 'down')}
                                            disabled={index === localOrder.length - 1}
                                            style={styles.arrowBtn}
                                            hitSlop={{ top: 4, bottom: 8, left: 8, right: 8 }}
                                        >
                                            <ChevronDown size={18} color={index === localOrder.length - 1 ? (isDarkMode ? '#444' : '#D1D5DB') : theme.primary} strokeWidth={2.5} />
                                        </TouchableOpacity>
                                    </View>

                                    {/* Icon */}
                                    <View style={[styles.iconCircle, { backgroundColor: iconColor + '15' }]}>
                                        <Icon size={19} color={iconColor} strokeWidth={1.5} />
                                    </View>

                                    {/* Label */}
                                    <Text style={[
                                        styles.itemLabel,
                                        { color: theme.textPrimary },
                                        isHidden && { color: theme.textTertiary, textDecorationLine: 'line-through' },
                                    ]}>
                                        {t(labelKey)}
                                    </Text>

                                    {/* Visibility Toggle */}
                                    {!isItemProtected && (
                                        <TouchableOpacity
                                            style={[
                                                styles.visibilityBtn,
                                                {
                                                    backgroundColor: isHidden
                                                        ? (isDarkMode ? '#3A1515' : '#FEE2E2')
                                                        : (isDarkMode ? '#0A2A1A' : '#D1FAE5'),
                                                }
                                            ]}
                                            onPress={() => handleToggleVisibility(key)}
                                        >
                                            {isHidden ? (
                                                <EyeOff size={18} color="#EF4444" />
                                            ) : (
                                                <Eye size={18} color="#10B981" />
                                            )}
                                        </TouchableOpacity>
                                    )}

                                    {isItemProtected && (
                                        <View style={[styles.protectedBadge, { backgroundColor: isDarkMode ? '#1E1040' : '#E0E7FF' }]}>
                                            <Text style={[styles.protectedText, { color: theme.primary }]}>חובה</Text>
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </ScrollView>

                    {/* Save Button */}
                    <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primary }]} onPress={handleClose}>
                        <Text style={styles.saveBtnText}>{t('tracking.endTime')}</Text>
                    </TouchableOpacity>
                </RNAnimated.View>
            </View>
        </Modal>
    );
});

QuickActionsEditModal.displayName = 'QuickActionsEditModal';

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    modalContainer: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        minHeight: SCREEN_HEIGHT * 0.65,
        maxHeight: SCREEN_HEIGHT * 0.85,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    },
    handleContainer: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 8,
    },
    handle: {
        width: 40,
        height: 5,
        borderRadius: 3,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    resetBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    instructionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    instructionsText: {
        fontSize: 13,
    },
    listContainer: {
        flex: 1,
        paddingHorizontal: 16,
    },
    listContent: {
        paddingVertical: 8,
    },
    itemContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginVertical: 4,
        borderRadius: 14,
        borderWidth: 1,
    },
    arrowsColumn: {
        alignItems: 'center',
        marginLeft: 8,
        gap: 2,
    },
    arrowBtn: {
        padding: 2,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
    },
    itemLabel: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        textAlign: 'right',
    },
    visibilityBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    protectedBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginLeft: 8,
    },
    protectedText: {
        fontSize: 11,
        fontWeight: '600',
    },
    saveBtn: {
        marginHorizontal: 20,
        marginTop: 16,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    saveBtnText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
    },
});

export default QuickActionsEditModal;
