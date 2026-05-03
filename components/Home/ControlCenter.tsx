/**
 * ControlCenter — Picker for radial arc shortcuts
 * User selects up to 4 actions → they appear in the radial arc on short press
 */

import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Modal,
    TouchableWithoutFeedback, ScrollView,
} from 'react-native';
import Animated, {
    useSharedValue, useAnimatedStyle, withTiming, Easing,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { X, Check, Lock, Zap } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useQuickActions, QuickActionKey } from '../../context/QuickActionsContext';
import { QUICK_ACTION_BASE_CONFIG } from './quickActionsConfig';

const MAX = 4;

// Actions that trigger immediately (no screen navigation)
const INSTANT_ACTIONS = new Set<QuickActionKey>(['sleep', 'whiteNoise', 'whiteNoiseLullaby', 'whiteNoiseGentle', 'whiteNoiseBirds', 'whiteNoiseRain', 'breastfeeding', 'breastfeedingRight', 'breastfeedingLeft', 'bottle', 'pumping']);

// ─── Available actions organized by section ────────────────────────────────────
const SECTIONS: { title: string; items: QuickActionKey[] }[] = [
    { title: 'שינה', items: ['sleep'] },
    { title: 'האכלה', items: ['breastfeedingRight', 'breastfeedingLeft', 'bottle', 'pumping', 'food', 'diaper'] },
    { title: 'רעש לבן', items: ['whiteNoiseLullaby', 'whiteNoiseGentle', 'whiteNoiseBirds', 'whiteNoiseRain'] },
    { title: 'כלים', items: ['nightLight', 'quickReminder', 'health', 'growth', 'milestones', 'sos'] },
];

interface Props {
    visible: boolean;
    onClose: () => void;
}

const ControlCenter: React.FC<Props> = ({ visible, onClose }) => {
    const { theme, isDarkMode } = useTheme();
    const insets = useSafeAreaInsets();
    const { sosActions, setSosActions } = useQuickActions();
    const [selected, setSelected] = useState<QuickActionKey[]>([...sosActions]);

    useEffect(() => {
        if (visible) setSelected([...sosActions]);
    }, [visible]);

    const translateY = useSharedValue(600);
    const backdropOp = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            translateY.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
            backdropOp.value = withTiming(1, { duration: 180 });
        } else {
            translateY.value = withTiming(600, { duration: 200, easing: Easing.in(Easing.cubic) });
            backdropOp.value = withTiming(0, { duration: 180 });
        }
    }, [visible]);

    const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
    const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOp.value }));

    const toggle = (key: QuickActionKey) => {
        if (!selected.includes(key) && selected.length >= MAX) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }
        Haptics.selectionAsync();
        setSelected(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    const save = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSosActions(selected);
        onClose();
    };

    const bg = isDarkMode ? 'rgba(22,22,26,0.97)' : 'rgba(248,246,244,0.97)';
    const cardBg = isDarkMode ? 'rgba(255,255,255,0.08)' : '#FFFFFF';

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
                    <View style={[styles.handle, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]} />

                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: theme.textPrimary }]}>קיצורי לחיצה מהירה</Text>
                        <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)' }]}>
                            <X size={16} color={theme.textSecondary} strokeWidth={2.5} />
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                        בחר עד {MAX} קיצורים שיופיעו בלחיצה על "+" ({selected.length}/{MAX})
                    </Text>

                    <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                        {SECTIONS.map(section => (
                            <View key={section.title} style={styles.section}>
                                <Text style={[styles.sectionTitle, { color: isDarkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.35)' }]}>
                                    {section.title}
                                </Text>
                                <View style={styles.itemsRow}>
                                    {section.items.map(key => {
                                        const config = QUICK_ACTION_BASE_CONFIG[key];
                                        const colors = theme.actionColors[key as keyof typeof theme.actionColors];
                                        const Icon = config?.icon;
                                        if (!Icon || !colors) return null;

                                        const isSelected = selected.includes(key);
                                        const isDisabled = !isSelected && selected.length >= MAX;

                                        return (
                                            <TouchableOpacity
                                                key={key}
                                                style={[
                                                    styles.item,
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
                                                    {key === 'breastfeeding' ? 'הנקה' :
                                                     key === 'breastfeedingRight' ? 'הנקה R' :
                                                     key === 'breastfeedingLeft' ? 'הנקה L' :
                                                     key === 'bottle' ? 'בקבוק' :
                                                     key === 'pumping' ? 'שאיבה' :
                                                     key === 'diaper' ? 'החתלה' :
                                                     key === 'sleep' ? 'שינה' :
                                                     key === 'whiteNoise' ? 'רעש לבן' :
                                                     key === 'whiteNoiseLullaby' ? 'שיר ערש' :
                                                     key === 'whiteNoiseGentle' ? 'מוזיקה עדינה' :
                                                     key === 'whiteNoiseBirds' ? 'ציפורים' :
                                                     key === 'whiteNoiseRain' ? 'גשם' :
                                                     key === 'nightLight' ? 'פנס לילה' :
                                                     key === 'quickReminder' ? 'תזכורת' :
                                                     key === 'health' ? 'בריאות' :
                                                     key === 'growth' ? 'צמיחה' :
                                                     key === 'milestones' ? 'אבני דרך' :
                                                     key === 'sos' ? 'SOS' :
                                                     key === 'food' ? 'אוכל' : key}
                                                </Text>
                                                {isSelected && (
                                                    <View style={styles.checkBadge}>
                                                        <Check size={10} color="#fff" strokeWidth={3} />
                                                    </View>
                                                )}
                                                {!isSelected && INSTANT_ACTIONS.has(key) && (
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
                            </View>
                        ))}
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
        maxHeight: '88%',
    },
    inner: { paddingHorizontal: 16, borderTopLeftRadius: 28, borderTopRightRadius: 28, flex: 1 },
    handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 2 },
    header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
    title: { fontSize: 17, fontWeight: '700' },
    subtitle: { fontSize: 13, marginBottom: 12, textAlign: 'right' },
    closeBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    section: { marginBottom: 16 },
    sectionTitle: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, textAlign: 'right' },
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
        alignItems: 'center', justifyContent: 'center',
        opacity: 0.85,
    },
    lockBadge: {
        position: 'absolute', top: 6, right: 6,
        width: 14, height: 14, borderRadius: 7,
        alignItems: 'center', justifyContent: 'center',
    },
    saveBtn: {
        marginTop: 8, padding: 15, borderRadius: 16, alignItems: 'center',
        shadowColor: '#C8806A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
    },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default ControlCenter;
