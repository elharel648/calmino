import React, { useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Platform,
    Animated,
    Switch,
    LayoutAnimation,
    UIManager,
} from 'react-native';
import { Pill, Minus, Plus, Clock, Check, AlertCircle, Bell } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Medication } from '../../types/home';

if (Platform.OS === 'android') {
    UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

interface AddMedicationFormProps {
    onSave: (med: Omit<Medication, 'id' | 'createdAt'>) => void;
    saving: boolean;
    saveSuccess: boolean;
}

const DEFAULT_TIMES = ['08:00', '12:00', '16:00', '20:00', '10:00', '22:00'];

/**
 * Form component for adding a new medication.
 * Rendered INSIDE HealthCard's medication sub-screen (not a separate modal).
 */
const AddMedicationForm: React.FC<AddMedicationFormProps> = ({ onSave, saving, saveSuccess }) => {
    const [name, setName] = useState('');
    const [dosage, setDosage] = useState('');
    const [frequency, setFrequency] = useState(1);
    const [times, setTimes] = useState<string[]>(['08:00']);
    const [notes, setNotes] = useState('');
    const [remindersEnabled, setRemindersEnabled] = useState(true);
    const [nameError, setNameError] = useState(false);

    // Time picker state
    const [showTimePicker, setShowTimePicker] = useState<number | null>(null);

    // Animation refs for dynamic fields
    const fadeAnims = useRef<Animated.Value[]>(
        Array.from({ length: 6 }, () => new Animated.Value(0))
    ).current;

    const updateFrequency = useCallback((newFreq: number) => {
        const clamped = Math.max(1, Math.min(6, newFreq));
        const oldFreq = frequency;

        // Animate layout change
        LayoutAnimation.configureNext(LayoutAnimation.create(
            250,
            LayoutAnimation.Types.easeInEaseOut,
            LayoutAnimation.Properties.opacity,
        ));

        setFrequency(clamped);

        // Update times array
        setTimes(prev => {
            const newTimes = [...prev];
            while (newTimes.length < clamped) {
                newTimes.push(DEFAULT_TIMES[newTimes.length] || '12:00');
            }
            return newTimes.slice(0, clamped);
        });

        // Animate new fields in
        if (clamped > oldFreq) {
            for (let i = oldFreq; i < clamped; i++) {
                fadeAnims[i].setValue(0);
                Animated.timing(fadeAnims[i], {
                    toValue: 1,
                    duration: 300,
                    delay: (i - oldFreq) * 80,
                    useNativeDriver: true,
                }).start();
            }
        }

        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    }, [frequency, fadeAnims]);

    const handleTimeChange = (index: number, event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowTimePicker(null);
        }
        if (selectedDate) {
            const hours = selectedDate.getHours().toString().padStart(2, '0');
            const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
            setTimes(prev => {
                const newTimes = [...prev];
                newTimes[index] = `${hours}:${minutes}`;
                return newTimes;
            });
        }
    };

    const getTimeAsDate = (timeStr: string): Date => {
        const [h, m] = timeStr.split(':').map(Number);
        const d = new Date();
        d.setHours(h, m, 0, 0);
        return d;
    };

    const handleSave = () => {
        if (!name.trim()) {
            setNameError(true);
            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
            return;
        }

        onSave({
            name: name.trim(),
            dosage: dosage.trim() || '-',
            frequency,
            times: times.slice(0, frequency),
            notes: notes.trim() || undefined,
            remindersEnabled,
        });
    };

    return (
        <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
        >
            {/* Header Icon */}
            <View style={styles.headerIcon}>
                <View style={styles.headerIconCircle}>
                    <Pill size={24} color="#8B5CF6" strokeWidth={1.5} />
                </View>
            </View>

            {/* Medication Name */}
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>שם התרופה</Text>
                <TextInput
                    style={[styles.textInput, nameError && styles.textInputError]}
                    value={name}
                    onChangeText={t => { setName(t); setNameError(false); }}
                    placeholder="שם התרופה (למשל: אקמול)"
                    placeholderTextColor="#9CA3AF"
                    textAlign="right"
                />
                {nameError && (
                    <View style={styles.errorRow}>
                        <Text style={styles.errorText}>יש להזין שם תרופה</Text>
                        <AlertCircle size={14} color="#EF4444" />
                    </View>
                )}
            </View>

            {/* Dosage */}
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>מינון</Text>
                <TextInput
                    style={styles.textInput}
                    value={dosage}
                    onChangeText={setDosage}
                    placeholder="כמות (למשל: 5 מ״ל, כדור אחד)"
                    placeholderTextColor="#9CA3AF"
                    textAlign="right"
                />
            </View>

            {/* Frequency Stepper */}
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>כמות פעמים ביום</Text>
                <View style={styles.stepperContainer}>
                    <TouchableOpacity
                        style={[styles.stepperBtn, frequency <= 1 && styles.stepperBtnDisabled]}
                        onPress={() => updateFrequency(frequency - 1)}
                        disabled={frequency <= 1}
                    >
                        <Minus size={20} color={frequency <= 1 ? '#D1D5DB' : '#6B7280'} />
                    </TouchableOpacity>

                    <View style={styles.stepperValueContainer}>
                        <Text style={styles.stepperValue}>{frequency}</Text>
                        <Text style={styles.stepperUnit}>
                            {frequency === 1 ? 'פעם' : 'פעמים'}
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.stepperBtn, frequency >= 6 && styles.stepperBtnDisabled]}
                        onPress={() => updateFrequency(frequency + 1)}
                        disabled={frequency >= 6}
                    >
                        <Plus size={20} color={frequency >= 6 ? '#D1D5DB' : '#6B7280'} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Dynamic Time Pickers */}
            <View style={styles.inputGroup}>
                <View style={styles.timesHeader}>
                    <Clock size={16} color="#8B5CF6" />
                    <Text style={styles.inputLabel}>שעות מתן</Text>
                </View>

                {times.slice(0, frequency).map((time, index) => (
                    <Animated.View
                        key={`time_${index}`}
                        style={[
                            styles.timePickerRow,
                            { opacity: index < 1 ? 1 : fadeAnims[index] },
                        ]}
                    >
                        <Text style={styles.timeLabel}>
                            {frequency === 1 ? 'שעה' : `שעה ${index + 1}`}
                        </Text>

                        <TouchableOpacity
                            style={styles.timeButton}
                            onPress={() => setShowTimePicker(showTimePicker === index ? null : index)}
                        >
                            <Clock size={16} color="#8B5CF6" strokeWidth={1.5} />
                            <Text style={styles.timeButtonText}>{time}</Text>
                        </TouchableOpacity>

                        {showTimePicker === index && (
                            <View style={styles.dateTimePickerWrapper}>
                                <DateTimePicker
                                    value={getTimeAsDate(time)}
                                    mode="time"
                                    is24Hour={true}
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={(e, d) => handleTimeChange(index, e, d)}
                                    style={styles.dateTimePicker}
                                    locale="he-IL"
                                />
                                {Platform.OS === 'ios' && (
                                    <TouchableOpacity
                                        style={styles.timePickerDone}
                                        onPress={() => setShowTimePicker(null)}
                                    >
                                        <Text style={styles.timePickerDoneText}>אישור</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </Animated.View>
                ))}
            </View>

            {/* Reminders Toggle */}
            <View style={styles.inputGroup}>
                <View style={styles.reminderRow}>
                    <View style={styles.reminderInfo}>
                        <Bell size={16} color="#8B5CF6" />
                        <Text style={styles.inputLabel}>התראות תזכורת</Text>
                    </View>
                    <Switch
                        value={remindersEnabled}
                        onValueChange={setRemindersEnabled}
                        trackColor={{ false: '#E5E7EB', true: '#C4B5FD' }}
                        thumbColor={remindersEnabled ? '#8B5CF6' : '#f4f3f4'}
                        ios_backgroundColor="#E5E7EB"
                    />
                </View>
                {remindersEnabled && (
                    <Text style={styles.reminderHint}>
                        תקבל/י תזכורת יומית בכל שעת מתן שנבחרה
                    </Text>
                )}
            </View>

            {/* Notes */}
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>הערות</Text>
                <TextInput
                    style={styles.textArea}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="הערות (למשל: לפני האוכל)"
                    placeholderTextColor="#9CA3AF"
                    textAlign="right"
                    multiline
                    numberOfLines={3}
                />
            </View>

            {/* Save Button */}
            <TouchableOpacity
                style={[styles.saveButton, (!name.trim() || saving) && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving || saveSuccess}
                activeOpacity={0.8}
            >
                <View style={[styles.saveButtonInner, saveSuccess && styles.saveButtonSuccess]}>
                    {saveSuccess ? (
                        <Check size={22} color="#10B981" strokeWidth={2.5} />
                    ) : (
                        <Text style={styles.saveButtonText}>שמור תרופה</Text>
                    )}
                </View>
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
        paddingBottom: 40,
    },
    headerIcon: {
        alignItems: 'center',
        marginBottom: 16,
    },
    headerIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        textAlign: 'right',
        marginBottom: 8,
    },
    textInput: {
        backgroundColor: '#F9FAFB',
        borderRadius: 14,
        padding: 16,
        fontSize: 15,
        color: '#1F2937',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        textAlign: 'right',
        writingDirection: 'rtl',
    },
    textInputError: {
        borderColor: '#EF4444',
        backgroundColor: '#FEF2F2',
    },
    textArea: {
        backgroundColor: '#F9FAFB',
        borderRadius: 14,
        padding: 16,
        fontSize: 15,
        color: '#1F2937',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        textAlign: 'right',
        writingDirection: 'rtl',
        minHeight: 80,
        textAlignVertical: 'top',
    },
    errorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 4,
        marginTop: 6,
    },
    errorText: {
        fontSize: 12,
        color: '#EF4444',
    },

    // Stepper
    stepperContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 12,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
    },
    stepperBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    stepperBtnDisabled: {
        opacity: 0.4,
    },
    stepperValueContainer: {
        alignItems: 'center',
        minWidth: 60,
    },
    stepperValue: {
        fontSize: 32,
        fontWeight: '800',
        color: '#8B5CF6',
    },
    stepperUnit: {
        fontSize: 12,
        fontWeight: '500',
        color: '#9CA3AF',
        marginTop: -2,
    },

    // Times
    timesHeader: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    timePickerRow: {
        marginBottom: 10,
    },
    timeLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: '#6B7280',
        textAlign: 'right',
        marginBottom: 6,
    },
    timeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#F5F3FF',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1.5,
        borderColor: '#DDD6FE',
    },
    timeButtonText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#7C3AED',
        letterSpacing: 2,
    },
    dateTimePickerWrapper: {
        backgroundColor: '#FAFAFE',
        borderRadius: 12,
        marginTop: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    dateTimePicker: {
        height: 120,
    },
    timePickerDone: {
        alignItems: 'center',
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    timePickerDoneText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#8B5CF6',
    },

    // Reminders
    reminderRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    reminderInfo: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
    },
    reminderHint: {
        fontSize: 12,
        color: '#9CA3AF',
        textAlign: 'right',
        marginTop: 6,
    },

    // Save
    saveButton: {
        marginTop: 8,
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    saveButtonInner: {
        backgroundColor: '#8B5CF6',
        borderRadius: 16,
        paddingVertical: 18,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    saveButtonSuccess: {
        backgroundColor: '#F0FDF4',
        shadowOpacity: 0,
        elevation: 0,
    },
    saveButtonText: {
        fontSize: 17,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});

export default AddMedicationForm;
