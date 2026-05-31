import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef, ReactNode } from 'react';
import { LucideIcon } from 'lucide-react-native';

export interface DynamicIslandContent {
    type: 'timer' | 'notification' | 'activity';
    icon?: LucideIcon;
    title: string;
    subtitle?: string;
    color?: string;
    duration?: number;
    onDismiss?: () => void;
}

interface DynamicIslandContextType {
    content: DynamicIslandContent | null;
    isVisible: boolean;
    show: (content: DynamicIslandContent) => void;
    hide: () => void;
    updateContent: (updates: Partial<DynamicIslandContent>) => void;
    onDismiss?: () => void;
}

const DynamicIslandContext = createContext<DynamicIslandContextType | null>(null);

export function DynamicIslandProvider({ children }: { children: ReactNode }) {
    const [content, setContent] = useState<DynamicIslandContent | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    // Track the auto-hide + cleanup timers so we can clear them on unmount
    // and on subsequent show/hide calls (audit MEDIUM crash finding — the
    // previous setTimeouts had no cleanup and could fire on unmounted providers).
    const autoHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const cleanupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const hide = useCallback(() => {
        setIsVisible(false);
        if (cleanupTimerRef.current) clearTimeout(cleanupTimerRef.current);
        cleanupTimerRef.current = setTimeout(() => {
            setContent(null);
            cleanupTimerRef.current = null;
        }, 300); // Wait for animation to complete
    }, []);

    const show = useCallback((newContent: DynamicIslandContent) => {
        setContent(newContent);
        setIsVisible(true);

        // Cancel any prior auto-hide schedule before scheduling a new one
        if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
        // Auto hide if duration is set (0 means don't auto-hide)
        if (newContent.duration && newContent.duration > 0) {
            autoHideTimerRef.current = setTimeout(() => {
                autoHideTimerRef.current = null;
                hide();
            }, newContent.duration);
        }
    }, [hide]);

    // Cancel any in-flight timers on unmount
    useEffect(() => {
        return () => {
            if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
            if (cleanupTimerRef.current) clearTimeout(cleanupTimerRef.current);
        };
    }, []);

    const updateContent = useCallback((updates: Partial<DynamicIslandContent>) => {
        setContent((prev) => {
            if (!prev) return null;
            return { ...prev, ...updates };
        });
    }, []);

    // Memoize the provider value so consumers don't re-render every render
    const contextValue = useMemo(
        () => ({ content, isVisible, show, hide, updateContent, onDismiss: content?.onDismiss }),
        [content, isVisible, show, hide, updateContent]
    );

    return (
        <DynamicIslandContext.Provider value={contextValue}>
            {children}
        </DynamicIslandContext.Provider>
    );
}

export function useDynamicIsland() {
    const context = useContext(DynamicIslandContext);
    if (!context) {
        // Return default values if not in provider (for components that might not have it)
        return {
            content: null,
            isVisible: false,
            show: () => {},
            hide: () => {},
            updateContent: () => {},
            onDismiss: undefined,
        };
    }
    return context;
}

