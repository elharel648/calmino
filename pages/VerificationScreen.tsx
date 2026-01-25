import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import * as Haptics from 'expo-haptics';

type VerificationScreenProps = {
    onVerified: () => void;
    onLogout: () => void;
};

export default function VerificationScreen({ onVerified, onLogout }: VerificationScreenProps) {
    const { theme } = useTheme();
    const { t } = useLanguage();
    const [loading, setLoading] = useState(false);

    const handleCheckVerification = async () => {
        setLoading(true);
        try {
            await auth.currentUser?.reload();
            if (auth.currentUser?.emailVerified) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onVerified();
            } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                Alert.alert(t('login.verification.notVerified'), t('login.verification.checkLink'));
            }
        } catch (e) {
            Alert.alert(t('common.error'), t('common.retry'));
        } finally {
            setLoading(false);
        }
    };

    const handleResendEmail = async () => {
        try {
            if (auth.currentUser) {
                await sendEmailVerification(auth.currentUser);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                Alert.alert(t('login.verification.resendSent'), t('login.verification.resendMessage'));
            }
        } catch (e) {
            Alert.alert(t('login.verification.resendError'), t('login.verification.resendErrorMsg'));
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <View style={styles.header}>
                <LinearGradient colors={['#1e1b4b', '#4338ca']} style={StyleSheet.absoluteFill} />
                <View style={[styles.blob, { top: -50, left: -50, backgroundColor: '#6366f1' }]} />
                <View style={[styles.blob, { top: 50, right: -20, backgroundColor: '#a855f7' }]} />
            </View>

            <View style={[styles.contentCard, { backgroundColor: theme.card }]}>
                <Text style={styles.emoji}>📧</Text>
                <Text style={[styles.title, { color: theme.textPrimary }]}>{t('login.verification.checkEmail')}</Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                    {t('login.verification.sentTo').replace('{email}', auth.currentUser?.email || '')}{'\n'}
                    <Text style={[styles.spamNote, { color: theme.textTertiary }]}>{t('login.verification.checkSpam')}</Text>
                </Text>

                <TouchableOpacity
                    style={styles.checkBtn}
                    onPress={handleCheckVerification}
                    disabled={loading}
                >
                    <LinearGradient
                        colors={[theme.success, theme.successLight]}
                        style={styles.gradientBtn}
                    >
                        {loading ? (
                            <ActivityIndicator color={theme.card} />
                        ) : (
                            <Text style={[styles.btnText, { color: theme.card }]}>{t('login.verification.checkButton')}</Text>
                        )}
                    </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.resendBtn}
                    onPress={handleResendEmail}
                >
                    <Text style={[styles.resendText, { color: theme.primary }]}>{t('login.verification.resend')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={onLogout}
                    style={styles.logoutBtn}
                >
                    <Text style={[styles.logoutText, { color: theme.textSecondary }]}>{t('login.verification.backToLogin')}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#0f172a',
    },
    header: {
        ...StyleSheet.absoluteFillObject,
        zIndex: -1,
    },
    blob: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        opacity: 0.3,
    },
    contentCard: {
        width: '100%',
        padding: 30,
        borderRadius: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    emoji: {
        fontSize: 60,
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 24,
    },
    spamNote: {
        fontSize: 14,
    },
    checkBtn: {
        width: '100%',
        height: 56,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    gradientBtn: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    resendBtn: {
        padding: 12,
        marginBottom: 8,
    },
    resendText: {
        fontSize: 16,
        fontWeight: '600',
    },
    logoutBtn: {
        padding: 12,
    },
    logoutText: {
        fontSize: 14,
    },
});
