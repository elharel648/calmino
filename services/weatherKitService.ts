/**
 * WeatherKit Service - Apple's native weather API
 * Requires iOS 16+ and WeatherKit entitlement
 */

import { NativeModules, Platform } from 'react-native';
import { logger } from '../utils/logger';

interface WeatherKitModule {
    getWeather(latitude: number, longitude: number): Promise<WeatherData>;
    getWeatherByCity(cityName: string): Promise<WeatherData>;
    clearCache(): Promise<{ success: boolean }>;
}

export interface WeatherData {
    temperature: number; // Celsius
    temperatureFahrenheit: number;
    condition: string;
    conditionCode: string;
    icon: string;
    humidity: number; // Percentage
    windSpeed: number; // m/s
    uvIndex: number;
    timestamp: number;
    latitude: number;
    longitude: number;
    isDaylight: boolean;
    cached: boolean;
    city?: string;
}

const { WeatherKitManager } = NativeModules;

class WeatherKitService {
    private isAvailable(): boolean {
        if (Platform.OS !== 'ios') {
            logger.warn('WeatherKit is only available on iOS');
            return false;
        }

        if (!WeatherKitManager) {
            // Expected when native module isn't installed - not an error
            return false;
        }

        // Check iOS version (WeatherKit requires iOS 16+)
        const iosVersion = parseInt(Platform.Version as string, 10);
        if (iosVersion < 16) {
            logger.warn(`WeatherKit requires iOS 16+, current version: ${iosVersion}`);
            return false;
        }

        return true;
    }

    async getWeather(latitude: number, longitude: number): Promise<WeatherData> {
        if (!this.isAvailable()) {
            throw new Error('WeatherKit is not available on this device');
        }

        try {
            logger.log('🌤️ Fetching weather from WeatherKit:', { latitude, longitude });
            const data = await WeatherKitManager.getWeather(latitude, longitude);
            logger.log('✅ Weather data received:', data);
            return data;
        } catch (error) {
            logger.error('❌ WeatherKit error:', error);
            throw error;
        }
    }

    async getWeatherByCity(cityName: string): Promise<WeatherData> {
        if (!this.isAvailable()) {
            throw new Error('WeatherKit is not available on this device');
        }

        try {
            logger.log('🌤️ Fetching weather for city:', cityName);
            const data = await WeatherKitManager.getWeatherByCity(cityName);
            logger.log('✅ Weather data received:', data);
            return data;
        } catch (error) {
            logger.error('❌ WeatherKit city error:', error);
            throw error;
        }
    }

    async clearCache(): Promise<void> {
        if (!this.isAvailable()) {
            return;
        }

        try {
            await WeatherKitManager.clearCache();
            logger.log('🗑️ WeatherKit cache cleared');
        } catch (error) {
            logger.error('Failed to clear WeatherKit cache:', error);
        }
    }

    /**
     * Get temperature recommendation in Hebrew
     */
    getRecommendation(temperature: number): string {
        if (temperature >= 25) return 'חם ☀️ שכבה דקה.';
        if (temperature >= 20) return 'נעים 😎 שכבה ארוכה.';
        if (temperature >= 15) return 'קריר 🍃 שתי שכבות.';
        return 'קר 🥶 לחמם טוב!';
    }
}

export const weatherKitService = new WeatherKitService();
