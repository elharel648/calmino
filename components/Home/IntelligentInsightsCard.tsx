/**
 * IntelligentInsightsCard - הקומפוננטה שמציגה תובנות חכמות ואקשנביליות
 * זה מה שמבדל אותנו מ-Baby Daybook: לא רק לתעד, אלא לפתור
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { getTopInsight, Insight } from '../../services/insightsService';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';

interface IntelligentInsightsCardProps {
    childId: string;
    userId: string;
    onActionPress?: (actionType: string, actionData: any) => void;
}

export default function IntelligentInsightsCard({
    childId,
    userId,
    onActionPress,
}: IntelligentInsightsCardProps) {
    const { theme, isDarkMode } = useTheme();
    const navigation = useNavigation();
    const [insight, setInsight] = useState<Insight | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadInsight();
    }, [childId, userId]);

    const loadInsight = async () => {
        setLoading(true);
        const result = await getTopInsight(childId, userId);
        setInsight(result);
        setLoading(false);
    };

    const handleActionPress = () => {
        if (!insight?.actionType) return;

        switch (insight.actionType) {
            case 'book_sitter':
                // Navigate to babysitter screen
                (navigation as any).navigate('BabySitter');
                break;
            case 'call_doctor':
                // Open phone/contacts
                break;
            case 'view_growth':
                // Open growth modal
                break;
            default:
                if (onActionPress) {
                    onActionPress(insight.actionType, insight.actionData);
                }
        }
    };

    if (loading) {
        return (
            <View style={[styles.card, { backgroundColor: isDarkMode ? '#1C1C1E' : '#F9FAFB' }]}>
                <ActivityIndicator size="small" color={theme.primary} />
            </View>
        );
    }

    if (!insight || insight.type === 'all_good') {
        // Show minimal "all good" card
        return (
            <Animated.View entering={FadeInDown.duration(500).delay(100)}>
                <View style={[styles.card, styles.allGoodCard]}>
                    <BlurView
                        intensity={isDarkMode ? 20 : 10}
                        tint={isDarkMode ? 'dark' : 'light'}
                        style={StyleSheet.absoluteFill}
                    />
                    <Text style={[styles.allGoodIcon]}>{insight?.icon || '✨'}</Text>
                    <Text style={[styles.allGoodTitle, { color: theme.textPrimary }]}>
                        {insight?.title || 'הכל נראה טוב!'}
                    </Text>
                </View>
            </Animated.View>
        );
    }

    // Show actionable insight card
    const severityColors = {
        high: isDarkMode ? ['#7C2D12', '#991B1B'] : ['#FEE2E2', '#FECACA'],
        medium: isDarkMode ? ['#78350F', '#92400E'] : ['#FEF3C7', '#FDE68A'],
        low: isDarkMode ? ['#1E3A8A', '#1E40AF'] : ['#DBEAFE', '#BFDBFE'],
    };

    const gradientColors = severityColors[insight.severity] as [string, string];

    return (
        <Animated.View entering={FadeInDown.duration(500).delay(100)}>
            <View style={styles.card}>
                <LinearGradient
                    colors={gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                >
                    <BlurView
                        intensity={isDarkMode ? 30 : 15}
                        tint={isDarkMode ? 'dark' : 'light'}
                        style={StyleSheet.absoluteFill}
                    />
                </LinearGradient>

                <View style={styles.content}>
                    {/* Icon + Title */}
                    <View style={styles.header}>
                        <Text style={styles.icon}>{insight.icon}</Text>
                        <Text style={[styles.title, { color: theme.textPrimary }]}>
                            {insight.title}
                        </Text>
                    </View>

                    {/* Description */}
                    <Text style={[styles.description, { color: theme.textSecondary }]}>
                        {insight.description}
                    </Text>

                    {/* Action Button */}
                    {insight.actionLabel && (
                        <TouchableOpacity
                            style={[
                                styles.actionButton,
                                { backgroundColor: isDarkMode ? '#4F46E5' : '#6366F1' },
                            ]}
                            onPress={handleActionPress}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.actionButtonText}>{insight.actionLabel}</Text>
                            <Text style={styles.actionButtonArrow}>←</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 20,
        overflow: 'hidden',
        marginVertical: 12,
        minHeight: 140,
    },
    allGoodCard: {
        minHeight: 80,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 16,
    },
    allGoodIcon: {
        fontSize: 32,
        marginBottom: 8,
    },
    allGoodTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    content: {
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    icon: {
        fontSize: 28,
        marginRight: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        flex: 1,
    },
    description: {
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 16,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 18,
        borderRadius: 12,
        marginTop: 8,
    },
    actionButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    actionButtonArrow: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
});
