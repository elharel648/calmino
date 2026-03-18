import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '../../context/LanguageContext';

interface StatusBadgeProps {
    babyName: string;
    status: 'sleeping' | 'awake';
    onToggle: () => void;
}

/**
 * Status badge with haptic feedback on toggle
 */
const StatusBadge = memo<StatusBadgeProps>(({ babyName, status, onToggle }) => {
    const { t } = useLanguage();
    const handlePress = useCallback(() => {
        // Haptic feedback for premium feel
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onToggle();
    }, [onToggle]);

    const isSleeping = status === 'sleeping';

    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={handlePress}
            style={[
                styles.statusBadge,
                isSleeping ? styles.statusSleep : styles.statusAwake,
            ]}
            accessibilityLabel={`${babyName} ${isSleeping ? 'ישנה' : 'ערה'}. לחץ לשינוי`}
            accessibilityRole="button"
        >
            <Text style={styles.statusText}>
                {isSleeping ? `${babyName} ישנה 😴` : `${babyName} ערה 😃`}
            </Text>
            <Text style={styles.statusSubText}>(לחץ לשינוי)</Text>
        </TouchableOpacity>
    );
});

StatusBadge.displayName = 'StatusBadge';

const styles = StyleSheet.create({
    statusBadge: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 20,
        marginBottom: 20,
        width: '100%',
    },
    statusSleep: {
        backgroundColor: '#E0E7FF',
    },
    statusAwake: {
        backgroundColor: '#FEF3C7',
    },
    statusText: {
        fontWeight: 'bold',
        fontSize: 16,
        color: '#1F2937',
    },
    statusSubText: {
        fontSize: 12,
        color: '#6B7280',
    },
});

export default StatusBadge;
