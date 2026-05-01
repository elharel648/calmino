import React, { useEffect, useState } from 'react';
import {
    View, StyleSheet, TouchableOpacity, Modal,
    TouchableWithoutFeedback, Dimensions, Platform, Text, ScrollView
} from 'react-native';
import Animated, {
    useSharedValue, useAnimatedStyle, withSpring, withTiming,
    Easing, runOnJS, interpolate, Extrapolate
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { X, Lightbulb, CheckCircle2, Circle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuickActions, QuickActionKey } from '../../context/QuickActionsContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAudio, SoundId } from '../../context/AudioContext';
import { QUICK_ACTION_BASE_CONFIG } from './quickActionsConfig';

// ─── Constants ────────────────────────────────────────────────────────────────
const FAB_SIZE = 48;
const FAB_RIGHT = 16 + 6;
const FAB_BOTTOM_OFFSET = 7;
const MENU_RADIUS = 110;
const ITEM_SIZE = 56;
const DEFAULT_WHITE_NOISE: SoundId = 'lullaby4';
const ANGLES = [0, Math.PI / 6, Math.PI / 3, Math.PI / 2];
const MAX_SOS = 4;
const TIP_STORAGE_KEY = '@radial_edit_tip_seen';

// All actions that can appear in the SOS menu
const SOS_AVAILABLE: QuickActionKey[] = [
    'food', 'sleep', 'diaper', 'whiteNoise', 'sos',
    'health', 'growth', 'milestones', 'magicMoments', 'teeth',
    'nightLight', 'supplements', 'quickReminder'
];

export default function RadialSOSMenu() {
    const { fabSheetVisible, setFabSheetVisible, triggerFABAction, sosActions, setSosActions, sosEditVisible, setSosEditVisible } = useQuickActions();
    const { theme, isDarkMode } = useTheme();
    const { t } = useLanguage();
    const insets = useSafeAreaInsets();
    const audio = useAudio();

    const isOpen = useSharedValue(0);
    const [renderMenu, setRenderMenu] = useState(false);
    const [tempSelection, setTempSelection] = useState<QuickActionKey[]>([]);
    const [showTip, setShowTip] = useState(false);

    useEffect(() => {
        // Check if user already saw the tip
        AsyncStorage.getItem(TIP_STORAGE_KEY).then(val => {
            if (val !== 'true') setShowTip(true);
        }).catch(() => {});
    }, []);

    useEffect(() => {
        if (fabSheetVisible) {
            setRenderMenu(true);
            isOpen.value = withTiming(1, { duration: 350, easing: Easing.bezier(0.25, 1, 0.5, 1) });
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } else {
            isOpen.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.ease) }, (finished) => {
                if (finished) runOnJS(setRenderMenu)(false);
            });
        }
    }, [fabSheetVisible]);

    const closeMenu = () => {
        setFabSheetVisible(false);
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    useEffect(() => {
        if (sosEditVisible) {
            setTempSelection([...sosActions]);
            // Hide tip forever once they open edit
            if (showTip) {
                setShowTip(false);
                AsyncStorage.setItem(TIP_STORAGE_KEY, 'true').catch(() => {});
            }
        }
    }, [sosEditVisible]);

    const toggleTempAction = (key: QuickActionKey) => {
        setTempSelection(prev => {
            if (prev.includes(key)) return prev.filter(k => k !== key);
            if (prev.length >= MAX_SOS) return prev; // max 4
            return [...prev, key];
        });
        if (Platform.OS !== 'web') Haptics.selectionAsync();
    };

    const handleOpenEdit = () => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        if (fabSheetVisible) {
            setFabSheetVisible(false);
            setTimeout(() => {
                setSosEditVisible(true);
            }, 300);
        } else {
            setSosEditVisible(true);
        }
    };

    const saveEdit = () => {
        if (tempSelection.length === 0) return;
        setSosActions(tempSelection);
        setSosEditVisible(false);
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const handleAction = (action: QuickActionKey) => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        closeMenu();
        setTimeout(() => {
            if (action === 'whiteNoise') {
                if (audio.activeSound) { audio.stopSound(); } else { audio.playSound(DEFAULT_WHITE_NOISE); }
            } else {
                triggerFABAction(action);
            }
        }, 150);
    };

    // ─── Animated Styles ──────────────────────────────────────────────────────
    const backdropStyle = useAnimatedStyle(() => ({
        opacity: interpolate(isOpen.value, [0, 1], [0, 1], Extrapolate.CLAMP),
    }));

    const fabStyle = useAnimatedStyle(() => ({
        transform: [
            { rotateZ: `${interpolate(isOpen.value, [0, 1], [0, -45])}deg` },
            { scale: interpolate(isOpen.value, [0, 0.5, 1], [1, 0.9, 1]) },
        ] as any,
    }));

    const tipStyle = useAnimatedStyle(() => {
        return {
            opacity: isOpen.value,
            transform: [
                { scale: isOpen.value },
                { translateX: interpolate(isOpen.value, [0, 1], [20, 0]) }
            ] as any,
        };
    });

    // Node styles (4 max based on sosActions.length)
    const nodeStyles = [
        useAnimatedStyle(() => {
            const d = interpolate(isOpen.value, [0, 1], [0, MENU_RADIUS], Extrapolate.CLAMP);
            return { transform: [{ translateX: -d * Math.sin(ANGLES[0]) }, { translateY: -d * Math.cos(ANGLES[0]) }, { scale: isOpen.value }] as any, opacity: isOpen.value };
        }),
        useAnimatedStyle(() => {
            const d = interpolate(isOpen.value, [0, 1], [0, MENU_RADIUS], Extrapolate.CLAMP);
            return { transform: [{ translateX: -d * Math.sin(ANGLES[1]) }, { translateY: -d * Math.cos(ANGLES[1]) }, { scale: isOpen.value }] as any, opacity: isOpen.value };
        }),
        useAnimatedStyle(() => {
            const d = interpolate(isOpen.value, [0, 1], [0, MENU_RADIUS], Extrapolate.CLAMP);
            return { transform: [{ translateX: -d * Math.sin(ANGLES[2]) }, { translateY: -d * Math.cos(ANGLES[2]) }, { scale: isOpen.value }] as any, opacity: isOpen.value };
        }),
        useAnimatedStyle(() => {
            const d = interpolate(isOpen.value, [0, 1], [0, MENU_RADIUS], Extrapolate.CLAMP);
            return { transform: [{ translateX: -d * Math.sin(ANGLES[3]) }, { translateY: -d * Math.cos(ANGLES[3]) }, { scale: isOpen.value }] as any, opacity: isOpen.value };
        }),
    ];

    if (!renderMenu && !sosEditVisible) return null;

    const baseBottom = FAB_BOTTOM_OFFSET + insets.bottom;

    return (
        <>
            {renderMenu && (
                <View style={styles.overlay}>
                    {/* Backdrop */}
                    <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
                        <TouchableWithoutFeedback onPress={closeMenu}>
                            <BlurView intensity={isDarkMode ? 40 : 25} tint={isDarkMode ? 'dark' : 'light'} style={StyleSheet.absoluteFill}>
                                <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.1)' }]} />
                            </BlurView>
                        </TouchableWithoutFeedback>
                    </Animated.View>

                    {sosActions.slice(0, MAX_SOS).map((actionKey, i) => {
                        const config = QUICK_ACTION_BASE_CONFIG[actionKey];
                        const colors = theme.actionColors[actionKey as keyof typeof theme.actionColors];
                        const Icon = config?.icon;
                        if (!Icon || !colors) return null;
                        return (
                            <Animated.View key={actionKey} style={[styles.nodeContainer, { right: FAB_RIGHT, bottom: baseBottom }, nodeStyles[i]]}>
                                <TouchableOpacity
                                    style={[styles.node, { backgroundColor: colors.color }]}
                                    onPress={() => handleAction(actionKey)}
                                    onLongPress={handleOpenEdit}
                                    delayLongPress={400}
                                    activeOpacity={0.75}
                                >
                                    <Icon size={22} color="#FFF" strokeWidth={2} />
                                </TouchableOpacity>
                            </Animated.View>
                        );
                    })}

                    {/* Tooltip for the first time */}
                    {showTip && (
                        <Animated.View style={[styles.tipWrapper, { right: FAB_RIGHT + FAB_SIZE + 16, bottom: baseBottom + 4 }, tipStyle]}>
                            <View style={styles.tipBubble}>
                                <Lightbulb size={16} color="#FFF" style={{ marginRight: 6 }} />
                                <Text style={styles.tipText}>לחיצה ארוכה על פלוס (או על הבועות) תאפשר לערוך פעולות</Text>
                                {/* Triangle pointer */}
                                <View style={styles.tipPointer} />
                            </View>
                        </Animated.View>
                    )}

                    {/* FAB clone (X to close) */}
                    <Animated.View style={[styles.fabClone, { right: FAB_RIGHT, bottom: baseBottom }, fabStyle]}>
                        <TouchableOpacity style={styles.fabInner} onPress={closeMenu} activeOpacity={0.9}>
                            <X size={26} color="#FFF" strokeWidth={3} />
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            )}

            {/* Edit Sheet */}
            <Modal transparent visible={sosEditVisible} animationType="slide" onRequestClose={() => setSosEditVisible(false)}>
                <View style={{ flex: 1 }}>
                    <TouchableWithoutFeedback onPress={() => setSosEditVisible(false)}>
                        <View style={styles.editOverlay} />
                    </TouchableWithoutFeedback>
                    <View style={[styles.editSheet, { backgroundColor: isDarkMode ? '#1C1C1E' : '#F2F2F7', paddingBottom: insets.bottom + 16 }]}>
                        <View style={styles.editHandle} />
                        <Text style={[styles.editTitle, { color: isDarkMode ? '#FFF' : '#000' }]}>ערוך כפתורי SOS</Text>
                        <Text style={[styles.editSubtitle, { color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }]}>
                            בחר עד 4 פעולות שיופיעו בתפריט המהיר ({tempSelection.length}/{MAX_SOS})
                        </Text>
                        <ScrollView contentContainerStyle={styles.editGrid} showsVerticalScrollIndicator={false}>
                        {SOS_AVAILABLE.map((key) => {
                            const config = QUICK_ACTION_BASE_CONFIG[key];
                            const colors = theme.actionColors[key as keyof typeof theme.actionColors];
                            const Icon = config?.icon;
                            const selected = tempSelection.includes(key);
                            const disabled = !selected && tempSelection.length >= MAX_SOS;
                            if (!Icon || !colors) return null;

                            return (
                                <TouchableOpacity
                                    key={key}
                                    style={[
                                        styles.editItem,
                                        {
                                            backgroundColor: selected ? colors.color : (isDarkMode ? 'rgba(255,255,255,0.08)' : '#FFFFFF'),
                                            shadowColor: selected ? colors.color : '#000',
                                            shadowOpacity: selected ? 0.3 : 0.05,
                                            shadowOffset: { width: 0, height: selected ? 6 : 2 },
                                            shadowRadius: selected ? 12 : 8,
                                            elevation: selected ? 8 : 2,
                                            opacity: disabled ? 0.4 : 1,
                                        }
                                    ]}
                                    onPress={() => toggleTempAction(key)}
                                    disabled={disabled && !selected}
                                    activeOpacity={0.75}
                                >
                                    <View style={styles.tileHeader}>
                                        <View style={[styles.editItemIcon, { backgroundColor: selected ? 'rgba(255,255,255,0.2)' : colors.lightColor }]}>
                                            <Icon size={20} color={selected ? '#FFF' : colors.color} strokeWidth={2.5} />
                                        </View>
                                        {selected && (
                                            <View style={styles.tileCheck}>
                                                <CheckCircle2 size={20} color="#FFF" fill="rgba(255,255,255,0.3)" stroke="#FFF" />
                                            </View>
                                        )}
                                    </View>
                                    <Text style={[styles.editItemLabel, { color: selected ? '#FFF' : (isDarkMode ? '#FFF' : '#1C1C1E') }]}>
                                        {t(config.labelKey)}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                        </ScrollView>
                    <TouchableOpacity
                        style={[styles.saveBtn, { backgroundColor: theme.primary, opacity: tempSelection.length === 0 ? 0.5 : 1 }]}
                        onPress={saveEdit}
                        disabled={tempSelection.length === 0}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.saveBtnText}>שמור שינויים</Text>
                    </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    overlay: { ...StyleSheet.absoluteFillObject, zIndex: 9999 },
    nodeContainer: {
        position: 'absolute', width: FAB_SIZE, height: FAB_SIZE,
        alignItems: 'center', justifyContent: 'center', zIndex: 10000,
    },
    node: {
        width: ITEM_SIZE, height: ITEM_SIZE, borderRadius: ITEM_SIZE / 2,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.22, shadowRadius: 10, elevation: 10,
        borderWidth: 2, borderColor: 'rgba(255,255,255,0.22)',
    },
    tipWrapper: { position: 'absolute', zIndex: 10000, width: 180 },
    tipBubble: {
        backgroundColor: '#4A90E2', borderRadius: 16, padding: 12,
        flexDirection: 'row', alignItems: 'flex-start',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
    },
    tipText: { color: '#FFF', fontSize: 13, fontWeight: '600', flex: 1, lineHeight: 18, textAlign: 'right' },
    tipPointer: {
        position: 'absolute', right: -6, bottom: 16,
        width: 0, height: 0, backgroundColor: 'transparent',
        borderStyle: 'solid', borderTopWidth: 6, borderBottomWidth: 6,
        borderLeftWidth: 8, borderTopColor: 'transparent',
        borderBottomColor: 'transparent', borderLeftColor: '#4A90E2',
    },
    fabClone: {
        position: 'absolute', width: FAB_SIZE, height: FAB_SIZE,
        borderRadius: FAB_SIZE / 2, backgroundColor: '#C8806A',
        alignItems: 'center', justifyContent: 'center', zIndex: 10001,
        shadowColor: '#C8806A', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.45, shadowRadius: 10, elevation: 8,
    },
    fabInner: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
    // Edit sheet
    editOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
    editSheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingTop: 12, paddingHorizontal: 20, maxHeight: '75%',
    },
    editHandle: {
        width: 36, height: 5, borderRadius: 3,
        backgroundColor: 'rgba(128,128,128,0.4)',
        alignSelf: 'center', marginBottom: 16,
    },
    editTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
    editSubtitle: { fontSize: 13, textAlign: 'center', marginBottom: 20 },
    editGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingBottom: 24, justifyContent: 'space-between' },
    editItem: {
        width: '48%', height: 100,
        borderRadius: 22,
        padding: 14,
        justifyContent: 'space-between',
    },
    tileHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    editItemIcon: {
        width: 38, height: 38, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
    },
    tileCheck: {
        marginTop: 4,
    },
    editItemLabel: { fontSize: 15, fontWeight: '700', textAlign: 'right' },
    saveBtn: {
        borderRadius: 16, paddingVertical: 15,
        alignItems: 'center', marginTop: 8,
    },
    saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
