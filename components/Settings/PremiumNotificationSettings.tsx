import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { Bell, Utensils, Pill, FileText, Clock, Sparkles, ChevronDown, ChevronUp, Play } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../hooks/useNotifications';
import { IntervalPicker } from './IntervalPicker';
import { TimePicker } from './TimePicker';
import * as Haptics from 'expo-haptics';

interface PremiumNotificationCardProps {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
  enabled: boolean;
  onToggle: (value: boolean) => void;
  disabled?: boolean;
  children?: React.ReactNode;
  onTest?: () => void;
}

const PremiumNotificationCard: React.FC<PremiumNotificationCardProps> = ({
  icon: Icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  enabled,
  onToggle,
  disabled = false,
  children,
  onTest,
}) => {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handleToggle = (value: boolean) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onToggle(value);
  };

  const toggleExpand = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setExpanded(!expanded);
  };

  return (
    <Animated.View
      style={[
        styles.card,
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        {/* Icon on the right */}
        <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
          <Icon size={18} color={iconColor} strokeWidth={2} />
        </View>

        {/* Content with text */}
        <TouchableOpacity
          style={styles.cardHeaderContent}
          onPress={toggleExpand}
          activeOpacity={0.7}
          disabled={disabled || !enabled}
        >
          <View style={styles.cardHeaderText}>
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{title}</Text>
            <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
          </View>
        </TouchableOpacity>

        {/* Actions */}
        <View style={styles.cardHeaderRight}>
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
            >
              {expanded ? (
                <ChevronUp size={18} color={theme.textSecondary} />
              ) : (
                <ChevronDown size={18} color={theme.textSecondary} />
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Switch on the left (RTL) */}
        <TouchableOpacity
          style={[
            styles.switchContainer,
            enabled && { backgroundColor: iconColor },
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
              { backgroundColor: '#fff' },
            ]}
          />
        </TouchableOpacity>
      </View>

      {/* Expanded Content */}
      {expanded && enabled && children && (
        <Animated.View style={styles.expandedContent}>
          {children}
        </Animated.View>
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
    // Send test notification based on type
    await sendTestNotification();
  };

  return (
    <View style={styles.container}>
      {/* Master Toggle - matches other list items */}
      <View style={[styles.listContainer, { backgroundColor: theme.card }]}>
        <View style={[styles.listItem, styles.listItemFirst]}>
          <TouchableOpacity
            style={[
              styles.masterSwitch,
              settings.enabled && { backgroundColor: '#FF9500' },
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
                { backgroundColor: '#fff' },
              ]}
            />
          </TouchableOpacity>
          <View style={styles.listItemContent}>
            <View style={[styles.listItemIcon, { backgroundColor: '#FFF4E6' }]}>
              <Bell size={18} color="#FF9500" strokeWidth={2} />
            </View>
            <View style={styles.listItemTextContainer}>
              <Text style={[styles.listItemText, { color: theme.textPrimary }]}>התראות ותזכורות</Text>
              <Text style={[styles.listItemSubtext, { color: theme.textSecondary }]}>
                {settings.enabled ? 'מופעל' : 'כבוי'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Notification Cards */}
      <View style={[styles.listContainer, { backgroundColor: theme.card }]}>
        {/* Feeding Reminder */}
        <>
          <PremiumNotificationCard
            icon={Utensils}
            iconColor="#F59E0B"
            iconBg="#FEF3C7"
            title="תזכורת אוכל"
            subtitle={`כל ${settings.feedingIntervalHours} שעות`}
            enabled={settings.feedingReminder}
            onToggle={(val) => updateSettings({ feedingReminder: val })}
            disabled={!settings.enabled}
            onTest={() => handleTestNotification('feeding')}
          >
            <View style={styles.cardContent}>
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
          </PremiumNotificationCard>
          <View style={[styles.listDivider, { backgroundColor: theme.divider }]} />
        </>

        {/* Supplements Reminder */}
        <>
          <PremiumNotificationCard
            icon={Pill}
            iconColor="#10B981"
            iconBg="#D1FAE5"
            title="תזכורת תוספים"
            subtitle={`כל יום בשעה ${settings.supplementTime}`}
            enabled={settings.supplementReminder}
            onToggle={(val) => updateSettings({ supplementReminder: val })}
            disabled={!settings.enabled}
            onTest={() => handleTestNotification('supplement')}
          >
            <View style={styles.cardContent}>
              <TimePicker
                value={settings.supplementTime}
                label="שעת נטילה"
                onChange={(time) => updateSettings({ supplementTime: time })}
                disabled={!settings.enabled}
              />
            </View>
          </PremiumNotificationCard>
          <View style={[styles.listDivider, { backgroundColor: theme.divider }]} />
        </>

        {/* Daily Summary */}
        <PremiumNotificationCard
          icon={FileText}
          iconColor="#EC4899"
          iconBg="#FCE7F3"
          title="סיכום יומי"
          subtitle={`כל יום בשעה ${settings.dailySummaryTime}`}
          enabled={settings.dailySummary}
          onToggle={(val) => updateSettings({ dailySummary: val })}
          disabled={!settings.enabled}
          onTest={() => handleTestNotification('summary')}
        >
          <View style={styles.cardContent}>
            <TimePicker
              value={settings.dailySummaryTime}
              label="שעת סיכום"
              onChange={(time) => updateSettings({ dailySummaryTime: time })}
              disabled={!settings.enabled}
            />
          </View>
        </PremiumNotificationCard>
      </View>

      {/* Info Banner */}
      {settings.enabled && (
        <View style={[styles.infoBanner, { backgroundColor: `${theme.primary}10`, borderColor: theme.primary }]}>
          <Sparkles size={16} color={theme.primary} />
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
    gap: 0,
  },
  listContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  listItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    minHeight: 56,
  },
  listItemFirst: {
    paddingTop: 18,
  },
  listItemLast: {
    paddingBottom: 18,
  },
  listDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 20,
    marginRight: 20,
  },
  listItemContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  listItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItemTextContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  listItemText: {
    fontSize: 17,
    fontWeight: '400',
    letterSpacing: -0.41,
  },
  listItemSubtext: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: 2,
    letterSpacing: -0.08,
  },
  masterSwitch: {
    width: 51,
    height: 31,
    borderRadius: 15.5,
    backgroundColor: '#E5E7EB',
    padding: 2,
    justifyContent: 'center',
  },
  card: {
    borderWidth: 0,
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    minHeight: 56,
    gap: 12,
  },
  cardHeaderContent: {
    flex: 1,
    alignItems: 'flex-end',
    minWidth: 0, // Allow text to shrink
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0, // Don't shrink icon
  },
  cardHeaderText: {
    flex: 1,
    alignItems: 'flex-end',
    minWidth: 0, // Allow text to shrink
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '400',
    letterSpacing: -0.41,
  },
  cardSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: 2,
    letterSpacing: -0.08,
  },
  cardHeaderRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0, // Don't shrink actions
  },
  testButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0, // Don't shrink button
  },
  expandButton: {
    padding: 4,
    flexShrink: 0, // Don't shrink button
  },
  switchContainer: {
    width: 51,
    height: 31,
    borderRadius: 15.5,
    backgroundColor: '#E5E7EB',
    padding: 2,
    justifyContent: 'center',
    flexShrink: 0, // Don't shrink switch
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
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  switchThumbActive: {
    transform: [{ translateX: -20 }], // RTL - move left when active
  },
  expandedContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  cardContent: {
    paddingTop: 12,
    gap: 12,
  },
  spacer: {
    height: 4,
  },
  infoBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: -0.08,
  },
});

