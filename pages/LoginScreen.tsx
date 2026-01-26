// LoginScreen.tsx - Enhanced Security & Premium Design

import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
  Keyboard,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Baby, Mail, Lock, Eye, EyeOff, AlertCircle, Check, Shield, Users, X, Briefcase } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithCredential,
  OAuthProvider,
} from 'firebase/auth';

import { auth, db } from '../services/firebaseConfig';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { joinFamily } from '../services/familyService';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { logger } from '../utils/logger';

WebBrowser.maybeCompleteAuthSession();

type LoginScreenProps = {
  onLoginSuccess: () => void;
};

// --- Validation Helpers ---
const validateEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

const validatePassword = (password: string, t: (key: string) => string): { valid: boolean; message: string } => {
  if (password.length < 6) return { valid: false, message: t('login.errors.passwordMinLength') };
  if (password.length < 8) return { valid: true, message: t('login.passwordStrength.medium') };
  if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) return { valid: true, message: t('login.passwordStrength.good') };
  return { valid: true, message: t('login.passwordStrength.strong') };
};

const getPasswordStrengthColor = (password: string): string => {
  if (password.length < 6) return '#EF4444';
  if (password.length < 8) return '#F59E0B';
  if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) return '#10B981';
  return '#059669';
};

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const { theme, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);

  // Join family with invite code
  const [showJoinCodeModal, setShowJoinCodeModal] = useState(false);
  const [pendingInviteCode, setPendingInviteCode] = useState('');
  const [joiningFamily, setJoiningFamily] = useState(false);

  // Babysitter registration
  const [registerAsBabysitter, setRegisterAsBabysitter] = useState(false);

  // Terms and Privacy Agreement
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);

  // Animation refs
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const passwordRef = useRef<TextInput>(null);

  // Google Auth - Using iOS native client ID from GoogleService-Info.plist
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: '16421819020-muvdskd7ppjnfcrnal4lsra01pqjr505.apps.googleusercontent.com',
    clientId: '16421819020-82oc8291kgi171lnqu2cthh1kb2htkr4.apps.googleusercontent.com', // Web client for fallback
  });

  // Entry animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  // Lockout timer
  useEffect(() => {
    if (lockoutTime) {
      const timer = setTimeout(() => {
        setLockoutTime(null);
        setAttempts(0);
      }, lockoutTime - Date.now());
      return () => clearTimeout(timer);
    }
  }, [lockoutTime]);

  // Google response handler
  useEffect(() => {
    logger.debug('🔐', 'Google Auth - request:', !!request, 'response type:', response?.type);
    if (response?.type === 'success') {
      const { id_token } = response.params;
      logger.debug('🔐', 'Google Auth - Got id_token, length:', id_token?.length);
      const credential = GoogleAuthProvider.credential(id_token);

      setLoading(true);
      signInWithCredential(auth, credential)
        .then(async (userCredential) => {
          logger.debug('✅', 'Google Sign-In Success!');

          // Check if this is a new user and save agreement
          const userRef = doc(db, 'users', userCredential.user.uid);
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            // New user - save agreement
            await setDoc(userRef, {
              agreements: {
                termsOfService: {
                  agreed: true,
                  agreedAt: serverTimestamp(),
                  version: '2026-01-20',
                },
                privacyPolicy: {
                  agreed: true,
                  agreedAt: serverTimestamp(),
                  version: '2026-01-20',
                },
              },
            }, { merge: true });
          }

          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onLoginSuccess();
        })
        .catch((error) => {
          logger.error('❌ Google Sign-In Firebase Error:', error.code, error.message);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert('שגיאה', `לא הצלחנו להתחבר עם גוגל: ${error.code}`);
        })
        .finally(() => setLoading(false));
    } else if (response?.type === 'error') {
      logger.error('❌ Google Auth Error:', response.error);
      Alert.alert('שגיאת Google', response.error?.message || 'Unknown error');
    } else if (response?.type === 'dismiss') {
      logger.debug('🔐', 'Google Auth - User dismissed');
    }
  }, [response]);

  // --- Shake animation on error ---
  const triggerShake = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  // --- Forgot password ---
  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert(t('common.error'), t('login.errors.enterEmail'));
      return;
    }
    if (!validateEmail(email)) {
      Alert.alert(t('common.error'), t('login.errors.invalidEmail'));
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t('login.passwordReset.sent'), t('login.passwordReset.sentMessage'));
    } catch (error) {
      logger.error('Password reset error:', error);
      Alert.alert(t('common.error'), t('alerts.couldNotSendEmail'));
    }
  };

  // --- Main auth handler ---
  const handleAuth = async () => {
    Keyboard.dismiss();
    setEmailError('');
    setPasswordError('');

    // Check lockout
    if (lockoutTime && Date.now() < lockoutTime) {
      const remaining = Math.ceil((lockoutTime - Date.now()) / 1000);
      Alert.alert(t('login.lockout.title'), t('login.lockout.message').replace('30', String(remaining)));
      return;
    }

    // Validate email
    if (!email) {
      setEmailError(t('login.errors.enterPassword'));
      triggerShake();
      return;
    }
    if (!validateEmail(email)) {
      setEmailError(t('login.errors.invalidEmail'));
      triggerShake();
      return;
    }

    // Validate password
    if (!password) {
      setPasswordError(t('login.errors.enterPassword'));
      triggerShake();
      return;
    }
    if (!isLogin && password.length < 6) {
      setPasswordError(t('login.errors.passwordMinLength'));
      triggerShake();
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        let user = userCredential.user;
        await user.reload(); // Refresh user data to get latest emailVerified status

        if (!user.emailVerified) {
          setLoading(false);
          Alert.alert(
            'אימות מייל נדרש',
            'עדיין לא אימתת את המייל. יש לאמת את המייל כדי להיכנס לאפליקציה.',
            [
              {
                text: 'שלח שוב',
                onPress: async () => {
                  try {
                    await sendEmailVerification(user);
                    Alert.alert('נשלח בהצלחה', 'מייל אימות נשלח שוב לכתובת שלך.');
                  } catch (e) {
                    Alert.alert('שגיאה', 'לא ניתן לשלוח מייל כרגע. נסה שוב מאוחר יותר.');
                  }
                }
              },
              {
                text: 'אימתתי, כנס',
                onPress: async () => {
                  setLoading(true);
                  try {
                    await user.reload();
                    if (user.emailVerified) {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      setAttempts(0);
                      onLoginSuccess();
                    } else {
                      setLoading(false);
                      Alert.alert('עדיין לא מאומת', 'המערכת עדיין לא מזהה שהמייל אומת. נסה שוב בעוד כמה שניות.');
                    }
                  } catch (error) {
                    setLoading(false);
                    Alert.alert('שגיאה', 'אירעה שגיאה בבדיקת האימות.');
                  }
                }
              },
              { text: 'ביטול', style: 'cancel', onPress: () => auth.signOut() }
            ]
          );
          return;
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setAttempts(0);
        onLoginSuccess();
      } else {
        // Check if user agreed to terms and privacy
        if (!agreedToTerms || !agreedToPrivacy) {
          Alert.alert(t('login.errors.agreementRequired'), t('login.errors.agreeTerms'));
          setLoading(false);
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCredential.user);

        // Save user agreement to Firestore
        const userRef = doc(db, 'users', userCredential.user.uid);
        await setDoc(userRef, {
          agreements: {
            termsOfService: {
              agreed: true,
              agreedAt: serverTimestamp(),
              version: '2026-01-20', // Update this date when terms change
            },
            privacyPolicy: {
              agreed: true,
              agreedAt: serverTimestamp(),
              version: '2026-01-20', // Update this date when privacy policy changes
            },
          },
        }, { merge: true });

        // If user has a pending invite code, join the family
        if (pendingInviteCode.trim().length === 6) {
          const result = await joinFamily(pendingInviteCode.trim());
          if (result.success) {
            logger.debug('✅', 'Joined family:', result.family?.babyName);
          }
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setLoading(false);

        // Sign out immediately so they have to log in (and trigger the verification check)
        await auth.signOut();

        Alert.alert(
          'החשבון נוצר בהצלחה!',
          'שלחנו לך מייל לאימות. יש לאשר את המייל ורק אז להתחבר.',
          [{
            text: 'הבנתי, תעביר אותי להתחברות',
            onPress: () => {
              setIsLogin(true);
            }
          }]
        );
      }
    } catch (error: any) {
      // Error logged via logger in catch block

      // Increment attempts for rate limiting
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      // Lock after 5 failed attempts
      if (newAttempts >= 5) {
        setLockoutTime(Date.now() + 30000); // 30 seconds
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(t('login.lockout.title'), t('login.lockout.message'));
        setLoading(false);
        return;
      }

      triggerShake();

      // Error messages
      let msg = t('login.errors.loginError');
      switch (error.code) {
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/user-not-found':
          msg = t('login.errors.wrongCredentials');
          break;
        case 'auth/email-already-in-use':
          msg = t('login.errors.emailInUse');
          break;
        case 'auth/invalid-email':
          msg = t('login.errors.invalidEmail');
          break;
        case 'auth/weak-password':
          msg = t('login.errors.weakPassword');
          break;
        case 'auth/too-many-requests':
          msg = t('login.errors.tooManyAttempts');
          break;
        case 'auth/network-request-failed':
          msg = t('login.errors.networkError');
          break;
      }

      Alert.alert(t('common.error'), msg);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = email.length > 0 && password.length >= 6 && (isLogin || (agreedToTerms && agreedToPrivacy));
  const passwordStrength = validatePassword(password, t);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <LinearGradient colors={['#0F172A', '#1E1B4B', '#312E81']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={styles.headerContent}>
          <View style={styles.premiumLogoContainer}>
            <LinearGradient
              colors={['#8B5CF6', '#6366F1', '#4F46E5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.premiumLogoGradient}
            >
              <View style={styles.premiumLogoGlow} />
              <Image
                source={require('../assets/icon_premium.png')}
                style={styles.premiumLogoImage}
                resizeMode="contain"
              />
              <View style={styles.premiumLogoShine} />
            </LinearGradient>
            <View style={styles.premiumLogoShadow} />
          </View>
          <Text style={styles.appTitle}>{t('login.appName')}</Text>
          <Text style={styles.appSubtitle}>{t('login.appSubtitle')}</Text>
        </View>
        <View style={[styles.blob, { top: -50, left: -50, backgroundColor: '#4F46E5', opacity: 0.2 }]} />
        <View style={[styles.blob, { top: 50, right: -20, backgroundColor: '#7C3AED', opacity: 0.2 }]} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.formContainer}>
        <Animated.View style={[
          styles.scrollContent,
          { backgroundColor: theme.card },
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }, { translateX: shakeAnim }]
          }
        ]}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* Security badge */}
            <View style={styles.securityBadge}>
              <Shield size={14} color="#10B981" />
              <Text style={styles.securityText}>{t('login.security')}</Text>
            </View>

            <Text style={[styles.formTitle, { color: theme.textPrimary }]}>{isLogin ? t('login.welcomeBack') : t('login.createAccount')}</Text>
            <Text style={[styles.formSubtitle, { color: theme.textSecondary }]}>{isLogin ? t('login.enterDetails') : t('login.joinCommunity')}</Text>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textPrimary }]}>{t('login.email')}</Text>
              <View style={[
                styles.inputWrapper,
                { backgroundColor: theme.inputBackground, borderColor: theme.border },
                emailError && [styles.inputError, { borderColor: theme.danger, backgroundColor: isDarkMode ? 'rgba(239,68,68,0.1)' : '#FEF2F2' }]
              ]}>
                <Mail size={20} color={emailError ? theme.danger : theme.textTertiary} style={{ marginLeft: 10 }} />
                <TextInput
                  style={[styles.input, { color: theme.textPrimary }]}
                  placeholder="your@email.com"
                  placeholderTextColor={theme.textTertiary}
                  value={email}
                  onChangeText={(text) => { setEmail(text); setEmailError(''); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  accessibilityLabel={t('login.emailField')}
                  accessibilityHint={t('login.emailHint')}
                />
                {email.length > 0 && validateEmail(email) && (
                  <Check size={18} color={theme.success} style={{ marginRight: 12 }} />
                )}
              </View>
              {emailError ? (
                <View style={styles.errorRow}>
                  <AlertCircle size={14} color={theme.danger} />
                  <Text style={[styles.errorText, { color: theme.danger }]}>{emailError}</Text>
                </View>
              ) : null}
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textPrimary }]}>{t('login.password')}</Text>
              <View style={[
                styles.inputWrapper,
                { backgroundColor: theme.inputBackground, borderColor: theme.border },
                passwordError && [styles.inputError, { borderColor: theme.danger, backgroundColor: isDarkMode ? 'rgba(239,68,68,0.1)' : '#FEF2F2' }]
              ]}>
                <Lock size={20} color={passwordError ? theme.danger : theme.textTertiary} style={{ marginLeft: 10 }} />
                <TextInput
                  ref={passwordRef}
                  style={[styles.input, { color: theme.textPrimary }]}
                  placeholder={t('login.password')}
                  placeholderTextColor={theme.textTertiary}
                  value={password}
                  onChangeText={(text) => { setPassword(text); setPasswordError(''); }}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleAuth}
                  accessibilityLabel={t('login.passwordField')}
                  accessibilityHint={t('login.passwordHint')}
                />
                <TouchableOpacity
                  onPress={() => {
                    setShowPassword(!showPassword);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={styles.eyeBtn}
                  accessibilityLabel={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                  accessibilityRole="button"
                >
                  {showPassword ? <EyeOff size={20} color={theme.textTertiary} /> : <Eye size={20} color={theme.textTertiary} />}
                </TouchableOpacity>
              </View>

              {/* Password strength indicator */}
              {!isLogin && password.length > 0 && (
                <View style={styles.strengthRow}>
                  <View style={[styles.strengthBar, { flex: password.length >= 6 ? 1 : 0.3, backgroundColor: getPasswordStrengthColor(password) }]} />
                  <Text style={[styles.strengthText, { color: getPasswordStrengthColor(password) }]}>
                    {passwordStrength.message}
                  </Text>
                </View>
              )}

              {passwordError ? (
                <View style={styles.errorRow}>
                  <AlertCircle size={14} color={theme.danger} />
                  <Text style={[styles.errorText, { color: theme.danger }]}>{passwordError}</Text>
                </View>
              ) : null}
            </View>

            {/* Forgot password link */}
            {isLogin && (
              <TouchableOpacity
                onPress={handleForgotPassword}
                style={styles.forgotBtn}
                accessibilityLabel={t('login.forgotPassword')}
                accessibilityRole="button"
              >
                <Text style={[styles.forgotText, { color: theme.primary }]}>{t('login.forgotPassword')}</Text>
              </TouchableOpacity>
            )}

            {/* Babysitter Registration Option - Minimalist */}
            {!isLogin && (
              <View style={{ gap: 12, marginBottom: 16, marginTop: 8 }}>
                <TouchableOpacity
                  style={[
                    styles.joinCodeBtnMinimal,
                    { borderColor: theme.border },
                    registerAsBabysitter && { borderColor: '#F59E0B', backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.1)' : '#FFFBEB' }
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setRegisterAsBabysitter(!registerAsBabysitter);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.joinContentRow}>
                    <View style={[styles.minimizeIconContainer, { backgroundColor: registerAsBabysitter ? '#F59E0B' : '#FEF3C7' }]}>
                      <Briefcase size={18} color={registerAsBabysitter ? '#fff' : '#D97706'} />
                    </View>
                    <View style={styles.joinTextContainer}>
                      <Text style={[styles.joinCodeTitleMinimal, { color: theme.textPrimary }]}>
                        {t('login.babysitter.title')}
                      </Text>
                      <Text style={[styles.joinCodeSubtitleMinimal, { color: theme.textSecondary }]}>
                        {t('login.babysitter.subtitle')}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.babysitterCheckbox, registerAsBabysitter && styles.babysitterCheckboxActive]}>
                    {registerAsBabysitter && <Check size={14} color={theme.card} />}
                  </View>
                </TouchableOpacity>

                {/* Join Family Code - Moved Here */}
                <TouchableOpacity
                  style={[
                    styles.joinCodeBtnMinimal,
                    { borderColor: theme.border, marginTop: 0 },
                    pendingInviteCode.length === 6 && { borderColor: theme.success, backgroundColor: isDarkMode ? 'rgba(16,185,129,0.1)' : '#ECFDF5' }
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setShowJoinCodeModal(true);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.joinContentRow}>
                    <View style={[styles.minimizeIconContainer, { backgroundColor: pendingInviteCode.length === 6 ? theme.success : theme.primaryLight }]}>
                      <Users size={18} color={pendingInviteCode.length === 6 ? '#fff' : theme.primary} />
                    </View>
                    <View style={styles.joinTextContainer}>
                      <Text style={[styles.joinCodeTitleMinimal, { color: theme.textPrimary }]}>
                        {pendingInviteCode.length === 6 ? t('login.codeSaved') : t('login.enterInviteCode')}
                      </Text>
                      <Text style={[styles.joinCodeSubtitleMinimal, { color: theme.textSecondary }]}>
                        {pendingInviteCode.length === 6 ? pendingInviteCode : t('login.partnerSentCode')}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.arrowContainer}>
                    <Users size={16} color={theme.textTertiary} style={{ transform: [{ rotate: '180deg' }] }} />
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Terms and Privacy Agreement - Only in signup mode */}
            {!isLogin && (
              <View style={styles.agreementContainer}>
                <View style={[styles.agreementRow, { flexDirection: 'row-reverse', justifyContent: 'flex-start' }]}>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setAgreedToTerms(!agreedToTerms);
                    }}
                    style={[
                      styles.agreementCheckbox,
                      { marginLeft: 10, borderColor: agreedToTerms ? theme.primary : theme.border },
                      agreedToTerms && { backgroundColor: theme.primary }
                    ]}
                  >
                    {agreedToTerms && <Check size={12} color={theme.card} strokeWidth={3} />}
                  </TouchableOpacity>
                  <Text style={[styles.agreementText, { color: theme.textSecondary, textAlign: 'right' }]}>
                    {t('login.agreement.terms')} <Text
                      style={[styles.agreementLink, { color: theme.primary }]}
                      onPress={() => WebBrowser.openBrowserAsync('https://www.calmparent.app/terms')}
                    >{t('login.agreement.termsLink')}</Text>
                  </Text>
                </View>

                <View style={[styles.agreementRow, { flexDirection: 'row-reverse', justifyContent: 'flex-start', marginTop: 12 }]}>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setAgreedToPrivacy(!agreedToPrivacy);
                    }}
                    style={[
                      styles.agreementCheckbox,
                      { marginLeft: 10, borderColor: agreedToPrivacy ? theme.primary : theme.border },
                      agreedToPrivacy && { backgroundColor: theme.primary }
                    ]}
                  >
                    {agreedToPrivacy && <Check size={12} color={theme.card} strokeWidth={3} />}
                  </TouchableOpacity>
                  <Text style={[styles.agreementText, { color: theme.textSecondary, textAlign: 'right' }]}>
                    אני מסכים/ה ל <Text
                      style={[styles.agreementLink, { color: theme.primary }]}
                      onPress={() => WebBrowser.openBrowserAsync('https://www.calmparent.app/privacy')}
                    >מדיניות הפרטיות</Text>
                  </Text>
                </View>
              </View>
            )}

            {/* Submit button */}
            <TouchableOpacity
              style={[styles.mainButton, !isFormValid && styles.mainButtonDisabled]}
              onPress={handleAuth}
              disabled={loading || !isFormValid}
              activeOpacity={0.8}
              accessibilityLabel={isLogin ? 'כפתור התחברות' : 'כפתור הרשמה'}
              accessibilityRole="button"
              accessibilityState={{ disabled: loading || !isFormValid }}
            >
              <LinearGradient
                colors={isFormValid ? ['#8B5CF6', '#6D28D9'] : [theme.textTertiary, theme.textTertiary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientBtn}
              >
                {loading ? (
                  <ActivityIndicator color={theme.card} />
                ) : (
                  <Text style={[styles.mainButtonText, { color: theme.card }]}>{isLogin ? 'התחברות' : 'הרשמה'}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={[styles.line, { backgroundColor: theme.border }]} />
              <Text style={[styles.orText, { color: theme.textTertiary }]}>או באמצעות</Text>
              <View style={[styles.line, { backgroundColor: theme.border }]} />
            </View>

            {/* Social buttons */}
            <View style={styles.socialRow}>
              <TouchableOpacity
                style={[
                  styles.socialBtn,
                  { backgroundColor: theme.card, borderColor: theme.border },
                  !request && { opacity: 0.5 }
                ]}
                onPress={() => {
                  if (request) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    promptAsync();
                  }
                }}
                disabled={!request}
                accessibilityLabel="התחברות עם Google"
                accessibilityRole="button"
                accessibilityState={{ disabled: !request }}
              >
                <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png' }} style={styles.socialIcon} />
                <Text style={[styles.socialText, { color: theme.textPrimary }]}>Google</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.socialBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
                accessibilityLabel="התחברות עם Apple"
                accessibilityRole="button"
                onPress={async () => {
                  try {
                    logger.debug('🍎', 'Apple Sign-In - Starting...');
                    // Generate a random nonce
                    const rawNonce = Math.random().toString(36).substring(2, 15) +
                      Math.random().toString(36).substring(2, 15);

                    // Hash the nonce using SHA256
                    const hashedNonce = await Crypto.digestStringAsync(
                      Crypto.CryptoDigestAlgorithm.SHA256,
                      rawNonce
                    );
                    logger.debug('🍎', 'Apple Sign-In - Nonce generated, calling signInAsync...');

                    const credential = await AppleAuthentication.signInAsync({
                      requestedScopes: [
                        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                        AppleAuthentication.AppleAuthenticationScope.EMAIL,
                      ],
                      nonce: hashedNonce,
                    });
                    logger.debug('🍎', 'Apple Sign-In - Got credential, identityToken length:', credential.identityToken?.length);

                    // Create Firebase credential with rawNonce
                    const provider = new OAuthProvider('apple.com');
                    const firebaseCredential = provider.credential({
                      idToken: credential.identityToken!,
                      rawNonce: rawNonce,
                    });

                    setLoading(true);
                    logger.debug('🍎', 'Apple Sign-In - Signing in to Firebase...');
                    const userCredential = await signInWithCredential(auth, firebaseCredential);
                    logger.debug('✅', 'Apple Sign-In Success!');

                    // Check if this is a new user and save agreement
                    const userRef = doc(db, 'users', userCredential.user.uid);
                    const userSnap = await getDoc(userRef);
                    if (!userSnap.exists()) {
                      // New user - save agreement
                      await setDoc(userRef, {
                        agreements: {
                          termsOfService: {
                            agreed: true,
                            agreedAt: serverTimestamp(),
                            version: '2026-01-20',
                          },
                          privacyPolicy: {
                            agreed: true,
                            agreedAt: serverTimestamp(),
                            version: '2026-01-20',
                          },
                        },
                      }, { merge: true });
                    }

                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    onLoginSuccess();
                  } catch (e: any) {
                    logger.error('❌ Apple Sign-In Error:', e.code, e.message);
                    if (e.code !== 'ERR_REQUEST_CANCELED') {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                      Alert.alert(t('login.errors.appleError'), `${e.code}: ${e.message}`);
                    }
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/0/747.png' }} style={styles.socialIcon} />
                <Text style={[styles.socialText, { color: theme.textPrimary }]}>Apple</Text>
              </TouchableOpacity>
            </View>

            {/* Switch mode */}
            <TouchableOpacity
              onPress={() => {
                setIsLogin(!isLogin);
                setEmailError('');
                setPasswordError('');
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={styles.switchMode}
              accessibilityLabel={isLogin ? t('login.switchToSignup') : t('login.switchToLogin')}
              accessibilityRole="button"
            >
              <Text style={[styles.switchText, { color: theme.textSecondary }]}>
                {isLogin ? t('login.noAccount') : t('login.hasAccount')}
                <Text style={[styles.linkText, { color: theme.primary }]}>{isLogin ? t('login.signupNow') : t('login.loginNow')}</Text>
              </Text>
            </TouchableOpacity>



          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>

      {/* Join Code Modal */}
      <Modal visible={showJoinCodeModal} transparent animationType="fade">
        <View style={styles.joinModalOverlay}>
          <View style={[styles.joinModalContent, { backgroundColor: theme.card }]}>
            <TouchableOpacity
              style={styles.joinModalClose}
              onPress={() => setShowJoinCodeModal(false)}
              accessibilityLabel={t('login.closeWindow')}
              accessibilityRole="button"
            >
              <X size={24} color={theme.textSecondary} />
            </TouchableOpacity>

            <Users size={48} color={theme.primary} />
            <Text style={[styles.joinModalTitle, { color: theme.textPrimary }]}>{t('login.enterInviteCode')}</Text>
            <Text style={[styles.joinModalSubtitle, { color: theme.textSecondary }]}>
              {t('login.receivedCode')}
            </Text>

            <TextInput
              style={[
                styles.joinModalInput,
                { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.textPrimary }
              ]}
              placeholder={t('login.codePlaceholder')}
              placeholderTextColor={theme.textTertiary}
              value={pendingInviteCode}
              onChangeText={(text) => setPendingInviteCode(text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              maxLength={6}
              autoCapitalize="characters"
              textAlign="center"
              accessibilityLabel={t('login.enterInviteCodeLabel')}
              accessibilityHint={t('login.codePlaceholder')}
            />

            <TouchableOpacity
              style={[
                styles.joinModalBtn,
                { backgroundColor: pendingInviteCode.length === 6 ? theme.primary : theme.inputBackground },
                pendingInviteCode.length !== 6 && styles.joinModalBtnDisabled
              ]}
              disabled={pendingInviteCode.length !== 6}
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setShowJoinCodeModal(false);
                Alert.alert(t('login.codeSavedSuccess'), t('login.codeSavedMessage'));
              }}
              accessibilityLabel={t('login.saveInviteCode')}
              accessibilityRole="button"
              accessibilityState={{ disabled: pendingInviteCode.length !== 6 }}
            >
              <Text style={[styles.joinModalBtnText, { color: pendingInviteCode.length === 6 ? theme.card : theme.textTertiary }]}>{t('login.saveInviteCode')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View >
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    height: '32%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40
  },
  headerContent: { alignItems: 'center', zIndex: 10 },
  iconCircle: {
    width: 80,
    height: 80,
    backgroundColor: 'white',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10
  },
  premiumLogoContainer: {
    width: 100,
    height: 100,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  premiumLogoGradient: {
    width: 100,
    height: 100,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  premiumLogoGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    top: -10,
    left: -10,
  },
  premiumLogoImage: {
    width: 90,
    height: 90,
    zIndex: 10,
  },
  premiumLogoShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    zIndex: 5,
  },
  premiumLogoShadow: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    top: 8,
    left: 5,
    zIndex: -1,
  },
  appTitle: { fontSize: 32, fontWeight: '900', color: 'white', marginBottom: 4 },
  appSubtitle: { fontSize: 14, color: '#e0e7ff', opacity: 0.9 },
  blob: { position: 'absolute', width: 150, height: 150, borderRadius: 75, opacity: 0.4 },

  // Form
  formContainer: { flex: 1, marginTop: -30 },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
    marginHorizontal: 20,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5
  },

  // Security badge
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  securityText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },

  formTitle: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 8, letterSpacing: -0.5 },
  formSubtitle: { fontSize: 14, textAlign: 'center', marginBottom: 28, letterSpacing: -0.2 },

  // Inputs
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8, textAlign: 'right', letterSpacing: -0.2 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    height: 54
  },
  inputError: {
  },
  input: {
    flex: 1,
    height: '100%',
    textAlign: 'right',
    paddingHorizontal: 12,
    fontSize: 15,
  },
  eyeBtn: {
    padding: 12,
  },

  // Error display
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    marginTop: 6,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: -0.2,
  },

  // Password strength
  strengthRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  strengthBar: {
    height: 4,
    borderRadius: 2,
    maxWidth: 100,
  },
  strengthText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Forgot password
  forgotBtn: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },

  // Main button
  mainButton: {
    marginTop: 12,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#4f46e5',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5
  },
  mainButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  gradientBtn: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10
  },
  mainButtonText: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },

  // Divider
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  orText: { marginHorizontal: 12, fontSize: 12, fontWeight: '600', letterSpacing: -0.2 },

  // Social buttons
  socialRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 8,
  },
  socialIcon: { width: 20, height: 20 },
  socialText: { fontSize: 14, fontWeight: '600' },

  // Switch mode
  switchMode: { alignItems: 'center', marginTop: 8 },
  switchText: { fontSize: 14, letterSpacing: -0.2 },
  linkText: { fontWeight: '700' },

  // Join Code Section
  joinCodeSection: {
    marginTop: 24,
    paddingTop: 8,
  },
  joinCodeDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  joinCodeLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  joinCodeOrText: {
    marginHorizontal: 12,
    fontSize: 12,
    letterSpacing: -0.2,
  },
  joinCodeBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  joinCodeIcon: {
    fontSize: 28,
  },
  joinCodeTitle: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
    letterSpacing: -0.3,
  },
  joinCodeSubtitle: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 2,
    letterSpacing: -0.2,
  },
  joinCodeBtnActive: {
  },

  // Join Modal styles
  joinModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  joinModalContent: {
    borderRadius: 28,
    padding: 28,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
    alignItems: 'center',
  },
  joinModalClose: {
    position: 'absolute',
    top: 16,
    left: 16,
  },
  joinModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  joinModalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: -0.2,
  },
  joinModalInput: {
    width: '100%',
    height: 56,
    borderRadius: 14,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 8,
    borderWidth: 1.5,
    textAlign: 'center',
  },
  joinModalBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 20,
  },
  joinModalBtnDisabled: {
  },
  joinModalBtnText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.3,
  },



  // Babysitter Registration Styles
  babysitterOptionCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 16,
    marginTop: 8,
  },
  babysitterOptionCardActive: {
  },
  babysitterBtnActive: {
  },
  babysitterIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  babysitterIconCircleActive: {
    backgroundColor: '#F59E0B',
  },
  babysitterTextSection: {
    flex: 1,
    marginRight: 12,
    alignItems: 'flex-end',
  },
  babysitterTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#92400E',
    textAlign: 'right',
  },
  babysitterSubtitle: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
    textAlign: 'right',
  },
  babysitterCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  babysitterCheckboxActive: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  agreementContainer: {
    marginTop: 16,
    marginBottom: 8,
    gap: 12,
  },
  agreementRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  agreementCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agreementText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  agreementLink: {
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  // Minimal Join Code Styles
  joinCodeBtnMinimal: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 18,
  },
  joinContentRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  minimizeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinTextContainer: {
    alignItems: 'flex-end',
  },
  joinCodeTitleMinimal: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  joinCodeSubtitleMinimal: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 2,
  },
  arrowContainer: {
    padding: 4,
    opacity: 0.5,
  },
});