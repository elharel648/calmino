import { logger } from '../utils/logger';
// services/imageUploadService.ts - Firebase Storage Image Upload (JS SDK)

import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Compress image before upload
 */
async function compressImage(uri: string): Promise<string> {
    try {
        logger.debug('📸', 'Compressing image...');

        const manipResult = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 1024 } }], // Max 1024px
            {
                compress: 0.8, // 80% quality
                format: ImageManipulator.SaveFormat.JPEG,
            }
        );

        logger.debug('📸', 'Compressed to:', manipResult.uri.substring(0, 50));
        return manipResult.uri;
    } catch (error) {
        logger.error('Compression failed, using original:', error);
        return uri;
    }
}

/**
 * Convert local file URI to Blob for JS SDK upload
 */
async function uriToBlob(uri: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function () {
            resolve(xhr.response);
        };
        xhr.onerror = function (e) {
            logger.error('XMLHttpRequest Blob conversion failed:', e);
            reject(new TypeError('Network request failed'));
        };
        xhr.responseType = 'blob'; // 'blob' works correctly in RN
        xhr.open('GET', uri, true);
        xhr.send(null);
    });
}

/**
 * Upload image to Firebase Storage using JS SDK
 * @param uri - Local image URI
 * @param path - Storage path (e.g., "childPhotos/userId/photo.jpg")
 * @returns Download URL
 */
export async function uploadImage(uri: string, path: string): Promise<string> {
    try {
        logger.debug('📸', 'Starting upload to Storage...');

        // Compress first
        const compressedUri = await compressImage(uri);

        // Convert to blob for JS SDK upload
        const blob = await uriToBlob(compressedUri);

        // Upload using JS SDK
        const storageInstance = getStorage();
        const storageRef = ref(storageInstance, path);
        logger.debug('📸', 'Uploading to:', path);
        await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });

        // Get download URL
        const downloadURL = await getDownloadURL(storageRef);
        logger.debug('✅', 'Upload complete:', downloadURL.substring(0, 60));

        return downloadURL;
    } catch (error: any) {
        logger.warn('⚠️ Storage upload failed (will use base64 fallback):', error.code, error.message);

        // Provide user-friendly error messages
        let errorMessage = 'Image upload failed';
        if (error.code === 'storage/unauthorized') {
            errorMessage = 'Permission denied. Please check your account settings.';
        } else if (error.code === 'storage/quota-exceeded') {
            errorMessage = 'Storage quota exceeded. Please contact support.';
        } else if (error.code === 'storage/unknown') {
            errorMessage = 'Network error. Please check your internet connection and try again.';
        }

        // Fallback to Base64 if Storage fails
        try {
            return await uploadImageAsBase64(uri);
        } catch (fallbackError) {
            logger.error('❌ Base64 fallback also failed:', fallbackError);
            throw new Error(errorMessage);
        }
    }
}

/**
 * Fallback: Upload as Base64 (if Storage fails)
 * Compresses very aggressively to stay under Firestore's 1MB document limit
 */
async function uploadImageAsBase64(uri: string): Promise<string> {
    try {
        const manipResult = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 400 } }],
            { compress: 0.3, format: ImageManipulator.SaveFormat.JPEG }
        );

        const base64 = await FileSystem.readAsStringAsync(manipResult.uri, {
            encoding: 'base64',
        });

        const base64Size = (base64.length * 3) / 4;
        logger.debug('📦 Base64 size:', base64Size, 'bytes');

        if (base64Size > 300000) {
            throw new Error('Image too large even after compression. Please use a smaller image or check your internet connection.');
        }

        return `data:image/jpeg;base64,${base64}`;
    } catch (error: any) {
        logger.error('❌ Base64 conversion failed:', error);
        throw new Error('Failed to save image. Please check your internet connection and try again.');
    }
}

/**
 * Upload child profile photo
 */
export async function uploadChildPhoto(childId: string, uri: string): Promise<string> {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    const path = `childPhotos/${userId}/${childId}/photo_${Date.now()}.jpg`;
    const downloadURL = await uploadImage(uri, path);

    const babyRef = doc(db, 'babies', childId);
    await updateDoc(babyRef, { photoUrl: downloadURL });

    logger.debug('✅', 'Child photo saved');
    return downloadURL;
}

/**
 * Upload user profile photo
 */
export async function uploadUserPhoto(uri: string): Promise<string> {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    const path = `userPhotos/${userId}/profile_${Date.now()}.jpg`;
    const downloadURL = await uploadImage(uri, path);

    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { photoUrl: downloadURL });

    logger.debug('✅', 'User photo saved');
    return downloadURL;
}

/**
 * Upload album photo (Magic Moments)
 */
export async function uploadAlbumPhoto(childId: string, month: number, uri: string): Promise<string> {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    const path = `childPhotos/${userId}/${childId}/album_month_${month}_${Date.now()}.jpg`;
    const downloadURL = await uploadImage(uri, path);

    logger.debug('✅', 'Album photo saved for month:', month);
    return downloadURL;
}
