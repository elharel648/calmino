import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { AlertCircle, RefreshCw } from 'lucide-react-native';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  fullScreen?: boolean;
}

export default function ErrorState({ 
  message,
  onRetry,
  retryLabel,
  fullScreen = false 
}: ErrorStateProps) {
  const { theme, isDarkMode } = useTheme();
  const { t } = useLanguage();

  const containerStyle = fullScreen 
    ? [styles.container, styles.fullScreen, { backgroundColor: theme.background }]
    : [styles.container, { backgroundColor: 'transparent' }];

  return (
    <View style={containerStyle}>
      <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)' }]}>
        <AlertCircle size={48} color={theme.danger} strokeWidth={2} />
      </View>
      
      <Text style={[styles.title, { color: theme.textPrimary }]}>
        {t('errors.somethingWentWrong') || 'משהו השתבש'}
      </Text>
      
      {message && (
        <Text style={[styles.message, { color: theme.textSecondary }]}>
          {message}
        </Text>
      )}
      
      {onRetry && (
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: theme.primary }]}
          onPress={onRetry}
          activeOpacity={0.8}
        >
          <RefreshCw size={18} color="#fff" strokeWidth={2.5} />
          <Text style={styles.retryButtonText}>
            {retryLabel || t('common.retry') || 'נסה שוב'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  fullScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

