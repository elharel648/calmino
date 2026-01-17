// utils/imageValidator.ts - Image validation for MVP

import { Alert } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';

const MAX_IMAGE_SIZE_BYTES = 500 * 1024; // 500KB for Base64 safety
const MAX_DIMENSION = 1200; // Max width/height

export interface ImageValidationResult {
    isValid: boolean;
    error?: string;
    compressedUri?: string;
}

/**
 * Validate and compress image for Base64 storage
 */
export async function validateAndCompressImage(
    uri: string
): Promise<ImageValidationResult> {
    try {
        // Get image info
        const response = await fetch(uri);
        const blob = await response.blob();
        const sizeInBytes = blob.size;

        console.log(`📸 Image size: ${(sizeInBytes / 1024).toFixed(2)}KB`);

        // If already small enough, return as-is
        if (sizeInBytes <= MAX_IMAGE_SIZE_BYTES) {
            return { isValid: true, compressedUri: uri };
        }

        // Compress image
        console.log('📸 Compressing image...');
        const manipResult = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: MAX_DIMENSION } }],
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );

        // Check compressed size
        const compressedResponse = await fetch(manipResult.uri);
        const compressedBlob = await compressedResponse.blob();
        const compressedSize = compressedBlob.size;

        console.log(`📸 Compressed to: ${(compressedSize / 1024).toFixed(2)}KB`);

        if (compressedSize > MAX_IMAGE_SIZE_BYTES) {
            return {
                isValid: false,
                error: 'התמונה גדולה מדי. נסה תמונה קטנה יותר (מתחת ל-500KB)',
            };
        }

        return { isValid: true, compressedUri: manipResult.uri };
    } catch (error) {
        console.error('Image validation error:', error);
        return {
            isValid: false,
            error: 'שגיאה בטעינת התמונה. נסה תמונה אחרת',
        };
    }
}

/**
 * Show user-friendly warning about image size
 */
export function showImageSizeWarning(): void {
    Alert.alert(
        '💡 טיפ',
        'כדי לשמור על ביצועים טובים, מומלץ להעלות תמונות קטנות (עד 500KB).\n\nנדחוס את התמונה אוטומטית.',
        [{ text: 'הבנתי' }]
    );
}
