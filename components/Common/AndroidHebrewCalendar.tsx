/**
 * AndroidHebrewCalendar — Reusable inline Hebrew calendar for Android
 * Replaces the native Material Design date picker on Android only.
 *
 * Features: Hebrew month/day names, RTL layout, month/year drill-down,
 * "Today" button, min/max date support, theme integration.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
} from 'react-native';
import { ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface AndroidHebrewCalendarProps {
  visible: boolean;
  value: Date;
  onSelect: (date: Date) => void;
  onDismiss: () => void;
  theme: any;
  t: (key: string) => string;
  minimumDate?: Date;
  maximumDate?: Date;
  /** If true, allows selecting future dates (default: false — blocks future) */
  allowFuture?: boolean;
}

const HEBREW_WEEKDAYS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

const AndroidHebrewCalendar: React.FC<AndroidHebrewCalendarProps> = ({
  visible,
  value,
  onSelect,
  onDismiss,
  theme,
  t,
  minimumDate,
  maximumDate,
  allowFuture = false,
}) => {
  const [displayDate, setDisplayDate] = useState(new Date(value));
  const [calendarView, setCalendarView] = useState<'days' | 'months'>('days');

  // Reset display date when opening
  React.useEffect(() => {
    if (visible) {
      setDisplayDate(new Date(value));
      setCalendarView('days');
    }
  }, [visible]);

  const haptic = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (!allowFuture && date > today) return true;
    if (minimumDate) {
      const min = new Date(minimumDate);
      min.setHours(0, 0, 0, 0);
      if (date < min) return true;
    }
    if (maximumDate) {
      const max = new Date(maximumDate);
      max.setHours(23, 59, 59, 999);
      if (date > max) return true;
    }
    return false;
  };

  const navigateMonth = (direction: number) => {
    const newDate = new Date(displayDate);
    if (calendarView === 'days') {
      newDate.setMonth(newDate.getMonth() + direction);
    } else {
      newDate.setFullYear(newDate.getFullYear() + direction);
    }
    setDisplayDate(newDate);
    haptic();
  };

  const selectDay = (date: Date) => {
    if (isDateDisabled(date)) return;
    haptic();
    onSelect(date);
  };

  const selectMonth = (monthIndex: number) => {
    const today = new Date();
    const isFutureMonth = !allowFuture && (
      displayDate.getFullYear() > today.getFullYear() ||
      (displayDate.getFullYear() === today.getFullYear() && monthIndex > today.getMonth())
    );
    if (isFutureMonth) return;

    const newDate = new Date(displayDate);
    newDate.setMonth(monthIndex);
    const daysInNewMonth = new Date(newDate.getFullYear(), monthIndex + 1, 0).getDate();
    if (newDate.getDate() > daysInNewMonth) {
      newDate.setDate(daysInNewMonth);
    }
    setDisplayDate(newDate);
    setCalendarView('days');
    haptic();
  };

  const selectToday = () => {
    const today = new Date();
    haptic();
    onSelect(today);
  };

  if (!visible) return null;

  const MONTH_NAMES = [
    t('months.january'), t('months.february'), t('months.march'),
    t('months.april'), t('months.may'), t('months.june'),
    t('months.july'), t('months.august'), t('months.september'),
    t('months.october'), t('months.november'), t('months.december'),
  ];

  const year = displayDate.getFullYear();
  const month = displayDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <TouchableOpacity
        style={[styles.overlay, { backgroundColor: theme.modalOverlay || 'rgba(0,0,0,0.5)' }]}
        activeOpacity={1}
        onPress={onDismiss}
      >
        <TouchableOpacity
          style={[styles.card, { backgroundColor: theme.card }]}
          activeOpacity={1}
          onPress={() => {}}
        >
          {/* Month/Year Header */}
          <View style={styles.header}>
            <TouchableOpacity style={[styles.navBtn, { backgroundColor: theme.inputBackground, borderColor: theme.border }]} onPress={() => navigateMonth(1)}>
              <ChevronLeft size={18} color={theme.textPrimary} strokeWidth={1.5} />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setCalendarView(calendarView === 'days' ? 'months' : 'days'); haptic(); }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={[styles.monthText, { color: theme.textPrimary }]}>
                  {calendarView === 'days'
                    ? displayDate.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })
                    : year.toString()
                  }
                </Text>
                <ChevronUp size={14} color={theme.textPrimary} strokeWidth={1.5} style={{ transform: [{ rotate: calendarView === 'months' ? '180deg' : '0deg' }] }} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.navBtn, { backgroundColor: theme.inputBackground, borderColor: theme.border }]} onPress={() => navigateMonth(-1)}>
              <ChevronRight size={18} color={theme.textPrimary} strokeWidth={1.5} />
            </TouchableOpacity>
          </View>

          {/* Days View */}
          {calendarView === 'days' && (
            <>
              {/* Weekday Headers */}
              <View style={styles.weekRow}>
                {HEBREW_WEEKDAYS.map((day, i) => (
                  <Text key={i} style={[styles.weekDay, { color: theme.textTertiary }]}>{day}</Text>
                ))}
              </View>

              {/* Days Grid */}
              <View style={styles.daysGrid}>
                {/* Empty slots */}
                {Array.from({ length: firstDay }, (_, i) => (
                  <View key={`e-${i}`} style={styles.dayCell} />
                ))}

                {/* Day numbers */}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const d = i + 1;
                  const date = new Date(year, month, d);
                  const isToday = date.toDateString() === today.toDateString();
                  const isSelected = date.toDateString() === value.toDateString();
                  const disabled = isDateDisabled(date);

                  return (
                    <TouchableOpacity
                      key={d}
                      style={[
                        styles.dayCell,
                        isToday && [styles.dayToday, { backgroundColor: theme.cardSecondary }],
                        isSelected && [styles.daySelected, { backgroundColor: theme.primary }],
                        disabled && styles.dayDisabled,
                      ]}
                      onPress={() => selectDay(date)}
                      disabled={disabled}
                    >
                      <Text style={[
                        styles.dayText,
                        { color: theme.textPrimary },
                        isSelected && { color: theme.card },
                      ]}>{d}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* Months View */}
          {calendarView === 'months' && (
            <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', marginTop: 8 }}>
              {MONTH_NAMES.map((monthName, i) => {
                const isCurrentMonth = displayDate.getMonth() === i;
                const isFutureMonth = !allowFuture && (
                  year > today.getFullYear() ||
                  (year === today.getFullYear() && i > today.getMonth())
                );

                return (
                  <TouchableOpacity
                    key={i}
                    style={{
                      width: '33.33%',
                      padding: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isCurrentMonth ? theme.primary : 'transparent',
                      borderRadius: 12,
                      opacity: isFutureMonth ? 0.4 : 1,
                    }}
                    onPress={() => selectMonth(i)}
                    disabled={isFutureMonth}
                  >
                    <Text style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: isCurrentMonth ? '#fff' : theme.textPrimary,
                    }}>{monthName}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Today Button */}
          <TouchableOpacity
            style={[styles.todayBtn, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}
            onPress={selectToday}
          >
            <Text style={[styles.todayBtnText, { color: theme.primary }]}>{t('common.today')}</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 350,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  weekRow: {
    flexDirection: 'row-reverse',
    marginBottom: 8,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dayToday: {
    borderRadius: 20,
  },
  daySelected: {
    borderRadius: 20,
  },
  dayDisabled: {
    opacity: 0.3,
  },
  todayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
    borderWidth: 1,
  },
  todayBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default AndroidHebrewCalendar;
