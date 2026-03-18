/**
 * Production-safe logger utility
 * Only logs in development mode, errors always logged
 */

export const logger = {
    /**
     * Log debug messages (only in development)
     */
    log: (...args: any[]): void => {
        if (__DEV__) {
            console.log(...args);
        }
    },

    /**
     * Log warnings (only in development)
     */
    warn: (...args: any[]): void => {
        if (__DEV__) {
            console.warn(...args);
        }
    },

    /**
     * Log errors (always logged, even in production)
     */
    error: (...args: any[]): void => {
        // Downgrade Firebase offline errors to warnings
        const isOfflineError = args.some(arg =>
            (typeof arg === 'string' && (arg.includes('offline') || arg.includes('Failed to get document because the client is offline'))) ||
            (arg?.message && (arg.message.includes('offline') || arg.message.includes('Failed to get document because the client is offline'))) ||
            (arg?.code && (arg.code === 'unavailable' || arg.code === 'failed-precondition'))
        );

        if (isOfflineError) {
            console.warn('📶 [Offline]', ...args);
            return;
        }

        console.error(...args);
    },

    /**
     * Log info messages (only in development)
     */
    info: (...args: any[]): void => {
        if (__DEV__) {
            console.info(...args);
        }
    },

    /**
     * Log debug messages with emoji prefix (only in development)
     */
    debug: (emoji: string, ...args: any[]): void => {
        if (__DEV__) {
            console.log(emoji, ...args);
        }
    },
};

