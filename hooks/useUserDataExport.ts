import { useState } from 'react';
import { Alert } from 'react-native';
import { db, auth } from '../services/firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { logger } from '../utils/logger';

export const useUserDataExport = () => {
    const [isExporting, setIsExporting] = useState(false);

    const exportUserData = async () => {
        const userId = auth.currentUser?.uid;
        if (!userId) {
            Alert.alert('שגיאה', 'משתמש לא מחובר');
            return;
        }

        setIsExporting(true);
        try {
            // 1. Fetch User Data
            const userRef = doc(db, 'users', userId);
            const userSnap = await getDoc(userRef);
            const userData = userSnap.exists() ? userSnap.data() : null;

            // 2. Fetch Families
            // A dynamic approach to finding families where user is member
            const familiesSnap = await getDocs(collection(db, 'families'));
            const families: any[] = [];
            const familyIds: string[] = [];

            familiesSnap.forEach(doc => {
                const data = doc.data();
                if (data.members && data.members[userId]) {
                    families.push({ id: doc.id, ...data });
                    familyIds.push(doc.id);
                }
            });

            // 3. Fetch Babies
            const babies: any[] = [];
            if (familyIds.length > 0) {
                const chunks = [];
                for (let i = 0; i < familyIds.length; i += 10) {
                    chunks.push(familyIds.slice(i, i + 10));
                }

                for (const chunk of chunks) {
                    const babiesQ = query(collection(db, 'babies'), where('familyId', 'in', chunk));
                    const babiesSnap = await getDocs(babiesQ);
                    babiesSnap.forEach(doc => babies.push({ id: doc.id, ...doc.data() }));
                }
            }

            // 4. Fetch Events
            const events: any[] = [];
            for (const baby of babies) {
                const eventsQ = query(collection(db, 'events'), where('childId', '==', baby.id));
                const eventsSnap = await getDocs(eventsQ);
                eventsSnap.forEach(doc => events.push({ id: doc.id, ...doc.data() }));
            }

            // Prepare Export Object
            const exportData = {
                metadata: {
                    exportDate: new Date().toISOString(),
                    userId,
                    appName: 'Calmino',
                },
                user: userData,
                families,
                babies,
                events,
            };

            const jsonString = JSON.stringify(exportData, null, 2);
            const fileUri = `${FileSystem.documentDirectory}calmino_user_data_${userId}.json`;

            await FileSystem.writeAsStringAsync(fileUri, jsonString, {
                encoding: FileSystem.EncodingType.UTF8,
            });

            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
                await Sharing.shareAsync(fileUri, {
                    mimeType: 'application/json',
                    dialogTitle: 'ייצוא נתוני משתמש - Calmino',
                    UTI: 'public.json'
                });
            } else {
                Alert.alert('שגיאה', 'שיתוף קבצים אינו נתמך במכשיר זה');
            }

        } catch (error) {
            logger.error('Error exporting user data:', error);
            Alert.alert('שגיאה', 'אירעה שגיאה בייצוא הנתונים. נסה שוב מאוחר יותר.');
        } finally {
            setIsExporting(false);
        }
    };

    return { exportUserData, isExporting };
};
