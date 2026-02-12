// pages/PhoneVerificationScreen.tsx - SMS Verification Screen
import React, { useState, useEffect, useRef } from 'react';
import { Modal } from 'react-native';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, MessageSquare, CheckCircle, XCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { sendVerificationCode, verifyCode, validateIsraeliPhone, formatPhoneForFirebase } from '../services/phoneAuthService';
import { logger } from '../utils/logger';

interface PhoneVerificationScreenProps {
    phoneNumber: string;
    onVerified: (phoneNumber: string) => void;
    onCancel: () => void;
}

export default function PhoneVerificationScreen({
    phoneNumber,
    onVerified,
    onCancel,
}: PhoneVerificationScreenProps) {
    const { theme, isDarkMode } = useTheme();
    const { t } = useLanguage();

    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [countdown, setCountdown] = useState(60);
    const [confirmation, setConfirmation] = useState<any>(null);
    const codeInputRef = useRef<TextInput>(null);

    // Send initial SMS on mount
    useEffect(() => {
        sendSMS();
    }, []);

    // Countdown timer for resend
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const sendSMS = async () => {
        const validation = validateIsraeliPhone(phoneNumber);
        if (!validation.valid) {
            Alert.alert('שגיאה', validation.message);
            return;
        }

        setLoading(true);
        try {
            const result = await sendVerificationCode(phoneNumber);
            if (result.success && result.confirmation) {
                setConfirmation(result.confirmation);
                setCountdown(60);
                if (Platform.OS !== 'web') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
                Alert.alert('נשלח!', 'קוד אימות נשלח למספר הטלפון שלך');
            } else {
                // Show detailed error message
                const errorMsg = result.error || 'לא ניתן לשלוח SMS';
                Alert.alert(
                    'שגיאה',
                    errorMsg + (errorMsg.includes('לא מופעל') ? '\n\nיש להפעיל Phone Authentication ב-Firebase Console' : ''),
                    [
                        { text: 'הבנתי', style: 'cancel' },
                        ...(errorMsg.includes('לא מופעל') ? [{
                            text: 'פתח Firebase Console',
                            onPress: () => {
                                // Could open browser to Firebase Console
                            }
                        }] : [])
                    ]
                );
            }
        } catch (error: any) {
            logger.error('SMS send error:', error);
            const errorMsg = error?.message || 'לא ניתן לשלוח SMS. נסה שוב מאוחר יותר';
            Alert.alert(
                'שגיאה',
                errorMsg + '\n\nאם הבעיה נמשכת, וודא ש:\n1. Phone Authentication מופעל ב-Firebase Console\n2. יש כרטיס אשראי מקושר לחשבון'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        if (code.length !== 6) {
            Alert.alert('שגיאה', 'יש להזין קוד בן 6 ספרות');
            return;
        }

        if (!confirmation) {
            Alert.alert('שגיאה', 'אין אישור פעיל. נסה לשלוח SMS מחדש');
            return;
        }

        setLoading(true);
        try {
            const result = await verifyCode(confirmation, code);
            if (result.success) {
                if (Platform.OS !== 'web') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
                onVerified(phoneNumber);
            } else {
                if (Platform.OS !== 'web') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                }
                Alert.alert('שגיאה', result.error || 'קוד אימות שגוי');
                setCode('');
            }
        } catch (error) {
            logger.error('Verification error:', error);
            Alert.alert('שגיאה', 'אירעה שגיאה באימות. נסה שוב');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (countdown > 0) return;

        setResending(true);
        await sendSMS();
        setResending(false);
    };

    const formattedPhone = phoneNumber.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');

    return (
        <Modal
            visible={true}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onCancel}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={[styles.container, { backgroundColor: theme.background }]}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            onPress={onCancel}
                            style={styles.backBtn}
                            accessibilityLabel="חזרה"
                        >
                            <ArrowLeft size={24} color={theme.textPrimary} />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
                            אימות טלפון
                        </Text>
                        <View style={{ width: 40 }} />
                    </View>

                    {/* Content */}
                    <View style={styles.content}>
                        {/* Icon */}
                        <View style={[styles.iconContainer, { backgroundColor: theme.primaryLight }]}>
                            <MessageSquare size={48} color={theme.primary} />
                        </View>

                        {/* Title */}
                        <Text style={[styles.title, { color: theme.textPrimary }]}>
                            הזן את קוד האימות
                        </Text>
                        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                            שלחנו קוד אימות למספר{'\n'}
                            <Text style={{ fontWeight: '700' }}>{formattedPhone}</Text>
                        </Text>

                        {/* Code Input */}
                        <View style={styles.codeContainer}>
                            <TextInput
                                ref={codeInputRef}
                                style={[
                                    styles.codeInput,
                                    {
                                        backgroundColor: theme.card,
                                        borderColor: code.length === 6 ? theme.success : theme.border,
                                        color: theme.textPrimary,
                                    },
                                ]}
                                value={code}
                                onChangeText={(text) => {
                                    const cleaned = text.replace(/\D/g, '').slice(0, 6);
                                    setCode(cleaned);
                                    if (cleaned.length === 6) {
                                        handleVerify();
                                    }
                                }}
                                placeholder="000000"
                                placeholderTextColor={theme.textTertiary}
                                keyboardType="number-pad"
                                maxLength={6}
                                autoFocus
                                textAlign="center"
                                selectTextOnFocus
                            />
                            {code.length === 6 && (
                                <View style={styles.checkIcon}>
                                    <CheckCircle size={20} color={theme.success} />
                                </View>
                            )}
                        </View>

                        {/* Resend */}
                        <View style={styles.resendContainer}>
                            <Text style={[styles.resendText, { color: theme.textSecondary }]}>
                                לא קיבלת את הקוד?
                            </Text>
                            <TouchableOpacity
                                onPress={handleResend}
                                disabled={countdown > 0 || resending || loading}
                                style={[
                                    styles.resendBtn,
                                    (countdown > 0 || resending || loading) && styles.resendBtnDisabled,
                                ]}
                            >
                                {resending ? (
                                    <ActivityIndicator size="small" color={theme.primary} />
                                ) : (
                                    <Text
                                        style={[
                                            styles.resendBtnText,
                                            { color: countdown > 0 ? theme.textTertiary : theme.primary },
                                        ]}
                                    >
                                        {countdown > 0 ? `שלח שוב (${countdown})` : 'שלח שוב'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Verify Button */}
                        <TouchableOpacity
                            style={[
                                styles.verifyBtn,
                                (!code || code.length !== 6 || loading) && styles.verifyBtnDisabled,
                            ]}
                            onPress={handleVerify}
                            disabled={!code || code.length !== 6 || loading}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={
                                    code.length === 6 && !loading
                                        ? [theme.primary, theme.primary]
                                        : [theme.textTertiary, theme.textTertiary]
                                }
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.verifyBtnGradient}
                            >
                                {loading ? (
                                    <ActivityIndicator color={theme.card} />
                                ) : (
                                    <Text style={[styles.verifyBtnText, { color: theme.card }]}>
                                        אמת
                                    </Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 45,
        paddingBottom: 20,
    },
    backBtn: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingTop: 40,
    },
    iconContainer: {
        width: 96,
        height: 96,
        borderRadius: 48,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 12,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 22,
    },
    codeContainer: {
        width: '100%',
        marginBottom: 24,
        position: 'relative',
    },
    codeInput: {
        width: '100%',
        height: 64,
        borderRadius: 16,
        borderWidth: 2,
        fontSize: 28,
        fontWeight: '700',
        letterSpacing: 8,
    },
    checkIcon: {
        position: 'absolute',
        left: 16,
        top: 22,
    },
    resendContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    resendText: {
        fontSize: 14,
        marginBottom: 8,
    },
    resendBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    resendBtnDisabled: {
        opacity: 0.5,
    },
    resendBtnText: {
        fontSize: 15,
        fontWeight: '600',
    },
    verifyBtn: {
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    verifyBtnDisabled: {
        opacity: 0.6,
        shadowOpacity: 0,
        elevation: 0,
    },
    verifyBtnGradient: {
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    verifyBtnText: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
});
