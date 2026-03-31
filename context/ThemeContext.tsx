import { logger } from '../utils/logger';
import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { auth, db } from '../services/firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from './/LanguageContext';

const THEME_CACHE_KEY = '@calmino_dark_mode';
const THEME_MODE_KEY = '@calmino_theme_mode'; // 'auto' | 'manual'

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
        // Action colors for Quick Actions - Functional Minimalism (Soft category bg tint, solid category icon)
        actionColors: {
            food: { color: '#F59E0B', lightColor: 'rgba(245, 158, 11, 0.12)', accentColor: '#F59E0B' },
            sleep: { color: '#8B5CF6', lightColor: 'rgba(139, 92, 246, 0.12)', accentColor: '#8B5CF6' },
            diaper: { color: '#34C759', lightColor: 'rgba(52, 199, 89, 0.12)', accentColor: '#34C759' },
            supplements: { color: '#FF6B6B', lightColor: 'rgba(255, 107, 107, 0.12)', accentColor: '#FF6B6B' },
            whiteNoise: { color: '#14B8A6', lightColor: 'rgba(20, 184, 166, 0.12)', accentColor: '#14B8A6' },
            sos: { color: '#FF3B30', lightColor: 'rgba(255, 59, 48, 0.12)', accentColor: '#FF3B30' },
            custom: { color: '#8E8E93', lightColor: 'rgba(142, 142, 147, 0.12)', accentColor: '#8E8E93' },
            health: { color: '#14B8A6', lightColor: 'rgba(20, 184, 166, 0.12)', accentColor: '#14B8A6' },
            growth: { color: '#10B981', lightColor: 'rgba(16, 185, 129, 0.12)', accentColor: '#10B981' },
            milestones: { color: '#D97706', lightColor: 'rgba(217, 119, 6, 0.12)', accentColor: '#D97706' },
            magicMoments: { color: '#BF5AF2', lightColor: 'rgba(191, 90, 242, 0.12)', accentColor: '#BF5AF2' },
            tools: { color: '#8E8E93', lightColor: 'rgba(142, 142, 147, 0.12)', accentColor: '#8E8E93' },
            teeth: { color: '#EC4899', lightColor: 'rgba(236, 72, 153, 0.12)', accentColor: '#EC4899' },
            nightLight: { color: '#F59E0B', lightColor: 'rgba(245, 158, 11, 0.12)', accentColor: '#F59E0B' },
            quickReminder: { color: '#007AFF', lightColor: 'rgba(0, 122, 255, 0.12)', accentColor: '#007AFF' },
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
        // Action colors for Quick Actions - Functional Minimalism
        actionColors: {
            food: { color: '#FBBF24', lightColor: 'rgba(251, 191, 36, 0.22)', accentColor: '#FBBF24' },
            sleep: { color: '#A78BFA', lightColor: 'rgba(167, 139, 250, 0.22)', accentColor: '#A78BFA' },
            diaper: { color: '#34D158', lightColor: 'rgba(52, 209, 88, 0.22)', accentColor: '#34D158' },
            supplements: { color: '#FF6B6B', lightColor: 'rgba(255, 107, 107, 0.22)', accentColor: '#FF6B6B' },
            whiteNoise: { color: '#2DD4BF', lightColor: 'rgba(45, 212, 191, 0.22)', accentColor: '#2DD4BF' },
            sos: { color: '#FF6B6B', lightColor: 'rgba(255, 107, 107, 0.22)', accentColor: '#FF6B6B' },
            custom: { color: '#A8A8AD', lightColor: 'rgba(168, 168, 173, 0.22)', accentColor: '#A8A8AD' },
            health: { color: '#2DD4BF', lightColor: 'rgba(45, 212, 191, 0.22)', accentColor: '#2DD4BF' },
            growth: { color: '#34D158', lightColor: 'rgba(52, 209, 88, 0.22)', accentColor: '#34D158' },
            milestones: { color: '#FFD060', lightColor: 'rgba(255, 208, 96, 0.22)', accentColor: '#FFD060' },
            magicMoments: { color: '#D08EF5', lightColor: 'rgba(208, 142, 245, 0.22)', accentColor: '#D08EF5' },
            tools: { color: '#A8A8AD', lightColor: 'rgba(168, 168, 173, 0.22)', accentColor: '#A8A8AD' },
            teeth: { color: '#EC4899', lightColor: 'rgba(236, 72, 153, 0.22)', accentColor: '#EC4899' },
            nightLight: { color: '#FBBF24', lightColor: 'rgba(251, 191, 36, 0.22)', accentColor: '#FBBF24' },
            quickReminder: { color: '#60A5FA', lightColor: 'rgba(96, 165, 250, 0.22)', accentColor: '#60A5FA' },
        },
    }
};

