import { logger } from '../utils/logger';
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
        // Action colors for Quick Actions
        actionColors: {
            food: { color: '#FF9F1C', lightColor: 'rgba(255, 159, 28, 0.08)' },
            sleep: { color: '#9F7AEA', lightColor: 'rgba(139, 92, 246, 0.08)' },
            diaper: { color: '#34D399', lightColor: 'rgba(52, 211, 153, 0.08)' },
            supplements: { color: '#3B82F6', lightColor: 'rgba(59, 130, 246, 0.08)' },
            whiteNoise: { color: '#A78BFA', lightColor: 'rgba(167, 139, 250, 0.08)' },
            sos: { color: '#F87171', lightColor: 'rgba(248, 113, 113, 0.08)' },
            custom: { color: '#64748B', lightColor: 'rgba(148, 163, 184, 0.08)' },
            health: { color: '#2DD4BF', lightColor: 'rgba(45, 212, 191, 0.08)' },
            growth: { color: '#34D399', lightColor: 'rgba(52, 211, 153, 0.08)' },
            milestones: { color: '#FF9F1C', lightColor: 'rgba(255, 159, 28, 0.08)' },
            magicMoments: { color: '#A78BFA', lightColor: 'rgba(167, 139, 250, 0.08)' },
            tools: { color: '#9F7AEA', lightColor: 'rgba(139, 92, 246, 0.08)' },
            teeth: { color: '#EC4899', lightColor: 'rgba(236, 72, 153, 0.08)' },
            nightLight: { color: '#FF9F1C', lightColor: 'rgba(255, 159, 28, 0.08)' },
            quickReminder: { color: '#64748B', lightColor: 'rgba(148, 163, 184, 0.08)' },
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
        // Action colors for Quick Actions (Dark Mode optimized)
        actionColors: {
            food: { color: '#FFB84D', lightColor: 'rgba(255, 184, 77, 0.12)' },
            sleep: { color: '#A78BFA', lightColor: 'rgba(167, 139, 250, 0.12)' },
            diaper: { color: '#6EE7B7', lightColor: 'rgba(110, 231, 183, 0.12)' },
            supplements: { color: '#60A5FA', lightColor: 'rgba(96, 165, 250, 0.12)' },
            whiteNoise: { color: '#C4B5FD', lightColor: 'rgba(196, 181, 253, 0.12)' },
            sos: { color: '#FCA5A5', lightColor: 'rgba(252, 165, 165, 0.12)' },
            custom: { color: '#94A3B8', lightColor: 'rgba(148, 163, 184, 0.12)' },
            health: { color: '#5EEAD4', lightColor: 'rgba(94, 234, 212, 0.12)' },
            growth: { color: '#6EE7B7', lightColor: 'rgba(110, 231, 183, 0.12)' },
            milestones: { color: '#FFB84D', lightColor: 'rgba(255, 184, 77, 0.12)' },
            magicMoments: { color: '#C4B5FD', lightColor: 'rgba(196, 181, 253, 0.12)' },
            tools: { color: '#A78BFA', lightColor: 'rgba(167, 139, 250, 0.12)' },
            teeth: { color: '#F9A8D4', lightColor: 'rgba(249, 168, 212, 0.12)' },
            nightLight: { color: '#FFB84D', lightColor: 'rgba(255, 184, 77, 0.12)' },
            quickReminder: { color: '#94A3B8', lightColor: 'rgba(148, 163, 184, 0.12)' },
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
            logger.log('Error loading theme preference:', error);
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
