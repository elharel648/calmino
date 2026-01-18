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

