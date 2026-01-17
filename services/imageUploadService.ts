// services/imageUploadService.ts - Base64 Image Upload with Compression
// TODO: MIGRATE TO FIREBASE STORAGE WHEN BUCKET IS READY!
// MVP: Using Base64 with careful size management

import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Compress and convert image to Base64
 * Firestore limit: 1MB per field
 * @param uri - Local image URI
 * @returns Base64 data URI (compressed)
 */
async function compressAndConvertToBase64(uri: string): Promise<string> {
    try {
        console.log('📸 Compressing image...');

        // Compress image to fit Firestore 1MB limit
        const manipResult = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 800 } }], // Max width 800px
            {
                compress: 0.7, // 70% quality
                format: ImageManipulator.SaveFormat.JPEG,
            }
        );

        console.log('📸 Compressed URI:', manipResult.uri.substring(0, 60));

        // Convert to Base64
        const base64 = await FileSystem.readAsStringAsync(manipResult.uri, {
            encoding: FileSystem.EncodingType.Base64,
        });

        const dataUri = `data:image/jpeg;base64,${base64}`;
        const sizeKB = Math.round(dataUri.length / 1024);

        console.log('✅ Base64 created:', sizeKB, 'KB');

        // Check if still too large (Firestore limit is ~1MB)
        if (dataUri.length > 1000000) {
            console.warn('⚠️ Image still large after compression:', sizeKB, 'KB');
            throw new Error('התמונה גדולה מדי. נסה תמונה קטנה יותר (מתחת ל-500KB)');
        }

        return dataUri;
    } catch (error: any) {
        console.error('❌ Compression error:', error.message);
        throw error;
    }
}

/**
 * Upload image (Base64 to Firestore)
 * @param uri - Local image URI
 * @param path - Not used in Base64 mode (kept for compatibility)
 * @returns Base64 data URI
 */
export async function uploadImage(uri: string, path: string): Promise<string> {
    return compressAndConvertToBase64(uri);
}

/**
 * Upload sitter profile photo
 */
export async function uploadSitterPhoto(uri: string): Promise<string> {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    const base64Uri = await compressAndConvertToBase64(uri);

    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
        photoUrl: base64Uri,
    });

    console.log('✅ Sitter photo saved');
    return base64Uri;
}

/**
 * Upload child profile photo
 */
export async function uploadChildPhoto(childId: string, uri: string): Promise<string> {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    const base64Uri = await compressAndConvertToBase64(uri);

    const babyRef = doc(db, 'babies', childId);
    await updateDoc(babyRef, {
        photoUrl: base64Uri,
    });

    console.log('✅ Child photo saved');
    return base64Uri;
}

/**
 * Upload user profile photo
 */
export async function uploadUserPhoto(uri: string): Promise<string> {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    const base64Uri = await compressAndConvertToBase64(uri);

    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
        photoUrl: base64Uri,
    });

    console.log('✅ User photo saved');
    return base64Uri;
}
