import React, { useState, useRef } from 'react';
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
    Animated,
    Alert,
} from 'react-native';
import { X, Users, LogIn, CheckCircle, QrCode } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { joinFamily } from '../../services/familyService';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useActiveChild } from '../../context/ActiveChildContext';

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
    const { theme, isDarkMode } = useTheme();
    const { t } = useLanguage();
    const { refreshChildren } = useActiveChild();
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [permission, requestPermission] = useCameraPermissions();
    const [scanning, setScanning] = useState(false);

    // Success animation
    const successScale = useRef(new Animated.Value(0)).current;
    const successOpacity = useRef(new Animated.Value(0)).current;

    const playSuccessAndClose = (message: string) => {
        setShowSuccess(true);
        setSuccessMessage(message);
        successScale.setValue(0);
        successOpacity.setValue(0);

        Animated.parallel([
            Animated.spring(successScale, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }),
            Animated.timing(successOpacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();

        // Refresh children list immediately so the guest child appears
        refreshChildren();

        // Auto-close after 1.5 seconds
        setTimeout(() => {
            setShowSuccess(false);
            setCode('');
            onClose();
            onSuccess?.();
        }, 1500);
    };

    const handleOpenScanner = async () => {
        if (!permission?.granted) {
            const { status } = await requestPermission();
            if (status !== 'granted') {
                Alert.alert(t('common.error'), 'יש לאשר גישה למצלמה כדי לסרוק QR');
                return;
            }
        }
        setScanning(true);
    };

    const doJoin = async (force: boolean, joinCode?: string) => {
        const codeToUse = joinCode ?? code;
        setLoading(true);
        setError('');

        try {
            const result = await joinFamily(codeToUse, force);
            setLoading(false);

            if (result.success) {
                if (Platform.OS !== 'web') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
                playSuccessAndClose(t('joinFamily.success'));
                return;
            }

            // Server signals that user must leave current family first
            if (result.requiresLeave) {
                Alert.alert(
                    'שים לב',
                    `אתה כבר חלק ממשפחת "${result.currentFamilyName}".\nאם תמשיך, תאבד את הגישה לנתוניה.\n\nלהמשיך ולהצטרף?`,
                    [
                        { text: t('common.cancel'), style: 'cancel' },
                        {
                            text: 'כן, הצטרף',
                            style: 'destructive',
                            onPress: () => doJoin(true, codeToUse),
                        },
                    ]
                );
                return;
            }

            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
            setError(result.message);
        } catch (err) {
            setLoading(false);
            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
            setError(t('joinFamily.error'));
        }
    };

    const handleJoin = () => {
        if (code.length !== 6) {
            setError(t('joinFamily.codeMustBe6'));
            return;
        }
        doJoin(false);
    };

    const handleCodeChange = (text: string) => {
        const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
        setCode(cleaned);
        setError('');
    };

    const handleBarcodeScanned = ({ data }: { data: string }) => {
        if (!scanning) return;
        const cleaned = data.replace(/[^0-9]/g, '').slice(0, 6);
        if (cleaned.length === 6) {
            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            setCode(cleaned);
            setScanning(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView
                style={styles.overlay}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                    {showSuccess ? (
                        /* Success Animation Screen */
                        <Animated.View style={[styles.successContainer, { transform: [{ scale: successScale }], opacity: successOpacity }]}>
                            <View style={styles.successIconCircle}>
                                <CheckCircle size={48} color="#10B981" />
                            </View>
                            <Text style={[styles.successText, { color: theme.textPrimary }]}>
                                {successMessage}
                            </Text>
                        </Animated.View>
                    ) : scanning ? (
                        <View style={{ height: 400, borderRadius: 20, overflow: 'hidden' }}>
                            <View style={styles.header}>
                                <TouchableOpacity onPress={() => setScanning(false)} style={styles.closeBtn}>
                                    <X size={22} color={theme.textPrimary} />
                                </TouchableOpacity>
                                <Text style={[styles.title, { color: theme.textPrimary }]}>סורק קוד משפחה</Text>
                                <View style={{ width: 22 }} />
                            </View>
                            <CameraView
                                style={{ flex: 1 }}
                                facing="back"
                                onBarcodeScanned={handleBarcodeScanned}
                                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                            />
                            <View style={{ position: 'absolute', bottom: 20, left: 0, right: 0, alignItems: 'center' }}>
                                <View style={{ backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}>
                                    <Text style={{ color: '#fff', fontWeight: '600' }}>כוון את המצלמה לברקוד</Text>
                                </View>
                            </View>
                        </View>
                    ) : (
                        <>
                            {/* Header */}
                            <View style={styles.header}>
                                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                    <X size={22} color={theme.textSecondary} />
                                </TouchableOpacity>
                                <Text style={[styles.title, { color: theme.textPrimary }]}>{t('joinFamily.title')}</Text>
                                <Users size={22} color="#10B981" />
                            </View>

                            {/* Description */}
                            <Text style={[styles.description, { color: theme.textSecondary }]}>
                                {t('joinFamily.description')}{'\n'}
                                {t('joinFamily.autoDetect')}
                            </Text>

                            {/* Code Input */}
                            <View style={styles.inputContainer}>
                                <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>{t('joinFamily.codeLabel')}</Text>
                                <TextInput
                                    style={[styles.codeInput, {
                                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#F9FAFB',
                                        color: theme.textPrimary,
                                        borderColor: error
                                            ? '#EF4444'
                                            : (isDarkMode ? 'rgba(255,255,255,0.12)' : '#E5E7EB'),
                                    }, error && {
                                        backgroundColor: isDarkMode ? 'rgba(239,68,68,0.1)' : '#FEF2F2',
                                    }]}
                                    value={code}
                                    onChangeText={handleCodeChange}
                                    placeholder="000000"
                                    placeholderTextColor={theme.textSecondary}
                                    keyboardType="number-pad"
                                    maxLength={6}
                                />
                                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                                <TouchableOpacity
                                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, gap: 8 }}
                                    onPress={async () => {
                                        if (!permission?.granted) {
                                            const { status } = await requestPermission();
                                            if (status !== 'granted') {
                                                Alert.alert(t('common.error'), 'יש לאשר גישה למצלמה כדי לסרוק QR');
                                                return;
                                            }
                                        }
                                        setScanning(true);
                                    }}
                                >
                                    <QrCode size={18} color={theme.textSecondary} />
                                    <Text style={{ color: theme.textSecondary, fontSize: 14 }}>או סרוק קוד QR</Text>
                                </TouchableOpacity>
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
                                        <Text style={styles.joinBtnText}>{t('joinFamily.join')}</Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            {/* Tip */}
                            <Text style={[styles.tip, { color: theme.textSecondary }]}>
                                {t('joinFamily.tipFamily')}{'\n'}
                                {t('joinFamily.tipGuest')}
                            </Text>
                        </>
                    )}
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
    },
    description: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    inputContainer: {
        marginBottom: 12,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'right',
    },
    codeInput: {
        borderRadius: 16,
        paddingVertical: 20,
        paddingHorizontal: 16,
        fontSize: 28,
        fontWeight: '800',
        textAlign: 'center',
        letterSpacing: 8,
        borderWidth: 2,
    },
    errorText: {
        fontSize: 12,
        color: '#EF4444',
        textAlign: 'center',
        marginTop: 8,
    },
    orRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10,
    },
    orLine: {
        flex: 1,
        height: 1,
    },
    orText: {
        fontSize: 12,
        fontWeight: '500',
    },
    scanBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 8,
        marginBottom: 16,
    },
    scanBtnText: {
        fontSize: 13,
        fontWeight: '500',
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
        textAlign: 'center',
    },
    // Success animation
    successContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    successIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(16,185,129,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    successText: {
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
    },
    // Scanner
    scannerContainer: {
        paddingBottom: 8,
    },
    scannerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    cameraWrapper: {
        height: 260,
        borderRadius: 20,
        overflow: 'hidden',
        position: 'relative',
    },
    scanFrame: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 160,
        height: 160,
        marginTop: -80,
        marginLeft: -80,
        borderRadius: 12,
        borderWidth: 2.5,
        borderColor: '#10B981',
    },
});

export default JoinFamilyModal;
