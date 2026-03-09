/**
 * LiquidGlassTabBar - Premium Apple iOS 26 Liquid Glass Tab Bar
 * Features:
 * - Smooth spring-animated glass bubble that slides between tabs
 * - Prismatic rainbow edge refraction effect
 * - Native UIGlassEffect when available, BlurView fallback
 * - Haptic feedback on tab press
 */

import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    TouchableOpacity,
    StyleSheet,
    Platform,
    Dimensions,
    Animated,
} from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '../../context/ThemeContext';

// Try to load native glass effect
let GlassView: any = null;
let GlassContainer: any = null;
let glassAPIAvailable = false;

try {
    const glassModule = require('expo-glass-effect');
    GlassView = glassModule.GlassView;
    GlassContainer = glassModule.GlassContainer;
    try {
        glassAPIAvailable = glassModule.isGlassEffectAPIAvailable();
    } catch (e: any) {
        glassAPIAvailable = false;
    }
} catch (e: any) {
    // Module not available
}

const useNativeGlass = GlassView != null && GlassContainer != null && glassAPIAvailable;

const ACTIVE_COLOR = '#007AFF';
const SCREEN_W = Dimensions.get('window').width;
const BAR_MARGIN_H = 14;
const BAR_PADDING_H = 8;
const BAR_W = SCREEN_W - BAR_MARGIN_H * 2;
const BAR_H = 102;
const BAR_R = 40;
const BUBBLE_SIZE = 56;
const BUBBLE_R = 20;

const FULLSCREEN_SCREENS: string[] = [];

