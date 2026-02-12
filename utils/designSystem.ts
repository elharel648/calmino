/**
 * Design System - CalmParent App
 * 
 * מערכת עיצוב אחידה לכל האפליקצייה
 * כולל: Spacing, Typography, Shadows, Animations, Icons, Border Radius
 */

// ============================================
// SPACING SYSTEM
// ============================================
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  massive: 48,
} as const;

// ============================================
// TYPOGRAPHY SYSTEM
// ============================================
export const TYPOGRAPHY = {
  // Display - Headers גדולים
  display: {
    fontSize: 32,
    fontWeight: '900' as const,
    letterSpacing: -0.5,
    lineHeight: 40,
  },

  // Headers
  h1: {
    fontSize: 28,
    fontWeight: '800' as const,
    letterSpacing: -0.4,
    lineHeight: 36,
  },
  h2: {
    fontSize: 24,
    fontWeight: '800' as const,
    letterSpacing: -0.3,
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  h4: {
    fontSize: 18,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    lineHeight: 24,
  },

  // Body
  body: {
    fontSize: 16,
    fontWeight: '500' as const,
    letterSpacing: -0.2,
    lineHeight: 24,
  },
  bodyLarge: {
    fontSize: 17,
    fontWeight: '500' as const,
    letterSpacing: -0.25,
    lineHeight: 26,
  },
  bodySmall: {
    fontSize: 15,
    fontWeight: '400' as const,
    letterSpacing: -0.2,
    lineHeight: 22,
  },

  // Labels & Captions
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  labelSmall: {
    fontSize: 13,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
    lineHeight: 18,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    letterSpacing: -0.1,
    lineHeight: 16,
  },
  captionSmall: {
    fontSize: 11,
    fontWeight: '400' as const,
    letterSpacing: -0.1,
    lineHeight: 14,
  },

  // Special
  button: {
    fontSize: 16,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  buttonLarge: {
    fontSize: 18,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  buttonSmall: {
    fontSize: 14,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
    lineHeight: 20,
  },
} as const;

// ============================================
// SHADOW SYSTEM
// ============================================
export const SHADOWS = {
  none: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  prominent: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 6,
  },
  // Special shadows for colored elements
  primary: {
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  success: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  warning: {
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  danger: {
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
} as const;

// ============================================
// BORDER RADIUS SYSTEM
// ============================================
export const BORDER_RADIUS = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  xxxl: 24,
  round: 9999,
} as const;

// ============================================
// ICON SIZES
// ============================================
export const ICON_SIZES = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
  xxl: 32,
  xxxl: 40,
} as const;

// ============================================
// ANIMATION SYSTEM
// ============================================
import { FadeInDown, FadeInUp, FadeIn, FadeOut } from 'react-native-reanimated';

// Entry animations - DISABLED per user request
export const ANIMATIONS = {
  // Return undefined to disable animations globally
  fadeInDown: (delay: number = 0, duration: number = 400) => undefined,

  fadeInUp: (delay: number = 0, duration: number = 400) => undefined,

  fadeIn: (delay: number = 0, duration: number = 300) => undefined,

  fadeOut: (duration: number = 200) => undefined,

  // Stagger delays for lists - keep logic but it won't be used for animation
  stagger: (index: number, baseDelay: number = 100) => index * baseDelay,
} as const;

// ============================================
// HAPTIC FEEDBACK SYSTEM
// ============================================
import * as Haptics from 'expo-haptics';

export const HAPTIC = {
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
} as const;

// ============================================
// ACTION COLORS (Specific actions - keep as is)
// ============================================
export const ACTION_COLORS = {
  food: '#F59E0B',
  sleep: '#6366F1',
  diaper: '#10B981',
  supplements: '#EC4899',
  custom: '#8B5CF6',
  whiteNoise: '#0EA5E9',
  health: '#EF4444',
  growth: '#10B981',
  milestones: '#8B5CF6',
  magicMoments: '#EC4899',
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get spacing value
 */
export const getSpacing = (key: keyof typeof SPACING): number => SPACING[key];

/**
 * Get typography style
 */
export const getTypography = (key: keyof typeof TYPOGRAPHY) => TYPOGRAPHY[key];

/**
 * Get shadow style
 */
export const getShadow = (key: keyof typeof SHADOWS) => SHADOWS[key];

/**
 * Get border radius
 */
export const getBorderRadius = (key: keyof typeof BORDER_RADIUS): number => BORDER_RADIUS[key];

/**
 * Get icon size
 */
export const getIconSize = (key: keyof typeof ICON_SIZES): number => ICON_SIZES[key];

/**
 * Get action color
 */
export const getActionColor = (key: keyof typeof ACTION_COLORS): string => ACTION_COLORS[key];