export type Theme = typeof COLORS.light;
export type ThemeMode = 'light' | 'dark';

export type ThemePreference = 'auto' | 'light' | 'dark';

interface ThemeContextType {
    isDarkMode: boolean;
    theme: Theme;
    themePreference: ThemePreference;
    toggleTheme: () => void;
    setDarkMode: (value: boolean) => void;
    setThemePreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const { t } = useLanguage();
    const systemColorScheme = useColorScheme();
    const [themePreference, setThemePreferenceState] = useState<ThemePreference>('auto');
    const [manualDarkMode, setManualDarkMode] = useState(false);

    // Resolve actual dark mode based on preference
    const isDarkMode = themePreference === 'auto'
        ? systemColorScheme === 'dark'
        : themePreference === 'dark';

    // Load theme preference — AsyncStorage first (instant), then Firestore (sync)
    useEffect(() => {
        loadThemePreference();
    }, []);

    const loadThemePreference = async () => {
        try {
            // 1. Load from AsyncStorage immediately
            const [cachedMode, cachedPref] = await Promise.all([
                AsyncStorage.getItem(THEME_CACHE_KEY),
                AsyncStorage.getItem(THEME_MODE_KEY),
            ]);

            if (cachedPref !== null) {
                setThemePreferenceState(cachedPref as ThemePreference);
            }
            if (cachedMode !== null) {
                setManualDarkMode(cachedMode === 'true');
            }

            // 2. Sync from Firestore in background
            const user = auth.currentUser;
            if (user) {
                const userRef = doc(db, 'users', user.uid);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    const settings = userSnap.data().settings;
                    if (settings?.themePreference !== undefined) {
                        setThemePreferenceState(settings.themePreference);
                        await AsyncStorage.setItem(THEME_MODE_KEY, settings.themePreference);
                    }
                    if (settings?.isDarkMode !== undefined) {
                        setManualDarkMode(settings.isDarkMode);
                        await AsyncStorage.setItem(THEME_CACHE_KEY, String(settings.isDarkMode));
                    }
                }
            }
        } catch (error) {
            logger.log('Error loading theme preference:', error);
        }
    };

    const saveThemeToStorage = async (darkValue: boolean, pref: ThemePreference) => {
        try {
            await Promise.all([
                AsyncStorage.setItem(THEME_CACHE_KEY, String(darkValue)),
                AsyncStorage.setItem(THEME_MODE_KEY, pref),
            ]);
            const user = auth.currentUser;
            if (user) {
                const userRef = doc(db, 'users', user.uid);
                await setDoc(userRef, { settings: { isDarkMode: darkValue, themePreference: pref } }, { merge: true });
            }
        } catch (error) {
            logger.log('Error saving theme preference:', error);
        }
    };

    const setThemePreference = (pref: ThemePreference) => {
        setThemePreferenceState(pref);
        const newDark = pref === 'auto' ? systemColorScheme === 'dark' : pref === 'dark';
        setManualDarkMode(newDark);
        saveThemeToStorage(newDark, pref);
    };

    const toggleTheme = () => {
        // When toggling manually, switch to explicit light/dark
        const newDark = !isDarkMode;
        setManualDarkMode(newDark);
        const newPref: ThemePreference = newDark ? 'dark' : 'light';
        setThemePreferenceState(newPref);
        saveThemeToStorage(newDark, newPref);
    };

    const setDarkMode = (value: boolean) => {
        setManualDarkMode(value);
        const newPref: ThemePreference = value ? 'dark' : 'light';
        setThemePreferenceState(newPref);
        saveThemeToStorage(value, newPref);
    };

    const theme = isDarkMode ? COLORS.dark : COLORS.light;

    const contextValue = useMemo(() => ({
        isDarkMode,
        theme,
        themePreference,
        toggleTheme,
        setDarkMode,
        setThemePreference,
    }), [isDarkMode, theme, themePreference]);

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
