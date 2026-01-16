import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import * as Haptics from 'expo-haptics';

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
        <View style={[styles.container, { backgroundColor: theme.background }]}>
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
                                    isSelected && styles.optionButtonSelected,
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
                                        disabled && styles.optionTextDisabled,
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
        paddingHorizontal: 20,
        paddingVertical: 14,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 12,
        textAlign: 'right',
    },
    optionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'flex-end',
    },
    optionButton: {
        width: 52,
        height: 52,
        borderRadius: 14,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    optionButtonSelected: {
        shadowColor: ACCENT_COLOR,
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 3,
    },
    optionButtonDisabled: {
        opacity: 0.4,
    },
    optionText: {
        fontSize: 18,
        fontWeight: '700',
    },
    optionTextDisabled: {
        opacity: 0.6,
    },
});

export default IntervalPicker;
