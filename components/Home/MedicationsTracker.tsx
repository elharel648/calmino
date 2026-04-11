import React, { memo, useCallback, useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Animated } from 'react-native';
import { Sun, Droplets, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { MedicationsState } from '../../types/home';
import { useTheme } from '../../context/ThemeContext';

interface MedicationsTrackerProps {
    meds: MedicationsState;
    onToggle: (type: 'vitaminD' | 'iron') => void;
    syncStatus?: 'synced' | 'syncing' | 'error';
    dynamicStyles: { text: string };
}

const AnimatedSupplementRow = ({ type, name, isDone, onToggle, Icon, theme, isDarkMode }: any) => {
    const checkScale = useRef(new Animated.Value(isDone ? 1 : 0)).current;
    const checkOpacity = useRef(new Animated.Value(isDone ? 1 : 0)).current;
    const burstScale = useRef(new Animated.Value(0.5)).current;
    const burstOpacity = useRef(new Animated.Value(0)).current;
    const strikeWidth = useRef(new Animated.Value(isDone ? 1 : 0)).current;
    const textOpacity = useRef(new Animated.Value(isDone ? 0.5 : 1)).current;
    const rowBg = useRef(new Animated.Value(isDone ? 1 : 0)).current;
    
    const [justCompleted, setJustCompleted] = useState(false);

    useEffect(() => {
        if (justCompleted) {
            Animated.sequence([
                Animated.parallel([
                    Animated.timing(rowBg, { toValue: 1, duration: 400, useNativeDriver: false }),
                    Animated.timing(checkOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
                ]),
                Animated.parallel([
                    Animated.sequence([
                        Animated.timing(burstOpacity, { toValue: 0.8, duration: 150, useNativeDriver: true }),
                        Animated.parallel([
                            Animated.spring(burstScale, { toValue: 2.0, friction: 8, tension: 80, useNativeDriver: true }),
                            Animated.timing(burstOpacity, { toValue: 0, duration: 600, useNativeDriver: true }),
                        ]),
                    ]),
                    Animated.sequence([
                        Animated.delay(100),
                        Animated.spring(checkScale, { toValue: 1.25, friction: 4, tension: 180, useNativeDriver: true }),
                        Animated.spring(checkScale, { toValue: 1, friction: 6, tension: 250, useNativeDriver: true }),
                    ]),
                    Animated.sequence([
                        Animated.delay(200),
                        Animated.timing(strikeWidth, { toValue: 1, duration: 700, useNativeDriver: false }),
                    ]),
                    Animated.sequence([
                        Animated.delay(150),
                        Animated.timing(textOpacity, { toValue: 0.5, duration: 600, useNativeDriver: true }),
                    ]),
                ]),
            ]).start(() => setJustCompleted(false));
        } else if (!isDone) {
            rowBg.setValue(0);
            checkOpacity.setValue(0);
            checkScale.setValue(0);
            strikeWidth.setValue(0);
            textOpacity.setValue(1);
        } else {
            rowBg.setValue(1);
            checkOpacity.setValue(1);
            checkScale.setValue(1);
            strikeWidth.setValue(1);
            textOpacity.setValue(0.5);
        }
    }, [isDone, justCompleted]);

    const handlePress = () => {
        if (!isDone) {
            setJustCompleted(true);
        }
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(isDone ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
        }
        // Small delay to let animation start smoothly before state updates if it causes a re-render
        setTimeout(() => onToggle(type), 50);
    };

    const animatedBg = rowBg.interpolate({
        inputRange: [0, 1],
        outputRange: [isDarkMode ? 'rgba(255,255,255,0.04)' : theme.card, isDarkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.08)'],
    });

    const activeColor = '#10B981'; // Green
    const inactiveColor = isDarkMode ? 'rgba(255,255,255,0.2)' : '#D1D5DB';

    return (
        <Animated.View style={[
            styles.supplementRow,
            { backgroundColor: animatedBg },
            (isDone || justCompleted) && { borderWidth: 1, borderColor: isDarkMode ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.25)' },
            !(isDone || justCompleted) && {
                shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 0
            }
        ]}>
            <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} activeOpacity={1}>
                <View style={[styles.iconBox, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#F3F4F6' }]}>
                    <Icon size={18} color={theme.textTertiary} strokeWidth={2}/>
                </View>
            </TouchableOpacity>
            
            <TouchableOpacity
                style={{ flexDirection: 'row-reverse', alignItems: 'center', flex: 1, gap: 12 }}
                onPress={handlePress}
                activeOpacity={0.7}
            >
                {/* Checkbox */}
                <View style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }}>
                    {(justCompleted || isDone) && (
                        <Animated.View style={{
                            position: 'absolute',
                            alignSelf: 'center',
                            width: 48, height: 48, borderRadius: 24,
                            borderWidth: 2,
                            borderColor: activeColor,
                            borderStyle: 'dashed',
                            opacity: burstOpacity,
                            transform: [{ scale: burstScale }],
                        }} />
                    )}
                    <Animated.View style={[
                        styles.checkbox,
                        !(isDone || justCompleted) && { borderColor: inactiveColor },
                        (isDone || justCompleted) && { backgroundColor: activeColor, borderColor: activeColor },
                        (justCompleted) && {
                            transform: [{ scale: checkScale }],
                            opacity: checkOpacity,
                        },
                    ]}>
                        {(isDone || justCompleted) && <Check size={16} color="#fff" strokeWidth={3} />}
                    </Animated.View>
                </View>

                {/* Text content */}
                <Animated.View style={{ flex: 1, alignItems: 'flex-end', opacity: textOpacity }}>
                    <View style={{ position: 'relative' }}>
                        <Text style={[
                            styles.supplementName,
                            { color: theme.textPrimary },
                            (isDone || justCompleted) && { color: theme.textSecondary, fontWeight: '500' },
                        ]}>
                            {name}
                        </Text>
                        <Animated.View style={{
                            position: 'absolute', top: '50%', right: 0,
                            height: 1.5,
                            backgroundColor: theme.textSecondary,
                            width: strikeWidth.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0%', '100%'],
                            }),
                        }} />
                    </View>
                </Animated.View>
            </TouchableOpacity>
        </Animated.View>
    );
};

const MedicationsTracker = memo<MedicationsTrackerProps>(({
    meds,
    onToggle,
}) => {
    const { theme, isDarkMode } = useTheme();

    return (
        <View style={styles.container}>
            <AnimatedSupplementRow
                type="vitaminD"
                name="ויטמין D"
                isDone={meds.vitaminD}
                onToggle={onToggle}
                Icon={Sun}
                theme={theme}
                isDarkMode={isDarkMode}
            />
            <AnimatedSupplementRow
                type="iron"
                name="ברזל"
                isDone={meds.iron}
                onToggle={onToggle}
                Icon={Droplets}
                theme={theme}
                isDarkMode={isDarkMode}
            />
        </View>
    );
});

MedicationsTracker.displayName = 'MedicationsTracker';

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
        gap: 8,
    },
    supplementRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    iconBox: {
        width: 38,
        height: 38,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkbox: {
        width: 30,
        height: 30,
        borderRadius: 15,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    supplementName: {
        fontSize: 15,
        fontWeight: '600',
        textAlign: 'right',
        writingDirection: 'rtl',
    },
});

export default MedicationsTracker;
