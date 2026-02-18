/**
 * Social Media Utils
 * Utilities for opening social media profiles
 */

import { Linking, Alert, Platform } from 'react-native';

export type SocialPlatform = 'instagram' | 'facebook' | 'linkedin' | 'whatsapp' | 'tiktok' | 'telegram';

/**
 * Open social media profile
 * Tries to open in native app first, falls back to web browser
 */
export const openSocialLink = async (platform: SocialPlatform, username: string) => {
    if (!username || username.trim() === '') {
        Alert.alert('שגיאה', 'לא הוזן שם משתמש');
        return;
    }

    const cleanUsername = username.trim().replace('@', '');
    let appUrl = '';
    let webUrl = '';

    switch (platform) {
        case 'instagram':
            appUrl = `instagram://user?username=${cleanUsername}`;
            webUrl = `https://instagram.com/${cleanUsername}`;
            break;

        case 'facebook':
            // Facebook username or profile ID
            appUrl = `fb://profile/${cleanUsername}`;
            webUrl = `https://facebook.com/${cleanUsername}`;
            break;

        case 'linkedin':
            // LinkedIn requires full URL usually
            webUrl = cleanUsername.startsWith('http')
                ? cleanUsername
                : `https://linkedin.com/in/${cleanUsername}`;
            appUrl = webUrl; // LinkedIn app handles https links
            break;

        case 'whatsapp':
            // WhatsApp requires phone number format: +972501234567
            const phone = cleanUsername.replace(/[^0-9+]/g, '');
            appUrl = `whatsapp://send?phone=${phone}`;
            webUrl = `https://wa.me/${phone}`;
            break;

        case 'tiktok':
            appUrl = `tiktok://user?username=${cleanUsername}`;
            webUrl = `https://tiktok.com/@${cleanUsername}`;
            break;

        case 'telegram':
            appUrl = `tg://resolve?domain=${cleanUsername}`;
            webUrl = `https://t.me/${cleanUsername}`;
            break;

        default:
            Alert.alert('שגיאה', 'פלטפורמה לא נתמכת');
            return;
    }

    try {
        // Try native app first, fall back to web
        if (appUrl !== webUrl) {
            const canOpen = await Linking.canOpenURL(appUrl);
            if (canOpen) {
                await Linking.openURL(appUrl);
                return;
            }
        }
        // Fallback to web browser
        await Linking.openURL(webUrl);
    } catch (error) {
        // If native app failed, try web as last resort
        try {
            await Linking.openURL(webUrl);
        } catch {
            console.error('Error opening social link:', error);
            Alert.alert('שגיאה', 'לא ניתן לפתוח את הקישור');
        }
    }
};

/**
 * Get display name for platform
 */
export const getPlatformName = (platform: SocialPlatform): string => {
    const names: Record<SocialPlatform, string> = {
        instagram: 'Instagram',
        facebook: 'Facebook',
        linkedin: 'LinkedIn',
        whatsapp: 'WhatsApp',
        tiktok: 'TikTok',
        telegram: 'Telegram',
    };
    return names[platform];
};

/**
 * Get icon name for lucide-react-native
 */
export const getPlatformIcon = (platform: SocialPlatform): string => {
    const icons: Record<SocialPlatform, string> = {
        instagram: 'Instagram',
        facebook: 'Facebook',
        linkedin: 'Linkedin',
        whatsapp: 'MessageCircle', // WhatsApp icon not in lucide, use message
        tiktok: 'Music', // TikTok icon not in lucide, use music note
        telegram: 'Send', // Telegram icon not in lucide, use send
    };
    return icons[platform];
};

/**
 * Validate username format for platform
 */
export const validateUsername = (platform: SocialPlatform, username: string): boolean => {
    const trimmed = username.trim();

    if (!trimmed) return false;

    switch (platform) {
        case 'whatsapp':
            // Must be phone number with + and digits
            return /^\+?[0-9]{10,15}$/.test(trimmed.replace(/[^0-9+]/g, ''));

        case 'linkedin':
            // Can be username or full URL
            return trimmed.length > 3;

        default:
            // Username: alphanumeric, underscore, dot (3-30 chars)
            return /^[a-zA-Z0-9_.]{3,30}$/.test(trimmed.replace('@', ''));
    }
};

/**
 * Format username for display
 */
export const formatUsername = (platform: SocialPlatform, username: string): string => {
    const trimmed = username.trim();

    switch (platform) {
        case 'whatsapp':
            return trimmed; // Keep phone as is

        case 'linkedin':
            if (trimmed.startsWith('http')) {
                // Extract username from URL
                const match = trimmed.match(/linkedin\.com\/in\/([^/]+)/);
                return match ? `@${match[1]}` : trimmed;
            }
            return `@${trimmed}`;

        default:
            return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
    }
};
