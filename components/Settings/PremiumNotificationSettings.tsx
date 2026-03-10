import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Platform, LayoutAnimation, UIManager, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Bell, Utensils, Pill, ChevronDown, ChevronUp, Play, Clock } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../hooks/useNotifications';
import { IntervalPicker } from './IntervalPicker';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '../../context/LanguageContext';

const ACCENT_COLOR = '#6366F1';

// Compact time chip used inside supplement rows
function CompactTimePicker({ value, onChange, disabled }: { value: string; onChange: (t: string) => void; disabled?: boolean }) {
    const { theme, isDarkMode } = useTheme();
    const [show, setShow] = useState(false);
    const getDate = (s: string) => { const [h, m] = s.split(':').map(Number); const d = new Date(); d.setHours(h, m, 0, 0); return d; };
    const fmt = (d: Date) => `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
    const chipBg = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    const chipColor = isDarkMode ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)';
    return (
        <>
            <TouchableOpacity
                style={[styles.timeChip, { backgroundColor: chipBg, opacity: disabled ? 0.4 : 1 }]}
                onPress={() => { if (!disabled) { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShow(true); }}}
                activeOpacity={0.7}
                disabled={disabled}
            >
                <Clock size={11} color={chipColor} strokeWidth={2} />
                <Text style={[styles.timeChipText, { color: chipColor }]}>{value}</Text>
            </TouchableOpacity>
            {Platform.OS === 'android' && show && (
                <DateTimePicker value={getDate(value)} mode="time" is24Hour onChange={(e, d) => { setShow(false); if (d && e.type !== 'dismissed') onChange(fmt(d)); }} />
            )}
            {Platform.OS === 'ios' && (
                <Modal visible={show} transparent animationType="fade" onRequestClose={() => setShow(false)}>
                    <View style={styles.timeModalOverlay}>
                        <View style={[styles.timeModalContent, { backgroundColor: theme.card }]}>
                            <View style={[styles.timeModalHeader, { borderBottomColor: theme.divider }]}>
                                <TouchableOpacity onPress={() => setShow(false)}><Text style={{ color: theme.textSecondary, fontSize: 16 }}>ביטול</Text></TouchableOpacity>
                                <Text style={[styles.timeModalTitle, { color: theme.textPrimary }]}>בחר שעה</Text>
                                <TouchableOpacity onPress={() => setShow(false)}><Text style={{ color: ACCENT_COLOR, fontSize: 16, fontWeight: '600' }}>אישור</Text></TouchableOpacity>
                            </View>
                            <DateTimePicker value={getDate(value)} mode="time" is24Hour display="spinner" locale="he-IL" textColor={theme.textPrimary} style={{ height: 200 }}
                                onChange={(e, d) => { if (d && e.type !== 'dismissed') onChange(fmt(d)); }} />
                        </View>
                    </View>
                </Modal>
            )}
        </>
    );
}

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

interface PremiumNotificationSettingsProps {
  supplements?: { id: string; name: string }[];
}

export default function PremiumNotificationSettings({ supplements = [] }: PremiumNotificationSettingsProps) {
    const { t } = useLanguage();
  const { theme, isDarkMode } = useTheme();
  const { settings, updateSettings, sendTestNotification, schedulePerSupplementReminders } = useNotifications();

  const handleTestNotification = async (type: 'feeding' | 'supplement' | 'summary') => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    await sendTestNotification();
  };

  const notificationCards: NotificationCardConfig[] = [
    {
      icon: Utensils,
      iconColor: isDarkMode ? '#FF9F1C' : '#E68A00',
      iconBg: isDarkMode ? 'rgba(255, 159, 28, 0.15)' : 'rgba(255, 159, 28, 0.1)',
      title: t('settings.feedingReminder'),
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
            unit={t('tracking.hours')}
            onChange={(val) => updateSettings({ feedingIntervalHours: val as 1 | 2 | 3 | 4 })}
            disabled={!settings.enabled}
          />
          <View style={[styles.suppDivider, { backgroundColor: theme.divider }]} />
          <View style={styles.suppRow}>
            <Text style={[styles.suppName, { color: theme.textPrimary }]}>שעת התחלה</Text>
            <CompactTimePicker
              value={settings.feedingStartTime || "08:00"}
              disabled={!settings.enabled}
              onChange={(time) => updateSettings({ feedingStartTime: time })}
            />
          </View>
        </View>
      ),
    },
    {
      icon: Pill,
      iconColor: isDarkMode ? '#34D399' : '#059669',
      iconBg: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
      title: t('settings.supplementsReminder'),
      getSubtitle: () => supplements.length > 0
        ? `${supplements.length} תוספים מוגדרים`
        : 'כל יום בשעה שתבחרי',
      enabled: settings.supplementReminder,
      onToggle: (val) => updateSettings({ supplementReminder: val }),
      disabled: !settings.enabled,
      onTest: () => handleTestNotification('supplement'),
      children: (
        <View style={styles.cardChildContent}>
          {supplements.length === 0 ? (
            <Text style={[styles.emptySupplements, { color: theme.textSecondary }]}>
              אין תוספים מוגדרים — הוסיפי תוספים בדף הבית
            </Text>
          ) : (
            supplements.map((supp, i) => {
              const time = settings.supplementTimes?.[supp.id] || '09:00';
              return (
                <View key={supp.id}>
                  {i > 0 && <View style={[styles.suppDivider, { backgroundColor: theme.divider }]} />}
                  <View style={styles.suppRow}>
                    <Text style={[styles.suppName, { color: theme.textPrimary }]}>{supp.name}</Text>
                    <CompactTimePicker
                      value={time}
                      disabled={!settings.enabled}
                      onChange={async (newTime) => {
                        const newTimes = { ...(settings.supplementTimes || {}), [supp.id]: newTime };
                        await updateSettings({ supplementTimes: newTimes });
                        await schedulePerSupplementReminders(supplements);
                      }}
                    />
                  </View>
                </View>
              );
            })
          )}
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
            <View style={[styles.masterIcon, { backgroundColor: isDarkMode ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.1)' }]}>
              <Bell size={18} color={isDarkMode ? '#818CF8' : '#6366F1'} strokeWidth={2.5} />
            </View>
            <View style={styles.masterTextContainer}>
              <Text style={[styles.masterTitle, { color: theme.textPrimary }]}>{t('settings.notificationsAndReminders')}</Text>
              <Text style={[styles.masterSubtitle, { color: theme.textSecondary }]}>
                {settings.enabled ? t('settings.enabled') : t('settings.disabled')}
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
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexShrink: 0,
  },
  timeChipText: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  timeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  timeModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
  },
  timeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  timeModalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  suppRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  suppName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'right',
  },
  suppDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },
  emptySupplements: {
    fontSize: 13,
    textAlign: 'right',
    paddingHorizontal: 16,
    paddingVertical: 12,
    opacity: 0.7,
  },
});
