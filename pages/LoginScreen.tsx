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
import { Mail, Lock, Eye, EyeOff, AlertCircle, Check, Shield, Users, X, Briefcase, User, QrCode, Compass } from 'lucide-react-native';
import LegalModal, { LegalType } from '../components/Legal/LegalModal';
import ConfettiBurst from '../components/Effects/ConfettiBurst';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { CameraView, useCameraPermissions } from 'expo-camera';

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithCredential,
  OAuthProvider,
  updateProfile,
} from 'firebase/auth';

import { auth, db } from '../services/firebaseConfig';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { joinFamily } from '../services/familyService';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { BlurView } from 'expo-blur';
import { logger } from '../utils/logger';

type LoginScreenProps = {
  onLoginSuccess: () => void;
  onGuestMode?: () => void;
};

// Custom password input that avoids iOS AutoFill entirely (no secureTextEntry)
const MaskedPasswordInput = React.forwardRef<TextInput, any>(
  ({ realValue, onRealChange, showRaw = false, isLoginMode = false, ...props }, ref) => {
    const BULLET = '•';

    const handleChange = (text: string) => {
      if (isLoginMode || showRaw) {
        onRealChange(text);
        return;
      }
      const prevLen = realValue.length;
      const newLen = text.length;
      if (newLen < prevLen) {
        onRealChange(realValue.slice(0, newLen));
      } else if (newLen > prevLen) {
        for (let i = 0; i < text.length; i++) {
          if (text[i] !== BULLET) {
            onRealChange(realValue.slice(0, i) + text[i] + realValue.slice(i));
            return;
          }
        }
      }
    };

    if (isLoginMode) {
      return (
        <TextInput
          ref={ref}
          {...props}
          value={realValue}
          onChangeText={handleChange}
          secureTextEntry={!showRaw}
          textContentType="password"
          autoComplete="current-password"
          autoCorrect={false}
        />
      );
    }

    return (
      <TextInput
        ref={ref}
        {...props}
        value={showRaw ? realValue : BULLET.repeat(realValue.length)}
        onChangeText={handleChange}
        secureTextEntry={false}
        textContentType={"none" as any}
        autoComplete="off"
        autoCorrect={false}
        spellCheck={false}
      />
    );
  }
);

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

