import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    TextInput,
    ActivityIndicator,
    Platform,
    KeyboardAvoidingView,
} from 'react-native';
import { X, Users, LogIn } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { joinFamily } from '../../services/familyService';
import { logger } from '../../utils/logger';

interface JoinFamilyModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export const JoinFamilyModal: React.FC<JoinFamilyModalProps> = ({
    visible,
    onClose,
    onSuccess,
}) => {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    console.log('\ud83d\udd17 JoinFamilyModal RENDER - visible:', visible);

    const handleJoin = async () => {
        if (code.length !== 6) {
            setError('הקוד צריך להיות 6 ספרות');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Smart join - automatically detects if code is for family or guest
            const result = await joinFamily(code);

            setLoading(false);

            if (result.success) {
                if (Platform.OS !== 'web') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
                setCode('');
                onClose();
                onSuccess?.();
            } else {
                if (Platform.OS !== 'web') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                }
                setError(result.message);
            }
        } catch (error) {
            setLoading(false);
            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
            setError('שגיאה בהצטרפות. נסה שוב.');
        }
    };

    const handleCodeChange = (text: string) => {
        // Only allow digits and max 6 characters
        const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
        setCode(cleaned);
        setError('');
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView
                style={styles.overlay}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={styles.modalContent}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={22} color="#9CA3AF" />
                        </TouchableOpacity>
                        <Text style={styles.title}>הצטרף למשפחה</Text>
                        <Users size={22} color="#10B981" />
                    </View>

                    {/* Description */}
                    <Text style={styles.description}>
                        הזן את קוד ההזמנה שקיבלת{'\n'}
                        המערכת תזהה אוטומטית אם זה קוד למשפחה (גישה מלאה) או קוד לאורח (24 שעות)
                    </Text>

                    {/* Code Input */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>קוד הזמנה</Text>
                        <TextInput
                            style={[styles.codeInput, error ? styles.codeInputError : null]}
                            value={code}
                            onChangeText={handleCodeChange}
                            placeholder="000000"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="number-pad"
                            maxLength={6}
                        // autoFocus removed to prevent crash on mount
                        />
                        {error ? <Text style={styles.errorText}>{error}</Text> : null}
                    </View>

                    {/* Join Button */}
                    <TouchableOpacity
                        style={[styles.joinBtn, code.length !== 6 && styles.joinBtnDisabled]}
                        onPress={handleJoin}
                        disabled={loading || code.length !== 6}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <LogIn size={20} color="#fff" />
                                <Text style={styles.joinBtnText}>הצטרף</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {/* Tip */}
                    <Text style={styles.tip}>
                        💡 קוד משפחה: גישה מלאה לכל הילדים{'\n'}
                        💡 קוד אורח: גישה ל-24 שעות בלבד
                    </Text>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    closeBtn: {
        padding: 4,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1F2937',
    },
    description: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    inputContainer: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
        textAlign: 'right',
    },
    codeInput: {
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        paddingVertical: 20,
        paddingHorizontal: 16,
        fontSize: 28,
        fontWeight: '800',
        textAlign: 'center',
        letterSpacing: 8,
        color: '#1F2937',
        borderWidth: 2,
        borderColor: '#E5E7EB',
    },
    codeInputError: {
        borderColor: '#EF4444',
        backgroundColor: '#FEF2F2',
    },
    errorText: {
        fontSize: 12,
        color: '#EF4444',
        textAlign: 'center',
        marginTop: 8,
    },
    joinBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: '#10B981',
        paddingVertical: 16,
        borderRadius: 14,
        marginBottom: 16,
    },
    joinBtnDisabled: {
        backgroundColor: '#9CA3AF',
    },
    joinBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    tip: {
        fontSize: 12,
        color: '#9CA3AF',
        textAlign: 'center',
    },
});

export default JoinFamilyModal;
