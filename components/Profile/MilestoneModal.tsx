import React, { memo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Calendar as CalendarIcon } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '../../context/LanguageContext';

interface MilestoneModalProps {
    visible: boolean;
    onAdd: (title: string, date: Date) => void;
    onClose: () => void;
}

const MilestoneModal = memo(({ visible, onAdd, onClose }: MilestoneModalProps) => {
    const { t } = useLanguage();
    const { theme, isDarkMode } = useTheme();
    const styles = React.useMemo(() => getStyles(theme, isDarkMode), [theme, isDarkMode]);
    const [title, setTitle] = useState('');
    const [date, setDate] = useState(new Date());
    const [showPicker, setShowPicker] = useState(false);

    useEffect(() => {
        if (visible) {
            setTitle('');
            setDate(new Date());
        }
    }, [visible]);

    const handleAdd = () => {
        if (!title.trim()) return;

        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        onAdd(title, date);
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.backdrop}>
                <View style={styles.card}>
                    <Text style={styles.title}>רגע מיוחד חדש ✨</Text>

                    <TextInput
                        style={styles.input}
                        placeholder="למשל: התהפך בפעם הראשונה"
                        value={title}
                        onChangeText={setTitle}
                        textAlign="right"
                    />

                    <TouchableOpacity
                        style={styles.dateSelector}
                        onPress={() => setShowPicker(true)}
                    >
                        <CalendarIcon size={20} color="#64748b" />
                        <Text>{date.toLocaleDateString('he-IL')}</Text>
                    </TouchableOpacity>

                    {showPicker && (
                        <DateTimePicker
                            value={date}
                            mode="date"
                            display="default"
                            onChange={(e, d) => {
                                setShowPicker(false);
                                if (d) setDate(d);
                            }}
                        />
                    )}

                    <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
                        <Text style={styles.addBtnText}>הוסף ליומן</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                        <Text style={styles.cancelText}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
});

MilestoneModal.displayName = 'MilestoneModal';

const getStyles = (theme: any, isDarkMode: boolean) => StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    card: {
        backgroundColor: theme.card,
        borderRadius: 20,
        padding: 24,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 15,
        color: theme.textPrimary,
    },
    input: {
        backgroundColor: '#f8fafc',
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        fontSize: 16,
        marginBottom: 15,
    },
    dateSelector: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    addBtn: {
        backgroundColor: '#4f46e5',
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
    },
    addBtnText: {
        color: theme.card,
        fontWeight: 'bold',
    },
    cancelBtn: {
        alignItems: 'center',
        marginTop: 15,
    },
    cancelText: {
        color: theme.textSecondary,
    },
});

export default MilestoneModal;
