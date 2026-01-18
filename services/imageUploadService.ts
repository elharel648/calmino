// services/imageUploadService.ts - Firebase Storage Image Upload
// UPDATED: Using Firebase Storage instead of Base64

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { auth, db, storage } from './firebaseConfig';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { logger } from '../utils/logger';

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
 * Convert local URI to blob for upload
 */
async function uriToBlob(uri: string): Promise<Blob> {
    try {
        const response = await fetch(uri);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        }
        return await response.blob();
    } catch (error) {
        logger.error('❌ uriToBlob failed:', error);
        throw new Error(`Image conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Upload image to Firebase Storage
 * @param uri - Local image URI
 * @param path - Storage path (e.g., "sitterPhotos/userId/photo.jpg")
 * @returns Download URL
 */
export async function uploadImage(uri: string, path: string): Promise<string> {
    try {
        logger.debug('📸', 'Starting upload to Storage...');

        // Compress first
        const compressedUri = await compressImage(uri);

        // Convert to blob
        const blob = await uriToBlob(compressedUri);
        logger.debug('📸', 'Blob size:', blob.size, 'bytes');

        // Create storage reference
        const storageRef = ref(storage, path);

        // Upload
        logger.debug('📸', 'Uploading to:', path);
        const snapshot = await uploadBytes(storageRef, blob, {
            contentType: 'image/jpeg',
        });

        // Get download URL
        const downloadURL = await getDownloadURL(snapshot.ref);
        logger.debug('✅', 'Upload complete:', downloadURL.substring(0, 60));

        return downloadURL;
    } catch (error: any) {
        logger.error('❌ Storage upload failed:', error.code, error.message);

        // Fallback to Base64 if Storage fails
        logger.debug('⚠️', 'Falling back to Base64...');
        try {
            return await uploadImageAsBase64(uri);
        } catch (fallbackError) {
            logger.error('❌ Base64 fallback also failed:', fallbackError);
            throw new Error('Image upload failed');
        }
    }
}

/**
 * Fallback: Upload as Base64 (if Storage fails)
 */
async function uploadImageAsBase64(uri: string): Promise<string> {
    const compressedUri = await compressImage(uri);

    const manipResult = await ImageManipulator.manipulateAsync(
        compressedUri,
        [{ resize: { width: 800 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );

    const base64 = await FileSystem.readAsStringAsync(manipResult.uri, {
        encoding: FileSystem.EncodingType.Base64,
    });

    return `data:image/jpeg;base64,${base64}`;
}

/**
 * Upload sitter profile photo
 */
export async function uploadSitterPhoto(uri: string): Promise<string> {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    const path = `sitterPhotos/${userId}/profile_${Date.now()}.jpg`;
    const downloadURL = await uploadImage(uri, path);

    // Update Firestore - use setDoc with merge to handle if doc doesn't exist
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, { photoUrl: downloadURL }, { merge: true });

    // Also update sitters collection if exists
    try {
        const sitterRef = doc(db, 'sitters', userId);
        await setDoc(sitterRef, { image: downloadURL }, { merge: true });
    } catch (e) {
        // Sitter doc may not exist yet
    }

    logger.debug('✅', 'Sitter photo saved');
    return downloadURL;
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
