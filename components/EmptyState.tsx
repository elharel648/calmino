import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { Inbox, Plus } from 'lucide-react-native';

interface EmptyStateProps {
  icon?: React.ComponentType<any>;
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  fullScreen?: boolean;
}

export default function EmptyState({ 
  icon: Icon = Inbox,
  title,
  message,
  actionLabel,
  onAction,
  fullScreen = false 
}: EmptyStateProps) {
  const { theme, isDarkMode } = useTheme();
  const { t } = useLanguage();

  const containerStyle = fullScreen 
    ? [styles.container, styles.fullScreen, { backgroundColor: theme.background }]
    : [styles.container, { backgroundColor: 'transparent' }];

  return (
    <View style={containerStyle}>
      <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.1)' }]}>
        <Icon size={48} color={theme.primary} strokeWidth={2} />
      </View>
      
      {title && (
        <Text style={[styles.title, { color: theme.textPrimary }]}>
          {title}
        </Text>
      )}
      
      {message && (
        <Text style={[styles.message, { color: theme.textSecondary }]}>
          {message}
        </Text>
      )}
      
      {onAction && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.primary }]}
          onPress={onAction}
          activeOpacity={0.8}
        >
          <Plus size={18} color="#fff" strokeWidth={2.5} />
          <Text style={styles.actionButtonText}>
            {actionLabel || t('common.add') || t('common.add')}
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
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
