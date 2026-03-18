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
    const { theme } = useTheme();
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

    const iconColor = showSuccess ? theme.success : '#007AFF';
    const textColor = showSuccess ? theme.success : theme.textSecondary;

    return (
        <TouchableOpacity
            style={[styles.container, { backgroundColor: theme.card }]}
            onPress={handlePress}
            activeOpacity={0.6}
        >
            {showSuccess ? (
                <Check size={15} color={iconColor} strokeWidth={2} />
            ) : (
                <Share2 size={15} color={iconColor} strokeWidth={1.8} />
            )}
            <Text style={[styles.text, { color: textColor }]}>
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
        gap: 8,
        marginTop: 20,
        marginBottom: 16,
        marginHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 16,
        // Floating shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 2,
    },
    text: {
        fontSize: 14,
        fontWeight: '500',
        letterSpacing: -0.2,
    },
});

export default ShareStatusButton;
