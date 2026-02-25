import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Animated, Platform, LayoutAnimation, UIManager } from 'react-native';
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
  const { theme, isDarkMode } = useTheme();
  const [expanded, setExpanded] = useState(false);

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
    <View style={[styles.card, isLast && styles.cardLast]}>
      <View style={styles.cardHeader}>
        {/* Right side: Icon + Title (RTL) */}
        <View style={styles.cardMainContent}>
          <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
            <Icon size={18} color={iconColor} strokeWidth={1.5} />
          </View>
          <TouchableOpacity
            style={styles.cardTextContent}
            onPress={children && enabled ? toggleExpand : undefined}
            activeOpacity={children && enabled ? 0.7 : 1}
            disabled={disabled || !enabled || !children}
          >
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{title}</Text>
            <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
              {getSubtitle()}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Left side: Actions (RTL) */}
        <View style={styles.cardActions}>
          {children && enabled && (
            <TouchableOpacity
              style={styles.expandButton}
              onPress={toggleExpand}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {expanded ? (
                <ChevronUp size={18} color={theme.textTertiary} />
              ) : (
                <ChevronDown size={18} color={theme.textTertiary} />
              )}
            </TouchableOpacity>
          )}
          {onTest && enabled && (
            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: `${iconColor}15` }]}
              onPress={onTest}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Play size={11} color={iconColor} fill={iconColor} />
            </TouchableOpacity>
          )}
          <Switch
            trackColor={{ false: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)', true: '#3B82F6' }}
            thumbColor='#fff'
            ios_backgroundColor={isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}
            onValueChange={handleToggle}
            value={enabled}
            disabled={disabled}
            style={disabled ? { opacity: 0.4 } : undefined}
          />
        </View>
      </View>

      {/* Expanded Content */}
      {expanded && enabled && children && (
        <View style={[styles.expandedContent, { borderTopColor: theme.divider }]}>
          {children}
        </View>
      )}
    </View>
  );
};

export default function PremiumNotificationSettings() {
  const { theme, isDarkMode } = useTheme();
  const { settings, updateSettings, sendTestNotification } = useNotifications();

  const handleTestNotification = async (type: 'feeding' | 'supplement' | 'summary') => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    await sendTestNotification();
  };

  const notificationCards: NotificationCardConfig[] = [
    {
      icon: Utensils,
      iconColor: "#FFFFFF",
      iconBg: isDarkMode ? '#E68A00' : '#FF9F1C',
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
      iconColor: "#FFFFFF",
      iconBg: isDarkMode ? '#059669' : '#10B981',
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
      iconColor: "#FFFFFF",
      iconBg: isDarkMode ? '#DB2777' : '#EC4899',
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
      {/* Master Toggle */}
      <View style={[styles.masterCard, { backgroundColor: theme.card }]}>
        <View style={styles.masterCardRow}>
          <View style={styles.masterContent}>
            <View style={[styles.masterIcon, { backgroundColor: isDarkMode ? '#4F46E5' : '#6366F1' }]}>
              <Bell size={18} color="#FFFFFF" strokeWidth={2.5} />
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

          <Switch
            trackColor={{ false: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)', true: '#3B82F6' }}
            thumbColor='#fff'
            ios_backgroundColor={isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}
            onValueChange={(val) => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
              updateSettings({ enabled: val });
            }}
            value={settings.enabled}
          />
        </View>
      </View>

      {/* Notification Cards */}
      <View style={[styles.cardsContainer, { backgroundColor: theme.card }, !settings.enabled && { opacity: 0.45 }]}>
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


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  masterCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  masterCardRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    minHeight: 60,
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
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  masterTextContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  masterTitle: {
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: -0.4,
  },
  masterSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: 2,
  },
  cardsContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  card: {},
  cardLast: {},
  cardHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    minHeight: 60,
  },
  cardMainContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardTextContent: {
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
  expandedContent: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cardChildContent: {
    paddingTop: 4,
  },
  spacer: {
    height: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 20,
  },
  infoBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.08,
    textAlign: 'right',
  },
});
