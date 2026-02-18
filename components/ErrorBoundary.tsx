import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';
import { LanguageContext } from '../context/LanguageContext';
import Constants from 'expo-constants';
import { logger } from '../utils/logger';

// Crashlytics temporarily disabled
let crashlytics: any = null;

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component that catches JavaScript errors anywhere in the child component tree.
 * Displays a fallback UI instead of crashing the entire app.
 */
class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI
        return {
            hasError: true,
            error,
            errorInfo: null,
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        // Log error to console in DEV only
        if (__DEV__) {
            logger.log('🚨 ErrorBoundary caught an error:', error);
            logger.log('Component stack:', errorInfo.componentStack);
        }

        this.setState({
            error,
            errorInfo,
        });

        // Send to Firebase Crashlytics in production (only if available)
        if (!__DEV__ && Platform.OS !== 'web' && crashlytics) {
            try {
                crashlytics().recordError(error);
                crashlytics().log('ErrorBoundary caught error');
                crashlytics().setAttribute('componentStack', errorInfo.componentStack || '');
                crashlytics().setAttribute('errorMessage', error.message || '');
            } catch (crashlyticsError) {
                // Silently fail if Crashlytics is not available
                if (__DEV__) {
                    logger.log('Crashlytics error:', crashlyticsError);
                }
            }
        }
    }

    handleRetry = (): void => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    render(): ReactNode {
        if (this.state.hasError) {
            // Custom fallback UI
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <SafeAreaView style={styles.container}>
                    <View style={styles.content}>
                        <View style={styles.iconContainer}>
                            <AlertTriangle size={48} color="#EF4444" />
                        </View>

                        <LanguageContext.Consumer>
                            {(context) => {
                                // Fallback translation function if context is missing
                                const safeT = (key: string) => {
                                    if (context?.t) return context.t(key);
                                    // Simple fallback for critical error messages
                                    const fallbacks: Record<string, string> = {
                                        'errors.somethingWentWrong': 'Something went wrong',
                                        'errors.unexpectedError': 'An unexpected error occurred.',
                                        'errors.errorDetails': 'Error Details:',
                                        'errors.tryAgain': 'Try Again'
                                    };
                                    return fallbacks[key] || key;
                                };

                                return (
                                    <>
                                        <Text style={styles.title}>{safeT('errors.somethingWentWrong')}</Text>
                                        <Text style={styles.message}>
                                            {safeT('errors.unexpectedError')}
                                        </Text>

                                        {this.state.error && (
                                            <View style={styles.errorDetails}>
                                                <Text style={styles.errorTitle}>{safeT('errors.errorDetails')}</Text>
                                                <Text style={styles.errorText}>
                                                    {this.state.error.toString()}
                                                </Text>
                                            </View>
                                        )}

                                        <TouchableOpacity
                                            style={styles.retryButton}
                                            onPress={this.handleRetry}
                                            activeOpacity={0.8}
                                        >
                                            <RefreshCw size={20} color="#fff" />
                                            <Text style={styles.retryButtonText}>{safeT('errors.tryAgain')}</Text>
                                        </TouchableOpacity>
                                    </>
                                );
                            }}
                        </LanguageContext.Consumer>
                    </View>
                </SafeAreaView>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FEF2F2',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FEE2E2',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 24,
    },
    errorDetails: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        width: '100%',
        maxHeight: 150,
    },
    errorTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#EF4444',
        marginBottom: 8,
    },
    errorText: {
        fontSize: 11,
        color: '#374151',
        fontFamily: 'monospace',
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#6366F1',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default ErrorBoundary;
