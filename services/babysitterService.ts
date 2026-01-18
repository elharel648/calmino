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
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { BabysitterBooking, Review, ActiveShift, Chat, ChatMessage, SitterBadge } from '../types/babysitter';
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
    hourlyRate: number;
    notes?: string;
}): Promise<string> {
    const bookingRef = await addDoc(collection(db, 'bookings'), {
        parentId: bookingData.parentId,
        babysitterId: bookingData.babysitterId,
        status: 'pending',
        date: Timestamp.fromDate(bookingData.date),
        startTime: bookingData.startTime,
        endTime: bookingData.endTime,
        hourlyRate: bookingData.hourlyRate,
        notes: bookingData.notes || null,
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
    const shiftRef = await addDoc(collection(db, 'activeShifts'), {
        bookingId: booking.id,
        parentId: booking.parentId,
        babysitterId: booking.babysitterId,
        babysitterName,
        startedAt: serverTimestamp(),
        isPaused: false,
        totalPausedSeconds: 0,
        hourlyRate: booking.hourlyRate,
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

// ===================
// REVIEWS
// ===================

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
                isAvailable: data.sitterAvailable || false,
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

    // 🏆 Highly Recommended - מעל 95% המלצות (4-5 כוכבים)
    if (reviewCount > 0) {
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

/**
 * Get or create chat between parent and babysitter
 */
export async function getOrCreateChat(parentId: string, babysitterId: string): Promise<Chat> {
    // Check if chat exists
    const q = query(
        collection(db, 'chats'),
        where('parentId', '==', parentId),
        where('babysitterId', '==', babysitterId)
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() } as Chat;
    }

    // Create new chat
    const chatRef = await addDoc(collection(db, 'chats'), {
        parentId,
        babysitterId,
        unreadByParent: 0,
        unreadByBabysitter: 0,
        createdAt: serverTimestamp(),
    });

    return {
        id: chatRef.id,
        parentId,
        babysitterId,
        unreadByParent: 0,
        unreadByBabysitter: 0,
        createdAt: Timestamp.now(),
    };
}

/**
 * Send message in chat
 */
export async function sendMessage(chatId: string, senderId: string, text: string): Promise<void> {
    // Add message
    await addDoc(collection(db, 'chats', chatId, 'messages'), {
        chatId,
        senderId,
        text,
        createdAt: serverTimestamp(),
    });

    // Update chat with last message
    const chatDoc = await getDoc(doc(db, 'chats', chatId));
    const chatData = chatDoc.data();

    const isParent = senderId === chatData?.parentId;

    await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: text,
        lastMessageAt: serverTimestamp(),
        // Increment unread for the other party
        ...(isParent
            ? { unreadByBabysitter: (chatData?.unreadByBabysitter || 0) + 1 }
            : { unreadByParent: (chatData?.unreadByParent || 0) + 1 }
        ),
    });
}

/**
 * Get chat messages
 */
export async function getChatMessages(chatId: string): Promise<ChatMessage[]> {
    const q = query(
        collection(db, 'chats', chatId, 'messages'),
        orderBy('createdAt', 'asc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
}

/**
 * Subscribe to chat messages
 */
export function subscribeToChatMessages(
    chatId: string,
    callback: (messages: ChatMessage[]) => void
): () => void {
    const q = query(
        collection(db, 'chats', chatId, 'messages'),
        orderBy('createdAt', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
        callback(messages);
    });
}

/**
 * Mark chat as read
 */
export async function markChatAsRead(chatId: string, userId: string): Promise<void> {
    const chatDoc = await getDoc(doc(db, 'chats', chatId));
    const chatData = chatDoc.data();

    const isParent = userId === chatData?.parentId;

    await updateDoc(doc(db, 'chats', chatId), {
        ...(isParent ? { unreadByParent: 0 } : { unreadByBabysitter: 0 }),
    });
}

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
