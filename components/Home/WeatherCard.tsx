import React, { memo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { WeatherData } from '../../types/home';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

interface WeatherCardProps {
    weather: WeatherData;
}

/**
 * Weather card with skeleton loading state
 */
const WeatherCard = memo<WeatherCardProps>(({ weather }) => {
    const { t } = useLanguage();
    const { theme, isDarkMode } = useTheme();
    
    if (weather.loading) {
        // Skeleton loading state
        return (
            <View style={[styles.weatherCard, { backgroundColor: theme.card }]}>
                <View style={[styles.weatherIcon, { borderLeftColor: theme.border }]}>
                    <View style={[styles.skeletonTemp, { backgroundColor: theme.inputBackground }]} />
                </View>
                <View style={styles.weatherInfo}>
                    <View style={[styles.skeletonCity, { backgroundColor: theme.inputBackground }]} />
                    <View style={[styles.skeletonRec, { backgroundColor: theme.inputBackground }]} />
                </View>
            </View>
        );
    }

    return (
        <View
            style={[styles.weatherCard, { backgroundColor: theme.card }]}
            accessibilityLabel={`מזג אוויר ב${weather.city}: ${weather.temp} מעלות. ${weather.recommendation}`}
        >
            <View style={[styles.weatherIcon, { borderLeftColor: theme.border }]}>
                <Text style={[styles.weatherTemp, { color: theme.textPrimary }]}>{weather.temp}°</Text>
            </View>
            <View style={styles.weatherInfo}>
                <Text style={[styles.weatherTitle, { color: theme.textSecondary }]}>{weather.city}</Text>
                <Text style={[styles.weatherRec, { color: theme.textPrimary }]}>{weather.recommendation}</Text>
            </View>
        </View>
    );
});

WeatherCard.displayName = 'WeatherCard';

const styles = StyleSheet.create({
    weatherCard: {
        flexDirection: 'row-reverse',
        borderRadius: 20,
        padding: 16,
        marginBottom: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    weatherIcon: {
        alignItems: 'center',
        paddingLeft: 16,
        borderLeftWidth: StyleSheet.hairlineWidth,
        minWidth: 60,
    },
    weatherTemp: {
        fontSize: 22,
        fontWeight: '700',
        marginTop: 4,
        letterSpacing: -0.5,
    },
    weatherInfo: {
        flex: 1,
        paddingRight: 12,
    },
    weatherTitle: {
        fontSize: 14,
        marginBottom: 4,
        textAlign: 'right',
        letterSpacing: -0.2,
    },
    weatherRec: {
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'right',
        letterSpacing: -0.3,
    },
    // Skeleton styles
    skeletonTemp: {
        width: 40,
        height: 28,
        borderRadius: 6,
    },
    skeletonCity: {
        width: 60,
        height: 14,
        borderRadius: 4,
        marginBottom: 8,
        alignSelf: 'flex-end',
    },
    skeletonRec: {
        width: 120,
        height: 18,
        borderRadius: 4,
        alignSelf: 'flex-end',
    },
});

export default WeatherCard;
