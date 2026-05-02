/**
 * RadialSOSMenu
 * • Short press → radial arc with instant actions
 * • Long press → Control Center sheet
 */

import React, { useEffect, useState } from 'react';
import {
    View, StyleSheet, TouchableOpacity, Platform,
} from 'react-native';
import Animated, {
    useSharedValue, useAnimatedStyle, withTiming,
    Easing, runOnJS, interpolate, Extrapolate
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuickActions, QuickActionKey } from '../../context/QuickActionsContext';
import { useTheme } from '../../context/ThemeContext';
import { useAudio, SoundId } from '../../context/AudioContext';
import { useSleepTimer } from '../../context/SleepTimerContext';
import { useFoodTimer } from '../../context/FoodTimerContext';
import { QUICK_ACTION_BASE_CONFIG } from './quickActionsConfig';
import { navigateToHome } from '../../services/navigationService';
import ControlCenter from './ControlCenter';

// ─── Constants ────────────────────────────────────────────────────────────────
const FAB_SIZE = 48;
const FAB_RIGHT = 16 + 6;
const FAB_BOTTOM_OFFSET = 7;
const MENU_RADIUS = 110;
const ITEM_SIZE = 56;
const DEFAULT_WHITE_NOISE: SoundId = 'lullaby4';
const ANGLES = [0, Math.PI / 6, Math.PI / 3, Math.PI / 2];

export default function RadialSOSMenu() {
    const { fabSheetVisible, setFabSheetVisible, sosActions, sosEditVisible, setSosEditVisible, triggerFABAction } = useQuickActions();
    const { theme, isDarkMode } = useTheme();
    const insets = useSafeAreaInsets();
    const audio = useAudio();
    const { start: startSleep, isRunning: isSleepRunning, stop: stopSleep } = useSleepTimer();
    const { startBreast, startBottle, startPumping } = useFoodTimer();

    const isOpen = useSharedValue(0);
    const [renderMenu, setRenderMenu] = useState(false);

    useEffect(() => {
        if (fabSheetVisible) {
            setRenderMenu(true);
            isOpen.value = withTiming(1, { duration: 320, easing: Easing.bezier(0.25, 1, 0.5, 1) });
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

    const handleAction = (action: QuickActionKey) => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        closeMenu();
        setTimeout(() => {
            if (action === 'whiteNoise') {
                if (audio.activeSound) { audio.stopSound(); } else { audio.playSound(DEFAULT_WHITE_NOISE); }
            } else if (action === 'sleep') {
                if (isSleepRunning) { stopSleep(); } else { startSleep(); }
            } else if (action === 'breastfeeding') {
                startBreast('right');
            } else if (action === 'bottle') {
                startBottle();
            } else if (action === 'pumping') {
                startPumping();
            } else {
                triggerFABAction(action);
                navigateToHome();
            }
        }, 150);
    };

    // ─── Animated backdrop ─────────────────────────────────────────────────────
    const backdropStyle = useAnimatedStyle(() => ({
        opacity: interpolate(isOpen.value, [0, 1], [0, 1], Extrapolate.CLAMP),
    }));

    const fabStyle = useAnimatedStyle(() => ({
        transform: [
            { rotateZ: `${interpolate(isOpen.value, [0, 1], [0, -45])}deg` },
            { scale: interpolate(isOpen.value, [0, 0.5, 1], [1, 0.9, 1]) },
        ] as any,
    }));

    // ─── Node styles ───────────────────────────────────────────────────────────
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

    const baseBottom = FAB_BOTTOM_OFFSET + insets.bottom;

    return (
        <>
            {/* ─── Radial arc (short press) ─── */}
            {renderMenu && (
                <View style={styles.overlay}>
                    <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
                        <BlurView intensity={isDarkMode ? 40 : 25} tint={isDarkMode ? 'dark' : 'light'} style={StyleSheet.absoluteFill}>
                            <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.1)' }]} />
                        </BlurView>
                        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeMenu} activeOpacity={1} />
                    </Animated.View>

                    {sosActions.slice(0, 4).map((actionKey, i) => {
                        const config = QUICK_ACTION_BASE_CONFIG[actionKey];
                        const colors = theme.actionColors[actionKey as keyof typeof theme.actionColors];
                        const Icon = config?.icon;
                        if (!Icon || !colors || !nodeStyles[i]) return null;

                        // Active state indicator
                        const isActive =
                            (actionKey === 'sleep' && isSleepRunning) ||
                            (actionKey === 'whiteNoise' && !!audio.activeSound);

                        return (
                            <Animated.View key={actionKey} style={[styles.nodeContainer, { right: FAB_RIGHT, bottom: baseBottom }, nodeStyles[i]]}>
                                <TouchableOpacity
                                    style={[
                                        styles.node,
                                        { backgroundColor: colors.color },
                                        isActive && styles.nodeActive,
                                    ]}
                                    onPress={() => handleAction(actionKey)}
                                    onLongPress={() => {
                                        closeMenu();
                                        setTimeout(() => setSosEditVisible(true), 300);
                                    }}
                                    delayLongPress={400}
                                    activeOpacity={0.75}
                                >
                                    <Icon size={22} color="#FFF" strokeWidth={2} />
                                    {isActive && <View style={styles.activePulse} />}
                                </TouchableOpacity>
                            </Animated.View>
                        );
                    })}

                    {/* X to close */}
                    <Animated.View style={[styles.fabClone, { right: FAB_RIGHT, bottom: baseBottom }, fabStyle]}>
                        <TouchableOpacity style={styles.fabInner} onPress={closeMenu} activeOpacity={0.9}>
                            <X size={26} color="#FFF" strokeWidth={3} />
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            )}

            {/* ─── Control Center (long press) ─── */}
            <ControlCenter
                visible={sosEditVisible}
                onClose={() => setSosEditVisible(false)}
                onDiaper={() => { triggerFABAction('diaper'); navigateToHome(); }}
                onNightLight={() => { triggerFABAction('nightLight'); navigateToHome(); }}
                onQuickReminder={() => { triggerFABAction('quickReminder'); navigateToHome(); }}
                onEditRadial={() => {
                    setSosEditVisible(false);
                    setTimeout(() => setSosEditVisible(true), 100);
                }}
            />
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
    nodeActive: {
        borderWidth: 3, borderColor: 'rgba(255,255,255,0.6)',
        shadowOpacity: 0.5, shadowRadius: 16,
    },
    activePulse: {
        position: 'absolute', bottom: 6, right: 6,
        width: 8, height: 8, borderRadius: 4,
        backgroundColor: '#fff', opacity: 0.85,
    },
    fabClone: {
        position: 'absolute', width: FAB_SIZE, height: FAB_SIZE,
        alignItems: 'center', justifyContent: 'center', zIndex: 10001,
    },
    fabInner: {
        width: FAB_SIZE, height: FAB_SIZE, borderRadius: FAB_SIZE / 2,
        backgroundColor: '#C8806A', alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
    },
});
