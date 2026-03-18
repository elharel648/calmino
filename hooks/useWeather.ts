import { logger } from '../utils/logger';
import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { WeatherData } from '../types/home';
import { weatherKitService } from '../services/weatherKitService';

interface UseWeatherReturn {
    weather: WeatherData;
    refresh: () => Promise<void>;
}

/**
 * Custom hook for weather data using Apple WeatherKit
 * Requires iOS 16+ and WeatherKit entitlement
 */
export const useWeather = (): UseWeatherReturn => {
    const [weather, setWeather] = useState<WeatherData>({
        temp: 24,
        city: 'טוען...',
        icon: '☁️',
        recommendation: 'טוען...',
        loading: true,
    });

    const getRecommendation = useCallback((temp: number): string => {
        if (temp >= 25) return 'חם ☀️ שכבה דקה.';
        if (temp >= 20) return 'נעים 😎 שכבה ארוכה.';
        if (temp >= 15) return 'קריר 🍃 שתי שכבות.';
        return 'קר 🥶 לחמם טוב!';
    }, []);

    const getCityName = async (lat: number, lon: number): Promise<string> => {
        try {
            const [address] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
            return address?.city || address?.region || 'איזורך';
        } catch {
            return 'איזורך';
        }
    };

    const fetchWeather = useCallback(async () => {
        setWeather(prev => ({ ...prev, loading: true, error: undefined }));

        try {
            const { status } = await Location.requestForegroundPermissionsAsync();

            if (status !== 'granted') {
                setWeather(prev => ({
                    ...prev,
                    loading: false,
                    recommendation: 'אין גישה למיקום',
                    error: 'permission_denied',
                }));
                return;
            }

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            const { latitude, longitude } = location.coords;

            // Apple WeatherKit - Native iOS API with 15-min caching
            const weatherData = await weatherKitService.getWeather(latitude, longitude);
            const temp = Math.round(weatherData.temperature);
            const cityName = await getCityName(latitude, longitude);

            setWeather({
                temp,
                city: cityName,
                icon: weatherData.icon,
                recommendation: getRecommendation(temp),
                loading: false,
            });
        } catch (e) {
            logger.log('Weather fetch issue:', e);
            setWeather({
                temp: 22,
                city: 'ישראל',
                icon: '☁️',
                recommendation: 'בדוק חיבור 🔧',
                loading: false,
                error: 'fetch_failed',
            });
        }
    }, [getRecommendation]);

    useEffect(() => {
        fetchWeather();
    }, [fetchWeather]);

    return {
        weather,
        refresh: fetchWeather,
    };
};

export default useWeather;
