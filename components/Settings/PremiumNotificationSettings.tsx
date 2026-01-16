import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform, LayoutAnimation, UIManager } from 'react-native';
import { Bell, Utensils, Pill, FileText, ChevronDown, ChevronUp, Play, Sparkles } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../hooks/useNotifications';
import { IntervalPicker } from './IntervalPicker';
import { TimePicker } from './TimePicker';
import * as Haptics from 'expo-haptics';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Unified accent color for all toggles
const ACCENT_COLOR = '#6366F1';

interface NotificationCardConfig {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  title: string;
  getSubtitle: () => string;
  enabled: boolean;
  onToggle: (value: boolean) => void;
  disabled?: boolean;
  onTest?: () => void;
  children?: React.ReactNode;
}

interface PremiumNotificationCardProps {
  config: NotificationCardConfig;
  isLast?: boolean;
}

const PremiumNotificationCard: React.FC<PremiumNotificationCardProps> = ({ config, isLast = false }) => {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const {
    icon: Icon,
    iconColor,
    iconBg,
    title,
    getSubtitle,
    enabled,
    onToggle,
    disabled = false,
    onTest,
    children,
  } = config;

  const handleToggle = (value: boolean) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.97,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start();

    onToggle(value);
  };

  const toggleExpand = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  return (
    <Animated.View
      style={[
        styles.card,
        { transform: [{ scale: scaleAnim }] },
        isLast && styles.cardLast,
      ]}
    >
      {/* Header Row */}
      <View style={styles.cardHeader}>
        {/* Icon Container - Right side (RTL) */}
        <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
          <Icon size={18} color={iconColor} strokeWidth={2} />
        </View>

        {/* Title & Subtitle */}
        <TouchableOpacity
          style={styles.cardContent}
          onPress={toggleExpand}
          activeOpacity={0.7}
          disabled={disabled || !enabled || !children}
        >
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{title}</Text>
          <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
            {getSubtitle()}
          </Text>
        </TouchableOpacity>

        {/* Actions: Test + Expand */}
        <View style={styles.cardActions}>
          {onTest && enabled && (
            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: `${iconColor}15` }]}
              onPress={onTest}
              activeOpacity={0.7}
            >
              <Play size={12} color={iconColor} fill={iconColor} />
            </TouchableOpacity>
          )}
          {children && (
            <TouchableOpacity
              style={styles.expandButton}
              onPress={toggleExpand}
              activeOpacity={0.7}
              disabled={disabled || !enabled}
            >
              {expanded ? (
                <ChevronUp size={18} color={theme.textSecondary} />
              ) : (
                <ChevronDown size={18} color={theme.textSecondary} />
              )}
            </TouchableOpacity>
          )}

          {/* Toggle Switch - Left side (RTL) - placed last in row-reverse */}
          <TouchableOpacity
            style={[
              styles.switchTrack,
              { backgroundColor: enabled ? ACCENT_COLOR : theme.divider },
              disabled && styles.switchDisabled,
            ]}
            onPress={() => !disabled && handleToggle(!enabled)}
            activeOpacity={0.8}
            disabled={disabled}
          >
            <Animated.View
              style={[
                styles.switchThumb,
                enabled && styles.switchThumbActive,
              ]}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Expanded Content */}
      {expanded && enabled && children && (
        <View style={[styles.expandedContent, { borderTopColor: theme.divider }]}>
          {children}
        </View>
      )}
    </Animated.View>
  );
};

