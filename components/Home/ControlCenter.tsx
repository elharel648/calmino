/**
 * ControlCenter — Picker for radial arc shortcuts
 * User selects up to 4 actions → they appear in the radial arc on short press
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Modal,
    TouchableWithoutFeedback, ScrollView, Dimensions, PanResponder,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SCREEN_HEIGHT = Dimensions.get('window').height;

import Animated, {
    useSharedValue, useAnimatedStyle, withTiming, Easing,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Check, Lock, Zap, ChevronDown, ChevronUp, EyeOff } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useQuickActions, QuickActionKey } from '../../context/QuickActionsContext';
import { QUICK_ACTION_BASE_CONFIG } from './quickActionsConfig';

const MAX = 4;
const STORAGE_KEY_COLLAPSED = '@cc_collapsed_sections';
const STORAGE_KEY_HIDDEN_SECTIONS = '@cc_hidden_sections';

// Actions that trigger immediately (no screen navigation)
const INSTANT_ACTIONS = new Set<QuickActionKey>(['sleep', 'whiteNoise', 'whiteNoiseLullaby', 'whiteNoiseGentle', 'whiteNoiseBirds', 'whiteNoiseRain', 'breastfeeding', 'breastfeedingRight', 'breastfeedingLeft', 'bottle', 'pumping']);

// ─── Available actions organized by section ────────────────────────────────────
const SECTIONS: { title: string; items: QuickActionKey[]; cols?: 2 | 3 }[] = [
    { title: 'שינה', items: ['sleep'] },
    { title: 'האכלה', items: ['breastfeedingRight', 'breastfeedingLeft', 'bottle', 'pumping', 'food', 'diaper'] },
    { title: 'רעש לבן', items: ['whiteNoiseLullaby', 'whiteNoiseGentle', 'whiteNoiseBirds', 'whiteNoiseRain'], cols: 2 },
    { title: 'בריאות', items: ['healthDoctor', 'healthVaccines', 'healthIllness', 'healthTemperature', 'healthMedications', 'healthTipatHalav', 'healthAllergies', 'healthHistory'] },
    { title: 'כלים', items: ['nightLight', 'quickReminder', 'growth', 'milestones', 'sos'] },
];

// Only keys that exist in sections are valid selections
const VALID_KEYS = new Set(SECTIONS.flatMap(s => s.items));

const LABEL_MAP: Partial<Record<QuickActionKey, string>> = {
    breastfeeding: 'הנקה', breastfeedingRight: 'הנקה R', breastfeedingLeft: 'הנקה L',
    bottle: 'בקבוק', pumping: 'שאיבה', diaper: 'החתלה', sleep: 'שינה', food: 'אוכל',
    whiteNoise: 'רעש לבן', whiteNoiseLullaby: 'שיר ערש', whiteNoiseGentle: 'מוזיקה עדינה',
    whiteNoiseBirds: 'ציפורים', whiteNoiseRain: 'גשם',
    healthDoctor: 'ביקור רופא', healthVaccines: 'חיסונים', healthIllness: 'מחלות',
    healthTemperature: 'טמפרטורה', healthMedications: 'תרופות', healthTipatHalav: 'טיפת חלב',
    healthAllergies: 'אלרגיות', healthHistory: 'היסטוריה',
    nightLight: 'פנס לילה', quickReminder: 'תזכורת', health: 'בריאות',
    growth: 'צמיחה', milestones: 'אבני דרך', sos: 'SOS',
};

interface Props {
    visible: boolean;
    onClose: () => void;
}

const ControlCenter: React.FC<Props> = ({ visible, onClose }) => {
    const { theme, isDarkMode } = useTheme();
    const insets = useSafeAreaInsets();
    const { sosActions, setSosActions } = useQuickActions();

    // Filter stale keys that no longer exist in any section
    const [selected, setSelected] = useState<QuickActionKey[]>(
        sosActions.filter(k => VALID_KEYS.has(k))
    );
    const [showMaxHint, setShowMaxHint] = useState(false);
    const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
    const [hiddenSections, setHiddenSections] = useState<Set<string>>(new Set());
    const [editMode, setEditMode] = useState(false);

    // Load persisted prefs
    useEffect(() => {
        AsyncStorage.multiGet([STORAGE_KEY_COLLAPSED, STORAGE_KEY_HIDDEN_SECTIONS])
            .then(([[, collapsed], [, hidden]]) => {
                if (collapsed) setCollapsedSections(new Set(JSON.parse(collapsed)));
                if (hidden) setHiddenSections(new Set(JSON.parse(hidden)));
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (visible) setSelected(sosActions.filter(k => VALID_KEYS.has(k)));
    }, [visible]);

    const translateY = useSharedValue(SCREEN_HEIGHT);
    const backdropOp = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            translateY.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
            backdropOp.value = withTiming(1, { duration: 180 });
        } else {
            translateY.value = withTiming(SCREEN_HEIGHT, { duration: 200, easing: Easing.in(Easing.cubic) });
            backdropOp.value = withTiming(0, { duration: 180 });
        }
    }, [visible]);

    const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
    const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOp.value }));

    // Swipe-down to dismiss
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onStartShouldSetPanResponderCapture: () => false,
            onMoveShouldSetPanResponder: (_, gs) =>
                gs.dy > 10 && Math.abs(gs.dy) > Math.abs(gs.dx) * 1.5,
            onPanResponderMove: (_, gs) => {
                if (gs.dy > 0) translateY.value = gs.dy;
            },
            onPanResponderRelease: (_, gs) => {
                if (gs.dy > 80 || gs.vy > 0.5) {
                    translateY.value = withTiming(SCREEN_HEIGHT, { duration: 200, easing: Easing.in(Easing.cubic) });
                    backdropOp.value = withTiming(0, { duration: 180 });
                    setTimeout(onClose, 200);
                } else {
                    translateY.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) });
                }
            },
        })
    ).current;

    const toggle = (key: QuickActionKey) => {
        if (!selected.includes(key) && selected.length >= MAX) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setShowMaxHint(true);
            setTimeout(() => setShowMaxHint(false), 2000);
            return;
        }
        Haptics.selectionAsync();
        setSelected(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    const toggleCollapse = useCallback((title: string) => {
        Haptics.selectionAsync();
        setCollapsedSections(prev => {
            const next = new Set(prev);
            next.has(title) ? next.delete(title) : next.add(title);
            AsyncStorage.setItem(STORAGE_KEY_COLLAPSED, JSON.stringify([...next])).catch(() => {});
            return next;
        });
    }, []);

    const toggleHideSection = useCallback((title: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setHiddenSections(prev => {
            const next = new Set(prev);
            next.has(title) ? next.delete(title) : next.add(title);
            AsyncStorage.setItem(STORAGE_KEY_HIDDEN_SECTIONS, JSON.stringify([...next])).catch(() => {});
            return next;
        });
    }, []);

    const save = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSosActions(selected);
        onClose();
    };

    const bg = isDarkMode ? 'rgba(22,22,26,0.97)' : 'rgba(248,246,244,0.97)';
    const cardBg = isDarkMode ? 'rgba(255,255,255,0.08)' : '#FFFFFF';
    const sectionTitleColor = isDarkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.35)';

    if (!visible) return null;

    return (
        <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)' }, backdropStyle]} />
            </TouchableWithoutFeedback>

            <Animated.View style={[styles.sheet, sheetStyle]}>
                <BlurView
                    tint={isDarkMode ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterialLight'}
                    intensity={90}
                    style={[StyleSheet.absoluteFill, { borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' }]}
                />
                <View style={[styles.inner, { backgroundColor: bg, paddingBottom: insets.bottom + 12 }]}>

                    {/* Swipe handle */}
                    <View style={styles.handleArea} {...panResponder.panHandlers}>
                        <View style={[styles.handle, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]} />
                    </View>

                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: theme.textPrimary }]}>קיצורי לחיצה מהירה</Text>
                        <TouchableOpacity
                            onPress={() => setEditMode(e => !e)}
                            style={[styles.editModeBtn, { backgroundColor: editMode ? theme.primary : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)') }]}
                        >
                            <EyeOff size={14} color={editMode ? '#fff' : theme.textSecondary} strokeWidth={2} />
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                        {editMode
                            ? 'לחץ על עין להסתיר/להציג קטגוריה'
                            : `בחר עד ${MAX} קיצורים שיופיעו בלחיצה על "+" (${selected.length}/${MAX})`
                        }
                    </Text>

                    {showMaxHint && (
                        <View style={[styles.maxHint, { backgroundColor: isDarkMode ? 'rgba(255,100,80,0.15)' : 'rgba(200,80,60,0.08)', borderColor: isDarkMode ? 'rgba(255,100,80,0.3)' : 'rgba(200,80,60,0.2)' }]}>
                            <Text style={[styles.maxHintText, { color: isDarkMode ? '#FF7060' : '#C8503C' }]}>
                                הגעת למקסימום — בטל בחירה קיימת כדי להוסיף
                            </Text>
                        </View>
                    )}

                    <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                        {SECTIONS.map(section => {
                            const isHidden = hiddenSections.has(section.title);
                            const isCollapsed = collapsedSections.has(section.title);

                            return (
                                <View key={section.title} style={[styles.section, isHidden && styles.sectionHidden]}>
                                    {/* Section header — tappable to collapse, shows hide button in edit mode */}
                                    <TouchableOpacity
                                        style={styles.sectionHeader}
                                        onPress={() => !editMode && toggleCollapse(section.title)}
                                        activeOpacity={editMode ? 1 : 0.6}
                                    >
                                        <View style={styles.sectionHeaderLeft}>
                                            {!editMode && (
                                                isCollapsed
                                                    ? <ChevronDown size={12} color={sectionTitleColor} strokeWidth={2.5} />
                                                    : <ChevronUp size={12} color={sectionTitleColor} strokeWidth={2.5} />
                                            )}
                                        </View>
                                        <Text style={[styles.sectionTitle, { color: isHidden ? (isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.18)') : sectionTitleColor }]}>
                                            {section.title}
                                            {isHidden ? '  (מוסתר)' : ''}
                                        </Text>
                                        {editMode && (
                                            <TouchableOpacity
                                                onPress={() => toggleHideSection(section.title)}
                                                style={[styles.hideSectionBtn, { backgroundColor: isHidden ? theme.primary : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)') }]}
                                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                            >
                                                <EyeOff size={12} color={isHidden ? '#fff' : theme.textSecondary} strokeWidth={2} />
                                            </TouchableOpacity>
                                        )}
                                    </TouchableOpacity>

                                    {/* Items — hidden when section collapsed or hidden */}
                                    {!isCollapsed && !isHidden && (
                                        <View style={styles.itemsRow}>
                                            {section.items.map((key) => {
                                                const config = QUICK_ACTION_BASE_CONFIG[key];
                                                const colors = theme.actionColors[key as keyof typeof theme.actionColors];
                                                const Icon = config?.icon;
                                                if (!Icon || !colors) return null;

                                                const isSelected = selected.includes(key);
                                                const isDisabled = !isSelected && selected.length >= MAX;
                                                const itemWidthStyle = section.cols === 2
                                                    ? { width: '47%' as const }
                                                    : { width: '30%' as const };

                                                return (
                                                    <TouchableOpacity
                                                        key={key}
                                                        style={[
                                                            styles.item,
                                                            itemWidthStyle,
                                                            {
                                                                backgroundColor: isSelected ? colors.color : cardBg,
                                                                borderColor: isSelected ? colors.color : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)'),
                                                                opacity: isDisabled ? 0.38 : 1,
                                                            }
                                                        ]}
                                                        onPress={() => toggle(key)}
                                                        activeOpacity={isDisabled ? 0.6 : 0.75}
                                                    >
                                                        <Icon size={22} color={isSelected ? '#fff' : colors.color} strokeWidth={2} />
                                                        <Text style={[styles.itemLabel, { color: isSelected ? '#fff' : theme.textPrimary }]} numberOfLines={2}>
                                                            {LABEL_MAP[key] ?? key}
                                                        </Text>
                                                        {isSelected && (
                                                            <View style={styles.checkBadge}>
                                                                <Check size={10} color="#fff" strokeWidth={3} />
                                                            </View>
                                                        )}
                                                        {!isSelected && !isDisabled && INSTANT_ACTIONS.has(key) && (
                                                            <View style={[styles.instantBadge, { backgroundColor: colors.color }]}>
                                                                <Zap size={8} color="#fff" strokeWidth={2.5} fill="#fff" />
                                                            </View>
                                                        )}
                                                        {isDisabled && (
                                                            <View style={[styles.lockBadge, { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.12)' }]}>
                                                                <Lock size={8} color={isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.45)'} strokeWidth={2.5} />
                                                            </View>
                                                        )}
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                        <View style={{ height: 12 }} />
                    </ScrollView>

                    {/* Save button */}
                    <TouchableOpacity
                        style={[styles.saveBtn, { backgroundColor: theme.primary, opacity: selected.length === 0 ? 0.5 : 1 }]}
                        onPress={save}
                        disabled={selected.length === 0}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.saveBtnText}>שמור קיצורים ({selected.length}/{MAX})</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    sheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.2, shadowRadius: 20, elevation: 16,
        height: SCREEN_HEIGHT * 0.88,
    },
    inner: { paddingHorizontal: 16, borderTopLeftRadius: 28, borderTopRightRadius: 28, flex: 1 },
    handleArea: { alignItems: 'center', paddingTop: 12, paddingBottom: 8, paddingHorizontal: 40, minHeight: 36 },
    handle: { width: 36, height: 4, borderRadius: 2 },
    header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
    title: { fontSize: 17, fontWeight: '700' },
    subtitle: { fontSize: 13, marginBottom: 12, textAlign: 'right' },
    editModeBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    section: { marginBottom: 16 },
    sectionHidden: { opacity: 0.5 },
    sectionHeader: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 8 },
    sectionHeaderLeft: { width: 20, alignItems: 'flex-end' },
    sectionTitle: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, flex: 1, textAlign: 'right' },
    hideSectionBtn: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
    itemsRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
    item: {
        width: '30%', alignItems: 'center', padding: 12, borderRadius: 16, borderWidth: 1.5, gap: 6,
        position: 'relative',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    },
    itemLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
    checkBadge: {
        position: 'absolute', top: 6, left: 6,
        width: 16, height: 16, borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.3)',
        alignItems: 'center', justifyContent: 'center',
    },
    instantBadge: {
        position: 'absolute', top: 6, right: 6,
        width: 14, height: 14, borderRadius: 7,
        alignItems: 'center', justifyContent: 'center', opacity: 0.85,
    },
    lockBadge: {
        position: 'absolute', top: 6, right: 6,
        width: 14, height: 14, borderRadius: 7,
        alignItems: 'center', justifyContent: 'center',
    },
    maxHint: {
        marginBottom: 10, paddingHorizontal: 12, paddingVertical: 8,
        borderRadius: 10, borderWidth: 1,
    },
    maxHintText: { fontSize: 12, fontWeight: '600', textAlign: 'right' },
    saveBtn: {
        marginTop: 8, padding: 15, borderRadius: 16, alignItems: 'center',
        shadowColor: '#C8806A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
    },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default ControlCenter;
