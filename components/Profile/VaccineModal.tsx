import React, { memo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '../../context/LanguageContext';

interface VaccineModalProps {
    visible: boolean;
    onAdd: (name: string) => void;
    onClose: () => void;
}

const VaccineModal = memo(({ visible, onAdd, onClose }: VaccineModalProps) => {
    const { t } = useLanguage();
    const { theme, isDarkMode } = useTheme();
    const styles = React.useMemo(() => getStyles(theme, isDarkMode), [theme, isDarkMode]);
    const [name, setName] = useState('');

    useEffect(() => {
        if (visible) {
            setName('');
        }
    }, [visible]);

    const handleAdd = () => {
        if (!name.trim()) return;

        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        onAdd(name);
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.backdrop}>
                <View style={styles.card}>
                    <Text style={styles.title}>חיסון נוסף</Text>

                    <TextInput
                        style={styles.input}
                        placeholder="שם החיסון"
                        value={name}
                        onChangeText={setName}
                        textAlign="right"
                        autoFocus
                    />

                    <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
                        <Text style={styles.addBtnText}>{t('common.add')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                        <Text style={styles.cancelText}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
});

VaccineModal.displayName = 'VaccineModal';

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
    addBtn: {
        backgroundColor: '#4f46e5',
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
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

export default VaccineModal;
