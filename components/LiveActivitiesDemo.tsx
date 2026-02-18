/**
 * Live Activities Demo Component
 * Quick test component for Meal and Sleep Live Activities
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import quickActionsService from '../services/quickActionsService';
import { useTheme } from '../context/ThemeContext';

export const LiveActivitiesDemo: React.FC = () => {
    const { colors } = useTheme();
    const [mealProgress, setMealProgress] = useState(0);
    const [foodItems, setFoodItems] = useState<string[]>([]);

    // ===========================
    // Meal Handlers
    // ===========================

    const handleStartMeal = async () => {
        const activityId = await quickActionsService.startMeal(
            'נועם',
            '👶',
            'ארוחת צהריים',
            ['אורז', 'עוף']
        );

        if (activityId) {
            Alert.alert('✅ הצלחה!', `Meal Live Activity התחיל!\nID: ${activityId}\n\n🔒 נעל את המסך כדי לראות!`);
            setFoodItems(['אורז', 'עוף']);
            setMealProgress(0.3);
        } else {
            Alert.alert('❌ שגיאה', 'לא ניתן להתחיל Meal Activity');
        }
    };

    const handleAddFood = async () => {
        const newItems = [...foodItems, 'ירקות'];
        setFoodItems(newItems);
        const newProgress = Math.min(mealProgress + 0.3, 1.0);
        setMealProgress(newProgress);

        await quickActionsService.updateMeal(newProgress, newItems);
        Alert.alert('🍽️ עודכן!', `התקדמות: ${Math.round(newProgress * 100)}%`);
    };

    const handleStopMeal = async () => {
        await quickActionsService.stopMeal();
        setFoodItems([]);
        setMealProgress(0);
        Alert.alert('🛑 הסתיים', 'Meal Live Activity נעצר');
    };

    // ===========================
    // Sleep Handlers
    // ===========================

    const handleStartSleep = async () => {
        const activityId = await quickActionsService.startSleep(
            'נועם',
            '👶',
            'תנומת צהריים'
        );

        if (activityId) {
            Alert.alert('✅ הצלחה!', `Sleep Live Activity התחיל!\nID: ${activityId}\n\n🔒 נעל את המסך כדי לראות!`);
        } else {
            Alert.alert('❌ שגיאה', 'לא ניתן להתחיל Sleep Activity');
        }
    };

    const handleWakeUp = async () => {
        await quickActionsService.wakeUp('טוב');
        Alert.alert('☀️ התעורר!', 'הסטטוס עודכן ל"ער/ה"');
    };

    const handleStopSleep = async () => {
        await quickActionsService.stopSleep();
        Alert.alert('🛑 הסתיים', 'Sleep Live Activity נעצר');
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Text style={[styles.title, { color: colors.text }]}>
                🧪 Live Activities Demo
            </Text>

            {/* Meal Section */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    🍽️ Meal Activity
                </Text>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#FF9500' }]}
                    onPress={handleStartMeal}
                >
                    <Text style={styles.buttonText}>התחל ארוחה</Text>
                </TouchableOpacity>

                {quickActionsService.isMealActive() && (
                    <>
                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: '#34C759' }]}
                            onPress={handleAddFood}
                        >
                            <Text style={styles.buttonText}>הוסף מאכל</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: '#FF3B30' }]}
                            onPress={handleStopMeal}
                        >
                            <Text style={styles.buttonText}>סיים ארוחה</Text>
                        </TouchableOpacity>

                        <Text style={[styles.info, { color: colors.text }]}>
                            התקדמות: {Math.round(mealProgress * 100)}%
                        </Text>
                    </>
                )}
            </View>

            {/* Sleep Section */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    😴 Sleep Activity
                </Text>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#5856D6' }]}
                    onPress={handleStartSleep}
                >
                    <Text style={styles.buttonText}>התחל שינה</Text>
                </TouchableOpacity>

                {quickActionsService.isSleepActive() && (
                    <>
                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: '#FF9500' }]}
                            onPress={handleWakeUp}
                        >
                            <Text style={styles.buttonText}>התעורר</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: '#FF3B30' }]}
                            onPress={handleStopSleep}
                        >
                            <Text style={styles.buttonText}>סיים שינה</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>

            <Text style={[styles.hint, { color: colors.textSecondary }]}>
                💡 אחרי שתלחץ "התחל", נעל את המסך כדי לראות את ה-Live Activity!
            </Text>
        </View>
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
        marginBottom: 30,
        textAlign: 'center',
    },
    section: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 15,
    },
    button: {
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    info: {
        fontSize: 14,
        marginTop: 10,
        textAlign: 'center',
    },
    hint: {
        fontSize: 14,
        textAlign: 'center',
        marginTop: 20,
        fontStyle: 'italic',
    },
});
