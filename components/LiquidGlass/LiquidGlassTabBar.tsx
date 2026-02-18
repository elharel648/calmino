/**
 * LiquidGlassTabBar - Apple iOS 18 Style Liquid Glass Tab Bar
 * Premium tab bar with glass effect matching iOS design
 */

import React from 'react';
import {
    View,
    TouchableOpacity,
    Text,
    StyleSheet,
    Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const LiquidGlassTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
    const activeTabPayload = state.routes[state.index];
    const activeTabName = activeTabPayload.name;

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

    return (
        <View style={styles.container}>
            {/* Glow Effect */}
            <LinearGradient
                colors={['rgba(255, 255, 255, 0.2)', 'transparent']}
                style={styles.topGlow}
            />

            {/* Glass Tab Bar */}
            <BlurView intensity={90} tint="light" style={styles.blurContainer}>
                <LinearGradient
                    colors={[
                        'rgba(255, 255, 255, 0.35)',
                        'rgba(255, 255, 255, 0.2)',
                        'rgba(255, 255, 255, 0.15)',
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.gradientContainer}
                >
                    {/* Top Border Highlight */}
                    <View style={styles.topBorder} />

                    {/* Tabs */}
                    <View style={styles.tabsContainer}>
                        {state.routes.map((route, index) => {
                            const { options } = descriptors[route.key];
                            const label =
                                options.tabBarLabel !== undefined
                                    ? options.tabBarLabel
                                    : options.title !== undefined
                                        ? options.title
                                        : route.name;

                            const isFocused = state.index === index;

                            // Extract the icon from options (we assume tabBarIcon is provided)
                            const IconComponent = options.tabBarIcon;

                            return (
                                <TouchableOpacity
                                    key={route.key}
                                    onPress={() => handleTabPress(route, isFocused)}
                                    activeOpacity={0.7}
                                    style={[
                                        styles.tab,
                                        index === 0 && styles.firstTab,
                                        index === state.routes.length - 1 && styles.lastTab,
                                    ]}
                                >
                                    {isFocused && (
                                        <BlurView
                                            intensity={70}
                                            tint="light"
                                            style={styles.activeTabBackground}
                                        >
                                            <LinearGradient
                                                colors={[
                                                    'rgba(0, 122, 255, 0.4)',
                                                    'rgba(88, 86, 214, 0.3)',
                                                ]}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 1 }}
                                                style={styles.activeGradient}
                                            >
                                                <View style={styles.activeBorder} />
                                            </LinearGradient>
                                        </BlurView>
                                    )}

                                    <View style={styles.iconContainer}>
                                        {IconComponent && IconComponent({
                                            focused: isFocused,
                                            color: isFocused ? '#FFFFFF' : 'rgba(0, 0, 0, 0.6)',
                                            size: 24
                                        })}
                                    </View>

                                    {/* Optional: Show label if needed, but the custom icon usually handles it.
                                        If CustomTabIcon is used in App.tsx, it renders both icon and label.
                                        We might need to adjust this to avoid double labels if CustomTabIcon is doing both.
                                        
                                        However, looking at App.tsx, `tabBarIcon` renders `CustomTabIcon` which renders both Icon and Text.
                                        So we just need to render `IconComponent`.
                                     */}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </LinearGradient>
            </BlurView>

            {/* Bottom Shadow */}
            <View style={styles.bottomShadow} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 24,
        left: 16,
        right: 16,
        borderRadius: 32, // More rounded for modern look
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
    },
    topGlow: {
        position: 'absolute',
        top: -8,
        left: 0,
        right: 0,
        height: 16,
        zIndex: 1,
        borderRadius: 32,
    },
    blurContainer: {
        borderRadius: 32,
        overflow: 'hidden',
    },
    gradientContainer: {
        borderRadius: 32,
        padding: 4, // Inner padding for floating effect
    },
    topBorder: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 1.5,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
    },
    tabsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    tab: {
        flex: 1,
        height: 64, // Taller touch target
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        borderRadius: 24,
    },
    firstTab: {
        marginLeft: 0,
    },
    lastTab: {
        marginRight: 0,
    },
    activeTabBackground: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 24,
        overflow: 'hidden',
        margin: 4, // Spacing for current tab
    },
    activeGradient: {
        flex: 1,
    },
    activeBorder: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
    },
    iconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    bottomShadow: {
        position: 'absolute',
        bottom: -4,
        left: 8,
        right: 8,
        height: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        borderRadius: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
});

export default LiquidGlassTabBar;
