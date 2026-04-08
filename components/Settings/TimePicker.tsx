import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Clock } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '../../context/LanguageContext';

// Unified accent color
const ACCENT_COLOR = '#C8806A';

interface TimePickerProps {
    value: string; // HH:MM format
    label: string;
    onChange: (time: string) => void;
    disabled?: boolean;
}

export const TimePicker: React.FC<TimePickerProps> = ({
    value,
    label,
    onChange,
    disabled = false,
}) => {
    const { theme } = useTheme();
    const { t } = useLanguage();
    const [showPicker, setShowPicker] = useState(false);

    // Convert HH:MM string to Date object
    const getDateFromTime = (timeString: string): Date => {
        const [hours, minutes] = timeString.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date;
    };

    // Convert Date to HH:MM string
    const getTimeFromDate = (date: Date): string => {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    const handlePress = () => {
        if (disabled) return;
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        setShowPicker(true);
    };

    const handleTimeChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowPicker(false);
        }

        if (selectedDate && event.type !== 'dismissed') {
            const newTime = getTimeFromDate(selectedDate);
            onChange(newTime);
        }
    };

    const handleConfirm = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        setShowPicker(false);
    };

    const handleCancel = () => {
        setShowPicker(false);
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <TouchableOpacity
                style={[
                    styles.button,
                    {
                        backgroundColor: theme.card,
                        borderColor: theme.divider,
                    },
                    disabled && styles.buttonDisabled,
                ]}
                onPress={handlePress}
                activeOpacity={0.7}
                disabled={disabled}
            >
                <View style={styles.content}>
                    <View style={[styles.iconContainer, { backgroundColor: `${ACCENT_COLOR}15` }]}>
                        <Clock size={16} color={disabled ? theme.textSecondary : ACCENT_COLOR} />
                    </View>
                    <Text style={[styles.label, { color: disabled ? theme.textSecondary : theme.textPrimary }]}>
                        {label}
                    </Text>
                    <View style={[styles.timeContainer, { backgroundColor: `${ACCENT_COLOR}10` }]}>
                        <Text style={[styles.time, { color: disabled ? theme.textSecondary : ACCENT_COLOR }]}>
                            {value}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>

            {/* Android Picker */}
            {showPicker && Platform.OS === 'android' && (
                <DateTimePicker
                    value={getDateFromTime(value)}
                    mode="time"
                    is24Hour={true}
                    display="default"
                    onChange={handleTimeChange}
                />
            )}

            {/* iOS Modal Picker */}
            {Platform.OS === 'ios' && (
                <Modal
                    visible={showPicker}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={handleCancel}
                >
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                            {/* Drag Handle */}
                            <View style={styles.dragHandleContainer}>
                                <View style={[styles.dragHandle, { backgroundColor: theme.divider }]} />
                            </View>

                            {/* Header */}
                            <View style={[styles.modalHeader, { borderBottomColor: theme.divider }]}>
                                <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
                                    <Text style={[styles.cancelText, { color: theme.textSecondary }]}>{t('common.cancel')}</Text>
                                </TouchableOpacity>
                                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{label}</Text>
                                <TouchableOpacity onPress={handleConfirm} style={styles.headerButton}>
                                    <Text style={styles.confirmText}>{t('common.confirm')}</Text>
                                </TouchableOpacity>
                            </View>

                            <DateTimePicker
                                value={getDateFromTime(value)}
                                mode="time"
                                is24Hour={true}
                                display="spinner"
                                onChange={handleTimeChange}
                                locale="he-IL"
                                textColor={theme.textPrimary}
                                style={styles.picker}
                            />
                        </View>
                    </View>
                </Modal>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        paddingVertical: 8,
    },
    button: {
        borderRadius: 14,
        borderWidth: 1,
        padding: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 0,
    },
    buttonDisabled: {
        opacity: 0.4,
    },
    content: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 12,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        textAlign: 'right',
    },
    timeContainer: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    time: {
        fontSize: 16,
        fontWeight: '700',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: 30,
    },
    dragHandleContainer: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    dragHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerButton: {
        minWidth: 60,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '600',
        textAlign: 'center',
    },
    confirmText: {
        fontSize: 16,
        fontWeight: '600',
        color: ACCENT_COLOR,
        textAlign: 'left',
    },
    cancelText: {
        fontSize: 16,
        textAlign: 'right',
    },
    picker: {
        height: 200,
    },
});

export default TimePicker;
