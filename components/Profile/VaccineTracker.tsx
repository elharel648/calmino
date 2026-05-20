import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform, Modal } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Info, Plus, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { VACCINE_SCHEDULE, CustomVaccine } from '../../types/profile';

interface VaccineTrackerProps {
    vaccines?: { [key: string]: boolean | { isDone: boolean; date: any } };
    customVaccines?: CustomVaccine[];
    onToggle: (key: string, date?: Date) => void;
    onToggleCustom: (vaccine: CustomVaccine) => void;
    onAddCustom: () => void;
    onDeleteCustom: (vaccine: CustomVaccine) => void;
}

const VaccineTracker = memo(({
    vaccines,
    customVaccines,
    onToggle,
    onToggleCustom,
    onAddCustom,
    onDeleteCustom,
}: VaccineTrackerProps) => {

    const { theme, isDarkMode } = useTheme();
    const styles = React.useMemo(() => getStyles(theme, isDarkMode), [theme, isDarkMode]);
    const [datePickerVisible, setDatePickerVisible] = React.useState(false);
    const [pendingVaccine, setPendingVaccine] = React.useState<{ key: string, isCustom: boolean, customObj?: CustomVaccine } | null>(null);
    const [selectedDate, setSelectedDate] = React.useState(new Date());
    // Guard to prevent Android double-fire
    const androidPickerHandled = React.useRef(false);

    const handleToggle = (key: string) => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        const isDone = vaccines?.[key];
        // If already done, just toggle off (or we could allow editing date, but simple toggle is safer for now)
        if (isDone) {
            onToggle(key);
        } else {
            // If not done, show date picker
            setPendingVaccine({ key, isCustom: false });
            setSelectedDate(new Date());
            androidPickerHandled.current = false;
            setDatePickerVisible(true);
        }
    };

    const handleToggleCustom = (vaccine: CustomVaccine) => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        if (vaccine.isDone) {
            onToggleCustom(vaccine);
        } else {
            setPendingVaccine({ key: vaccine.id, isCustom: true, customObj: vaccine });
            setSelectedDate(new Date());
            androidPickerHandled.current = false;
            setDatePickerVisible(true);
        }
    };

    const onDateConfirm = (event: any, date?: Date) => {
        if (Platform.OS === 'android') {
            // Android fires onChange twice (once for 'set', once for 'dismissed').
            // Use a ref guard to ensure we only handle the first event.
            if (androidPickerHandled.current) return;
            androidPickerHandled.current = true;
            setDatePickerVisible(false);

            if (event?.type !== 'set') {
                setPendingVaccine(null);
                return;
            }

            const selected = date || selectedDate;
            if (selected && pendingVaccine) {
                if (pendingVaccine.isCustom && pendingVaccine.customObj) {
                    onToggleCustom(pendingVaccine.customObj);
                } else {
                    onToggle(pendingVaccine.key, selected);
                }
            }
            setPendingVaccine(null);
            return;
        }

        // iOS path
        if (event?.type === 'dismissed') {
            setPendingVaccine(null);
            return;
        }

        const selected = date || selectedDate;
        if (selected && pendingVaccine) {
            if (pendingVaccine.isCustom && pendingVaccine.customObj) {
                onToggleCustom(pendingVaccine.customObj);
            } else {
                onToggle(pendingVaccine.key, selected);
            }
        }
        setPendingVaccine(null);
    };

    // For iOS Modal
    const confirmDate = () => {
        onDateConfirm(null, selectedDate);
        setDatePickerVisible(false);
    };

    const openHealthInfo = () => {
        Linking.openURL('https://www.health.gov.il/Subjects/pregnancy/Childbirth/Vaccination_of_infants/Pages/default.aspx');
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.title}>💉 פנקס חיסונים</Text>
                <TouchableOpacity onPress={openHealthInfo}>
                    <Info size={18} color="#6366f1" />
                </TouchableOpacity>
            </View>
            <Text style={styles.disclaimer}>לפי המלצות משרד הבריאות</Text>

            {/* Date Picker Modal */}
            {datePickerVisible && (
                Platform.OS === 'ios' ? (
                    <Modal transparent animationType="fade" visible={datePickerVisible}>
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContent}>
                                <Text style={styles.modalTitle}>מתי בצעתם את החיסון?</Text>
                                {/* @ts-ignore */}
                                <DateTimePicker
                                    value={selectedDate}
                                    mode="date"
                                    display="spinner"
                                    onChange={(e, d) => setSelectedDate(d || selectedDate)}
                                    maximumDate={new Date()}
                                    locale="he-IL"
                                />
                                <View style={styles.modalButtons}>
                                    <TouchableOpacity style={styles.cancelButton} onPress={() => setDatePickerVisible(false)}>
                                        <Text style={styles.cancelButtonText}>ביטול</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.confirmButton} onPress={confirmDate}>
                                        <Text style={styles.confirmButtonText}>אישור</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>
                ) : (
                    /* @ts-ignore */
                    <DateTimePicker
                        value={selectedDate}
                        mode="date"
                        display="default"
                        onChange={onDateConfirm}
                        maximumDate={new Date()}
                    />
                )
            )}

            {VACCINE_SCHEDULE.map((group, idx) => (
                <View key={idx} style={styles.vaccineGroup}>
                    <Text style={styles.ageTitle}>{group.ageTitle}</Text>
                    {group.vaccines.map((v) => {
                        const vaccineData = vaccines?.[v.key];
                        // @ts-ignore
                        const isDone = typeof vaccineData === 'object' ? vaccineData?.isDone : !!vaccineData;
                        // @ts-ignore
                        const date = typeof vaccineData === 'object' ? vaccineData?.date : null;

                        return (
                            <TouchableOpacity
                                key={v.key}
                                style={[styles.vaccineRow, isDone && styles.vaccineRowDone]}
                                onPress={() => handleToggle(v.key)}
                            >
                                <View style={[styles.checkbox, isDone && styles.checkboxDone]}>
                                    {isDone && <Check size={12} color="white" />}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.vaccineText, isDone && styles.vaccineTextDone]}>
                                        {v.name}
                                    </Text>
                                    {isDone && date && (
                                        <Text style={styles.vaccineDate}>
                                            {/* @ts-ignore */}
                                            {date.seconds ? new Date(date.seconds * 1000).toLocaleDateString('he-IL') : new Date(date).toLocaleDateString('he-IL')}
                                        </Text>
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            ))}

            <TouchableOpacity style={styles.addBtn} onPress={onAddCustom}>
                <Plus size={16} color="#6366f1" />
                <Text style={styles.addText}>הוסף חיסון אחר</Text>
            </TouchableOpacity>

            {customVaccines?.map((v, i) => (
                <TouchableOpacity
                    key={i}
                    style={[styles.vaccineRow, v.isDone && styles.vaccineRowDone]}
                    onPress={() => handleToggleCustom(v)}
                    onLongPress={() => onDeleteCustom(v)}
                >
                    <View style={[styles.checkbox, v.isDone && styles.checkboxDone]}>
                        {v.isDone && <Check size={12} color="white" />}
                    </View>
                    <Text style={styles.vaccineText}>{v.name} (אישי)</Text>
                </TouchableOpacity>
            ))}
        </View>
    );
});

VaccineTracker.displayName = 'VaccineTracker';

const getStyles = (theme: any, isDarkMode: boolean) => StyleSheet.create({
    container: {
        backgroundColor: theme.card,
        marginHorizontal: 20,
        padding: 20,
        borderRadius: 20,
        marginBottom: 25,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 0,
    },
    headerRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.textPrimary,
    },
    disclaimer: {
        fontSize: 11,
        color: theme.textSecondary,
        textAlign: 'right',
        marginBottom: 20,
    },
    vaccineGroup: {
        marginBottom: 20,
    },
    ageTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#6366f1',
        textAlign: 'right',
        marginBottom: 8,
        backgroundColor: '#e0e7ff',
        alignSelf: 'flex-end',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    vaccineRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginBottom: 8,
        gap: 10,
    },
    vaccineRowDone: {
        opacity: 0.6,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#cbd5e1',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxDone: {
        backgroundColor: '#10b981',
        borderColor: '#10b981',
    },
    vaccineText: {
        fontSize: 14,
        color: '#334155',
        flex: 1,
        textAlign: 'right',
    },
    vaccineTextDone: {
        textDecorationLine: 'line-through',
        color: '#94a3b8',
    },
    addBtn: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 10,
        padding: 10,
        backgroundColor: '#f5f3ff',
        borderRadius: 8,
    },
    addText: {
        color: '#6366f1',
        fontWeight: '600',
        fontSize: 14,
    },
    vaccineDate: {
        fontSize: 11,
        color: theme.textSecondary,
        marginTop: 2,
        textAlign: 'right',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: theme.card,
        borderRadius: 20,
        padding: 20,
        width: '85%',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        color: theme.textPrimary,
    },
    modalButtons: {
        flexDirection: 'row',
        marginTop: 20,
        gap: 15,
        width: '100%',
        justifyContent: 'center',
    },
    confirmButton: {
        backgroundColor: '#6366f1',
        paddingVertical: 10,
        paddingHorizontal: 25,
        borderRadius: 10,
    },
    confirmButtonText: {
        color: theme.card,
        fontWeight: 'bold',
    },
    cancelButton: {
        backgroundColor: '#f1f5f9',
        paddingVertical: 10,
        paddingHorizontal: 25,
        borderRadius: 10,
    },
    cancelButtonText: {
        color: theme.textSecondary,
        fontWeight: '600',
    },
});

export default VaccineTracker;
