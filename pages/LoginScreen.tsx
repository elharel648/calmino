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

import { auth } from '../services/firebaseConfig';
import { joinFamily } from '../services/familyService';
import { useTheme } from '../context/ThemeContext';

WebBrowser.maybeCompleteAuthSession();

type LoginScreenProps = {
  onLoginSuccess: () => void;
};

// --- Validation Helpers ---
const validateEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

const validatePassword = (password: string): { valid: boolean; message: string } => {
  if (password.length < 6) return { valid: false, message: 'לפחות 6 תווים' };
  if (password.length < 8) return { valid: true, message: 'סיסמה בינונית' };
  if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) return { valid: true, message: 'סיסמה טובה' };
  return { valid: true, message: 'סיסמה חזקה 💪' };
};

const getPasswordStrengthColor = (password: string): string => {
  if (password.length < 6) return '#EF4444';
  if (password.length < 8) return '#F59E0B';
  if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) return '#10B981';
  return '#059669';
};

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const { theme, isDarkMode } = useTheme();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);
  const [awaitingVerification, setAwaitingVerification] = useState(false);

  // Join family with invite code
  const [showJoinCodeModal, setShowJoinCodeModal] = useState(false);
  const [pendingInviteCode, setPendingInviteCode] = useState('');
  const [joiningFamily, setJoiningFamily] = useState(false);

  // Babysitter registration
  const [registerAsBabysitter, setRegisterAsBabysitter] = useState(false);

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
    if (__DEV__) console.log('🔐 Google Auth - request:', !!request, 'response type:', response?.type);
    if (response?.type === 'success') {
      const { id_token } = response.params;
      if (__DEV__) console.log('🔐 Google Auth - Got id_token, length:', id_token?.length);
      const credential = GoogleAuthProvider.credential(id_token);

      setLoading(true);
      signInWithCredential(auth, credential)
        .then(() => {
          if (__DEV__) console.log('✅ Google Sign-In Success!');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onLoginSuccess();
        })
        .catch((error) => {
          if (__DEV__) console.error('❌ Google Sign-In Firebase Error:', error.code, error.message);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert('שגיאה', `לא הצלחנו להתחבר עם גוגל: ${error.code}`);
        })
        .finally(() => setLoading(false));
    } else if (response?.type === 'error') {
      if (__DEV__) console.error('❌ Google Auth Error:', response.error);
      Alert.alert('שגיאת Google', response.error?.message || 'Unknown error');
    } else if (response?.type === 'dismiss') {
      if (__DEV__) console.log('🔐 Google Auth - User dismissed');
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
      Alert.alert('שגיאה', 'אנא הזן את כתובת האימייל שלך');
      return;
    }
    if (!validateEmail(email)) {
      Alert.alert('שגיאה', 'כתובת אימייל לא תקינה');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('נשלח! ✉️', 'מייל לאיפוס סיסמה נשלח אליך. בדוק גם בספאם.');
    } catch (error) {
      if (__DEV__) console.log('Password reset error:', error);
      Alert.alert('שגיאה', 'לא הצלחנו לשלוח מייל איפוס');
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
      Alert.alert('נחסמת זמנית', `נסה שוב בעוד ${remaining} שניות`);
      return;
    }

    // Validate email
    if (!email) {
      setEmailError('נא להזין אימייל');
      triggerShake();
      return;
    }
    if (!validateEmail(email)) {
      setEmailError('כתובת אימייל לא תקינה');
      triggerShake();
      return;
    }

    // Validate password
    if (!password) {
      setPasswordError('נא להזין סיסמה');
      triggerShake();
      return;
    }
    if (!isLogin && password.length < 6) {
      setPasswordError('הסיסמה חייבת להכיל לפחות 6 תווים');
      triggerShake();
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setAttempts(0);
        onLoginSuccess();
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCredential.user);

        // If user has a pending invite code, join the family
        if (pendingInviteCode.trim().length === 6) {
          const result = await joinFamily(pendingInviteCode.trim());
          if (result.success) {
            if (__DEV__) console.log('✅ Joined family:', result.family?.babyName);
          }
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setLoading(false);
        setAwaitingVerification(true); // Show verification waiting screen
      }
    } catch (error: any) {
      if (__DEV__) console.log('Auth Error:', error?.code);

      // Increment attempts for rate limiting
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      // Lock after 5 failed attempts
      if (newAttempts >= 5) {
        setLockoutTime(Date.now() + 30000); // 30 seconds
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('יותר מדי ניסיונות', 'נחסמת ל-30 שניות מסיבות אבטחה');
        setLoading(false);
        return;
      }

      triggerShake();

      // Error messages
      let msg = 'שגיאה בהתחברות';
      switch (error.code) {
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/user-not-found':
          msg = 'אימייל או סיסמה שגויים';
          break;
        case 'auth/email-already-in-use':
          msg = 'כתובת האימייל כבר רשומה במערכת';
          break;
        case 'auth/invalid-email':
          msg = 'כתובת אימייל לא תקינה';
          break;
        case 'auth/weak-password':
          msg = 'הסיסמה חלשה מדי - נסה סיסמה חזקה יותר';
          break;
        case 'auth/too-many-requests':
          msg = 'יותר מדי ניסיונות. נסה שוב בעוד כמה דקות';
          break;
        case 'auth/network-request-failed':
          msg = 'בעיית חיבור לאינטרנט';
          break;
      }

      Alert.alert('שגיאה', msg);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = email.length > 0 && password.length >= 6;
  const passwordStrength = validatePassword(password);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <LinearGradient colors={['#1e1b4b', '#4338ca']} style={StyleSheet.absoluteFill} />
        <View style={styles.headerContent}>
          <View style={[styles.iconCircle, { backgroundColor: theme.card }]}>
            <Baby size={40} color={theme.primary} />
          </View>
          <Text style={styles.appTitle}>הורה רגוע</Text>
          <Text style={styles.appSubtitle}>ניהול חכם ושקט להורים טריים</Text>
        </View>
        <View style={[styles.blob, { top: -50, left: -50, backgroundColor: '#6366f1' }]} />
        <View style={[styles.blob, { top: 50, right: -20, backgroundColor: '#a855f7' }]} />
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
              <Text style={styles.securityText}>חיבור מאובטח</Text>
            </View>

            {/* Verification Waiting Screen */}
            {awaitingVerification ? (
              <View style={styles.verificationContainer}>
                <Text style={styles.verificationEmoji}>📧</Text>
                <Text style={styles.verificationTitle}>בדוק את המייל שלך</Text>
                <Text style={styles.verificationSubtitle}>
                  שלחנו לינק אימות ל-{email}{'\n'}
                  <Text style={styles.spamNote}>(בדוק גם בתיקיית הספאם!)</Text>
                </Text>

                <TouchableOpacity
                  style={styles.checkVerificationBtn}
                  onPress={async () => {
                    setLoading(true);
                    try {
                      await auth.currentUser?.reload();
                      if (auth.currentUser?.emailVerified) {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        Alert.alert('מעולה! 🎉', 'האימייל אומת בהצלחה!', [
                          { text: 'המשך', onPress: () => onLoginSuccess() }
                        ]);
                      } else {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        Alert.alert('עוד לא אימתת', 'לחץ על הלינק במייל שנשלח אליך ונסה שוב');
                      }
                    } catch (e) {
                      Alert.alert('שגיאה', 'נסה שוב');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    style={styles.gradientBtn}
                  >
                    {loading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={styles.mainButtonText}>אימתתי! בדוק עכשיו ✓</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.resendBtn}
                  onPress={async () => {
                    try {
                      if (auth.currentUser) {
                        await sendEmailVerification(auth.currentUser);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        Alert.alert('נשלח!', 'מייל אימות חדש נשלח אליך');
                      }
                    } catch (e) {
                      Alert.alert('שגיאה', 'נסה שוב בעוד דקה');
                    }
                  }}
                >
                  <Text style={styles.resendText}>שלח מייל אימות מחדש</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    auth.signOut();
                    setAwaitingVerification(false);
                    setEmail('');
                    setPassword('');
                  }}
                  style={{ marginTop: 20 }}
                >
                  <Text style={styles.backToLogin}>חזרה למסך התחברות</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.formTitle}>{isLogin ? 'ברוכים השבים' : 'יצירת חשבון'}</Text>
                <Text style={styles.formSubtitle}>{isLogin ? 'הכנס פרטים כדי להמשיך' : 'הצטרפו לקהילת ההורים הרגועים'}</Text>

                {/* Email Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>אימייל</Text>
                  <View style={[styles.inputWrapper, emailError && styles.inputError]}>
                    <Mail size={20} color={emailError ? '#EF4444' : '#9ca3af'} style={{ marginLeft: 10 }} />
                    <TextInput
                      style={styles.input}
                      placeholder="your@email.com"
                      placeholderTextColor="#9ca3af"
                      value={email}
                      onChangeText={(text) => { setEmail(text); setEmailError(''); }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="next"
                      onSubmitEditing={() => passwordRef.current?.focus()}
                    />
                    {email.length > 0 && validateEmail(email) && (
                      <Check size={18} color="#10B981" style={{ marginRight: 12 }} />
                    )}
                  </View>
                  {emailError ? (
                    <View style={styles.errorRow}>
                      <AlertCircle size={14} color="#EF4444" />
                      <Text style={styles.errorText}>{emailError}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Password Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>סיסמה</Text>
                  <View style={[styles.inputWrapper, passwordError && styles.inputError]}>
                    <Lock size={20} color={passwordError ? '#EF4444' : '#9ca3af'} style={{ marginLeft: 10 }} />
                    <TextInput
                      ref={passwordRef}
                      style={styles.input}
                      placeholder="הזן סיסמה"
                      placeholderTextColor="#9ca3af"
                      value={password}
                      onChangeText={(text) => { setPassword(text); setPasswordError(''); }}
                      secureTextEntry={!showPassword}
                      returnKeyType="done"
                      onSubmitEditing={handleAuth}
                    />
                    <TouchableOpacity
                      onPress={() => {
                        setShowPassword(!showPassword);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      style={styles.eyeBtn}
                    >
                      {showPassword ? <EyeOff size={20} color="#9ca3af" /> : <Eye size={20} color="#9ca3af" />}
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
                      <AlertCircle size={14} color="#EF4444" />
                      <Text style={styles.errorText}>{passwordError}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Forgot password link */}
                {isLogin && (
                  <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotBtn}>
                    <Text style={styles.forgotText}>שכחת סיסמה?</Text>
                  </TouchableOpacity>
                )}

                {/* Babysitter Registration Option - Visible in signup mode */}
                {!isLogin && (
                  <TouchableOpacity
                    style={[
                      styles.babysitterOptionCard,
                      { backgroundColor: isDarkMode ? 'rgba(251, 191, 36, 0.1)' : '#FFFBEB', borderColor: isDarkMode ? 'rgba(251, 191, 36, 0.3)' : '#FDE68A' },
                      registerAsBabysitter && [
                        styles.babysitterOptionCardActive,
                        { borderColor: theme.warning, backgroundColor: isDarkMode ? 'rgba(251, 191, 36, 0.15)' : '#FEF3C7' }
                      ]
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setRegisterAsBabysitter(!registerAsBabysitter);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.babysitterIconCircle, registerAsBabysitter && styles.babysitterIconCircleActive]}>
                      <Briefcase size={20} color={registerAsBabysitter ? theme.card : theme.warning} />
                    </View>
                    <View style={styles.babysitterTextSection}>
                      <Text style={[styles.babysitterTitle, { color: theme.textPrimary }, registerAsBabysitter && { color: theme.warning }]}>
                        {registerAsBabysitter ? '✓ נרשם/ת כבייביסיטר' : 'רוצה לעבוד כבייביסיטר?'}
                      </Text>
                      <Text style={[styles.babysitterSubtitle, { color: theme.textSecondary }]}>
                        {registerAsBabysitter ? 'תוכל/י לקבל הזמנות משפחות' : 'הצטרפ/י לרשת הבייביסיטרים שלנו'}
                      </Text>
                    </View>
                    <View style={[styles.babysitterCheckbox, registerAsBabysitter && styles.babysitterCheckboxActive]}>
                      {registerAsBabysitter && <Check size={14} color={theme.card} />}
                    </View>
                  </TouchableOpacity>
                )}

                {/* Submit button */}
                <TouchableOpacity
                  style={[styles.mainButton, !isFormValid && styles.mainButtonDisabled]}
                  onPress={handleAuth}
                  disabled={loading || !isFormValid}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={isFormValid ? ['#4f46e5', '#4338ca'] : ['#9ca3af', '#9ca3af']}
                    style={styles.gradientBtn}
                  >
                    {loading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={styles.mainButtonText}>{isLogin ? 'התחברות' : 'הרשמה'}</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.divider}>
                  <View style={styles.line} />
                  <Text style={styles.orText}>או באמצעות</Text>
                  <View style={styles.line} />
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
                  >
                    <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png' }} style={styles.socialIcon} />
                    <Text style={[styles.socialText, { color: theme.textPrimary }]}>Google</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.socialBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
                    onPress={async () => {
                      try {
                        if (__DEV__) console.log('🍎 Apple Sign-In - Starting...');
                        // Generate a random nonce
                        const rawNonce = Math.random().toString(36).substring(2, 15) +
                          Math.random().toString(36).substring(2, 15);

                        // Hash the nonce using SHA256
                        const hashedNonce = await Crypto.digestStringAsync(
                          Crypto.CryptoDigestAlgorithm.SHA256,
                          rawNonce
                        );
                        if (__DEV__) console.log('🍎 Apple Sign-In - Nonce generated, calling signInAsync...');

                        const credential = await AppleAuthentication.signInAsync({
                          requestedScopes: [
                            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                            AppleAuthentication.AppleAuthenticationScope.EMAIL,
                          ],
                          nonce: hashedNonce,
                        });
                        if (__DEV__) console.log('🍎 Apple Sign-In - Got credential, identityToken length:', credential.identityToken?.length);

                        // Create Firebase credential with rawNonce
                        const provider = new OAuthProvider('apple.com');
                        const firebaseCredential = provider.credential({
                          idToken: credential.identityToken!,
                          rawNonce: rawNonce,
                        });

                        setLoading(true);
                        if (__DEV__) console.log('🍎 Apple Sign-In - Signing in to Firebase...');
                        await signInWithCredential(auth, firebaseCredential);
                        if (__DEV__) console.log('✅ Apple Sign-In Success!');
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        onLoginSuccess();
                      } catch (e: any) {
                        if (__DEV__) console.error('❌ Apple Sign-In Error:', e.code, e.message);
                        if (e.code !== 'ERR_REQUEST_CANCELED') {
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                          Alert.alert('שגיאת Apple', `${e.code}: ${e.message}`);
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
                <TouchableOpacity onPress={() => {
                  setIsLogin(!isLogin);
                  setEmailError('');
                  setPasswordError('');
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }} style={styles.switchMode}>
                  <Text style={styles.switchText}>
                    {isLogin ? 'עדיין אין לך חשבון? ' : 'כבר יש לך חשבון? '}
                    <Text style={styles.linkText}>{isLogin ? 'הרשם עכשיו' : 'התחבר'}</Text>
                  </Text>
                </TouchableOpacity>

                {/* Join Family Code - for registration */}
                {!isLogin && (
                  <View style={styles.joinCodeSection}>
                    <View style={styles.joinCodeDivider}>
                      <View style={styles.joinCodeLine} />
                      <Text style={styles.joinCodeOrText}>או</Text>
                      <View style={styles.joinCodeLine} />
                    </View>

                    <TouchableOpacity
                      style={[styles.joinCodeBtn, pendingInviteCode.length === 6 && styles.joinCodeBtnActive]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        setShowJoinCodeModal(true);
                      }}
                    >
                      <Users size={24} color={pendingInviteCode.length === 6 ? '#10B981' : '#6366F1'} />
                      <View style={{ marginRight: 12 }}>
                        <Text style={[styles.joinCodeTitle, pendingInviteCode.length === 6 && { color: '#10B981' }]}>
                          {pendingInviteCode.length === 6 ? `קוד הזמנה: ${pendingInviteCode}` : 'קיבלתי קוד הזמנה'}
                        </Text>
                        <Text style={styles.joinCodeSubtitle}>
                          {pendingInviteCode.length === 6 ? 'הקוד יופעל בסיום ההרשמה ✓' : 'בן/בת זוג שלחו לי קוד'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}

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
            >
              <X size={24} color="#6B7280" />
            </TouchableOpacity>

            <Users size={48} color="#6366F1" />
            <Text style={styles.joinModalTitle}>הזן קוד הזמנה</Text>
            <Text style={styles.joinModalSubtitle}>
              קיבלת קוד 6 ספרות מבן/בת הזוג?
            </Text>

            <TextInput
              style={styles.joinModalInput}
              placeholder="הזן קוד 6 ספרות"
              placeholderTextColor="#9CA3AF"
              value={pendingInviteCode}
              onChangeText={(text) => setPendingInviteCode(text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              maxLength={6}
              autoCapitalize="characters"
              textAlign="center"
            />

            <TouchableOpacity
              style={[styles.joinModalBtn, pendingInviteCode.length !== 6 && styles.joinModalBtnDisabled]}
              disabled={pendingInviteCode.length !== 6}
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setShowJoinCodeModal(false);
                Alert.alert('מעולה! 🎉', 'הקוד נשמר! המשך להרשמה והקוד יופעל אוטומטית.');
              }}
            >
              <Text style={[styles.joinModalBtnText, { color: theme.card }]}>שמור קוד</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },

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

  formTitle: { fontSize: 24, fontWeight: '800', color: '#1f2937', textAlign: 'center', marginBottom: 8 },
  formSubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 28 },

  // Inputs
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8, textAlign: 'right' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    height: 54
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  input: {
    flex: 1,
    height: '100%',
    textAlign: 'right',
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#111827'
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
    color: '#EF4444',
    fontWeight: '500',
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
    color: '#6366F1',
    fontWeight: '600',
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
  mainButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

  // Divider
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  line: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  orText: { marginHorizontal: 12, color: '#9ca3af', fontSize: 12, fontWeight: '600' },

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
  switchText: { fontSize: 14, color: '#6b7280' },
  linkText: { color: '#4f46e5', fontWeight: 'bold' },

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
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  joinCodeOrText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: '#9CA3AF',
  },
  joinCodeBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F5F3FF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#C4B5FD',
    borderStyle: 'dashed',
  },
  joinCodeIcon: {
    fontSize: 28,
  },
  joinCodeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4F46E5',
    textAlign: 'right',
  },
  joinCodeSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
    marginTop: 2,
  },
  joinCodeBtnActive: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
    borderStyle: 'solid',
  },

  // Join Modal styles
  joinModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  joinModalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    width: '100%',
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
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  joinModalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  joinModalInput: {
    width: '100%',
    height: 56,
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: 8,
  },
  joinModalBtn: {
    width: '100%',
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 20,
  },
  joinModalBtnDisabled: {
    backgroundColor: '#D1D5DB',
  },
  joinModalBtnText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Verification Waiting Screen Styles
  verificationContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  verificationEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  verificationTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 12,
  },
  verificationSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  spamNote: {
    color: '#EF4444',
    fontWeight: '600',
  },
  checkVerificationBtn: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
  },
  resendBtn: {
    paddingVertical: 12,
  },
  resendText: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '600',
  },
  backToLogin: {
    fontSize: 14,
    color: '#9CA3AF',
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
});