/**
 * RadialSOSMenu
 * • Short press → radial arc with instant actions
 * • Long press → Control Center sheet
 */

import React, { useEffect, useState } from 'react';
import {
    View, StyleSheet, TouchableOpacity, Platform, Text,
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../../context/LanguageContext';

// ─── Constants ────────────────────────────────────────────────────────────────
const FAB_SIZE = 48;
const FAB_RIGHT = 16 + 6;
const FAB_BOTTOM_OFFSET = 7;
const MENU_RADIUS = 140;
const ITEM_SIZE = 56;
const DEFAULT_WHITE_NOISE: SoundId = 'lullaby4';

export default function RadialSOSMenu() {
    const { fabSheetVisible, setFabSheetVisible, sosActions, sosEditVisible, setSosEditVisible, triggerFABAction } = useQuickActions();
    const { theme, isDarkMode } = useTheme();
    const { t } = useLanguage();
    const insets = useSafeAreaInsets();
    const audio = useAudio();
    const { start: startSleep, isRunning: isSleepRunning, stop: stopSleep } = useSleepTimer();
    const { startBreast, startBottle, startPumping } = useFoodTimer();

    const isOpen = useSharedValue(0);
    const [renderMenu, setRenderMenu] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);

    // Dynamic angles: spread evenly from 0° to 90° based on how many actions are selected
    const count = Math.min(sosActions.length, 4);
    const computedAngles = [0, 1, 2, 3].map(i =>
        count <= 1 ? 0 : (i * Math.PI) / (2 * (count - 1))
    );

    useEffect(() => {
        if (fabSheetVisible) {
            setRenderMenu(true);
            isOpen.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) });
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            
            // Check for tooltip on first open
            AsyncStorage.getItem('hasSeenRadialLongPressHint').then(val => {
                if (!val) {
                    setShowTooltip(true);
                    // Save immediately so it only ever shows once, even if they don't long-press
                    AsyncStorage.setItem('hasSeenRadialLongPressHint', 'true');
                }
            });
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

    const handleLongPress = () => {
        closeMenu();
        if (showTooltip) setShowTooltip(false);
        setTimeout(() => setSosEditVisible(true), 300);
    };

    const handleAction = (action: QuickActionKey) => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        closeMenu();
        setTimeout(() => {
            if (action === 'whiteNoise') {
                if (audio.activeSound) { audio.stopSound(); } else { audio.playSound(DEFAULT_WHITE_NOISE); }
            } else if (action === 'whiteNoiseLullaby') {
                audio.activeSound === 'lullaby1' ? audio.stopSound() : audio.playSound('lullaby1');
            } else if (action === 'whiteNoiseGentle') {
                audio.activeSound === 'lullaby2' ? audio.stopSound() : audio.playSound('lullaby2');
            } else if (action === 'whiteNoiseBirds') {
                audio.activeSound === 'lullaby3' ? audio.stopSound() : audio.playSound('lullaby3');
            } else if (action === 'whiteNoiseRain') {
                audio.activeSound === 'lullaby4' ? audio.stopSound() : audio.playSound('lullaby4');
            } else if (action === 'sleep') {
                if (isSleepRunning) { stopSleep(); } else { startSleep(); }
            } else if (action === 'breastfeeding' || action === 'breastfeedingRight') {
                startBreast('right');
            } else if (action === 'breastfeedingLeft') {
                startBreast('left');
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
        ] as any,
    }));

    // ─── Node styles ───────────────────────────────────────────────────────────
    const nodeStyles = [
        useAnimatedStyle(() => {
            const d = interpolate(isOpen.value, [0, 1], [0, MENU_RADIUS], Extrapolate.CLAMP);
            return { transform: [{ translateX: -d * Math.sin(computedAngles[0]) }, { translateY: -d * Math.cos(computedAngles[0]) }, { scale: isOpen.value }] as any, opacity: isOpen.value };
        }),
        useAnimatedStyle(() => {
            const d = interpolate(isOpen.value, [0, 1], [0, MENU_RADIUS], Extrapolate.CLAMP);
            return { transform: [{ translateX: -d * Math.sin(computedAngles[1]) }, { translateY: -d * Math.cos(computedAngles[1]) }, { scale: isOpen.value }] as any, opacity: isOpen.value };
        }),
        useAnimatedStyle(() => {
            const d = interpolate(isOpen.value, [0, 1], [0, MENU_RADIUS], Extrapolate.CLAMP);
            return { transform: [{ translateX: -d * Math.sin(computedAngles[2]) }, { translateY: -d * Math.cos(computedAngles[2]) }, { scale: isOpen.value }] as any, opacity: isOpen.value };
        }),
        useAnimatedStyle(() => {
            const d = interpolate(isOpen.value, [0, 1], [0, MENU_RADIUS], Extrapolate.CLAMP);
            return { transform: [{ translateX: -d * Math.sin(computedAngles[3]) }, { translateY: -d * Math.cos(computedAngles[3]) }, { scale: isOpen.value }] as any, opacity: isOpen.value };
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
                            (actionKey === 'whiteNoise' && !!audio.activeSound) ||
                            (actionKey === 'whiteNoiseLullaby' && audio.activeSound === 'lullaby1') ||
                            (actionKey === 'whiteNoiseGentle' && audio.activeSound === 'lullaby2') ||
                            (actionKey === 'whiteNoiseBirds' && audio.activeSound === 'lullaby3') ||
                            (actionKey === 'whiteNoiseRain' && audio.activeSound === 'lullaby4');

                        return (
                            <Animated.View key={actionKey} style={[styles.nodeContainer, { right: FAB_RIGHT, bottom: baseBottom }, nodeStyles[i]]}>
                                <TouchableOpacity
                                    style={[
                                        styles.node,
                                        { backgroundColor: colors.color },
                                        isActive && styles.nodeActive,
                                    ]}
                                    onPress={() => handleAction(actionKey)}
                                    onLongPress={handleLongPress}
                                    delayLongPress={400}
                                    activeOpacity={0.75}
                                >
                                    <Icon size={22} color="#FFF" strokeWidth={2} />
                                    {isActive && <View style={styles.activePulse} />}
                                </TouchableOpacity>
                            </Animated.View>
                        );
                    })}

                    {/* X to close (or long press to edit) */}
                    <Animated.View style={[styles.fabClone, { right: FAB_RIGHT, bottom: baseBottom }, fabStyle]}>
                        <TouchableOpacity style={styles.fabInner} onPress={closeMenu} onLongPress={handleLongPress} delayLongPress={400} activeOpacity={0.9}>
                            <X size={26} color="#FFF" strokeWidth={3} />
                        </TouchableOpacity>
                    </Animated.View>

                    {/* First-time Tooltip */}
                    {showTooltip && (
                        <Animated.View style={[styles.tooltipContainer, { right: FAB_RIGHT - 20, bottom: baseBottom + 65, opacity: isOpen }]} pointerEvents="none">
                            <View style={[styles.tooltipBubble, { backgroundColor: isDarkMode ? '#2C2C2E' : '#333333' }]}>
                                <Text style={styles.tooltipText}>{t('fab.longPressHint')}</Text>
                            </View>
                            <View style={[styles.tooltipTail, { borderTopColor: isDarkMode ? '#2C2C2E' : '#333333' }]} />
                        </Animated.View>
                    )}
                </View>
            )}

            {/* ─── Control Center (long press) ─── */}
            <ControlCenter
                visible={sosEditVisible}
                onClose={() => setSosEditVisible(false)}
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
        shadowOpacity: 0.22, shadowRadius: 10, elevation: 0,
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
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 0,
    },
    tooltipContainer: {
        position: 'absolute',
        alignItems: 'center',
        zIndex: 10002,
    },
    tooltipBubble: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 0,
    },
    tooltipText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
    },
    tooltipTail: {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 8,
        borderRightWidth: 8,
        borderTopWidth: 8,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        alignSelf: 'center',
        marginRight: 40, // Position tail slightly right to align with the button
    },
});
