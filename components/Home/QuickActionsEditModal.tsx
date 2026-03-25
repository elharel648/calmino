import React, { memo, useCallback, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Platform, Dimensions, Animated as RNAnimated, TouchableWithoutFeedback, PanResponder } from 'react-native';
import { Eye, EyeOff, RotateCcw, GripVertical } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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
    const { actionOrder, hiddenActions, toggleActionVisibility, resetToDefault, setActionOrder } = useQuickActions();
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

    const handleClose = useCallback(() => {
        RNAnimated.timing(slideAnim, {
            toValue: SCREEN_HEIGHT,
            duration: 250,
            useNativeDriver: true,
        }).start(onClose);
    }, [slideAnim, onClose]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, gs) =>
                gs.dy > 8 && Math.abs(gs.dy) > Math.abs(gs.dx) * 1.5,
            onPanResponderMove: (_, gs) => {
                if (gs.dy > 0) slideAnim.setValue(gs.dy);
            },
            onPanResponderRelease: (_, gs) => {
                if (gs.dy > 100 || gs.vy > 0.5) {
                    RNAnimated.timing(slideAnim, {
                        toValue: SCREEN_HEIGHT,
                        duration: 220,
                        useNativeDriver: true,
                    }).start(onClose);
                } else {
                    RNAnimated.spring(slideAnim, {
                        toValue: 0,
                        useNativeDriver: true,
                        tension: 65,
                        friction: 11,
                    }).start();
                }
            },
        })
    ).current;

    const handleDragEnd = useCallback(({ data }: { data: QuickActionKey[] }) => {
        setLocalOrder(data);
        setActionOrder(data);
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    }, [setActionOrder]);

    const handleToggleVisibility = useCallback((key: QuickActionKey) => {
        toggleActionVisibility(key);
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    }, [toggleActionVisibility]);

    const handleReset = useCallback(() => {
        resetToDefault();
        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    }, [resetToDefault]);

    const renderItem = useCallback(({ item: key, drag, isActive }: RenderItemParams<QuickActionKey>) => {
        const Icon = QUICK_ACTION_BASE_CONFIG[key].icon;
        const labelKey = QUICK_ACTION_BASE_CONFIG[key].labelKey;
        const colors = theme.actionColors[key as keyof typeof theme.actionColors];
        const isHidden = hiddenActions.includes(key);
        const iconBg = colors?.lightColor || (isDarkMode ? 'rgba(255,255,255,0.08)' : '#FFFFFF');
        const iconColor = colors?.color || theme.textPrimary;

        return (
            <ScaleDecorator>
                <TouchableOpacity
                    activeOpacity={0.85}
                    onLongPress={drag}
                    delayLongPress={200}
                    disabled={isActive}
                    style={[
                        styles.itemContainer,
                        {
                            backgroundColor: isActive
                                ? (isDarkMode ? '#2A2A2A' : '#F0F4FF')
                                : (isDarkMode ? '#1E1E1E' : '#F9FAFB'),
                            borderColor: isActive
                                ? theme.primary
                                : (isDarkMode ? '#333' : '#E5E7EB'),
                        },
                        isHidden && {
                            opacity: 0.5,
                            backgroundColor: isDarkMode ? '#2A1515' : '#FEE2E2',
                            borderColor: isDarkMode ? '#4A2020' : '#FECACA',
                        },
                    ]}
                >
                    {/* Visibility Toggle (right side, RTL) */}
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
                        onLongPress={() => {}}
                    >
                        {isHidden ? (
                            <EyeOff size={18} color="#EF4444" />
                        ) : (
                            <Eye size={18} color="#10B981" />
                        )}
                    </TouchableOpacity>

                    {/* Icon */}
                    <View style={[
                        styles.iconContainer,
                        {
                            backgroundColor: iconBg,
                            shadowColor: isDarkMode ? 'transparent' : '#000',
                        }
                    ]}>
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

                    {/* Drag Handle indicator (left side, RTL) */}
                    <View style={styles.dragHandle}>
                        <GripVertical size={20} color={isDarkMode ? '#666' : '#C7C7CC'} strokeWidth={1.5} />
                    </View>
                </TouchableOpacity>
            </ScaleDecorator>
        );
    }, [theme, isDarkMode, hiddenActions, handleToggleVisibility, t]);

    return (
        <Modal
            visible={visible}
            animationType="none"
            transparent={true}
            onRequestClose={handleClose}
        >
            <GestureHandlerRootView style={{ flex: 1 }}>
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
                    {/* Drag Handle — swipe down zone */}
                    <View style={styles.handleContainer} {...panResponder.panHandlers}>
                        <View style={[styles.handle, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)' }]} />
                    </View>

                    {/* Header */}
                    <View style={[styles.header, { borderBottomColor: theme.border, flexDirection: 'row-reverse' }]}>
                        <TouchableOpacity style={[styles.resetBtn, { backgroundColor: isDarkMode ? '#1E1040' : '#EEF2FF' }]} onPress={handleReset}>
                            <RotateCcw size={18} color={theme.primary} />
                        </TouchableOpacity>
                        <Text style={[styles.title, { color: theme.textPrimary }]}>עריכת פעולות מהירות</Text>
                        <View style={styles.resetBtn} />
                    </View>

                    {/* Instructions */}
                    <View style={styles.instructionsRow}>
                        <Text style={[styles.instructionsText, { color: theme.textTertiary }]}>לחיצה ארוכה על שורה כדי לגרור ולשנות סדר • לחץ על העין להסתיר</Text>
                    </View>

                    {/* Draggable List */}
                    <DraggableFlatList
                        data={localOrder}
                        onDragEnd={handleDragEnd}
                        keyExtractor={(item) => item}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                        containerStyle={styles.listContainer}
                        activationDistance={8}
                    />

                    {/* Save Button */}
                    <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primary }]} onPress={handleClose}>
                        <Text style={styles.saveBtnText}>{t('tracking.endTime')}</Text>
                    </TouchableOpacity>
                </RNAnimated.View>
            </View>
            </GestureHandlerRootView>
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
        height: SCREEN_HEIGHT * 0.75,
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
    resetBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    instructionsRow: {
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
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 0,
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
        marginRight: 8,
    },
    protectedText: {
        fontSize: 11,
        fontWeight: '600',
    },
    dragHandle: {
        paddingHorizontal: 6,
        paddingVertical: 8,
        marginLeft: 4,
        justifyContent: 'center',
        alignItems: 'center',
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
