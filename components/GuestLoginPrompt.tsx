import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LogIn, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useGuest } from '../context/GuestContext';

interface GuestLoginPromptProps {
  onLoginPress: () => void;
}

export default function GuestLoginPrompt({ onLoginPress }: GuestLoginPromptProps) {
  const { theme, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const { showLoginPrompt, dismissLoginPrompt } = useGuest();

  const handleLogin = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
        <View style={[styles.container, { backgroundColor: theme.card }]}>
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleDismiss}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <X size={20} color={theme.textTertiary} />
          </TouchableOpacity>

          {/* Icon */}
          <View style={[styles.iconWrap, { backgroundColor: isDarkMode ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)' }]}>
            <LogIn size={28} color={isDarkMode ? '#818CF8' : '#6366F1'} />
          </View>

          {/* Text */}
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            {t('guest.loginRequiredTitle') || 'נדרשת התחברות'}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {t('guest.loginRequiredMessage') || 'כדי לשמור מידע ולהשתמש בפיצ׳ר הזה, צריך להתחבר לחשבון'}
          </Text>

          {/* Login button */}
          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} activeOpacity={0.85}>
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.loginBtnGradient}
            >
              <Text style={styles.loginBtnText}>
                {t('guest.loginNow') || 'התחבר עכשיו'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Dismiss */}
          <TouchableOpacity style={styles.dismissBtn} onPress={handleDismiss} activeOpacity={0.7}>
            <Text style={[styles.dismissBtnText, { color: theme.textTertiary }]}>
              {t('guest.notNow') || 'לא עכשיו'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  container: {
    width: '100%',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 1,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  loginBtn: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
  },
  loginBtnGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  dismissBtn: {
    paddingVertical: 8,
  },
  dismissBtnText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
