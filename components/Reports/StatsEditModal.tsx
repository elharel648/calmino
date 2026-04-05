import React, { memo, useCallback, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Platform, Dimensions, Animated as RNAnimated, PanResponder } from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { X, GripVertical, RotateCcw, Utensils, Moon, Pill } from 'lucide-react-native';
import DiaperIcon from '../Common/DiaperIcon';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext';
import { logger } from '../../utils/logger';
import { useLanguage } from '../../context/LanguageContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Stats keys
export type StatKey = 'food' | 'sleep' | 'diapers' | 'supplements';

export const DEFAULT_STATS_ORDER: StatKey[] = ['food', 'sleep', 'diapers', 'supplements'];
export const STATS_ORDER_KEY = '@stats_order';

const ICONS: Record<StatKey, any> = {
    food: Utensils,
    sleep: Moon,
    diapers: DiaperIcon,
    supplements: Pill,
};

interface StatsEditModalProps {
    visible: boolean;
    onClose: () => void;
    currentOrder: StatKey[];
    onOrderChange: (newOrder: StatKey[]) => void;
}

interface DraggableItem {
    key: StatKey;
}

const StatsEditModal: React.FC<StatsEditModalProps> = memo(({ visible, onClose, currentOrder, onOrderChange }) => {
    const { theme, isDarkMode } = useTheme();
    const { t } = useLanguage();
    const [localOrder, setLocalOrder] = useState<DraggableItem[]>([]);

    // Premium spring animation
    const slideAnim = useRef(new RNAnimated.Value(SCREEN_HEIGHT)).current;
    const backdropAnim = useRef(new RNAnimated.Value(0)).current;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onStartShouldSetPanResponderCapture: () => false,
            onMoveShouldSetPanResponder: (_, gs) =>
                gs.dy > 10 && Math.abs(gs.dy) > Math.abs(gs.dx) * 1.5,
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

    useEffect(() => {
        if (visible) {
            setLocalOrder(currentOrder.map(key => ({ key })));
            // Animate in with spring
            RNAnimated.parallel([
                RNAnimated.spring(slideAnim, {
                    toValue: 0,
                    tension: 65,
                    friction: 11,
                    useNativeDriver: true,
                }),
                RNAnimated.timing(backdropAnim, {
                    toValue: 1,
                    duration: 280,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            // Animate out
            RNAnimated.parallel([
                RNAnimated.timing(slideAnim, {
                    toValue: SCREEN_HEIGHT,
                    duration: 260,
                    useNativeDriver: true,
                }),
                RNAnimated.timing(backdropAnim, {
                    toValue: 0,
                    duration: 220,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible, currentOrder]);

    const handleDragEnd = useCallback(async ({ data }: { data: DraggableItem[] }) => {
        setLocalOrder(data);
        const newOrder = data.map(item => item.key);
        onOrderChange(newOrder);

        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        try {
            await AsyncStorage.setItem(STATS_ORDER_KEY, JSON.stringify(newOrder));
        } catch (e) {
            logger.error('Failed to save stats order', e);
        }
    }, [onOrderChange]);

    const handleReset = useCallback(async () => {
        const defaultItems = DEFAULT_STATS_ORDER.map(key => ({ key }));
        setLocalOrder(defaultItems);
        onOrderChange(DEFAULT_STATS_ORDER);

        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        try {
            await AsyncStorage.setItem(STATS_ORDER_KEY, JSON.stringify(DEFAULT_STATS_ORDER));
        } catch (e) {
            logger.error('Failed to reset stats order', e);
        }
    }, [onOrderChange]);

    const renderItem = useCallback(({ item, drag, isActive }: RenderItemParams<DraggableItem>) => {
        const Icon = ICONS[item.key];

        // Theme-matched colors — same as the actual stats cards
        const colorMap: Record<StatKey, { color: string; lightColor: string; label: string }> = {
            food:        { color: theme.actionColors.food.accentColor,        lightColor: theme.actionColors.food.lightColor,        label: t('reports.metrics.feeding') },
            sleep:       { color: theme.actionColors.sleep.accentColor,       lightColor: theme.actionColors.sleep.lightColor,       label: t('reports.metrics.sleep') },
            diapers:     { color: theme.actionColors.diaper.accentColor,      lightColor: theme.actionColors.diaper.lightColor,      label: t('reports.metrics.diapers') },
            supplements: { color: theme.actionColors.supplements.accentColor, lightColor: theme.actionColors.supplements.lightColor, label: t('reports.metrics.supplements') },
        };
        const data = colorMap[item.key];

        return (
            <ScaleDecorator activeScale={1.03}>
                <TouchableOpacity
                    style={[
                        styles.itemContainer,
                        {
                            borderColor: isActive
                                ? data.color + '60'
                                : isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
                            backgroundColor: isActive
                                ? (isDarkMode ? 'rgba(255,255,255,0.06)' : data.lightColor)
                                : theme.card,
                            shadowColor: isActive ? data.color : 'transparent',
                            shadowOffset: { width: 0, height: 6 },
                            shadowOpacity: isActive ? 0.25 : 0,
                            shadowRadius: 12,
                            elevation: isActive ? 6 : 0,
                        },
                    ]}
                    onLongPress={drag}
                    delayLongPress={80}
                    activeOpacity={0.75}
                >
                    {/* Drag Handle */}
                    <View style={styles.dragHandle}>
                        <GripVertical
                            size={18}
                            color={isActive ? data.color : (isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)')}
                            strokeWidth={2}
                        />
                    </View>

                    {/* Icon Circle — same styling as stats screen */}
                    <View style={[styles.iconCircle, { backgroundColor: data.color }]}>
                        <Icon size={19} color="#FFFFFF" strokeWidth={2} />
                    </View>

                    {/* Label */}
                    <Text style={[styles.itemLabel, { color: theme.textPrimary }]}>
                        {data.label}
                    </Text>

                    {/* Active indicator dot */}
                    {isActive && (
                        <View style={[styles.activeDot, { backgroundColor: data.color }]} />
                    )}
                </TouchableOpacity>
            </ScaleDecorator>
        );
    }, [theme, isDarkMode, t]);

    return (
        <Modal
            visible={visible}
            animationType="none"
            transparent={true}
            onRequestClose={onClose}
        >
            {/* Backdrop */}
            <RNAnimated.View
                style={[styles.overlay, { opacity: backdropAnim }]}
                pointerEvents="box-none"
            >
                <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
            </RNAnimated.View>

            {/* Sheet — slides up with spring */}
            <RNAnimated.View
                style={[
                    styles.modalContainer,
                    {
                        backgroundColor: theme.card,
                        transform: [{ translateY: slideAnim }],
                    },
                ]}
            >
                {/* Header Container with PanResponder */}
                <View {...panResponder.panHandlers} style={{ paddingBottom: 8, backgroundColor: 'transparent' }}>
                    {/* Drag Pill */}
                    <View style={[styles.pill, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)' }]} />

                    {/* Header */}
                    <View style={[styles.header, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }]}>
                        <TouchableOpacity
                            style={[styles.iconBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                            onPress={onClose}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <X size={18} color={theme.textPrimary} strokeWidth={2.5} />
                        </TouchableOpacity>

                        <Text style={[styles.title, { color: theme.textPrimary }]}>{t('reports.tabs.orderTabs')}</Text>

                        <TouchableOpacity
                            style={[styles.iconBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                            onPress={handleReset}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <RotateCcw size={16} color="#C8806A" strokeWidth={2.5} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Draggable List */}
                <GestureHandlerRootView style={styles.listContainer}>
                    <DraggableFlatList
                        data={localOrder}
                        keyExtractor={(item) => item.key}
                        renderItem={renderItem}
                        onDragEnd={handleDragEnd}
                        containerStyle={styles.flatList}
                    />
                </GestureHandlerRootView>

                {/* Save Button */}
                <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: '#C8806A' }]}
                    onPress={onClose}
                    activeOpacity={0.85}
                >
                    <Text style={styles.saveBtnText}>{t('common.done')}</Text>
                </TouchableOpacity>
            </RNAnimated.View>
        </Modal>
    );
});

StatsEditModal.displayName = 'StatsEditModal';

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.48)',
    },
    modalContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        minHeight: SCREEN_HEIGHT * 0.48,
        maxHeight: SCREEN_HEIGHT * 0.7,
        paddingBottom: Platform.OS === 'ios' ? 36 : 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.14,
        shadowRadius: 24,
        elevation: 20,
    },
    pill: {
        width: 36,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 10,
        marginBottom: 4,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    iconBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listContainer: {
        flex: 1,
        paddingHorizontal: 16,
    },
    flatList: {
        paddingVertical: 10,
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 13,
        paddingHorizontal: 14,
        marginVertical: 4,
        borderRadius: 16,
        borderWidth: 1,
    },
    dragHandle: {
        padding: 4,
        marginRight: 10,
    },
    iconCircle: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    itemLabel: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        textAlign: 'right',
        letterSpacing: -0.2,
    },
    activeDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        marginLeft: 8,
    },
    saveBtn: {
        marginHorizontal: 20,
        marginTop: 14,
        paddingVertical: 15,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#C8806A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 0,
    },
    saveBtnText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
});

export default StatsEditModal;
