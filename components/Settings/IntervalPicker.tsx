import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '../../context/LanguageContext';

// Unified accent color
const ACCENT_COLOR = '#6366F1';

interface IntervalPickerProps {
    value: number;
    options: number[];
    unit: string;
    onChange: (value: number) => void;
    disabled?: boolean;
}

export const IntervalPicker: React.FC<IntervalPickerProps> = ({
    value,
    options,
    unit,
    onChange,
    disabled = false,
}) => {
    const { theme } = useTheme();
    const { t } = useLanguage();
    const scaleAnims = React.useRef(options.map(() => new Animated.Value(1))).current;

    const handlePress = (option: number, index: number) => {
        if (disabled) return;

        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        // Bounce animation
        Animated.sequence([
            Animated.timing(scaleAnims[index], {
                toValue: 0.9,
                duration: 50,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnims[index], {
                toValue: 1,
                friction: 5,
                tension: 300,
                useNativeDriver: true,
            }),
        ]).start();

        onChange(option);
    };

    return (
        <View style={styles.container}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>כל {unit}:</Text>
            <View style={styles.optionsContainer}>
                {options.map((option, index) => {
                    const isSelected = option === value;
                    return (
                        <Animated.View
                            key={option}
                            style={{ transform: [{ scale: scaleAnims[index] }] }}
                        >
                            <TouchableOpacity
                                style={[
                                    styles.optionButton,
                                    {
                                        backgroundColor: isSelected ? ACCENT_COLOR : theme.card,
                                        borderColor: isSelected ? ACCENT_COLOR : theme.divider,
                                    },
                                    disabled && styles.optionButtonDisabled,
                                ]}
                                onPress={() => handlePress(option, index)}
                                activeOpacity={0.7}
                                disabled={disabled}
                            >
                                <Text
                                    style={[
                                        styles.optionText,
                                        { color: isSelected ? '#fff' : theme.textPrimary },
                                    ]}
                                >
                                    {option}
                                </Text>
                            </TouchableOpacity>
                        </Animated.View>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 10,
    },
    label: {
        fontSize: 13,
        fontWeight: '400',
        textAlign: 'right',
        flexShrink: 0,
    },
    optionsContainer: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        justifyContent: 'flex-end',
    },
    optionButton: {
        width: 40,
        height: 34,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionButtonDisabled: {
        opacity: 0.4,
    },
    optionText: {
        fontSize: 14,
        fontWeight: '600',
    },
});

export default IntervalPicker;
