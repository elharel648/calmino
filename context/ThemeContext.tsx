import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db } from '../services/firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// --- צבעים ---
export const COLORS = {
    light: {
        background: '#FFFFFF',
        card: '#FFFFFF',
        cardSecondary: '#F5F3FF',
        textPrimary: '#000000',
        textSecondary: '#6B7280',
        textTertiary: '#9CA3AF',
        divider: '#EDE9FE',
        border: '#EDE9FE',
        danger: '#EF4444',
        success: '#10B981',
        successLight: '#D1FAE5',
        warning: '#F59E0B',
        primary: '#8B5CF6',
        primaryLight: '#EDE9FE',
        accent: '#A78BFA',
        // Specific UI elements
        headerGradient: ['#A78BFA', '#C4B5FD'] as [string, string],
        tabBar: '#FFFFFF',
        tabBarBorder: '#EDE9FE',
        inputBackground: '#F5F3FF',
        modalOverlay: 'rgba(0,0,0,0.5)',
        shadow: '#000000',
        // Shadow colors for dynamic shadows
        shadowColor: '#000000',
        // Additional UI colors for HealthCard
        placeholder: '#9CA3AF',
        iconSecondary: '#6B7280',
        cardBackground: '#F9FAFB',
        cardBorder: '#E5E7EB',
        inputBorder: '#E5E7EB',
        checkboxBorder: '#D1D5DB',
    },
    dark: {
        background: '#0F0F0F',
        card: '#1C1C1E',
        cardSecondary: '#2C2C2E',
        textPrimary: '#FFFFFF',
        textSecondary: '#AEAEB2',
        textTertiary: '#8E8E93',
        divider: '#38383A',
        border: '#38383A',
        danger: '#FF453A',
        success: '#30D158',
        successLight: 'rgba(48, 209, 88, 0.2)',
        warning: '#FFD60A',
        primary: '#8B5CF6',
        primaryLight: '#3A2E5C',
        accent: '#A78BFA',
        // Specific UI elements
        headerGradient: ['#1C1C1E', '#2C2C2E'] as [string, string],
        tabBar: '#1C1C1E',
        tabBarBorder: '#38383A',
        inputBackground: '#2C2C2E',
        modalOverlay: 'rgba(0,0,0,0.7)',
        shadow: '#000000',
        // Shadow colors for dynamic shadows
        shadowColor: '#000000',
        // Additional UI colors for HealthCard
        placeholder: '#6E6E73',
        iconSecondary: '#8E8E93',
        cardBackground: '#2C2C2E',
        cardBorder: '#38383A',
        inputBorder: '#38383A',
        checkboxBorder: '#48484A',
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

    // Load theme preference from Firebase on mount
    useEffect(() => {
        loadThemePreference();
    }, []);

    const loadThemePreference = async () => {
        try {
            const user = auth.currentUser;
            if (user) {
                const userRef = doc(db, 'users', user.uid);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    const settings = userSnap.data().settings;
                    if (settings?.isDarkMode !== undefined) {
                        setIsDarkMode(settings.isDarkMode);
                    }
                }
            }
        } catch (error) {
            if (__DEV__) console.log('Error loading theme preference:', error);
        }
    };

    const saveThemePreference = async (value: boolean) => {
        try {
            const user = auth.currentUser;
            if (user) {
                const userRef = doc(db, 'users', user.uid);
                await setDoc(userRef, { settings: { isDarkMode: value } }, { merge: true });
            }
        } catch (error) {
            if (__DEV__) console.log('Error saving theme preference:', error);
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

    return (
        <ThemeContext.Provider value={{ isDarkMode, theme, toggleTheme, setDarkMode }}>
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
