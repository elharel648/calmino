/**
 * ExportTimelineButton - כפתור ייצוא טיימליין ל-PDF למודל Tracking
 */

import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { FileDown } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { exportTimelineToPDF } from '../../services/pdfExportService';
import { useActiveChild } from '../../context/ActiveChildContext';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export default function ExportTimelineButton() {
    const { theme } = useTheme();
    const { t } = useLanguage();
    const { activeChild } = useActiveChild();
    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        if (!activeChild?.childId || !activeChild?.childName) {
            Alert.alert(t('common.error'), 'לא נמצא ילד פעיל');
            return;
        }

        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        setExporting(true);

        try {
            // Export last 7 days by default
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 7);

            const success = await exportTimelineToPDF({
                childId: activeChild.childId,
                childName: activeChild.childName,
                startDate,
                endDate,
                includeGrowth: true,
            });

            if (success) {
                Alert.alert('הצלחה!', 'הדוח יוצא בהצלחה');
            } else {
                Alert.alert(t('common.error'), 'לא הצלחנו לייצא את הדוח');
            }
        } catch (error) {
            Alert.alert(t('common.error'), 'משהו השתבש בייצוא');
        } finally {
            setExporting(false);
        }
    };

    return (
        <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.primary }]}
            onPress={handleExport}
            disabled={exporting}
            activeOpacity={0.8}
        >
            {exporting ? (
                <ActivityIndicator size="small" color="#FFF" />
            ) : (
                <>
                    <FileDown size={18} color="#FFF" strokeWidth={2} />
                    <Text style={styles.buttonText}>ייצא PDF לרופא</Text>
                </>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        gap: 8,
        marginTop: 16,
    },
    buttonText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '600',
    },
});
