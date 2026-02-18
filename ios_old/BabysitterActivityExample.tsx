/**
 * דוגמה לשימוש ב-Live Activity מ-React Native
 * 
 * קובץ זה מראה איך להשתמש ב-ActivityKit Module
 * לניהול משמרות בייביסיטר עם Live Activity
 */

import { NativeModules, Platform, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { requireNativeModule } from 'expo-modules-core';

const ActivityKitManager = Platform.OS === 'ios' ? requireNativeModule('ActivityKitManager') : null;

// ===========================
// Hook לניהול Live Activity
// ===========================

export const useBabysitterActivity = () => {
  const [activityId, setActivityId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [totalPausedSeconds, setTotalPausedSeconds] = useState(0);
  const [pauseStartTime, setPauseStartTime] = useState<Date | null>(null);

  // בדיקה אם Live Activity נתמך
  const isSupported = async (): Promise<boolean> => {
    if (Platform.OS !== 'ios') return false;

    try {
      return await ActivityKitManager.isLiveActivitySupported();
    } catch (error) {
      console.error('Error checking Live Activity support:', error);
      return false;
    }
  };

  // התחלת משמרת
  const startShift = async (babysitterName: string, hourlyRate: number) => {
    try {
      const supported = await isSupported();
      if (!supported) {
        Alert.alert('לא נתמך', 'Live Activity דורש iOS 16.2 ומעלה');
        return;
      }

      const id = await ActivityKitManager.startBabysitterShift(
        babysitterName,
        hourlyRate
      );

      setActivityId(id);
      setStartTime(new Date());
      setIsPaused(false);
      setTotalPausedSeconds(0);

      console.log('✅ Live Activity התחיל:', id);
    } catch (error: any) {
      console.error('Error starting shift:', error);
      Alert.alert('שגיאה', error.message || 'לא ניתן להתחיל משמרת');
    }
  };

  // השהיית משמרת
  const pauseShift = async () => {
    if (!activityId || isPaused) return;

    try {
      setPauseStartTime(new Date());
      setIsPaused(true);

      await ActivityKitManager.updateBabysitterShift(
        true,
        totalPausedSeconds
      );

      console.log('⏸️ משמרת הושהתה');
    } catch (error) {
      console.error('Error pausing shift:', error);
      Alert.alert('שגיאה', 'לא ניתן להשהות משמרת');
    }
  };

  // המשך משמרת
  const resumeShift = async () => {
    if (!activityId || !isPaused || !pauseStartTime) return;

    try {
      const pauseDuration = (Date.now() - pauseStartTime.getTime()) / 1000;
      const newTotalPausedSeconds = totalPausedSeconds + pauseDuration;

      setTotalPausedSeconds(newTotalPausedSeconds);
      setIsPaused(false);
      setPauseStartTime(null);

      await ActivityKitManager.updateBabysitterShift(
        false,
        newTotalPausedSeconds
      );

      console.log('▶️ משמרת התחדשה');
    } catch (error) {
      console.error('Error resuming shift:', error);
      Alert.alert('שגיאה', 'לא ניתן להמשיך משמרת');
    }
  };

  // סיום משמרת
  const endShift = async () => {
    if (!activityId) return;

    try {
      await ActivityKitManager.stopBabysitterShift();

      setActivityId(null);
      setStartTime(null);
      setIsPaused(false);
      setTotalPausedSeconds(0);
      setPauseStartTime(null);

      console.log('🛑 משמרת הסתיימה');
    } catch (error) {
      console.error('Error ending shift:', error);
      Alert.alert('שגיאה', 'לא ניתן לסיים משמרת');
    }
  };

  // חישוב זמן עבודה נוכחי (בשניות)
  const getCurrentWorkTime = (): number => {
    if (!startTime) return 0;

    const elapsed = (Date.now() - startTime.getTime()) / 1000;
    let pausedTime = totalPausedSeconds;

    if (isPaused && pauseStartTime) {
      pausedTime += (Date.now() - pauseStartTime.getTime()) / 1000;
    }

    return Math.max(0, elapsed - pausedTime);
  };

  // חישוב עלות נוכחית
  const getCurrentCost = (hourlyRate: number): number => {
    const workTimeInHours = getCurrentWorkTime() / 3600;
    return workTimeInHours * hourlyRate;
  };

  // קבלת מצב Activity הנוכחי
  const getActivityState = async () => {
    try {
      return await ActivityKitManager.getActivityState();
    } catch (error) {
      console.error('Error getting activity state:', error);
      return null;
    }
  };

  return {
    activityId,
    isActive: !!activityId,
    isPaused,
    startTime,
    startShift,
    pauseShift,
    resumeShift,
    endShift,
    getCurrentWorkTime,
    getCurrentCost,
    getActivityState,
    isSupported,
  };
};

// ===========================
// דוגמה לשימוש בקומפוננטה
// ===========================

export const BabysitterShiftScreen = () => {
  const {
    isActive,
    isPaused,
    startShift,
    pauseShift,
    resumeShift,
    endShift,
    getCurrentWorkTime,
    getCurrentCost,
  } = useBabysitterActivity();

  const [babysitterName, setBabysitterName] = useState('שרה כהן');
  const [hourlyRate, setHourlyRate] = useState(50);

  const handleStartShift = () => {
    startShift(babysitterName, hourlyRate);
  };

  const handleTogglePause = () => {
    if (isPaused) {
      resumeShift();
    } else {
      pauseShift();
    }
  };

  const handleEndShift = () => {
    Alert.alert(
      'סיום משמרת',
      'האם אתה בטוח שברצונך לסיים את המשמרת?',
      [
        { text: 'ביטול', style: 'cancel' },
        { text: 'סיום', onPress: endShift, style: 'destructive' },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {!isActive ? (
        <>
          <Text style={styles.title}>התחל משמרת חדשה</Text>

          <TextInput
            style={styles.input}
            value={babysitterName}
            onChangeText={setBabysitterName}
            placeholder="שם הבייביסיטר"
          />

          <TextInput
            style={styles.input}
            value={String(hourlyRate)}
            onChangeText={(text) => setHourlyRate(Number(text))}
            placeholder="תעריף שעתי (₪)"
            keyboardType="numeric"
          />

          <Button title="התחל משמרת 🚀" onPress={handleStartShift} />
        </>
      ) : (
        <>
          <Text style={styles.title}>משמרת פעילה</Text>
          <Text style={styles.subtitle}>
            {isPaused ? '⏸️ מושהה' : '✅ פעיל'}
          </Text>

          <View style={styles.buttonContainer}>
            <Button
              title={isPaused ? 'המשך ▶️' : 'השהה ⏸️'}
              onPress={handleTogglePause}
            />

            <Button
              title="סיים משמרת 🛑"
              onPress={handleEndShift}
              color="red"
            />
          </View>

          <Text style={styles.info}>
            💡 עכשיו תוכל לראות את המשמרת ב:
            {'\n'}- Dynamic Island
            {'\n'}- Lock Screen
            {'\n'}- Notification Center
          </Text>
        </>
      )}
    </View>
  );
};

// ===========================
// דוגמה מתקדמת עם עדכונים
// ===========================

export const AdvancedBabysitterManager = () => {
  const activity = useBabysitterActivity();
  const [currentTime, setCurrentTime] = useState(0);
  const [currentCost, setCurrentCost] = useState(0);

  // עדכון התצוגה כל שנייה
  useEffect(() => {
    if (!activity.isActive) return;

    const interval = setInterval(() => {
      const hourlyRate = 50; // או שמור את זה ב-state
      setCurrentTime(activity.getCurrentWorkTime());
      setCurrentCost(activity.getCurrentCost(hourlyRate));
    }, 1000);

    return () => clearInterval(interval);
  }, [activity.isActive, activity.isPaused]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {activity.isActive && (
        <View style={styles.stats}>
          <Text style={styles.statLabel}>זמן עבודה:</Text>
          <Text style={styles.statValue}>{formatTime(currentTime)}</Text>

          <Text style={styles.statLabel}>עלות נוכחית:</Text>
          <Text style={styles.statValue}>₪{currentCost.toFixed(2)}</Text>
        </View>
      )}
    </View>
  );
};

// ===========================
// Styles
// ===========================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  buttonContainer: {
    gap: 10,
    marginVertical: 20,
  },
  info: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 22,
  },
  stats: {
    backgroundColor: '#f5f5f5',
    padding: 20,
    borderRadius: 12,
    marginVertical: 20,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
  },
});
