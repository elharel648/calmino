import { logger } from '../utils/logger';
import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { auth, db } from '../services/firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_CACHE_KEY = '@calmino_dark_mode';

// --- צבעים ---
export const COLORS = {
    light: {
        background: '#F5F7FA', // Premium subtle off-white
        card: '#FFFFFF',
        cardSecondary: '#F2F2F7',
        textPrimary: '#000000',
        textSecondary: '#8E8E93',
        textTertiary: '#AEAEB2',
        divider: '#E5E5EA',
        border: '#E5E5EA',
        danger: '#FF3B30',
        success: '#34C759',
        successLight: 'rgba(52, 199, 89, 0.12)',
        warning: '#FF9500',
        primary: '#007AFF',
        primaryLight: 'rgba(0, 122, 255, 0.12)',
        accent: '#34D399',
        accentLight: 'rgba(52, 211, 153, 0.10)',
        // Specific UI elements
        headerGradient: ['#FFFFFF', '#FFFFFF'] as [string, string],
        tabBar: '#FFFFFF',
        tabBarBorder: '#E5E5EA',
        inputBackground: '#F2F2F7',
        modalOverlay: 'rgba(0,0,0,0.5)',
        shadow: '#000000',
        // Shadow colors for dynamic shadows
        shadowColor: '#000000',
        // Action colors for Quick Actions - white bg, dark icon, category accentColor for live states
        actionColors: {
            food: { color: 'rgba(0,0,0,0.65)', lightColor: '#FFFFFF', accentColor: '#F59E0B' },
            sleep: { color: 'rgba(0,0,0,0.65)', lightColor: '#FFFFFF', accentColor: '#8B5CF6' },
            diaper: { color: 'rgba(0,0,0,0.65)', lightColor: '#FFFFFF', accentColor: '#3B82F6' },
            supplements: { color: 'rgba(0,0,0,0.65)', lightColor: '#FFFFFF', accentColor: '#34C759' },
            whiteNoise: { color: 'rgba(0,0,0,0.65)', lightColor: '#FFFFFF', accentColor: '#14B8A6' },
            sos: { color: 'rgba(0,0,0,0.65)', lightColor: '#FFFFFF', accentColor: '#FF3B30' },
            custom: { color: 'rgba(0,0,0,0.65)', lightColor: '#FFFFFF', accentColor: '#8E8E93' },
            health: { color: 'rgba(0,0,0,0.65)', lightColor: '#FFFFFF', accentColor: '#14B8A6' }, // Updated to Teal
            growth: { color: 'rgba(0,0,0,0.65)', lightColor: '#FFFFFF', accentColor: '#10B981' }, // Updated to Green
            milestones: { color: 'rgba(0,0,0,0.65)', lightColor: '#FFFFFF', accentColor: '#D97706' },
            magicMoments: { color: 'rgba(0,0,0,0.65)', lightColor: '#FFFFFF', accentColor: '#BF5AF2' },
            tools: { color: 'rgba(0,0,0,0.65)', lightColor: '#FFFFFF', accentColor: '#8E8E93' },
            teeth: { color: 'rgba(0,0,0,0.65)', lightColor: '#FFFFFF', accentColor: '#EC4899' }, // Updated to Pink
            nightLight: { color: 'rgba(0,0,0,0.65)', lightColor: '#FFFFFF', accentColor: '#F59E0B' },
            quickReminder: { color: 'rgba(0,0,0,0.65)', lightColor: '#FFFFFF', accentColor: '#007AFF' },
        },
    },
    dark: {
        background: '#0F0F0F',
        card: '#1C1C1E',
        cardSecondary: '#2C2C2E',
        textPrimary: '#FFFFFF',
        textSecondary: '#AEAEB2',
        textTertiary: '#A8A8AD',
        divider: '#48484A',
        border: '#48484A',
        danger: '#FF453A',
        success: '#30D158',
        successLight: 'rgba(48, 209, 88, 0.2)',
        warning: '#FFD60A',
        primary: '#0A84FF',
        primaryLight: 'rgba(10, 132, 255, 0.2)',
        accent: '#6EE7B7',
        accentLight: 'rgba(110, 231, 183, 0.15)',
        // Specific UI elements
        headerGradient: ['#1C1C1E', '#2C2C2E'] as [string, string],
        tabBar: '#1C1C1E',
        tabBarBorder: '#38383A',
        inputBackground: '#2C2C2E',
        modalOverlay: 'rgba(0,0,0,0.7)',
        shadow: '#000000',
        // Shadow colors for dynamic shadows
        shadowColor: '#000000',
        // Action colors for Quick Actions - Dark Mode (white icon, dark bg, vivid accent)
        actionColors: {
            food: { color: 'rgba(255,255,255,0.85)', lightColor: 'rgba(255,255,255,0.08)', accentColor: '#FBBF24' },
            sleep: { color: 'rgba(255,255,255,0.85)', lightColor: 'rgba(255,255,255,0.08)', accentColor: '#A78BFA' },
            diaper: { color: 'rgba(255,255,255,0.85)', lightColor: 'rgba(255,255,255,0.08)', accentColor: '#60A5FA' },
            supplements: { color: 'rgba(255,255,255,0.85)', lightColor: 'rgba(255,255,255,0.08)', accentColor: '#34D158' },
            whiteNoise: { color: 'rgba(255,255,255,0.85)', lightColor: 'rgba(255,255,255,0.08)', accentColor: '#2DD4BF' },
            sos: { color: 'rgba(255,255,255,0.85)', lightColor: 'rgba(255,255,255,0.08)', accentColor: '#FF6B6B' },
            custom: { color: 'rgba(255,255,255,0.85)', lightColor: 'rgba(255,255,255,0.08)', accentColor: '#A8A8AD' },
            health: { color: 'rgba(255,255,255,0.85)', lightColor: 'rgba(255,255,255,0.08)', accentColor: '#2DD4BF' }, // Teal
            growth: { color: 'rgba(255,255,255,0.85)', lightColor: 'rgba(255,255,255,0.08)', accentColor: '#34D158' }, // Green
            milestones: { color: 'rgba(255,255,255,0.85)', lightColor: 'rgba(255,255,255,0.08)', accentColor: '#FFD060' },
            magicMoments: { color: 'rgba(255,255,255,0.85)', lightColor: 'rgba(255,255,255,0.08)', accentColor: '#D08EF5' },
            tools: { color: 'rgba(255,255,255,0.85)', lightColor: 'rgba(255,255,255,0.08)', accentColor: '#A8A8AD' },
            teeth: { color: 'rgba(255,255,255,0.85)', lightColor: 'rgba(255,255,255,0.08)', accentColor: '#EC4899' }, // Pink
            nightLight: { color: 'rgba(255,255,255,0.85)', lightColor: 'rgba(255,255,255,0.08)', accentColor: '#FBBF24' },
            quickReminder: { color: 'rgba(255,255,255,0.85)', lightColor: 'rgba(255,255,255,0.08)', accentColor: '#60A5FA' },
        },
    }
};

