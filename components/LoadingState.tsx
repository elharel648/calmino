import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { Loader2 } from 'lucide-react-native';
import PremiumLoader from './Common/PremiumLoader';

interface LoadingStateProps {
  message?: string;
  size?: 'small' | 'large';
  fullScreen?: boolean;
}

export default function LoadingState({ 
  message, 
  size = 'large',
  fullScreen = false 
}: LoadingStateProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  const containerStyle = fullScreen 
    ? [styles.container, styles.fullScreen, { backgroundColor: theme.background }]
    : [styles.container, { backgroundColor: 'transparent' }];

  return (
    <View style={containerStyle}>
      {(size === 'large' || fullScreen) ? (
        <View style={{ marginBottom: message ? 16 : 0 }}>
            <PremiumLoader size={48} />
        </View>
      ) : (
        <ActivityIndicator 
          size={size} 
          color={theme.textPrimary}
        />
      )}
      {message && (
        <Text style={[styles.message, { color: theme.textSecondary }]}>
          {message}
        </Text>
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
  message: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});

