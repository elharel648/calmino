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
        background: '#F8F6F4', // Warm off-white — premium Apple Health feel
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
        primary: '#C8806A',
        primaryLight: 'rgba(200, 128, 106, 0.12)',
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
        // Action colors for Quick Actions - Exact 'Structured' App Muted Earth Palette
        actionColors: {
            food:          { color: '#D4A373', lightColor: 'rgba(212, 163, 115, 0.15)', accentColor: '#D4A373' }, // Muted Mustard
            sleep:         { color: '#4A6572', lightColor: 'rgba(74, 101, 114, 0.15)', accentColor: '#4A6572' }, // Muted Navy
            diaper:        { color: '#6A9C89', lightColor: 'rgba(106, 156, 137, 0.15)', accentColor: '#6A9C89' }, // Sage Teal
            supplements:   { color: '#B5838D', lightColor: 'rgba(181, 131, 141, 0.15)', accentColor: '#B5838D' }, // Lilac Mauve
            whiteNoise:    { color: '#557A9D', lightColor: 'rgba(85, 122, 157, 0.15)', accentColor: '#557A9D' }, // Slate Blue
            sos:           { color: '#CD8B87', lightColor: 'rgba(205, 139, 135, 0.15)', accentColor: '#CD8B87' }, // Dusty Rose
            custom:        { color: '#A5A58D', lightColor: 'rgba(165, 165, 141, 0.15)', accentColor: '#A5A58D' }, // Soft Stone
            health:        { color: '#8EB168', lightColor: 'rgba(142, 177, 104, 0.15)', accentColor: '#8EB168' }, // Soft Olive
            growth:        { color: '#83C5BE', lightColor: 'rgba(131, 197, 190, 0.15)', accentColor: '#83C5BE' }, // Muted Teal
            milestones:    { color: '#D4A373', lightColor: 'rgba(212, 163, 115, 0.15)', accentColor: '#D4A373' }, // Muted Mustard
            magicMoments:  { color: '#8D4A60', lightColor: 'rgba(141, 74, 96, 0.15)', accentColor: '#8D4A60' }, // Wine/Maroon
            tools:         { color: '#557A9D', lightColor: 'rgba(85, 122, 157, 0.15)', accentColor: '#557A9D' }, // Slate Blue
            teeth:         { color: '#8ECAE6', lightColor: 'rgba(142, 202, 230, 0.15)', accentColor: '#8ECAE6' }, // Soft Sky Blue
            nightLight:    { color: '#E9C46A', lightColor: 'rgba(233, 196, 106, 0.15)', accentColor: '#E9C46A' }, // Soft Sand
            quickReminder: { color: '#A29BFE', lightColor: 'rgba(162, 155, 254, 0.15)', accentColor: '#A29BFE' }, // Pastel Purple
            breastfeeding: { color: '#B5838D', lightColor: 'rgba(181, 131, 141, 0.15)', accentColor: '#B5838D' }, // Lilac Mauve
            bottle:        { color: '#D4A373', lightColor: 'rgba(212, 163, 115, 0.15)', accentColor: '#D4A373' }, // Muted Mustard
            pumping:       { color: '#83C5BE', lightColor: 'rgba(131, 197, 190, 0.15)', accentColor: '#83C5BE' }, // Muted Teal
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
        primary: '#C8806A',
        primaryLight: 'rgba(200, 128, 106, 0.2)',
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
        // Action colors for Quick Actions - Exact 'Structured' App Muted Earth Palette
        actionColors: {
            food:          { color: '#D4A373', lightColor: 'rgba(212, 163, 115, 0.22)', accentColor: '#D4A373' },
            sleep:         { color: '#4A6572', lightColor: 'rgba(74, 101, 114, 0.22)', accentColor: '#4A6572' },
            diaper:        { color: '#6A9C89', lightColor: 'rgba(106, 156, 137, 0.22)', accentColor: '#6A9C89' },
            supplements:   { color: '#B5838D', lightColor: 'rgba(181, 131, 141, 0.22)', accentColor: '#B5838D' },
            whiteNoise:    { color: '#557A9D', lightColor: 'rgba(85, 122, 157, 0.22)', accentColor: '#557A9D' },
            sos:           { color: '#CD8B87', lightColor: 'rgba(205, 139, 135, 0.22)', accentColor: '#CD8B87' },
            custom:        { color: '#A5A58D', lightColor: 'rgba(165, 165, 141, 0.22)', accentColor: '#A5A58D' },
            health:        { color: '#8EB168', lightColor: 'rgba(142, 177, 104, 0.22)', accentColor: '#8EB168' },
            growth:        { color: '#83C5BE', lightColor: 'rgba(131, 197, 190, 0.22)', accentColor: '#83C5BE' },
            milestones:    { color: '#D4A373', lightColor: 'rgba(212, 163, 115, 0.22)', accentColor: '#D4A373' },
            magicMoments:  { color: '#8D4A60', lightColor: 'rgba(141, 74, 96, 0.22)', accentColor: '#8D4A60' },
            tools:         { color: '#557A9D', lightColor: 'rgba(85, 122, 157, 0.22)', accentColor: '#557A9D' },
            teeth:         { color: '#8ECAE6', lightColor: 'rgba(142, 202, 230, 0.22)', accentColor: '#8ECAE6' },
            nightLight:    { color: '#E9C46A', lightColor: 'rgba(233, 196, 106, 0.22)', accentColor: '#E9C46A' },
            quickReminder: { color: '#A29BFE', lightColor: 'rgba(162, 155, 254, 0.22)', accentColor: '#A29BFE' },
            breastfeeding: { color: '#B5838D', lightColor: 'rgba(181, 131, 141, 0.22)', accentColor: '#B5838D' },
            bottle:        { color: '#D4A373', lightColor: 'rgba(212, 163, 115, 0.22)', accentColor: '#D4A373' },
            pumping:       { color: '#83C5BE', lightColor: 'rgba(131, 197, 190, 0.22)', accentColor: '#83C5BE' },
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
    }), [isDarkMode, theme, themePreference, systemColorScheme]);

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
