import { logger } from '../utils/logger';
import { useState, useCallback, useEffect, useRef } from 'react';
import { Alert, Platform, ActionSheetIOS, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { Timestamp } from 'firebase/firestore';
import { getBabyData, updateBabyData, saveAlbumImage, BabyData, getBabyDataById } from '../services/babyService';
import { uploadAlbumPhoto } from '../services/imageUploadService';
import { GrowthStats } from '../types/profile';

interface UseBabyProfileReturn {
    baby: BabyData | null;
    loading: boolean;
    savingImage: boolean;
    babyAgeMonths: number;
    birthDateObj: Date;
    refresh: () => Promise<void>;
    updatePhoto: (type: 'profile' | 'album', monthIndex?: number) => Promise<void>;
    updateBirthDate: (date: Date) => Promise<void>;
    updateStats: (type: 'weight' | 'height' | 'head', value: string) => Promise<void>;
    updateAllStats: (stats: { weight?: string; height?: string; headCircumference?: string }) => Promise<void>;
    updateBasicInfo: (data: { name: string; gender: 'boy' | 'girl' | 'other'; birthDate: Date }) => Promise<void>;
    updateAlbumNote: (month: number, note: string) => Promise<void>;
    updateAlbumDate: (month: number, date: Date) => Promise<void>;
}

export const useBabyProfile = (childId?: string): UseBabyProfileReturn => {
    const [baby, setBaby] = useState<BabyData | null>(null);
    const [loading, setLoading] = useState(true);
    const [savingImage, setSavingImage] = useState(false);
    const prevChildId = useRef<string | undefined>(childId);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            // If childId is provided, load that specific child's data
            if (childId) {
                const data = await getBabyDataById(childId);
                if (data) setBaby(data);
            } else {
                // Fall back to default behavior
                const data = await getBabyData();
                if (data) setBaby(data);
            }
        } catch (e) {
            logger.error('Error loading baby profile:', e);
        } finally {
            setLoading(false);
        }
    }, [childId]);

    // Reload when childId changes (for live updates when switching children)
    useEffect(() => {
        if (prevChildId.current !== childId) {
            prevChildId.current = childId;
            loadData();
        }
    }, [childId, loadData]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const birthDateObj = baby?.birthDate
        ? new Date(baby.birthDate.seconds * 1000)
        : new Date();

    const babyAgeMonths = Math.floor(
        (new Date().getTime() - birthDateObj.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );

    const updateBirthDate = useCallback(async (date: Date) => {
        if (!baby?.id) return;

        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        const timestamp = Timestamp.fromDate(date);
        await updateBabyData(baby.id, { birthDate: timestamp });
        setBaby(prev => prev ? { ...prev, birthDate: timestamp } : null);
    }, [baby?.id]);

    const updateStats = useCallback(async (type: 'weight' | 'height' | 'head', value: string) => {
        if (!baby?.id) return;

        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        const currentStats = baby.stats || {};
        let updates: { stats: GrowthStats } = { stats: { ...currentStats } };

        if (type === 'weight') updates.stats.weight = value;
        if (type === 'height') updates.stats.height = value;
        if (type === 'head') updates.stats.headCircumference = value;

        await updateBabyData(baby.id, updates);
        setBaby(prev => prev ? { ...prev, stats: updates.stats } : null);
    }, [baby?.id, baby?.stats]);

    // Update all stats in one call to avoid race condition
    const updateAllStats = useCallback(async (newStats: { weight?: string; height?: string; headCircumference?: string }) => {
        if (!baby?.id) {
            logger.log('❌ updateAllStats: No baby.id');
            return;
        }

        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        const currentStats = baby.stats || {};
        const mergedStats: GrowthStats = {
            ...currentStats,
            ...(newStats.weight !== undefined && { weight: newStats.weight }),
            ...(newStats.height !== undefined && { height: newStats.height }),
            ...(newStats.headCircumference !== undefined && { headCircumference: newStats.headCircumference }),
        };

        logger.log('📤 updateAllStats saving:', mergedStats);
        await updateBabyData(baby.id, { stats: mergedStats });
        logger.log('✅ updateAllStats successful');
        setBaby(prev => prev ? { ...prev, stats: mergedStats } : null);
    }, [baby?.id, baby?.stats]);

    const updateBasicInfo = useCallback(async (data: { name: string; gender: 'boy' | 'girl' | 'other'; birthDate: Date }) => {
        if (!baby?.id) return;

        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        const timestamp = Timestamp.fromDate(data.birthDate);
        const updates = {
            name: data.name,
            gender: data.gender,
            birthDate: timestamp,
        };

        await updateBabyData(baby.id, updates);
        setBaby(prev => prev ? { ...prev, ...updates } : null);
    }, [baby?.id]);

    const openSettings = useCallback(() => {
        if (Platform.OS === 'ios') {
            Linking.openURL('app-settings:');
        } else {
            Linking.openSettings();
        }
    }, []);

    const handlePermissionDenied = useCallback((permissionType: 'camera' | 'gallery') => {
        const message = permissionType === 'camera'
            ? 'נדרשת הרשאת מצלמה כדי לצלם תמונה'
            : 'נדרשת הרשאת גלריה כדי לבחור תמונה';

        Alert.alert(
            'חובה לאשר הרשאות',
            message,
            [
                { text: 'ביטול', style: 'cancel' },
                { text: 'פתח הגדרות', onPress: openSettings }
            ]
        );
    }, [openSettings]);

    const pickImageFromLibrary = useCallback(async (type: 'profile' | 'album', monthIndex?: number) => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                handlePermissionDenied('gallery');
                return null;
            }

            logger.log('📸 Opening image library...');
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: type === 'profile' ? [1, 1] : [3, 4],
                quality: type === 'album' ? 0.7 : 0.3, // Higher quality for album photos
                base64: true, // Always get base64 as fallback in case Storage fails
            });

            logger.log('📸 Image picker result:', result.canceled ? 'CANCELED' : 'SELECTED');
            return result;
        } catch (error) {
            logger.error('❌ Error in pickImageFromLibrary:', error);
            Alert.alert('שגיאה', 'לא הצלחנו לפתוח את הגלריה');
            return null;
        }
    }, [handlePermissionDenied]);

    const takePhotoWithCamera = useCallback(async (type: 'profile' | 'album') => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            handlePermissionDenied('camera');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: type === 'profile' ? [1, 1] : [3, 4],
            quality: type === 'album' ? 0.7 : 0.3, // Higher quality for album photos
            base64: true, // Always get base64 as fallback in case Storage fails
        });

        return result;
    }, [handlePermissionDenied]);

    const processImage = useCallback(async (result: ImagePicker.ImagePickerResult | null, type: 'profile' | 'album', monthIndex?: number) => {
        if (!result) {
            logger.log('⚠️ processImage: No result provided');
            return;
        }

        if (result.canceled) {
            logger.log('⚠️ processImage: User canceled');
            return;
        }

        if (!result.assets || !result.assets[0]) {
            logger.error('❌ processImage: No asset in result');
            Alert.alert('שגיאה', 'לא הצלחנו לטעון את התמונה');
            return;
        }

        if (!baby?.id) {
            logger.error('❌ processImage: No baby.id');
            Alert.alert('שגיאה', 'לא נמצא פרופיל תינוק');
            return;
        }

        logger.log('💾 Processing image...', { type, monthIndex });
        setSavingImage(true);

        try {
            if (type === 'profile') {
                // For profile, we can still use base64 or upload to Storage
                // Using base64 for profile to keep it simple
                if (result.assets[0].base64) {
                    const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
                    await updateBabyData(baby.id, { photoUrl: base64Img });
                    setBaby(prev => prev ? { ...prev, photoUrl: base64Img } : null);
                    logger.log('✅ Profile photo saved');
                } else if (result.assets[0].uri) {
                    // Fallback to URI if base64 not available
                    await updateBabyData(baby.id, { photoUrl: result.assets[0].uri });
                    setBaby(prev => prev ? { ...prev, photoUrl: result.assets[0].uri } : null);
                    logger.log('✅ Profile photo saved (URI)');
                }
            } else if (type === 'album' && monthIndex !== undefined) {
                logger.log('💾 Saving album image for month:', monthIndex);
                
                // Upload to Firebase Storage instead of saving base64
                if (!result.assets[0].uri) {
                    throw new Error('No image URI available');
                }

                // Upload to Firebase Storage (includes automatic fallback)
                const downloadURL = await uploadAlbumPhoto(baby.id, monthIndex, result.assets[0].uri);
                logger.log('✅ Album photo uploaded:', downloadURL.substring(0, 50));
                
                // Save the Storage URL (or compressed base64) to Firestore
                await saveAlbumImage(baby.id, monthIndex, downloadURL);
                
                // Auto-set date to today when adding a photo
                const today = Timestamp.now();
                const currentDates = baby.albumDates || {};
                const updatedDates = { ...currentDates, [monthIndex]: today };
                
                setBaby(prev => {
                    if (!prev) return null;
                    const updatedAlbum = { ...prev.album, [monthIndex]: downloadURL };
                    logger.log('✅ Album photo saved, date set to:', today);
                    return { 
                        ...prev, 
                        album: updatedAlbum,
                        albumDates: updatedDates
                    };
                });
                
                // Also save the date to Firebase
                try {
                    await updateBabyData(baby.id, { albumDates: updatedDates });
                    logger.log('✅ Album date saved to Firebase');
                } catch (e) {
                    logger.error('❌ Error auto-saving date:', e);
                }
            }

            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } catch (e) {
            logger.error('❌ Error saving image:', e);
            Alert.alert('שגיאה', 'לא הצלחנו לשמור את התמונה. נסה שוב.');
        } finally {
            setSavingImage(false);
        }
    }, [baby?.id, baby?.albumDates]);

    const updatePhoto = useCallback(async (type: 'profile' | 'album', monthIndex?: number) => {
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: ['ביטול', 'צלם תמונה', 'בחר מהגלריה'],
                    cancelButtonIndex: 0,
                    title: 'בחר מקור תמונה',
                },
                async (buttonIndex) => {
                    logger.log('📱 Action sheet button pressed:', buttonIndex);
                    if (buttonIndex === 1) {
                        // Camera
                        logger.log('📷 User selected camera');
                        const result = await takePhotoWithCamera(type);
                        if (result && !result.canceled) {
                            await processImage(result, type, monthIndex);
                        } else {
                            logger.log('⚠️ Camera canceled or failed');
                        }
                    } else if (buttonIndex === 2) {
                        // Gallery
                        logger.log('📸 User selected gallery');
                        const result = await pickImageFromLibrary(type, monthIndex);
                        if (result && !result.canceled) {
                            await processImage(result, type, monthIndex);
                        } else {
                            logger.log('⚠️ Gallery canceled or failed');
                        }
                    }
                }
            );
        } else {
            // Android - use Alert for action sheet
            Alert.alert(
                'בחר מקור תמונה',
                '',
                [
                    { text: 'ביטול', style: 'cancel' },
                    {
                        text: 'צלם תמונה',
                        onPress: async () => {
                            logger.log('📷 User selected camera (Android)');
                            const result = await takePhotoWithCamera(type);
                            if (result && !result.canceled) {
                                await processImage(result, type, monthIndex);
                            } else {
                                logger.log('⚠️ Camera canceled or failed');
                            }
                        }
                    },
                    {
                        text: 'בחר מהגלריה',
                        onPress: async () => {
                            logger.log('📸 User selected gallery (Android)');
                            const result = await pickImageFromLibrary(type, monthIndex);
                            if (result && !result.canceled) {
                                await processImage(result, type, monthIndex);
                            } else {
                                logger.log('⚠️ Gallery canceled or failed');
                            }
                        }
                    },
                ]
            );
        }
    }, [takePhotoWithCamera, pickImageFromLibrary, processImage]);

    const updateAlbumNote = useCallback(async (month: number, note: string) => {
        if (!baby?.id) return;

        try {
            // Get current album data
            const currentAlbum = baby.albumNotes || {};
            const updatedNotes = { ...currentAlbum, [month]: note };

            // Save to Firebase
            await updateBabyData(baby.id, { albumNotes: updatedNotes });

            // Update local state
            setBaby(prev => prev ? { ...prev, albumNotes: updatedNotes } : null);

            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } catch (e) {
            logger.error('Error saving album note:', e);
            Alert.alert('שגיאה', 'לא הצלחנו לשמור את ההערה');
        }
    }, [baby?.id, baby?.albumNotes]);

    const updateAlbumDate = useCallback(async (month: number, date: Date) => {
        if (!baby?.id) return;

        try {
            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }

            const timestamp = Timestamp.fromDate(date);
            const currentDates = baby.albumDates || {};
            const updatedDates = { ...currentDates, [month]: timestamp };

            await updateBabyData(baby.id, { albumDates: updatedDates });
            setBaby(prev => prev ? { ...prev, albumDates: updatedDates } : null);
        } catch (e) {
            logger.error('Error saving album date:', e);
            Alert.alert('שגיאה', 'לא הצלחנו לשמור את התאריך');
        }
    }, [baby?.id, baby?.albumDates]);

    return {
        baby,
        loading,
        savingImage,
        babyAgeMonths,
        birthDateObj,
        refresh: loadData,
        updatePhoto,
        updateBirthDate,
        updateStats,
        updateAllStats,
        updateBasicInfo,
        updateAlbumNote,
        updateAlbumDate,
    };
};

export default useBabyProfile;
