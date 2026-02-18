/**
 * QuickActionsExample.tsx
 * 
 * דוגמאות שימוש ב-Live Activities לפעולות מהירות
 * אוכל, שינה, משחק, מדיטציה
 */

import { NativeModules, Alert } from 'react-native';
import { useState } from 'react';

const { QuickActionsManager } = NativeModules;

// ===========================
// Hook לניהול ארוחה
// ===========================

export const useMealActivity = () => {
  const [activityId, setActivityId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const startMeal = async (
    babyName: string,
    babyEmoji: string,
    mealType: 'ארוחת בוקר' | 'צהריים' | 'ערב' | 'חטיף',
    foodItems: string[]
  ) => {
    try {
      const id = await QuickActionsManager.startMeal(
        babyName,
        babyEmoji,
        mealType,
        foodItems
      );
      setActivityId(id);
      setProgress(0);
      console.log('✅ ארוחה התחילה:', id);
      return id;
    } catch (error: any) {
      console.error('Error starting meal:', error);
      Alert.alert('שגיאה', error.message || 'לא ניתן להתחיל ארוחה');
    }
  };

  const updateProgress = async (newProgress: number, foodItems: string[]) => {
    if (!activityId) return;
    
    try {
      await QuickActionsManager.updateMeal(newProgress, foodItems);
      setProgress(newProgress);
      console.log('📊 התקדמות עודכנה:', newProgress);
    } catch (error) {
      console.error('Error updating meal:', error);
    }
  };

  const stopMeal = async () => {
    if (!activityId) return;
    
    try {
      await QuickActionsManager.stopMeal();
      setActivityId(null);
      setProgress(0);
      console.log('🛑 ארוחה הסתיימה');
    } catch (error) {
      console.error('Error stopping meal:', error);
    }
  };

  return {
    activityId,
    isActive: !!activityId,
    progress,
    startMeal,
    updateProgress,
    stopMeal,
  };
};

// ===========================
// Hook לניהול שינה
// ===========================

export const useSleepActivity = () => {
  const [activityId, setActivityId] = useState<string | null>(null);
  const [isAwake, setIsAwake] = useState(false);

  const startSleep = async (
    babyName: string,
    babyEmoji: string,
    sleepType: 'תנומת צהריים' | 'שינת לילה'
  ) => {
    try {
      const id = await QuickActionsManager.startSleep(
        babyName,
        babyEmoji,
        sleepType
      );
      setActivityId(id);
      setIsAwake(false);
      console.log('😴 שינה התחילה:', id);
      return id;
    } catch (error: any) {
      console.error('Error starting sleep:', error);
      Alert.alert('שגיאה', error.message || 'לא ניתן להתחיל שינה');
    }
  };

  const wakeUp = async (quality?: 'טוב' | 'רגיל' | 'לא טוב') => {
    if (!activityId) return;
    
    try {
      await QuickActionsManager.wakeUp(quality || null);
      setIsAwake(true);
      console.log('☀️ התעורר/ה');
    } catch (error) {
      console.error('Error waking up:', error);
    }
  };

  const stopSleep = async () => {
    if (!activityId) return;
    
    try {
      await QuickActionsManager.stopSleep();
      setActivityId(null);
      setIsAwake(false);
      console.log('🛑 מעקב שינה הסתיים');
    } catch (error) {
      console.error('Error stopping sleep:', error);
    }
  };

  return {
    activityId,
    isActive: !!activityId,
    isAwake,
    startSleep,
    wakeUp,
    stopSleep,
  };
};

// ===========================
// Hook לניהול משחק
// ===========================

export const usePlayActivity = () => {
  const [activityId, setActivityId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const startPlay = async (
    babyName: string,
    babyEmoji: string,
    activityType: 'משחק חופשי' | 'קריאה' | 'שירה' | 'משחק חוץ'
  ) => {
    try {
      const id = await QuickActionsManager.startPlay(
        babyName,
        babyEmoji,
        activityType
      );
      setActivityId(id);
      setIsPaused(false);
      console.log('🎮 משחק התחיל:', id);
      return id;
    } catch (error: any) {
      console.error('Error starting play:', error);
      Alert.alert('שגיאה', error.message || 'לא ניתן להתחיל משחק');
    }
  };

  const togglePause = async () => {
    if (!activityId) return;
    
    try {
      const newPausedState = !isPaused;
      await QuickActionsManager.togglePlayPause(newPausedState);
      setIsPaused(newPausedState);
      console.log(newPausedState ? '⏸️ מושהה' : '▶️ ממשיך');
    } catch (error) {
      console.error('Error toggling pause:', error);
    }
  };

  const stopPlay = async () => {
    if (!activityId) return;
    
    try {
      await QuickActionsManager.stopPlay();
      setActivityId(null);
      setIsPaused(false);
      console.log('🛑 משחק הסתיים');
    } catch (error) {
      console.error('Error stopping play:', error);
    }
  };

  return {
    activityId,
    isActive: !!activityId,
    isPaused,
    startPlay,
    togglePause,
    stopPlay,
  };
};

// ===========================
// Hook לניהול מדיטציה
// ===========================

export const useMeditationActivity = () => {
  const [activityId, setActivityId] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  const startMeditation = async (
    parentName: string,
    duration: number, // בשניות
    meditationType: 'נשימות' | 'סריקת גוף' | 'הרפיה'
  ) => {
    try {
      const id = await QuickActionsManager.startMeditation(
        parentName,
        duration,
        meditationType
      );
      setActivityId(id);
      setIsCompleted(false);
      console.log('🧘 מדיטציה התחילה:', id);
      return id;
    } catch (error: any) {
      console.error('Error starting meditation:', error);
      Alert.alert('שגיאה', error.message || 'לא ניתן להתחיל מדיטציה');
    }
  };

  const completeMeditation = async () => {
    if (!activityId) return;
    
    try {
      await QuickActionsManager.completeMeditation();
      setIsCompleted(true);
      console.log('✅ מדיטציה הושלמה');
    } catch (error) {
      console.error('Error completing meditation:', error);
    }
  };

  const stopMeditation = async () => {
    if (!activityId) return;
    
    try {
      await QuickActionsManager.stopMeditation();
      setActivityId(null);
      setIsCompleted(false);
      console.log('🛑 מדיטציה הסתיימה');
    } catch (error) {
      console.error('Error stopping meditation:', error);
    }
  };

  return {
    activityId,
    isActive: !!activityId,
    isCompleted,
    startMeditation,
    completeMeditation,
    stopMeditation,
  };
};

// ===========================
// דוגמה: מסך ארוחה
// ===========================

export const MealScreen = () => {
  const { isActive, progress, startMeal, updateProgress, stopMeal } = useMealActivity();
  const [selectedFoods, setSelectedFoods] = useState<string[]>([]);

  const handleStartMeal = () => {
    startMeal('נועם', '👶', 'צהריים', ['אורז', 'עוף', 'ירקות']);
    setSelectedFoods(['אורז', 'עוף', 'ירקות']);
  };

  const handleAddFood = (food: string) => {
    const newFoods = [...selectedFoods, food];
    setSelectedFoods(newFoods);
    updateProgress(progress, newFoods);
  };

  const handleProgressChange = (newProgress: number) => {
    updateProgress(newProgress, selectedFoods);
  };

  const handleEndMeal = () => {
    Alert.alert(
      'סיום ארוחה',
      'האם הארוחה הסתיימה?',
      [
        { text: 'ביטול', style: 'cancel' },
        { text: 'סיום', onPress: stopMeal, style: 'destructive' },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {!isActive ? (
        <Button title="התחל ארוחה 🍽️" onPress={handleStartMeal} />
      ) : (
        <View>
          <Text>התקדמות: {Math.round(progress * 100)}%</Text>
          <Slider 
            value={progress} 
            onValueChange={handleProgressChange}
            minimumValue={0}
            maximumValue={1}
          />
          <Button title="הוסף מאכל" onPress={() => handleAddFood('פירות')} />
          <Button title="סיים ארוחה" onPress={handleEndMeal} />
        </View>
      )}
    </View>
  );
};

// ===========================
// דוגמה: מסך שינה
// ===========================

export const SleepScreen = () => {
  const { isActive, isAwake, startSleep, wakeUp, stopSleep } = useSleepActivity();

  const handleStartSleep = () => {
    startSleep('נועם', '👶', 'תנומת צהריים');
  };

  const handleWakeUp = () => {
    Alert.alert(
      'איכות שינה',
      'איך הייתה השינה?',
      [
        { text: 'לא טוב', onPress: () => wakeUp('לא טוב') },
        { text: 'רגיל', onPress: () => wakeUp('רגיל') },
        { text: 'טוב', onPress: () => wakeUp('טוב') },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {!isActive ? (
        <Button title="התחל שינה 😴" onPress={handleStartSleep} />
      ) : (
        <View>
          <Text>{isAwake ? '☀️ ער/ה' : '😴 ישן/ה'}</Text>
          {!isAwake && (
            <Button title="התעורר/ה" onPress={handleWakeUp} />
          )}
          {isAwake && (
            <Button title="סיים מעקב" onPress={stopSleep} />
          )}
        </View>
      )}
    </View>
  );
};

// ===========================
// דוגמה: מסך משחק
// ===========================

export const PlayScreen = () => {
  const { isActive, isPaused, startPlay, togglePause, stopPlay } = usePlayActivity();

  const handleStartPlay = () => {
    Alert.alert(
      'סוג משחק',
      'מה רוצים לשחק?',
      [
        { text: 'משחק חופשי', onPress: () => startPlay('נועם', '👶', 'משחק חופשי') },
        { text: 'קריאה', onPress: () => startPlay('נועם', '👶', 'קריאה') },
        { text: 'שירה', onPress: () => startPlay('נועם', '👶', 'שירה') },
        { text: 'משחק חוץ', onPress: () => startPlay('נועם', '👶', 'משחק חוץ') },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {!isActive ? (
        <Button title="התחל משחק 🎮" onPress={handleStartPlay} />
      ) : (
        <View>
          <Button 
            title={isPaused ? 'המשך ▶️' : 'השהה ⏸️'} 
            onPress={togglePause} 
          />
          <Button title="סיים משחק 🛑" onPress={stopPlay} />
        </View>
      )}
    </View>
  );
};

// ===========================
// דוגמה: מסך מדיטציה
// ===========================

export const MeditationScreen = () => {
  const { isActive, isCompleted, startMeditation, completeMeditation, stopMeditation } = useMeditationActivity();

  const handleStartMeditation = () => {
    Alert.alert(
      'משך מדיטציה',
      'כמה זמן?',
      [
        { text: '5 דקות', onPress: () => startMeditation('אימא', 300, 'נשימות') },
        { text: '10 דקות', onPress: () => startMeditation('אימא', 600, 'נשימות') },
        { text: '15 דקות', onPress: () => startMeditation('אימא', 900, 'נשימות') },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {!isActive ? (
        <Button title="התחל מדיטציה 🧘" onPress={handleStartMeditation} />
      ) : (
        <View>
          <Text>{isCompleted ? '✅ הושלם' : '🧘 מדיטציה...'}</Text>
          {!isCompleted && (
            <Button title="השלם עכשיו" onPress={completeMeditation} />
          )}
          <Button title="עצור" onPress={stopMeditation} />
        </View>
      )}
    </View>
  );
};

// ===========================
// דוגמה: דף הבית עם כל הפעולות
// ===========================

export const QuickActionsHome = () => {
  const meal = useMealActivity();
  const sleep = useSleepActivity();
  const play = usePlayActivity();
  const meditation = useMeditationActivity();

  const handleStopAll = async () => {
    Alert.alert(
      'עצור הכל',
      'האם לעצור את כל הפעילויות?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'עצור הכל',
          style: 'destructive',
          onPress: async () => {
            await QuickActionsManager.stopAllActivities();
            console.log('🛑 כל הפעילויות נעצרו');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>פעולות מהירות</Text>

      {/* ארוחה */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🍽️ ארוחה</Text>
        <Text>סטטוס: {meal.isActive ? 'פעיל' : 'לא פעיל'}</Text>
        {meal.isActive && <Text>התקדמות: {Math.round(meal.progress * 100)}%</Text>}
        <Button
          title={meal.isActive ? 'עצור' : 'התחל'}
          onPress={() => {
            if (meal.isActive) {
              meal.stopMeal();
            } else {
              meal.startMeal('נועם', '👶', 'צהריים', ['אורז', 'עוף']);
            }
          }}
        />
      </View>

      {/* שינה */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>😴 שינה</Text>
        <Text>סטטוס: {sleep.isActive ? (sleep.isAwake ? 'ער/ה' : 'ישן/ה') : 'לא פעיל'}</Text>
        <Button
          title={sleep.isActive ? 'עצור' : 'התחל'}
          onPress={() => {
            if (sleep.isActive) {
              sleep.stopSleep();
            } else {
              sleep.startSleep('נועם', '👶', 'תנומת צהריים');
            }
          }}
        />
      </View>

      {/* משחק */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🎮 משחק</Text>
        <Text>סטטוס: {play.isActive ? (play.isPaused ? 'מושהה' : 'פעיל') : 'לא פעיל'}</Text>
        <Button
          title={play.isActive ? 'עצור' : 'התחל'}
          onPress={() => {
            if (play.isActive) {
              play.stopPlay();
            } else {
              play.startPlay('נועם', '👶', 'משחק חופשי');
            }
          }}
        />
      </View>

      {/* מדיטציה */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🧘 מדיטציה</Text>
        <Text>סטטוס: {meditation.isActive ? (meditation.isCompleted ? 'הושלם' : 'פעיל') : 'לא פעיל'}</Text>
        <Button
          title={meditation.isActive ? 'עצור' : 'התחל'}
          onPress={() => {
            if (meditation.isActive) {
              meditation.stopMeditation();
            } else {
              meditation.startMeditation('אימא', 600, 'נשימות');
            }
          }}
        />
      </View>

      {/* עצור הכל */}
      <Button
        title="🛑 עצור את כל הפעילויות"
        onPress={handleStopAll}
        color="red"
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
});
