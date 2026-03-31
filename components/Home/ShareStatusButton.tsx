import React, { memo, useCallback, useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform, Linking, View } from 'react-native';
import { Share2, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

interface ShareStatusButtonProps {
    onShare: () => Promise<void>;
    message?: string;
}

const ShareStatusButton = memo<ShareStatusButtonProps>(({ onShare, message }) => {
    const { theme, isDarkMode } = useTheme();
    const { t } = useLanguage();
    const [showSuccess, setShowSuccess] = useState(false);

    const handlePress = useCallback(async () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        try {
            const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message || 'עדכון מ-Calmino')}`;
            const canOpen = await Linking.canOpenURL(whatsappUrl);

            if (canOpen) {
                await Linking.openURL(whatsappUrl);
                setShowSuccess(true);

                if (Platform.OS !== 'web') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }

                setTimeout(() => setShowSuccess(false), 2000);
            } else {
                await onShare();
            }
        } catch (e) {
            await onShare();
        }
    }, [onShare, message]);

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={handlePress}
            activeOpacity={0.6}
        >
            {showSuccess ? (
                <Check size={14} color={theme.success} strokeWidth={2.5} />
            ) : (
                <Share2 size={14} color={theme.textTertiary} strokeWidth={1.8} />
            )}
            <Text style={[styles.text, { color: showSuccess ? theme.success : theme.textTertiary }]}>
                {showSuccess ? 'נשלח!' : t('export.shareDailySummary')}
            </Text>
        </TouchableOpacity>
    );
});

ShareStatusButton.displayName = 'ShareStatusButton';

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 6,
        marginBottom: 4,
        paddingVertical: 10,
        alignSelf: 'center',
    },
    text: {
        fontSize: 13,
        fontWeight: '500',
        letterSpacing: -0.2,
    },
});

export default ShareStatusButton;
