import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { LogIn, X, Sparkles, ShieldCheck } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useGuest } from '../context/GuestContext';

const { width } = Dimensions.get('window');

interface GuestLoginPromptProps {
  onLoginPress: () => void;
}

export default function GuestLoginPrompt({ onLoginPress }: GuestLoginPromptProps) {
  const { theme, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const { showLoginPrompt, dismissLoginPrompt } = useGuest();

  const handleLogin = () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    dismissLoginPrompt();
    onLoginPress();
  };

  const handleDismiss = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    dismissLoginPrompt();
  };

  return (
    <Modal
      visible={showLoginPrompt}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        {/* Card */}
        <Animated.View
          entering={FadeInUp.springify().damping(18).stiffness(140)}
          style={[styles.card, {
            backgroundColor: isDarkMode ? 'rgba(30,30,40,0.95)' : 'rgba(255,255,255,0.97)',
          }]}
        >
          {/* Decorative gradient orb */}
          <View style={styles.orbContainer}>
            <LinearGradient
              colors={['rgba(99,102,241,0.20)', 'rgba(139,92,246,0.12)', 'transparent']}
              style={styles.orb}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            />
          </View>

          {/* Close button */}
          <TouchableOpacity
            style={[styles.closeBtn, {
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
            }]}
            onPress={handleDismiss}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <X size={18} color={theme.textTertiary} strokeWidth={2.5} />
          </TouchableOpacity>

          {/* Icon with glow */}
          <Animated.View
            entering={FadeInDown.delay(100).springify().damping(16)}
            style={styles.iconSection}
          >
            <View style={[styles.iconGlow, {
              backgroundColor: isDarkMode ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.06)',
            }]} />
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconWrap}
            >
              <LogIn size={26} color="#fff" strokeWidth={2} />
            </LinearGradient>
          </Animated.View>

          {/* Text */}
          <Animated.View entering={FadeInDown.delay(150).springify().damping(16)}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>
              {t('guest.loginRequiredTitle')}
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {t('guest.loginRequiredMessage')}
            </Text>
          </Animated.View>

          {/* Login button */}
          <Animated.View
            entering={FadeInDown.delay(200).springify().damping(16)}
            style={styles.buttonContainer}
          >
            <TouchableOpacity
              style={styles.loginBtn}
              onPress={handleLogin}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#6366F1', '#7C3AED', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.loginBtnGradient}
              >
                <LogIn size={18} color="#fff" strokeWidth={2.5} />
                <Text style={styles.loginBtnText}>
                  {t('guest.loginNow')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Dismiss */}
            <TouchableOpacity
              style={styles.dismissBtn}
              onPress={handleDismiss}
              activeOpacity={0.6}
            >
              <Text style={[styles.dismissBtnText, { color: theme.textTertiary }]}>
                {t('guest.notNow')}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Trust footer */}
          <Animated.View
            entering={FadeInDown.delay(250).springify().damping(16)}
            style={styles.trustFooter}
          >
            <ShieldCheck size={13} color={theme.textTertiary} strokeWidth={2} />
            <Text style={[styles.trustText, { color: theme.textTertiary }]}>
              {t('login.security')}
            </Text>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 28,
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 0,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  orbContainer: {
    position: 'absolute',
    top: -40,
    left: '50%',
    marginLeft: -80,
    width: 160,
    height: 160,
    alignItems: 'center',
  },
  orb: {
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    left: 14,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  iconGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 0,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 4,
    letterSpacing: -0.1,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  loginBtn: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 0,
  },
  loginBtnGradient: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  dismissBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  dismissBtnText: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  trustFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  trustText: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
});
