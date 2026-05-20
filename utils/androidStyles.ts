import { Platform } from 'react-native';

/**
 * On Android, elevation adds a Material Design gray overlay to white backgrounds.
 * Use this instead of raw elevation to get clean white cards on both platforms.
 */
export const cardShadow = (elevation = 3, shadowColor = '#000') =>
  Platform.OS === 'android'
    ? { elevation: 0, borderWidth: 1, borderColor: 'rgba(0,0,0,0.07)' }
    : {
        shadowColor,
        shadowOffset: { width: 0, height: elevation * 1.5 },
        shadowOpacity: 0.06 + elevation * 0.02,
        shadowRadius: elevation * 3,
        elevation: 0,
      };

/**
 * iOS uses #F2F2F7 (system gray 6) for picker backgrounds.
 * On Android this looks muddy — use a near-white instead.
 */
export const pickerBg = (isDark = false) =>
  isDark
    ? 'rgba(255,255,255,0.08)'
    : Platform.OS === 'android'
    ? '#F8F8F8'
    : '#F2F2F7';

/**
 * Drop elevation completely on Android (for colored buttons/FABs that already
 * have a background — no gray tint needed, keep iOS shadow).
 */
export const buttonShadow = (color: string, elevation = 4) =>
  Platform.OS === 'android'
    ? { elevation: 0 }
    : {
        shadowColor: color,
        shadowOffset: { width: 0, height: elevation },
        shadowOpacity: 0.3,
        shadowRadius: elevation * 2,
      };