export default function LoginScreen({
  onLoginSuccess, onGuestMode }: LoginScreenProps) {
  const { theme, isDarkMode } = useTheme();
  const { t, isRTL } = useLanguage();
  const { showSuccess } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [displayNameError, setDisplayNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);

  // Join family with invite code
  const [showJoinCodeModal, setShowJoinCodeModal] = useState(false);
  const [pendingInviteCode, setPendingInviteCode] = useState('');
  const [joiningFamily, setJoiningFamily] = useState(false);

  // QR Scanner for Join Family
  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  // Legal modals
  const [legalModal, setLegalModal] = useState<LegalType | null>(null);

  // Babysitter registration
  const [registerAsBabysitter, setRegisterAsBabysitter] = useState(false);

  // Terms and Privacy Agreement
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Confetti celebration
  const [showConfetti, setShowConfetti] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [agreedToAge, setAgreedToAge] = useState(false);

  // Animation refs
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const nameRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

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

            // If user has a pending invite code, join the family
            if (pendingInviteCode.trim().length === 6) {
              const result = await joinFamily(pendingInviteCode.trim());
              if (result.success) {
                logger.debug('✅', 'Joined family via Google Auth:', result.currentFamilyName);
              }
            }
          }

          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onLoginSuccess();
        })
        .catch((error) => {
          logger.error('❌ Google Sign-In Firebase Error:', error.code, error.message);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert(t('common.error'), t('auth.googleLoginError', { code: error.code }));
        })
        .finally(() => setLoading(false));
    } else if (response?.type === 'error') {
      logger.error('❌ Google Auth Error:', response.error);
      Alert.alert(t('auth.googleError'), response.error?.message || t('auth.unknownError'));
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
    setDisplayNameError('');
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');

    // Check lockout
    if (lockoutTime && Date.now() < lockoutTime) {
      const remaining = Math.ceil((lockoutTime - Date.now()) / 1000);
      Alert.alert(t('login.lockout.title'), t('login.lockout.message').replace('30', String(remaining)));
      return;
    }

    // Validate name (signup only)
    if (!isLogin && !displayName.trim()) {
      setDisplayNameError(t('login.errors.enterName'));
      triggerShake();
      return;
    }

    // Validate email
    if (!email) {
      setEmailError(t('login.errors.enterEmail'));
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

    // Validate confirm password (signup only)
    if (!isLogin && password !== confirmPassword) {
      setConfirmPasswordError(t('login.errors.passwordsDoNotMatch'));
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
            t('auth.emailVerificationRequired'),
            t('auth.emailVerificationMessage'),
            [
              {
                text: t('auth.resendEmail'),
                onPress: async () => {
                  try {
                    await sendEmailVerification(user);
                    Alert.alert(t('auth.emailSent'), t('auth.emailSentMessage'));
                  } catch (e) {
                    Alert.alert(t('common.error'), t('auth.cannotSendEmail'));
                  }
                }
              },
              {
                text: t('auth.verifiedLogin'),
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
                      Alert.alert(t('auth.notVerifiedYet'), t('auth.notVerifiedMessage'));
                    }
                  } catch (error) {
                    setLoading(false);
                    Alert.alert(t('common.error'), t('auth.verificationError'));
                  }
                }
              },
              { text: t('common.cancel'), style: 'cancel', onPress: () => auth.signOut() }
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

        // Check age verification (COPPA/GDPR)
        if (!agreedToAge) {
          Alert.alert(t('login.errors.ageRequired'), t('login.errors.confirmAge'));
          setLoading(false);
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: displayName.trim() });
        await sendEmailVerification(userCredential.user);

        // Save user agreement and profile to Firestore
        const userRef = doc(db, 'users', userCredential.user.uid);
        await setDoc(userRef, {
          displayName: displayName.trim(),
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
            ageVerification: {
              confirmed: true,
              confirmedAt: serverTimestamp(),
              minimumAge: 16,
            },
          },
          ...(registerAsBabysitter ? { isSitter: true, sitterActive: false } : {}),
        }, { merge: true });

        // If user has a pending invite code, join the family
        if (pendingInviteCode.trim().length === 6) {
          const result = await joinFamily(pendingInviteCode.trim());
          if (result.success) {
            logger.debug('✅', 'Joined family:', result.currentFamilyName);
            showSuccess(t('auth.joinedFamily', { name: result.currentFamilyName || t('auth.newFamily') }), 3000);
          }
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setLoading(false);
        setShowConfetti(true);

        // Sign out immediately so they have to log in (and trigger the verification check)
        await auth.signOut();

        Alert.alert(
          t('auth.accountCreated'),
          t('auth.accountCreatedMessage'),
          [{
            text: t('auth.understood'),
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

  const isFormValid = email.length > 0 && password.length >= 6 && (
    isLogin || (
      displayName.trim().length > 0 &&
      confirmPassword === password &&
      agreedToTerms &&
      agreedToPrivacy &&
      agreedToAge
    )
  );
  const passwordStrength = validatePassword(password, t);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="light" />
      <ConfettiBurst visible={showConfetti} onFinish={() => setShowConfetti(false)} />

      {/* Premium Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={['#0F0A1A', '#1a1040', '#2D1B69']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Subtle ambient glow */}
        <View style={styles.ambientGlow} />
        <View style={styles.ambientGlow2} />

        <View style={styles.headerContent}>
          <View style={styles.premiumLogoContainer}>
            <View style={styles.logoRing}>
              <View style={styles.glassLogoBackground}>
                <Image
                  source={require('../assets/icon.png')}
                  style={styles.premiumLogoImage}
                  resizeMode="contain"
                />
              </View>
            </View>
          </View>
          <Text style={styles.appTitle}>{t('login.appName')}</Text>
          <Text style={styles.appSubtitle}>{t('login.appSubtitle')}</Text>
        </View>
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

            <Text style={[styles.formTitle, { color: theme.textPrimary }]}>
              {isLogin ? t('login.welcomeBack') : t('login.createAccount')}
            </Text>
            <Text style={[styles.formSubtitle, { color: theme.textSecondary }]}>
              {isLogin ? t('login.enterDetails') : t('login.joinCommunity')}
            </Text>

            {/* Display Name Input - signup only */}
            {!isLogin && (
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>{t('login.fullName')}</Text>
                <View style={[
                  styles.inputWrapper,
                  { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F8F9FB', borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#E8ECF0' },
                  displayNameError && { borderColor: '#EF4444', backgroundColor: isDarkMode ? 'rgba(239,68,68,0.08)' : '#FEF2F2' }
                ]}>
                  <View style={[styles.inputIconWrap, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}>
                    <User size={16} color={displayNameError ? '#EF4444' : theme.textTertiary} />
                  </View>
                  <TextInput
                    ref={nameRef}
                    style={[styles.input, { color: theme.textPrimary }]}
                    placeholder={t('login.fullNamePlaceholder')}
                    placeholderTextColor={theme.textTertiary}
                    value={displayName}
                    onChangeText={(text) => { setDisplayName(text); setDisplayNameError(''); }}
                    autoCapitalize="words"
                    autoCorrect={false}
                    returnKeyType="next"
                    onSubmitEditing={() => {
                      const emailInput = (passwordRef.current as any)?.props?.ref;
                      passwordRef.current?.focus();
                    }}
                    textAlign="right"
                  />
                </View>
                {displayNameError ? (
                  <View style={styles.errorRow}>
                    <AlertCircle size={12} color="#EF4444" />
                    <Text style={[styles.errorText, { color: '#EF4444' }]}>{displayNameError}</Text>
                  </View>
                ) : null}
              </View>
            )}

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>{t('login.email')}</Text>
              <View style={[
                styles.inputWrapper,
                { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F8F9FB', borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#E8ECF0' },
                emailError && { borderColor: '#EF4444', backgroundColor: isDarkMode ? 'rgba(239,68,68,0.08)' : '#FEF2F2' }
              ]}>
                <View style={[styles.inputIconWrap, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}>
                  <Mail size={16} color={emailError ? '#EF4444' : theme.textTertiary} />
                </View>
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
                  <View style={[styles.checkBadge, { backgroundColor: '#10B981' }]}>
                    <Check size={12} color="#fff" strokeWidth={3} />
                  </View>
                )}
              </View>
              {emailError ? (
                <View style={styles.errorRow}>
                  <AlertCircle size={12} color="#EF4444" />
                  <Text style={[styles.errorText, { color: '#EF4444' }]}>{emailError}</Text>
                </View>
              ) : null}
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>{t('login.password')}</Text>
              <View style={[
                styles.inputWrapper,
                { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F8F9FB', borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#E8ECF0' },
                passwordError && { borderColor: '#EF4444', backgroundColor: isDarkMode ? 'rgba(239,68,68,0.08)' : '#FEF2F2' }
              ]}>
                <View style={[styles.inputIconWrap, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}>
                  <Lock size={16} color={passwordError ? '#EF4444' : theme.textTertiary} />
                </View>
                <MaskedPasswordInput
                  ref={passwordRef}
                  style={[styles.input, { color: theme.textPrimary }]}
                  placeholder={t('login.password')}
                  placeholderTextColor={theme.textTertiary}
                  realValue={password}
                  onRealChange={(text: string) => { setPassword(text); setPasswordError(''); }}
                  showRaw={showPassword}
                  isLoginMode={isLogin}
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
                  {showPassword ? <EyeOff size={18} color={theme.textTertiary} /> : <Eye size={18} color={theme.textTertiary} />}
                </TouchableOpacity>
              </View>

              {/* Password strength indicator - Premium */}
              {!isLogin && password.length > 0 && (
                <View style={styles.strengthRow}>
                  <View style={styles.strengthTrack}>
                    <View style={[
                      styles.strengthBar,
                      {
                        width: password.length < 6 ? '30%' : password.length < 8 ? '60%' : '100%',
                        backgroundColor: getPasswordStrengthColor(password),
                      }
                    ]} />
                  </View>
                  <Text style={[styles.strengthText, { color: getPasswordStrengthColor(password) }]}>
                    {passwordStrength.message}
                  </Text>
                </View>
              )}

              {passwordError ? (
                <View style={styles.errorRow}>
                  <AlertCircle size={12} color="#EF4444" />
                  <Text style={[styles.errorText, { color: '#EF4444' }]}>{passwordError}</Text>
                </View>
              ) : null}
            </View>

            {/* Confirm Password - signup only */}
            {!isLogin && (
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>{t('login.confirmPassword')}</Text>
                <View style={[
                  styles.inputWrapper,
                  { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F8F9FB', borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#E8ECF0' },
                  confirmPasswordError && { borderColor: '#EF4444', backgroundColor: isDarkMode ? 'rgba(239,68,68,0.08)' : '#FEF2F2' },
                  !confirmPasswordError && confirmPassword.length > 0 && confirmPassword === password && { borderColor: '#10B981' }
                ]}>
                  <View style={[styles.inputIconWrap, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}>
                    <Lock size={16} color={confirmPasswordError ? '#EF4444' : theme.textTertiary} />
                  </View>
                  <MaskedPasswordInput
                    ref={confirmPasswordRef}
                    style={[styles.input, { color: theme.textPrimary }]}
                    placeholder={t('login.confirmPassword')}
                    placeholderTextColor={theme.textTertiary}
                    realValue={confirmPassword}
                    onRealChange={(text: string) => { setConfirmPassword(text); setConfirmPasswordError(''); }}
                    showRaw={showConfirmPassword}
                    isLoginMode={false}
                    returnKeyType="done"
                    onSubmitEditing={handleAuth}
                  />
                  <TouchableOpacity
                    onPress={() => {
                      setShowConfirmPassword(!showConfirmPassword);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={styles.eyeBtn}
                  >
                    {showConfirmPassword ? <EyeOff size={18} color={theme.textTertiary} /> : <Eye size={18} color={theme.textTertiary} />}
                  </TouchableOpacity>
                  {!confirmPasswordError && confirmPassword.length > 0 && confirmPassword === password && (
                    <View style={[styles.checkBadge, { backgroundColor: '#10B981' }]}>
                      <Check size={12} color="#fff" strokeWidth={3} />
                    </View>
                  )}
                </View>
                {confirmPasswordError ? (
                  <View style={styles.errorRow}>
                    <AlertCircle size={12} color="#EF4444" />
                    <Text style={[styles.errorText, { color: '#EF4444' }]}>{confirmPasswordError}</Text>
                  </View>
                ) : null}
              </View>
            )}

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

            {/* Registration Options */}
            {!isLogin && (
              <View style={styles.registrationOptions}>
                {/* Babysitter Registration */}
                <TouchableOpacity
                  style={[
                    styles.optionCard,
                    { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : '#FAFAFA', borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#F0F0F0' },
                    registerAsBabysitter && {
                      borderColor: '#F59E0B',
                      backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.08)' : '#FFFDF5',
                    }
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setRegisterAsBabysitter(!registerAsBabysitter);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionRow}>
                    <View style={[styles.optionIcon, { backgroundColor: registerAsBabysitter ? '#F59E0B' : (isDarkMode ? 'rgba(245,158,11,0.15)' : '#FEF3C7') }]}>
                      <Briefcase size={16} color={registerAsBabysitter ? '#fff' : '#D97706'} strokeWidth={2.5} />
                    </View>
                    <View style={styles.optionTextWrap}>
                      <Text style={[styles.optionTitle, { color: theme.textPrimary }]}>
                        {t('login.babysitter.title')}
                      </Text>
                      <Text style={[styles.optionSubtitle, { color: theme.textSecondary }]}>
                        {t('login.babysitter.subtitle')}
                      </Text>
                    </View>
                  </View>
                  <View style={[
                    styles.optionCheckbox,
                    { borderColor: isDarkMode ? 'rgba(255,255,255,0.15)' : '#D1D5DB' },
                    registerAsBabysitter && { backgroundColor: '#F59E0B', borderColor: '#F59E0B' }
                  ]}>
                    {registerAsBabysitter && <Check size={12} color="#fff" strokeWidth={3} />}
                  </View>
                </TouchableOpacity>

                {/* Join Family Code */}
                <TouchableOpacity
                  style={[
                    styles.optionCard,
                    { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : '#FAFAFA', borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#F0F0F0' },
                    pendingInviteCode.length === 6 && {
                      borderColor: '#10B981',
                      backgroundColor: isDarkMode ? 'rgba(16,185,129,0.08)' : '#F0FDF9',
                    }
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setShowJoinCodeModal(true);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionRow}>
                    <View style={[styles.optionIcon, { backgroundColor: pendingInviteCode.length === 6 ? '#10B981' : (isDarkMode ? 'rgba(139,92,246,0.15)' : theme.primaryLight) }]}>
                      <Users size={16} color={pendingInviteCode.length === 6 ? '#fff' : theme.primary} strokeWidth={2.5} />
                    </View>
                    <View style={styles.optionTextWrap}>
                      <Text style={[styles.optionTitle, { color: theme.textPrimary }]}>
                        {pendingInviteCode.length === 6 ? t('login.codeSaved') : t('login.enterInviteCode')}
                      </Text>
                      <Text style={[styles.optionSubtitle, { color: theme.textSecondary }]}>
                        {pendingInviteCode.length === 6 ? pendingInviteCode : t('login.partnerSentCode')}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.optionArrow, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}>
                    <Mail size={14} color={theme.textTertiary} />
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Terms and Privacy Agreement - Premium */}
            {!isLogin && (
              <View style={styles.agreementContainer}>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setAgreedToTerms(!agreedToTerms);
                  }}
                  style={styles.agreementRow}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.agreementCheckbox,
                    { borderColor: isDarkMode ? 'rgba(255,255,255,0.15)' : '#D1D5DB' },
                    agreedToTerms && { backgroundColor: theme.primary, borderColor: theme.primary }
                  ]}>
                    {agreedToTerms && <Check size={10} color="#fff" strokeWidth={3} />}
                  </View>
                  <Text style={[styles.agreementText, { color: theme.textSecondary }]}>
                    {t('login.agreement.terms')}{' '}
                    <Text
                      style={[styles.agreementLink, { color: theme.primary }]}
                      onPress={() => setLegalModal('terms')}
                    >{t('login.agreement.termsLink')}</Text>
                  </Text>

                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setAgreedToPrivacy(!agreedToPrivacy);
                  }}
                  style={styles.agreementRow}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.agreementCheckbox,
                    { borderColor: isDarkMode ? 'rgba(255,255,255,0.15)' : '#D1D5DB' },
                    agreedToPrivacy && { backgroundColor: theme.primary, borderColor: theme.primary }
                  ]}>
                    {agreedToPrivacy && <Check size={10} color="#fff" strokeWidth={3} />}
                  </View>
                  <Text style={[styles.agreementText, { color: theme.textSecondary }]}>
                    {t('login.agreement.privacy')}{' '}
                    <Text
                      style={[styles.agreementLink, { color: theme.primary }]}
                      onPress={() => setLegalModal('privacy')}
                    >{t('login.agreement.privacyLink')}</Text>
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setAgreedToAge(!agreedToAge);
                  }}
                  style={styles.agreementRow}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.agreementCheckbox,
                    { borderColor: isDarkMode ? 'rgba(255,255,255,0.15)' : '#D1D5DB' },
                    agreedToAge && { backgroundColor: theme.primary, borderColor: theme.primary }
                  ]}>
                    {agreedToAge && <Check size={10} color="#fff" strokeWidth={3} />}
                  </View>
                  <Text style={[styles.agreementText, { color: theme.textSecondary }]}>
                    {t('login.agreement.age')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Submit button - Premium */}
            <TouchableOpacity
              style={[styles.mainButton, !isFormValid && styles.mainButtonDisabled]}
              onPress={handleAuth}
              disabled={loading || !isFormValid}
              activeOpacity={0.85}
              accessibilityLabel={isLogin ? t('auth.loginLabel') : t('auth.registerLabel')}
              accessibilityRole="button"
              accessibilityState={{ disabled: loading || !isFormValid }}
            >
              <LinearGradient
                colors={isFormValid ? ['#7C3AED', '#6D28D9', '#5B21B6'] : [isDarkMode ? '#333' : '#D1D5DB', isDarkMode ? '#2a2a2a' : '#C4C4C4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientBtn}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.mainButtonText}>
                      {isLogin ? t('auth.login') : t('auth.createAccount')}
                    </Text>
                    {isFormValid && <Shield size={16} color="rgba(255,255,255,0.7)" strokeWidth={2} />}
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={[styles.line, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#E8ECF0' }]} />
              <Text style={[styles.orText, { color: theme.textTertiary }]}>{t('common.or')}</Text>
              <View style={[styles.line, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#E8ECF0' }]} />
            </View>

            {/* Social buttons - Premium */}
            <View style={styles.socialRow}>
              <TouchableOpacity
                style={[
                  styles.socialBtn,
                  { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#fff', borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#E8ECF0' },
                  !request && { opacity: 0.4 }
                ]}
                onPress={() => {
                  if (request) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    promptAsync();
                  }
                }}
                disabled={!request}
                accessibilityLabel={t('auth.googleLoginLabel')}
                accessibilityRole="button"
                accessibilityState={{ disabled: !request }}
              >
                <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png' }} style={styles.socialIcon} />
                <Text style={[styles.socialText, { color: theme.textPrimary }]}>Google</Text>
              </TouchableOpacity>

              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={[
                    styles.socialBtn,
                    { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#fff', borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#E8ECF0' },
                  ]}
                  accessibilityLabel={t('auth.appleLoginLabel')}
                  accessibilityRole="button"
                  onPress={async () => {
                    try {
                      logger.debug('🍎', 'Apple Sign-In - Starting...');

                      // Check if Apple Authentication is available (not available on simulator)
                      const isAvailable = await AppleAuthentication.isAvailableAsync();
                      if (!isAvailable) {
                        Alert.alert(t('auth.appleNotAvailable'), t('auth.appleNotAvailableMessage'));
                        return;
                      }

                      // Generate a cryptographically secure nonce
                      const randomBytes = await Crypto.getRandomBytesAsync(32);
                      const rawNonce = Array.from(randomBytes)
                        .map(b => b.toString(16).padStart(2, '0'))
                        .join('');

                      // Hash the nonce using SHA256
                      const hashedNonce = await Crypto.digestStringAsync(
                        Crypto.CryptoDigestAlgorithm.SHA256,
                        rawNonce
                      );
                      logger.debug('🍎', 'Apple Sign-In - Nonce generated, calling signInAsync...');

                      const appleCredential = await AppleAuthentication.signInAsync({
                        requestedScopes: [
                          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                          AppleAuthentication.AppleAuthenticationScope.EMAIL,
                        ],
                        nonce: hashedNonce,
                      });
                      logger.debug('🍎', 'Apple Sign-In - Got credential, identityToken length:', appleCredential.identityToken?.length);

                      // Validate identity token exists before using it
                      if (!appleCredential.identityToken) {
                        Alert.alert(t('common.error'), t('auth.appleTokenError'));
                        return;
                      }

                      // Create Firebase credential with rawNonce
                      const provider = new OAuthProvider('apple.com');
                      const firebaseCredential = provider.credential({
                        idToken: appleCredential.identityToken,
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

                        // If user has a pending invite code, join the family
                        if (pendingInviteCode.trim().length === 6) {
                          const result = await joinFamily(pendingInviteCode.trim());
                          if (result.success) {
                            logger.debug('✅', 'Joined family via Apple Auth:', result.currentFamilyName);
                          }
                        }
                      }

                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      onLoginSuccess();
                    } catch (e: any) {
                      logger.error('❌ Apple Sign-In Error:', e.code, e.message);
                      if (e.code !== 'ERR_REQUEST_CANCELED' && e.code !== 'ERR_CANCELED' && e.code !== 'ERR_REQUEST_UNKNOWN') {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                        Alert.alert(t('auth.appleError'), e.message || t('auth.unknownError'));
                      }
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/0/747.png' }} style={styles.socialIcon} />
                  <Text style={[styles.socialText, { color: theme.textPrimary }]}>Apple</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Switch mode */}
            <TouchableOpacity
              onPress={() => {
                setIsLogin(!isLogin);
                setDisplayName('');
                setConfirmPassword('');
                setDisplayNameError('');
                setEmailError('');
                setPasswordError('');
                setConfirmPasswordError('');
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={styles.switchMode}
              accessibilityLabel={isLogin ? t('login.switchToSignup') : t('login.switchToLogin')}
              accessibilityRole="button"
            >
              <Text style={[styles.switchText, { color: theme.textSecondary }]}>
                {isLogin ? t('login.noAccount') : t('login.hasAccount')}{' '}
                <Text style={[styles.linkText, { color: theme.primary }]}>{isLogin ? t('login.signupNow') : t('login.loginNow')}</Text>
              </Text>
            </TouchableOpacity>

            {/* Guest Mode / Explore */}
            {onGuestMode && (
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onGuestMode();
                }}
                style={styles.exploreBtn}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={isDarkMode
                    ? ['rgba(99,102,241,0.15)', 'rgba(139,92,246,0.10)']
                    : ['rgba(99,102,241,0.08)', 'rgba(139,92,246,0.05)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.exploreBtnGradient}
                >
                  <Compass size={18} color={isDarkMode ? '#818CF8' : '#6366F1'} strokeWidth={2.5} />
                  <Text style={[styles.exploreBtnText, { color: isDarkMode ? '#818CF8' : '#6366F1' }]}>
                    {t('login.exploreApp')}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* Security footer */}
            <View style={styles.securityFooter}>
              <Shield size={12} color={theme.textTertiary} />
              <Text style={[styles.securityFooterText, { color: theme.textTertiary }]}>
                {t('login.security')}
              </Text>
            </View>

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

            {showScanner ? (
              <View style={{ width: 250, height: 250, borderRadius: 16, overflow: 'hidden', marginVertical: 15 }}>
                <CameraView
                  style={StyleSheet.absoluteFillObject}
                  facing="back"
                  onBarcodeScanned={({ data }) => {
                    const code = data.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
                    if (code.length === 6) {
                      setPendingInviteCode(code);
                      setShowScanner(false);
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    }
                  }}
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                />
                <TouchableOpacity
                  style={{ position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 20 }}
                  onPress={() => setShowScanner(false)}
                >
                  <X size={20} color="#fff" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', gap: 10 }}>
                <TextInput
                  style={[
                    styles.joinModalInput,
                    { flex: 1, backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.textPrimary }
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
                  style={{
                    height: 50,
                    width: 50,
                    borderRadius: 12,
                    backgroundColor: isDarkMode ? 'rgba(124, 58, 237, 0.15)' : 'rgba(124, 58, 237, 0.1)',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  onPress={async () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    if (!permission?.granted) {
                      const result = await requestPermission();
                      if (!result.granted) {
                        Alert.alert(t('common.error'), t('auth.cameraPermRequired'));
                        return;
                      }
                    }
                    setShowScanner(true);
                  }}
                  accessibilityLabel={t('auth.scanBarcode')}
                >
                  <QrCode size={22} color={theme.primary} strokeWidth={2} />
                </TouchableOpacity>
              </View>
            )}

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

      <LegalModal
        visible={legalModal !== null}
        type={legalModal ?? 'terms'}
        onClose={() => setLegalModal(null)}
      />
    </View >
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // ===== HEADER =====
  header: {
    height: '28%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  headerContent: {
    alignItems: 'center',
    zIndex: 10,
  },
  ambientGlow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    top: -80,
    right: -80,
  },
  ambientGlow2: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    bottom: -60,
    left: -60,
  },
  premiumLogoContainer: {
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoRing: {
    width: 96,
    height: 96,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 0,
  },
  glassLogoBackground: {
    width: 84,
    height: 84,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  premiumLogoImage: {
    width: 72,
    height: 72,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 14,
    color: 'rgba(200, 200, 255, 0.7)',
    fontWeight: '500',
    letterSpacing: -0.2,
  },

  // ===== FORM =====
  formContainer: {
    flex: 1,
    marginTop: -24,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 28,
    paddingBottom: 32,
    marginHorizontal: 16,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 0,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  formSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 28,
    letterSpacing: -0.2,
    lineHeight: 20,
  },

  // ===== INPUTS =====
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'right',
    letterSpacing: -0.2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    height: 52,
  },
  inputIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  input: {
    flex: 1,
    height: '100%',
    textAlign: 'right',
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: '500',
  },
  checkBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  eyeBtn: {
    padding: 12,
  },

  // ===== ERRORS =====
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
    marginTop: 6,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: -0.2,
  },

  // ===== PASSWORD STRENGTH =====
  strengthRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginTop: 10,
    gap: 10,
  },
  strengthTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.06)',
    maxWidth: 120,
    overflow: 'hidden',
  },
  strengthBar: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.2,
  },

  // ===== FORGOT PASSWORD =====
  forgotBtn: {
    alignSelf: 'flex-start',
    marginBottom: 8,
    marginTop: -4,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },

  // ===== REGISTRATION OPTIONS =====
  registrationOptions: {
    gap: 10,
    marginBottom: 16,
    marginTop: 4,
  },
  optionCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  optionRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  optionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
    letterSpacing: -0.2,
  },
  optionSubtitle: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 1,
    letterSpacing: -0.1,
  },
  optionCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  optionArrow: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  // ===== AGREEMENTS =====
  agreementContainer: {
    marginBottom: 8,
    gap: 14,
  },
  agreementRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  agreementCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agreementText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
    textAlign: 'right',
  },
  agreementLink: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  // ===== MAIN BUTTON =====
  mainButton: {
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 0,
  },
  mainButtonDisabled: {
    shadowColor: '#000',
    shadowOpacity: 0.05,
    elevation: 0,
  },
  gradientBtn: {
    paddingVertical: 17,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mainButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
  },

  // ===== DIVIDER =====
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  orText: {
    marginHorizontal: 16,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.2,
  },

  // ===== SOCIAL BUTTONS =====
  socialRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  socialIcon: {
    width: 24,
    height: 24,
  },
  socialText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
  },

  // ===== SWITCH MODE =====
  switchMode: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  switchText: {
    fontSize: 14,
    letterSpacing: -0.2,
  },
  linkText: {
    fontWeight: '800',
  },

  // ===== EXPLORE / GUEST MODE =====
  exploreBtn: {
    marginTop: 14,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.15)',
  },
  exploreBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  exploreBtnText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
  },

  // ===== SECURITY FOOTER =====
  securityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 16,
    paddingTop: 12,
  },
  securityFooterText: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: -0.1,
  },

  // ===== JOIN MODAL =====
  joinModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  joinModalContent: {
    borderRadius: 24,
    padding: 28,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 0,
    alignItems: 'center',
  },
  joinModalClose: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  joinModalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  joinModalInput: {
    width: '100%',
    height: 56,
    borderRadius: 16,
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
  joinModalBtnDisabled: {},
  joinModalBtnText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
});