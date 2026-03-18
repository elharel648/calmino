import React, { createContext, useContext, ReactNode, useRef } from 'react';
import { Animated } from 'react-native';

interface ScrollTrackingContextType {
    scrollY: Animated.Value;
    scrollX: Animated.Value;
    gestureX: Animated.Value;
    gestureY: Animated.Value;
}

const ScrollTrackingContext = createContext<ScrollTrackingContextType | null>(null);

export function ScrollTrackingProvider({ children }: { children: ReactNode }) {
    const scrollY = useRef(new Animated.Value(0)).current;
    const scrollX = useRef(new Animated.Value(0)).current;
    const gestureX = useRef(new Animated.Value(0)).current;
    const gestureY = useRef(new Animated.Value(0)).current;

    return (
        <ScrollTrackingContext.Provider value={{ scrollY, scrollX, gestureX, gestureY }}>
            {children}
        </ScrollTrackingContext.Provider>
    );
}

export function useScrollTracking() {
    const context = useContext(ScrollTrackingContext);
    if (!context) {
        throw new Error('useScrollTracking must be used within ScrollTrackingProvider');
    }
    return context;
}