export default function PremiumNotificationSettings() {
  const { theme } = useTheme();
  const { settings, updateSettings, sendTestNotification } = useNotifications();

  const handleTestNotification = async (type: 'feeding' | 'supplement' | 'summary') => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    await sendTestNotification();
  };

  // Card configurations
  const notificationCards: NotificationCardConfig[] = [
    {
      icon: Utensils,
      iconColor: '#F59E0B',
      iconBg: '#FEF3C7',
      title: 'תזכורת אוכל',
      getSubtitle: () => `כל ${settings.feedingIntervalHours} שעות`,
      enabled: settings.feedingReminder,
      onToggle: (val) => updateSettings({ feedingReminder: val }),
      disabled: !settings.enabled,
      onTest: () => handleTestNotification('feeding'),
      children: (
        <View style={styles.cardChildContent}>
          <IntervalPicker
            value={settings.feedingIntervalHours}
            options={[1, 2, 3, 4]}
            unit="שעות"
            onChange={(val) => updateSettings({ feedingIntervalHours: val as 1 | 2 | 3 | 4 })}
            disabled={!settings.enabled}
          />
          <View style={styles.spacer} />
          <TimePicker
            value={settings.feedingStartTime || "08:00"}
            label="שעת התחלה"
            onChange={(time) => updateSettings({ feedingStartTime: time })}
            disabled={!settings.enabled}
          />
        </View>
      ),
    },
    {
      icon: Pill,
      iconColor: '#10B981',
      iconBg: '#D1FAE5',
      title: 'תזכורת תוספים',
      getSubtitle: () => `כל יום בשעה ${settings.supplementTime}`,
      enabled: settings.supplementReminder,
      onToggle: (val) => updateSettings({ supplementReminder: val }),
      disabled: !settings.enabled,
      onTest: () => handleTestNotification('supplement'),
      children: (
        <View style={styles.cardChildContent}>
          <TimePicker
            value={settings.supplementTime}
            label="שעת נטילה"
            onChange={(time) => updateSettings({ supplementTime: time })}
            disabled={!settings.enabled}
          />
        </View>
      ),
    },
    {
      icon: FileText,
      iconColor: '#EC4899',
      iconBg: '#FCE7F3',
      title: 'סיכום יומי',
      getSubtitle: () => `כל יום בשעה ${settings.dailySummaryTime}`,
      enabled: settings.dailySummary,
      onToggle: (val) => updateSettings({ dailySummary: val }),
      disabled: !settings.enabled,
      onTest: () => handleTestNotification('summary'),
      children: (
        <View style={styles.cardChildContent}>
          <TimePicker
            value={settings.dailySummaryTime}
            label="שעת סיכום"
            onChange={(time) => updateSettings({ dailySummaryTime: time })}
            disabled={!settings.enabled}
          />
        </View>
      ),
    },
  ];

  return (
    <View style={styles.container}>
      {/* Master Toggle Card */}
      <View style={[styles.masterCard, { backgroundColor: theme.card }]}>
        <View style={styles.masterCardRow}>
          <View style={styles.masterContent}>
            <View style={[styles.masterIcon, { backgroundColor: '#EDE9FE' }]}>
              <Bell size={18} color={ACCENT_COLOR} strokeWidth={2} />
            </View>
            <View style={styles.masterTextContainer}>
              <Text style={[styles.masterTitle, { color: theme.textPrimary }]}>
                התראות ותזכורות
              </Text>
              <Text style={[styles.masterSubtitle, { color: theme.textSecondary }]}>
                {settings.enabled ? 'מופעל' : 'כבוי'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.masterSwitch,
              { backgroundColor: settings.enabled ? ACCENT_COLOR : theme.divider },
            ]}
            onPress={() => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
              updateSettings({ enabled: !settings.enabled });
            }}
            activeOpacity={0.8}
          >
            <Animated.View
              style={[
                styles.switchThumb,
                settings.enabled && styles.switchThumbActive,
              ]}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Notification Type Cards */}
      <View style={[styles.cardsContainer, { backgroundColor: theme.card }]}>
        {notificationCards.map((config, index) => (
          <React.Fragment key={config.title}>
            <PremiumNotificationCard
              config={config}
              isLast={index === notificationCards.length - 1}
            />
            {index < notificationCards.length - 1 && (
              <View style={[styles.divider, { backgroundColor: theme.divider }]} />
            )}
          </React.Fragment>
        ))}
      </View>

      {/* Info Banner */}
      {settings.enabled && (
        <View style={[styles.infoBanner, { backgroundColor: `${ACCENT_COLOR}10`, borderColor: `${ACCENT_COLOR}30` }]}>
          <Sparkles size={16} color={ACCENT_COLOR} />
          <Text style={[styles.infoText, { color: theme.textPrimary }]}>
            ההתראות יישלחו בהתאם להגדרות שלך
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  // Master Card Styles
  masterCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  masterCardRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    minHeight: 64,
  },
  masterContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  masterIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  masterTextContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  masterTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  masterSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: 2,
  },
  masterSwitch: {
    width: 51,
    height: 31,
    borderRadius: 15.5,
    padding: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Cards Container
  cardsContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  // Individual Card Styles
  card: {
    borderWidth: 0,
  },
  cardLast: {
    // No special styling needed
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    minHeight: 60,
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardContent: {
    flex: 1,
    alignItems: 'flex-end',
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  testButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandButton: {
    padding: 4,
  },
  // Switch Styles
  switchTrack: {
    width: 51,
    height: 31,
    borderRadius: 15.5,
    padding: 2,
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  switchDisabled: {
    opacity: 0.4,
  },
  switchThumb: {
    width: 27,
    height: 27,
    borderRadius: 13.5,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  switchThumbActive: {
    marginLeft: 20, // Move to the right side when active
  },
  // Expanded Content
  expandedContent: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cardChildContent: {
    paddingTop: 4,
  },
  spacer: {
    height: 4,
  },
  // Divider
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 20,
  },
  // Info Banner
  infoBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.08,
    textAlign: 'right',
  },
});
