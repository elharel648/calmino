/**
 * Babysitter Service - פונקציות ניהול בייביסיטרים
 */

import {
    collection,
    query,
    where,
    orderBy,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    onSnapshot,
    getDoc,
    Timestamp,
    increment,
    arrayUnion,
    arrayRemove,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { BabysitterBooking, Review, ActiveShift, SitterBadge, ReviewTag } from '../types/babysitter';
import { logger } from '../utils/logger';
import { getUserPushToken, sendPushNotification } from './pushNotificationService';

// ===================
// BOOKINGS
// ===================

/**
 * Create a new booking request
 */
export async function createBooking(bookingData: {
    parentId: string;
    babysitterId: string;
    date: Date;
    startTime: string;
    endTime: string;
    hourlyRate?: number;
    location?: string;
    childIds?: string[];
    notes?: string;
}): Promise<string> {
    // Calculate hours and totalPrice
    const [startH, startM] = bookingData.startTime.split(':').map(Number);
    const [endH, endM] = bookingData.endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const hours = (endMinutes - startMinutes) / 60;

    // Get hourlyRate (use provided or fetch from sitter profile or default to 80)
    let hourlyRate = bookingData.hourlyRate || 80;
    if (!bookingData.hourlyRate) {
        try {
            const sitterDoc = await getDoc(doc(db, 'users', bookingData.babysitterId));
            if (sitterDoc.exists()) {
                const sitterData = sitterDoc.data();
                hourlyRate = sitterData?.sitterPrice || 80;
            }
        } catch (error) {
            logger.error('Error fetching sitter price:', error);
            // Keep default 80
        }
    }

    const totalPrice = Math.round(hours * hourlyRate * 100) / 100;

    // Get user names
    let parentName = 'הורה';
    let sitterName = 'בייביסיטר';

    try {
        const [parentDoc, sitterDoc] = await Promise.all([
            getDoc(doc(db, 'users', bookingData.parentId)),
            getDoc(doc(db, 'users', bookingData.babysitterId)),
        ]);

        if (parentDoc.exists()) {
            const parentData = parentDoc.data();
            parentName = parentData?.displayName || parentData?.name || 'הורה';
        }

        if (sitterDoc.exists()) {
            const sitterData = sitterDoc.data();
            sitterName = sitterData?.displayName || sitterData?.name || 'בייביסיטר';
        }
    } catch (error) {
        logger.error('Error fetching user names:', error);
        // Continue with defaults
    }

    const bookingRef = await addDoc(collection(db, 'bookings'), {
        parentId: bookingData.parentId,
        parentName,
        babysitterId: bookingData.babysitterId,
        sitterName,
        childIds: bookingData.childIds || [],
        status: 'pending',
        date: Timestamp.fromDate(bookingData.date),
        startTime: bookingData.startTime,
        endTime: bookingData.endTime,
        hours,
        hourlyRate,
        totalPrice,
        location: bookingData.location || '',
        notes: bookingData.notes || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    return bookingRef.id;
}

/**
 * Get all bookings for a parent
 */
export async function getParentBookings(parentId: string): Promise<BabysitterBooking[]> {
    const q = query(
        collection(db, 'bookings'),
        where('parentId', '==', parentId),
        orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BabysitterBooking));
}

/**
 * Get all bookings for a babysitter
 */
export async function getBabysitterBookings(babysitterId: string): Promise<BabysitterBooking[]> {
    const q = query(
        collection(db, 'bookings'),
        where('babysitterId', '==', babysitterId),
        orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BabysitterBooking));
}

/**
 * Update booking status
 */
export async function updateBookingStatus(
    bookingId: string,
    status: BabysitterBooking['status']
): Promise<void> {
    // Get booking data before update
    const bookingDoc = await getDoc(doc(db, 'bookings', bookingId));
    if (!bookingDoc.exists()) return;

    const bookingData = bookingDoc.data();
    const oldStatus = bookingData.status;

    // Update status
    await updateDoc(doc(db, 'bookings', bookingId), {
        status,
        updatedAt: serverTimestamp(),
    });

    // Send push notification if status changed
    if (oldStatus !== status) {
        try {
            const recipientId = status === 'confirmed' || status === 'declined' || status === 'active' || status === 'completed'
                ? bookingData.parentId
                : bookingData.babysitterId;

            const recipientToken = await getUserPushToken(recipientId);
            if (recipientToken) {
                let title = '';
                let body = '';

                switch (status) {
                    case 'confirmed':
                        title = '✅ הזמנה אושרה!';
                        body = 'הבייביסיטר אישר את ההזמנה שלך';
                        break;
                    case 'declined':
                        title = '❌ הזמנה נדחתה';
                        body = 'הבייביסיטר דחה את ההזמנה';
                        break;
                    case 'active':
                        title = '⏱️ השירות התחיל';
                        body = 'הבייביסיטר התחיל את השירות';
                        break;
                    case 'completed':
                        title = '✅ השירות הושלם';
                        body = 'השירות הושלם בהצלחה. תוכל/י לתת ביקורת';
                        break;
                    case 'cancelled':
                        title = '🚫 הזמנה בוטלה';
                        body = 'ההזמנה בוטלה';
                        break;
                }

                if (title && body) {
                    await sendPushNotification(recipientToken, title, body, {
                        type: 'booking_update',
                        bookingId,
                        status,
                    });
                }
            }
        } catch (error) {
            logger.error('Error sending booking notification:', error);
        }
    }
}

/**
 * Accept a booking (for babysitter)
 */
export async function acceptBooking(bookingId: string): Promise<void> {
    await updateBookingStatus(bookingId, 'confirmed');
}

/**
 * Decline a booking (for babysitter)
 */
export async function declineBooking(bookingId: string): Promise<void> {
    await updateBookingStatus(bookingId, 'declined');
}

/**
 * Start a shift - create active shift record
 */
export async function startShift(booking: BabysitterBooking, babysitterName: string): Promise<string> {
    // Get hourlyRate from booking or babysitter profile
    let hourlyRate = 80; // Default fallback

    try {
        // First try to get from booking
        const bookingDoc = await getDoc(doc(db, 'bookings', booking.id));
        const bookingData = bookingDoc.data();
        if (bookingData?.hourlyRate) {
            hourlyRate = bookingData.hourlyRate;
        } else {
            // Fallback: get from babysitter profile
            const sitterDoc = await getDoc(doc(db, 'users', booking.babysitterId));
            const sitterData = sitterDoc.data();
            hourlyRate = sitterData?.sitterPrice || 80;
        }
    } catch (error) {
        logger.error('Error fetching hourly rate:', error);
        // Keep default 80
    }

    const shiftRef = await addDoc(collection(db, 'activeShifts'), {
        bookingId: booking.id,
        parentId: booking.parentId,
        babysitterId: booking.babysitterId,
        babysitterName,
        hourlyRate, // ✅ ADD THIS
        startedAt: serverTimestamp(),
        isPaused: false,
        totalPausedSeconds: 0,
        isActive: true,
    });

    // Update booking status
    await updateDoc(doc(db, 'bookings', booking.id), {
        status: 'active',
        actualStart: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    return shiftRef.id;
}

/**
 * Get active shift for parent
 */
export async function getActiveShift(parentId: string): Promise<ActiveShift | null> {
    const q = query(
        collection(db, 'activeShifts'),
        where('parentId', '==', parentId),
        where('isActive', '==', true)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as ActiveShift;
}

/**
 * Subscribe to active shift updates
 */
export function subscribeToActiveShift(
    parentId: string,
    callback: (shift: ActiveShift | null) => void
): () => void {
    const q = query(
        collection(db, 'activeShifts'),
        where('parentId', '==', parentId),
        where('isActive', '==', true)
    );

    return onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            callback(null);
        } else {
            const doc = snapshot.docs[0];
            callback({ id: doc.id, ...doc.data() } as ActiveShift);
        }
    });
}

/**
 * Complete a shift - mark booking as completed with payment details
 */
export async function completeShift(
    shiftId: string,
    bookingId: string,
    totalMinutes: number,
    hourlyRate: number
): Promise<void> {
    // Calculate total amount
    const hours = totalMinutes / 60;
    const totalAmount = Math.round(hours * hourlyRate * 100) / 100;

    try {
        // Update booking with completion details
        await updateDoc(doc(db, 'bookings', bookingId), {
            status: 'completed',
            actualEnd: serverTimestamp(),
            totalMinutes,
            totalAmount,
            updatedAt: serverTimestamp(),
        });

        // Mark active shift as inactive
        await updateDoc(doc(db, 'activeShifts', shiftId), {
            isActive: false,
            updatedAt: serverTimestamp(),
        });

        logger.log(`✅ Shift completed: ${totalMinutes} minutes, ₪${totalAmount}`);
    } catch (error) {
        logger.error('Error completing shift:', error);
        throw error;
    }
}

// ===================
// REVIEWS
// ===================

/**
 * Submit a new review for a babysitter
 * This handles writing the review, updating the booking, 
 * and recalculating the sitter's aggregate rating in their profile.
 */
export async function submitReview(
    bookingId: string | undefined,
    babysitterId: string,
    parentId: string,
    rating: number,
    tags: ReviewTag[],
    text: string,
    isVerified?: boolean
): Promise<string> {
    try {
        // 1. Create the review document
        const reviewRef = await addDoc(collection(db, 'reviews'), {
            bookingId: bookingId || null,
            babysitterId,
            parentId,
            rating,
            tags,
            text,
            isVerified: isVerified ?? !!bookingId, // Verified if contacted via WhatsApp or from a booking
            helpfulCount: 0,
            helpfulBy: [],
            createdAt: serverTimestamp(),
        });

        // 2. Mark the booking as rated
        if (bookingId) {
            await updateDoc(doc(db, 'bookings', bookingId), {
                isRated: true,
                ratedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        }

        // 3. Recalculate sitter's stats and update their profile
        const stats = await getReviewStats(babysitterId);

        // Wait briefly to ensure the new review is in the stats, though it might not be due to Firestore replication
        // So we manually calculate the new average to be safe
        const newTotal = stats.total + 1;
        const newAverage = Math.round((((stats.average * stats.total) + rating) / newTotal) * 10) / 10;

        // Calculate updated badges and cache them in Firestore
        const updatedBadges = await calculateSitterBadges(babysitterId, {
            rating: newAverage,
            reviewCount: newTotal,
        });
        const badgesToCache = updatedBadges.filter(b => b !== 'available_now');

        await updateDoc(doc(db, 'users', babysitterId), {
            sitterRating: newAverage,
            sitterReviewCount: newTotal,
            sitterBadges: badgesToCache,
        });

        // 4. Send push notification to the sitter
        const sitterToken = await getUserPushToken(babysitterId);
        if (sitterToken) {
            await sendPushNotification(
                sitterToken,
                '⭐ קיבלת ביקורת חדשה!',
                `קיבלת ביקורת של ${rating} כוכבים על המשמרת האחרונה שלך!`,
                { type: 'new_review' }
            );
        }

        return reviewRef.id;
    } catch (error) {
        logger.error('Error submitting review:', error);
        throw error;
    }
}

/**
 * Get reviews for a babysitter (with parent names)
 */
export async function getBabysitterReviews(babysitterId: string): Promise<Review[]> {
    const q = query(
        collection(db, 'reviews'),
        where('babysitterId', '==', babysitterId),
        orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const reviews: Review[] = [];

    for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        let parentName = 'הורה';

        // Try to get parent name
        if (data.parentId) {
            try {
                const parentDoc = await getDoc(doc(db, 'users', data.parentId));
                if (parentDoc.exists()) {
                    parentName = parentDoc.data().displayName || 'הורה';
                }
            } catch (e) {
                logger.error('getParentName error:', e);
            }
        }

        reviews.push({
            id: docSnap.id,
            ...data,
            parentName,
        } as Review);
    }

    return reviews;
}

/**
 * Calculate average rating for babysitter
 */
export async function getBabysitterRating(babysitterId: string): Promise<{ average: number; count: number }> {
    const reviews = await getBabysitterReviews(babysitterId);

    if (reviews.length === 0) {
        return { average: 0, count: 0 };
    }

    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return {
        average: Math.round((sum / reviews.length) * 10) / 10,
        count: reviews.length,
    };
}

/**
 * Mark review as helpful
 */
export async function markReviewHelpful(reviewId: string, userId: string): Promise<boolean> {
    try {
        const reviewRef = doc(db, 'reviews', reviewId);
        const reviewDoc = await getDoc(reviewRef);

        if (!reviewDoc.exists()) {
            return false;
        }

        const data = reviewDoc.data();
        const helpfulBy = data.helpfulBy || [];
        const isAlreadyHelpful = helpfulBy.includes(userId);

        if (isAlreadyHelpful) {
            // Remove helpful
            await updateDoc(reviewRef, {
                helpfulBy: helpfulBy.filter((id: string) => id !== userId),
                helpfulCount: (data.helpfulCount || 0) - 1,
            });
        } else {
            // Add helpful
            await updateDoc(reviewRef, {
                helpfulBy: [...helpfulBy, userId],
                helpfulCount: (data.helpfulCount || 0) + 1,
            });
        }

        return true;
    } catch (error) {
        logger.error('Error marking review helpful:', error);
        return false;
    }
}

/**
 * Add sitter response to review
 */
export async function addSitterResponse(reviewId: string, sitterId: string, responseText: string): Promise<boolean> {
    try {
        const reviewRef = doc(db, 'reviews', reviewId);
        const reviewDoc = await getDoc(reviewRef);

        if (!reviewDoc.exists()) {
            return false;
        }

        const data = reviewDoc.data();
        if (data.babysitterId !== sitterId) {
            return false; // Not this sitter's review
        }

        await updateDoc(reviewRef, {
            sitterResponse: {
                text: responseText.trim(),
                createdAt: serverTimestamp(),
            },
        });

        return true;
    } catch (error) {
        logger.error('Error adding sitter response:', error);
        return false;
    }
}

/**
 * Delete a review — only allowed if the caller is the review's parentId
 */
export async function deleteReview(reviewId: string, parentId: string): Promise<boolean> {
    try {
        const reviewRef = doc(db, 'reviews', reviewId);
        const reviewDoc = await getDoc(reviewRef);
        if (!reviewDoc.exists() || reviewDoc.data().parentId !== parentId) return false;
        await deleteDoc(reviewRef);
        return true;
    } catch (error) {
        logger.error('Error deleting review:', error);
        return false;
    }
}

/**
 * Get review statistics for a babysitter
 */
export async function getReviewStats(babysitterId: string): Promise<{
    total: number;
    average: number;
    distribution: { [rating: number]: number }; // {5: 10, 4: 5, ...}
    verifiedCount: number;
    withResponseCount: number;
}> {
    const reviews = await getBabysitterReviews(babysitterId);

    if (reviews.length === 0) {
        return {
            total: 0,
            average: 0,
            distribution: {},
            verifiedCount: 0,
            withResponseCount: 0,
        };
    }

    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    const distribution: { [rating: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    reviews.forEach(review => {
        distribution[review.rating] = (distribution[review.rating] || 0) + 1;
    });

    return {
        total: reviews.length,
        average: Math.round((sum / reviews.length) * 10) / 10,
        distribution,
        verifiedCount: reviews.filter(r => r.isVerified).length,
        withResponseCount: reviews.filter(r => r.sitterResponse).length,
    };
}

/**
 * Calculate badges for a babysitter based on their stats
 */
export async function calculateSitterBadges(
    babysitterId: string,
    stats?: {
        rating: number;
        reviewCount: number;
        isAvailable?: boolean;
        createdAt?: Date | any;
    }
): Promise<SitterBadge[]> {
    const badges: SitterBadge[] = [];

    // If stats not provided, fetch them
    if (!stats) {
        try {
            const sitterDoc = await getDoc(doc(db, 'users', babysitterId));
            if (!sitterDoc.exists()) return badges;

            const data = sitterDoc.data();
            const reviewStats = await getReviewStats(babysitterId);

            stats = {
                rating: reviewStats.average || data.sitterRating || 0,
                reviewCount: reviewStats.total || data.sitterReviewCount || 0,
                // Check both sitterAvailable and sitterActive for availability
                isAvailable: data.sitterAvailable || data.sitterActive || false,
                createdAt: data.createdAt?.toDate?.() || data.createdAt,
            };
        } catch (error) {
            logger.error('Error calculating badges:', error);
            return badges;
        }
    }

    const { rating, reviewCount, isAvailable, createdAt } = stats;

    // ⭐ Top Sitter - מעל 4.8 עם 20+ ביקורות
    if (rating >= 4.8 && reviewCount >= 20) {
        badges.push('top_sitter');
    }

    // 🏆 Highly Recommended - לפחות 10 ביקורות + מעל 95% המלצות (4-5 כוכבים)
    if (reviewCount >= 10) {
        try {
            const reviewStats = await getReviewStats(babysitterId);
            const highRatings = (reviewStats.distribution[4] || 0) + (reviewStats.distribution[5] || 0);
            const recommendationRate = (highRatings / reviewStats.total) * 100;
            if (recommendationRate >= 95) {
                badges.push('highly_recommended');
            }
        } catch (error) {
            // Silent fail
        }
    }

    // 💎 VIP Sitter - מעל 50 ביקורות
    if (reviewCount >= 50) {
        badges.push('vip_sitter');
    }

    // ✨ Rising Star - סיטר חדש (פחות מ-3 חודשים) עם ביקורות מעולות (4.5+)
    if (createdAt) {
        const createdDate = createdAt instanceof Date ? createdAt : createdAt.toDate?.() || new Date(createdAt);
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        if (createdDate > threeMonthsAgo && rating >= 4.5 && reviewCount >= 5) {
            badges.push('rising_star');
        }
    }

    // ⚡ Available Now - זמין עכשיו
    if (isAvailable) {
        badges.push('available_now');
    }

    return badges;
}

// ===================
// CHAT
// ===================

// ===================
// BABYSITTER PROFILE
// ===================

/**
 * Get babysitter stats
 */
export async function getBabysitterStats(babysitterId: string): Promise<{
    completedShifts: number;
    repeatFamilies: number;
    avgResponseTime: number;
}> {
    // Get completed bookings
    const bookingsQuery = query(
        collection(db, 'bookings'),
        where('babysitterId', '==', babysitterId),
        where('status', '==', 'completed')
    );
    const bookingsSnapshot = await getDocs(bookingsQuery);
    const completedShifts = bookingsSnapshot.size;

    // Count unique parents who booked 2+ times
    const parentCounts: Record<string, number> = {};
    bookingsSnapshot.docs.forEach(docSnap => {
        const parentId = docSnap.data().parentId;
        parentCounts[parentId] = (parentCounts[parentId] || 0) + 1;
    });
    const repeatFamilies = Object.values(parentCounts).filter(count => count >= 2).length;

    // Calculate average response time from pending->confirmed timestamps
    let avgResponseTime = 5; // Default fallback in minutes
    try {
        const confirmedQuery = query(
            collection(db, 'bookings'),
            where('babysitterId', '==', babysitterId),
            where('status', 'in', ['confirmed', 'completed', 'active'])
        );
        const confirmedSnapshot = await getDocs(confirmedQuery);

        const responseTimes: number[] = [];
        confirmedSnapshot.docs.forEach(docSnap => {
            const data = docSnap.data();
            if (data.createdAt && data.updatedAt) {
                const created = data.createdAt.toDate?.() || new Date(data.createdAt);
                const updated = data.updatedAt.toDate?.() || new Date(data.updatedAt);
                const diffMinutes = Math.floor((updated.getTime() - created.getTime()) / (1000 * 60));
                if (diffMinutes > 0 && diffMinutes < 1440) { // Less than 24 hours
                    responseTimes.push(diffMinutes);
                }
            }
        });

        if (responseTimes.length > 0) {
            avgResponseTime = Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length);
        }
    } catch (e) {
        logger.error('getSitterStats error:', e);
    }

    return {
        completedShifts,
        repeatFamilies,
        avgResponseTime,
    };
}

// ===================
// SEARCH & LOCATION
// ===================

/**
 * Calculate distance between two GPS coordinates (Haversine formula)
 */
function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

function toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
}

/**
 * Search babysitters near a location
 * @param userLat User's latitude
 * @param userLon User's longitude
 * @param radiusKm Search radius in kilometers
 * @returns Array of babysitters within radius, sorted by distance
 */
export async function searchBabysitters(
    userLat: number,
    userLon: number,
    radiusKm: number = 10
): Promise<any[]> {
    try {
        // Get all active babysitters
        const sittersRef = collection(db, 'babysitters');
        const q = query(
            sittersRef,
            where('isActive', '==', true)
        );

        const snapshot = await getDocs(q);

        // Filter by distance and calculate distance for each
        const sittersWithDistance = snapshot.docs
            .map(doc => {
                const data = doc.data();

                // Skip if no location data
                if (!data.latitude || !data.longitude) {
                    return null;
                }

                const distance = calculateDistance(
                    userLat,
                    userLon,
                    data.latitude,
                    data.longitude
                );

                // Skip if outside radius
                if (distance > radiusKm) {
                    return null;
                }

                return {
                    id: doc.id,
                    ...data,
                    distance: Math.round(distance * 10) / 10, // Round to 1 decimal
                };
            })
            .filter(Boolean); // Remove nulls

        // Sort by distance (closest first)
        sittersWithDistance.sort((a, b) => (a?.distance || 0) - (b?.distance || 0));

        return sittersWithDistance as any[];

    } catch (error) {
        logger.error('Error searching babysitters:', error);
        return [];
    }
}

/**
 * Get all babysitters (no location filter)
 */
export async function getAllBabysitters(): Promise<any[]> {
    try {
        const sittersRef = collection(db, 'babysitters');
        const q = query(sittersRef, where('isActive', '==', true));
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));
    } catch (error) {
        logger.error('Error getting babysitters:', error);
        return [];
    }
}

// ===================
// PROFILE VIEWS & ANALYTICS
// ===================

/**
 * Track a profile view when a parent views a sitter's profile
 */
export async function trackProfileView(sitterId: string, viewerId: string): Promise<void> {
    try {
        if (!sitterId || !viewerId || sitterId === viewerId) return;

        await addDoc(collection(db, 'profileViews'), {
            sitterId,
            viewerId,
            viewedAt: serverTimestamp(),
        });

        // Also increment total view count on user doc for quick access
        const userRef = doc(db, 'users', sitterId);
        await updateDoc(userRef, {
            totalProfileViews: increment(1),
        });
    } catch (error) {
        logger.error('Error tracking profile view:', error);
    }
}

/**
 * Get profile view stats for the last 7 days (daily breakdown)
 */
export async function getProfileViewStats(sitterId: string): Promise<{
    dailyViews: { date: string; count: number }[];
    totalWeek: number;
    totalAllTime: number;
}> {
    try {
        const now = new Date();
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        // Get views from last 7 days
        const viewsQuery = query(
            collection(db, 'profileViews'),
            where('sitterId', '==', sitterId),
            where('viewedAt', '>=', Timestamp.fromDate(sevenDaysAgo)),
            orderBy('viewedAt', 'asc')
        );
        const viewsSnapshot = await getDocs(viewsQuery);

        // Build daily breakdown
        const dailyMap: Record<string, number> = {};
        const dayNames = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

        // Initialize all 7 days
        for (let i = 0; i < 7; i++) {
            const d = new Date(sevenDaysAgo);
            d.setDate(d.getDate() + i);
            const key = d.toISOString().split('T')[0];
            dailyMap[key] = 0;
        }

        viewsSnapshot.docs.forEach(docSnap => {
            const data = docSnap.data();
            const viewDate = data.viewedAt?.toDate?.() || new Date(data.viewedAt);
            const key = viewDate.toISOString().split('T')[0];
            if (dailyMap[key] !== undefined) {
                dailyMap[key]++;
            }
        });

        const dailyViews = Object.entries(dailyMap).map(([dateStr, count]) => {
            const d = new Date(dateStr);
            return {
                date: dayNames[d.getDay()],
                count,
            };
        });

        const totalWeek = viewsSnapshot.size;

        // Get all-time count from user doc
        let totalAllTime = totalWeek;
        try {
            const userDoc = await getDoc(doc(db, 'users', sitterId));
            if (userDoc.exists()) {
                totalAllTime = userDoc.data().totalProfileViews || totalWeek;
            }
        } catch (e) {
            // fallback to week count
        }

        return { dailyViews, totalWeek, totalAllTime };
    } catch (error) {
        logger.error('Error getting profile view stats:', error);
        return {
            dailyViews: [
                { date: 'א׳', count: 0 }, { date: 'ב׳', count: 0 },
                { date: 'ג׳', count: 0 }, { date: 'ד׳', count: 0 },
                { date: 'ה׳', count: 0 }, { date: 'ו׳', count: 0 },
                { date: 'ש׳', count: 0 },
            ],
            totalWeek: 0,
            totalAllTime: 0,
        };
    }
}

/**
 * Get response rate stats - percentage of bookings responded to and avg time
 */
export async function getResponseRateStats(sitterId: string): Promise<{
    responseRate: number; // 0-100 percentage
    avgResponseMinutes: number;
    totalRequests: number;
    totalResponded: number;
}> {
    try {
        // Get all bookings for this sitter
        const allBookingsQuery = query(
            collection(db, 'bookings'),
            where('babysitterId', '==', sitterId)
        );
        const allSnapshot = await getDocs(allBookingsQuery);
        const totalRequests = allSnapshot.size;

        // Get responded bookings (anything that's not pending)
        const respondedStatuses = ['confirmed', 'accepted', 'completed', 'active', 'declined', 'cancelled'];
        let totalResponded = 0;
        const responseTimes: number[] = [];

        allSnapshot.docs.forEach(docSnap => {
            const data = docSnap.data();
            if (respondedStatuses.includes(data.status)) {
                totalResponded++;

                if (data.createdAt && data.updatedAt) {
                    const created = data.createdAt.toDate?.() || new Date(data.createdAt);
                    const updated = data.updatedAt.toDate?.() || new Date(data.updatedAt);
                    const diffMinutes = Math.floor((updated.getTime() - created.getTime()) / (1000 * 60));
                    if (diffMinutes > 0 && diffMinutes < 1440) {
                        responseTimes.push(diffMinutes);
                    }
                }
            }
        });

        const responseRate = totalRequests > 0 ? Math.round((totalResponded / totalRequests) * 100) : 100;
        const avgResponseMinutes = responseTimes.length > 0
            ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
            : 0;

        return { responseRate, avgResponseMinutes, totalRequests, totalResponded };
    } catch (error) {
        logger.error('Error getting response rate stats:', error);
        return { responseRate: 100, avgResponseMinutes: 0, totalRequests: 0, totalResponded: 0 };
    }
}

// ===================
// TRUST & SAFETY
// ===================

/**
 * Block a babysitter so they no longer appear in search results
 * @param parentId The ID of the parent blocking
 * @param sitterId The ID of the babysitter being blocked
 */
export async function blockSitter(parentId: string, sitterId: string): Promise<void> {
    try {
        const userRef = doc(db, 'users', parentId);
        await updateDoc(userRef, {
            blockedSitters: arrayUnion(sitterId)
        });
        logger.log(`User ${parentId} blocked sitter ${sitterId}`);
    } catch (error) {
        logger.error('Error blocking sitter:', error);
        throw error;
    }
}

/**
 * Unblock a babysitter
 * @param parentId The ID of the parent unblocking
 * @param sitterId The ID of the babysitter being unblocked
 */
export async function unblockSitter(parentId: string, sitterId: string): Promise<void> {
    try {
        const userRef = doc(db, 'users', parentId);
        // We import arrayRemove at the top or here if needed, but assuming it will be imported via a separate replace call if missing
        await updateDoc(userRef, {
            blockedSitters: arrayRemove(sitterId)
        });
        logger.log(`User ${parentId} unblocked sitter ${sitterId}`);
    } catch (error) {
        logger.error('Error unblocking sitter:', error);
        throw error;
    }
}

/**
 * Get all blocked sitters for a parent
 * @param parentId The ID of the parent
 */
export async function getBlockedSitters(parentId: string): Promise<any[]> {
    try {
        const userRef = doc(db, 'users', parentId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) return [];

        const userData = userSnap.data();
        const blockedIds = userData.blockedSitters || [];

        if (blockedIds.length === 0) return [];

        // Fetch sitter profiles for these IDs
        const sittersRef = collection(db, 'users');
        const q = query(sittersRef, where('isSitter', '==', true), where('__name__', 'in', blockedIds));
        const querySnapshot = await getDocs(q);

        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        logger.error('Error fetching blocked sitters:', error);
        return [];
    }
}
