import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface DayHoursEditorProps {
    dayKey: string;
    dayLabel: string;
    hours: { start: string; end: string };
    onHoursChange: (dayKey: string, hours: { start: string; end: string }) => void;
}

export default function DayHoursEditor({ dayKey, dayLabel, hours, onHoursChange }: DayHoursEditorProps) {
    const { theme } = useTheme();

    return (
        <View style={styles.container}>
            <Text style={[styles.label, { color: theme.textPrimary }]}>{dayLabel}</Text>
            <View style={styles.hoursRow}>
                <View style={[styles.hourInput, { backgroundColor: theme.cardSecondary }]}>
                    <Text style={[styles.hourLabel, { color: theme.textSecondary }]}>מ-</Text>
                    <TextInput
                        style={[styles.hourText, { color: theme.textPrimary }]}
                        value={hours.start}
                        onChangeText={(text) => onHoursChange(dayKey, { ...hours, start: text })}
                        placeholder="09:00"
                        placeholderTextColor={theme.textSecondary}
                    />
                </View>
                <Text style={[styles.divider, { color: theme.textSecondary }]}>עד</Text>
                <View style={[styles.hourInput, { backgroundColor: theme.cardSecondary }]}>
                    <Text style={[styles.hourLabel, { color: theme.textSecondary }]}>עד-</Text>
                    <TextInput
                        style={[styles.hourText, { color: theme.textPrimary }]}
                        value={hours.end}
                        onChangeText={(text) => onHoursChange(dayKey, { ...hours, end: text })}
                        placeholder="18:00"
                        placeholderTextColor={theme.textSecondary}
                    />
                </View>
            </View>
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    hourInput: {
        flex: 1,
        flexDirection: 'row',
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
});
