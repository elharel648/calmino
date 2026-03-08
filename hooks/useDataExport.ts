// hooks/useDataExport.ts
// GDPR Right to Data Portability — Export all user data as JSON

import { useState, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { auth, db } from '../services/firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { logger } from '../utils/logger';

export interface DataExportResult {
    exportData: () => Promise<void>;
    loading: boolean;
}

export function useDataExport(t: (key: string) => string): DataExportResult {
    const [loading, setLoading] = useState(false);

    const exportData = useCallback(async () => {
        const user = auth.currentUser;
        if (!user) return;

        setLoading(true);

        try {
            const userId = user.uid;
            const exportPayload: Record<string, any> = {
                exportDate: new Date().toISOString(),
                userId,
                email: user.email,
                displayName: user.displayName,
            };

            // 1. User profile
            try {
                const userSnap = await getDoc(doc(db, 'users', userId));
                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    // Remove sensitive internal fields
                    const { settings, agreements, ...profile } = userData;
                    exportPayload.profile = profile;
                    exportPayload.settings = settings || {};
                    exportPayload.agreements = agreements || {};
                }
            } catch (e) {
                logger.warn('Export: Could not fetch user profile', e);
            }

            // 2. Babies
            try {
                const babiesQuery = query(
                    collection(db, 'babies'),
                    where('parentId', '==', userId)
                );
                const babiesSnapshot = await getDocs(babiesQuery);
                exportPayload.babies = babiesSnapshot.docs.map(d => ({
                    id: d.id,
                    ...d.data(),
                }));
            } catch (e) {
                logger.warn('Export: Could not fetch babies', e);
            }

            // 3. Events
            try {
                const eventsQuery = query(
                    collection(db, 'events'),
                    where('userId', '==', userId)
                );
                const eventsSnapshot = await getDocs(eventsQuery);
                exportPayload.events = eventsSnapshot.docs.map(d => ({
                    id: d.id,
                    ...d.data(),
                }));
            } catch (e) {
                logger.warn('Export: Could not fetch events', e);
            }

            // 4. Bookings (as parent)
            try {
                const bookingsQuery = query(
                    collection(db, 'bookings'),
                    where('parentId', '==', userId)
                );
                const bookingsSnapshot = await getDocs(bookingsQuery);
                exportPayload.bookings = bookingsSnapshot.docs.map(d => ({
                    id: d.id,
                    ...d.data(),
                }));
            } catch (e) {
                logger.warn('Export: Could not fetch bookings', e);
            }

            // 5. Notifications
            try {
                const notificationsQuery = query(
                    collection(db, 'notifications'),
                    where('userId', '==', userId)
                );
                const notificationsSnapshot = await getDocs(notificationsQuery);
                exportPayload.notifications = notificationsSnapshot.docs.map(d => ({
                    id: d.id,
                    ...d.data(),
                }));
            } catch (e) {
                logger.warn('Export: Could not fetch notifications', e);
            }

            // 6. Sitter profile (if exists)
            try {
                const sitterSnap = await getDoc(doc(db, 'sitters', userId));
                if (sitterSnap.exists()) {
                    exportPayload.sitterProfile = {
                        id: sitterSnap.id,
                        ...sitterSnap.data(),
                    };
                }
            } catch (e) {
                logger.warn('Export: Could not fetch sitter profile', e);
            }

            // Write JSON file
            const jsonString = JSON.stringify(exportPayload, null, 2);
            const fileName = `calmino_data_${new Date().toISOString().split('T')[0]}.json`;
            const filePath = `${FileSystem.cacheDirectory}${fileName}`;

            await FileSystem.writeAsStringAsync(filePath, jsonString, {
                encoding: FileSystem.EncodingType.UTF8,
            });

            // Share the file
            const isAvailable = await Sharing.isAvailableAsync();
            if (isAvailable) {
                await Sharing.shareAsync(filePath, {
                    mimeType: 'application/json',
                    dialogTitle: t('settings.exportData'),
                    UTI: 'public.json',
                });
            } else {
                Alert.alert(t('common.error'), t('settings.exportDataError'));
            }
        } catch (error) {
            logger.error('Export data error:', error);
            Alert.alert(t('common.error'), t('settings.exportDataError'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    return { exportData, loading };
}