const LiquidGlassTabBar: React.FC<BottomTabBarProps> = React.memo(({ state, descriptors, navigation }) => {
    const { isDarkMode } = useTheme();
    const numTabs = state.routes.length;

    // Hide tab bar when a fullscreen screen is active in any nested stack
    const activeRoute = state.routes[state.index];
    const nestedState = activeRoute.state as { index?: number; routes?: { name: string }[] } | undefined;
    if (nestedState?.routes && nestedState.index !== undefined) {
        const activeNestedRoute = nestedState.routes[nestedState.index];
        if (activeNestedRoute && FULLSCREEN_SCREENS.includes(activeNestedRoute.name)) {
            return null;
        }
    }

    // Calculate tab width and bubble position
    const tabWidth = (BAR_W - BAR_PADDING_H * 2) / numTabs;
    const getBubbleX = (index: number) => BAR_PADDING_H + tabWidth * index + (tabWidth - BUBBLE_SIZE) / 2;

    // Animated sliding bubble position
    const slideAnim = useRef(new Animated.Value(getBubbleX(state.index))).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(slideAnim, {
                toValue: getBubbleX(state.index),
                useNativeDriver: true,
                tension: 68,
                friction: 12,
            }),
            Animated.sequence([
                Animated.timing(scaleAnim, {
                    toValue: 0.9,
                    duration: 80,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    useNativeDriver: true,
                    tension: 120,
                    friction: 8,
                }),
            ]),
        ]).start();
    }, [state.index]);

    const handleTabPress = (route: any, isFocused: boolean) => {
        const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
        });
        if (!isFocused && !event.defaultPrevented) {
            if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            navigation.navigate(route.name, route.params);
        }
    };

    // Sliding glass bubble (rendered once, animated position)
    const renderSlidingBubble = () => (
        <Animated.View
            style={[
                styles.slidingBubble,
                {
                    transform: [
                        { translateX: slideAnim },
                        { scale: scaleAnim },
                    ],
                },
            ]}
        >
            {/* Glass bubble background */}
            {useNativeGlass ? (
                <GlassView
                    style={styles.activeBubble}
                    glassEffectStyle="regular"
                    isInteractive
                    colorScheme={isDarkMode ? 'dark' : 'light'}
                />
            ) : (
                <View style={[
                    styles.activeBubble,
                    {
                        backgroundColor: isDarkMode
                            ? 'rgba(255,255,255,0.12)'
                            : 'rgba(0,0,0,0.06)',
                    },
                ]} />
            )}

        </Animated.View>
    );

    // Top indicator line (animated)
    const renderTopIndicator = () => (
        <Animated.View
            style={[
                styles.topIndicator,
                {
                    transform: [
                        { translateX: Animated.add(slideAnim, new Animated.Value((BUBBLE_SIZE - 28) / 2)) },
                    ],
                },
            ]}
        />
    );

    const renderTabs = () => (
        <View style={styles.tabsRow}>
            {state.routes.map((route: any, index: number) => {
                const { options } = descriptors[route.key];
                const isFocused = state.index === index;
                const IconComponent = options.tabBarIcon;

                return (
                    <TouchableOpacity
                        key={route.key}
                        onPress={() => handleTabPress(route, isFocused)}
                        activeOpacity={0.7}
                        style={styles.tab}
                    >
                        <View style={styles.iconWrap}>
                            {IconComponent && IconComponent({
                                focused: isFocused,
                                color: isFocused
                                    ? ACTIVE_COLOR
                                    : (isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)'),
                                size: 24,
                            })}
                        </View>
                    </TouchableOpacity>
                );
            })}
        </View>
    );

    // Native glass path (dev build on iOS 26+)
    if (useNativeGlass) {
        return (
            <View style={styles.outer}>
                <GlassContainer spacing={12} style={styles.container}>
                    <GlassView
                        style={styles.barBackground}
                        glassEffectStyle="regular"
                        colorScheme={isDarkMode ? 'dark' : 'light'}
                    />
                    {renderTopIndicator()}
                    {renderSlidingBubble()}
                    {renderTabs()}
                </GlassContainer>
            </View>
        );
    }

    // Fallback path (Expo Go or non-iOS 26)
    return (
        <View style={styles.outer}>
            {/* Bottom fill - extends tab bar background to screen edge */}
            <View style={[styles.bottomFill, {
                backgroundColor: isDarkMode ? 'rgb(18,18,22)' : 'rgba(255,255,255,0.95)',
            }]} />
            <View style={[styles.container, styles.fallbackShadow]}>
                {/* Solid base layer — prevents iOS safe-area white from bleeding through */}
                <View style={[styles.blurFill, {
                    backgroundColor: isDarkMode ? 'rgb(18,18,22)' : 'transparent',
                }]} />
                {!isDarkMode && (
                    <BlurView
                        style={styles.blurFill}
                        tint="systemChromeMaterialLight"
                        intensity={90}
                    />
                )}
                {/* Tint overlay */}
                <View style={[
                    styles.blurFill,
                    {
                        backgroundColor: isDarkMode
                            ? 'rgba(28,28,36,0.96)'
                            : 'rgba(255,255,255,0.7)',
                    },
                ]} />
                {/* Subtle top border */}
                <View style={[
                    styles.blurFill,
                    {
                        borderWidth: 0.5,
                        borderColor: isDarkMode
                            ? 'rgba(255,255,255,0.08)'
                            : 'rgba(0,0,0,0.04)',
                        borderRadius: BAR_R,
                    },
                ]} />
                {renderTopIndicator()}
                {renderSlidingBubble()}
                {renderTabs()}
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    outer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingBottom: 32,
        paddingHorizontal: BAR_MARGIN_H,
    },
    container: {
        borderRadius: BAR_R,
        overflow: 'hidden',
    },
    bottomFill: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 34,
    },
    fallbackShadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 24,
        elevation: 8,
    },
    barBackground: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: BAR_R,
    },
    blurFill: {
        ...StyleSheet.absoluteFillObject,
    },
    tabsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        height: BAR_H,
        paddingHorizontal: BAR_PADDING_H,
    },
    tab: {
        flex: 1,
        height: BAR_H - 10,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    // Sliding glass bubble
    slidingBubble: {
        position: 'absolute',
        top: (BAR_H - BUBBLE_SIZE) / 2,
        width: BUBBLE_SIZE,
        height: BUBBLE_SIZE,
        borderRadius: BUBBLE_R,
        zIndex: 5,
    },
    activeBubble: {
        width: '100%',
        height: '100%',
        borderRadius: BUBBLE_R,
    },
    // Top blue indicator line
    topIndicator: {
        position: 'absolute',
        top: 8,
        width: 28,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: ACTIVE_COLOR,
        zIndex: 15,
    },
    iconWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
});

export default LiquidGlassTabBar;