export type Theme = typeof COLORS.light;
export type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
    isDarkMode: boolean;
    theme: Theme;
    toggleTheme: () => void;
    setDarkMode: (value: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const [isDarkMode, setIsDarkMode] = useState(false);

    // Load theme preference — AsyncStorage first (instant), then Firestore (sync)
    useEffect(() => {
        loadThemePreference();
    }, []);

    const loadThemePreference = async () => {
        try {
            // 1. Load from AsyncStorage immediately (synchronous-like, no network)
            const cached = await AsyncStorage.getItem(THEME_CACHE_KEY);
            if (cached !== null) {
                setIsDarkMode(cached === 'true');
            }

            // 2. Sync from Firestore in background
            const user = auth.currentUser;
            if (user) {
                const userRef = doc(db, 'users', user.uid);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    const settings = userSnap.data().settings;
                    if (settings?.isDarkMode !== undefined) {
                        setIsDarkMode(settings.isDarkMode);
                        await AsyncStorage.setItem(THEME_CACHE_KEY, String(settings.isDarkMode));
                    }
                }
            }
        } catch (error) {
            logger.log('Error loading theme preference:', error);
        }
    };

    const saveThemePreference = async (value: boolean) => {
        try {
            // Save to AsyncStorage immediately so next launch is instant
            await AsyncStorage.setItem(THEME_CACHE_KEY, String(value));
            const user = auth.currentUser;
            if (user) {
                const userRef = doc(db, 'users', user.uid);
                await setDoc(userRef, { settings: { isDarkMode: value } }, { merge: true });
            }
        } catch (error) {
            logger.log('Error saving theme preference:', error);
        }
    };

    const toggleTheme = () => {
        const newValue = !isDarkMode;
        setIsDarkMode(newValue);
        saveThemePreference(newValue);
    };

    const setDarkMode = (value: boolean) => {
        setIsDarkMode(value);
        saveThemePreference(value);
    };

    const theme = isDarkMode ? COLORS.dark : COLORS.light;

    const contextValue = useMemo(() => ({
        isDarkMode,
        theme,
        toggleTheme,
        setDarkMode
    }), [isDarkMode, theme]);

    return (
        <ThemeContext.Provider value={contextValue}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export default ThemeContext;
