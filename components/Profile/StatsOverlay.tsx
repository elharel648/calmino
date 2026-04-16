import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

interface StatsOverlayProps {
    weight?: string;
    height?: string;
}

const StatsOverlay = memo(({ weight, height }: StatsOverlayProps) => {
    const { t } = useLanguage();
    const { theme, isDarkMode } = useTheme();
    const styles = React.useMemo(() => getStyles(theme, isDarkMode), [theme, isDarkMode]);
    return (
        <View style={styles.container}>
            <View style={styles.statItem}>
                <Text style={styles.statVal}>{weight || '-'} ק״ג</Text>
                <Text style={styles.statLabel}>{t('growth.weight')}</Text>
            </View>
            <View style={styles.verticalLine} />
            <View style={styles.statItem}>
                <Text style={styles.statVal}>{height || '-'} ס״מ</Text>
                <Text style={styles.statLabel}>{t('growth.height')}</Text>
            </View>
        </View>
    );
});

StatsOverlay.displayName = 'StatsOverlay';

const getStyles = (theme: any, isDarkMode: boolean) => StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: -30,
        left: 20,
        right: 20,
        backgroundColor: theme.card,
        borderRadius: 20,
        padding: 15,
        flexDirection: 'row-reverse',
        justifyContent: 'space-around',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 2,
    },
    statItem: {
        alignItems: 'center',
    },
    statVal: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.textPrimary,
    },
    statLabel: {
        fontSize: 12,
        color: theme.textSecondary,
    },
    verticalLine: {
        width: 1,
        height: 30,
        backgroundColor: '#e2e8f0',
    },
});

export default StatsOverlay;
