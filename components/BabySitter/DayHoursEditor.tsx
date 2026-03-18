import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

interface DayHoursEditorProps {
    dayKey: string;
    dayLabel: string;
    hours: { start: string; end: string };
    onHoursChange: (dayKey: string, hours: { start: string; end: string }) => void;
}

// Validate time format HH:MM
const validateTimeFormat = (time: string): boolean => {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
};

// Format time input (auto-format as user types)
const formatTimeInput = (text: string): string => {
    // Remove non-digits
    const digits = text.replace(/\D/g, '');
    
    // Limit to 4 digits
    if (digits.length > 4) return text;
    
    // Auto-format: HH:MM
    if (digits.length <= 2) {
        return digits;
    } else {
        return `${digits.slice(0, 2)}:${digits.slice(2)}`;
    }
};

export default function DayHoursEditor({ dayKey, dayLabel, hours, onHoursChange }: DayHoursEditorProps) {
    const { theme } = useTheme();
    const { t } = useLanguage();
    const [startError, setStartError] = useState(false);
    const [endError, setEndError] = useState(false);

    const handleStartChange = (text: string) => {
        const formatted = formatTimeInput(text);
        const isValid = formatted.length === 0 || validateTimeFormat(formatted);
        setStartError(formatted.length > 0 && !isValid);
        
        if (isValid || formatted.length === 0) {
            onHoursChange(dayKey, { ...hours, start: formatted });
        }
    };

    const handleEndChange = (text: string) => {
        const formatted = formatTimeInput(text);
        const isValid = formatted.length === 0 || validateTimeFormat(formatted);
        setEndError(formatted.length > 0 && !isValid);
        
        if (isValid || formatted.length === 0) {
            onHoursChange(dayKey, { ...hours, end: formatted });
        }
    };

    return (
        <View style={styles.container}>
            <Text style={[styles.label, { color: theme.textPrimary }]}>{dayLabel}</Text>
            <View style={styles.hoursRow}>
                <View style={[styles.hourInput, { 
                    backgroundColor: theme.cardSecondary,
                    borderWidth: startError ? 1 : 0,
                    borderColor: startError ? theme.danger : 'transparent',
                }]}>
                    <TextInput
                        style={[styles.hourText, { 
                            color: startError ? theme.danger : theme.textPrimary 
                        }]}
                        value={hours.start}
                        onChangeText={handleStartChange}
                        placeholder="09:00"
                        placeholderTextColor={theme.textSecondary}
                        textAlign="center"
                        keyboardType="numeric"
                        maxLength={5}
                    />
                </View>
                <Text style={[styles.divider, { color: theme.textSecondary }]}>-</Text>
                <View style={[styles.hourInput, { 
                    backgroundColor: theme.cardSecondary,
                    borderWidth: endError ? 1 : 0,
                    borderColor: endError ? theme.danger : 'transparent',
                }]}>
                    <TextInput
                        style={[styles.hourText, { 
                            color: endError ? theme.danger : theme.textPrimary 
                        }]}
                        value={hours.end}
                        onChangeText={handleEndChange}
                        placeholder="18:00"
                        placeholderTextColor={theme.textSecondary}
                        textAlign="center"
                        keyboardType="numeric"
                        maxLength={5}
                    />
                </View>
            </View>
            {(startError || endError) && (
                <Text style={[styles.errorText, { color: theme.danger }]}>
                    אנא הזן שעה בפורמט HH:MM (לדוגמה: 09:00)
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    label: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'right',
    },
    hoursRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    hourInput: {
        flex: 1,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        gap: 8,
    },
    hourLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    hourText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    divider: {
        fontSize: 14,
        fontWeight: '500',
    },
    errorText: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 4,
        textAlign: 'right',
    },
});
