// services/bookingService.ts - Firebase Booking Operations

import {
    collection,
    doc,
    addDoc,
    updateDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    Timestamp,
    getDoc,
} from 'firebase/firestore';
import { db, auth } from './firebaseConfig';
import { getUserPushToken, sendPushNotification } from './pushNotificationService';

export type BookingStatus = 'pending' | 'accepted' | 'confirmed' | 'completed' | 'cancelled';

export interface Booking {
    id: string;
    babysitterId: string;  // ✅ FIXED: Changed from sitterId to babysitterId to match Firestore
    parentId: string;
    sitterName: string;
    parentName: string;
    childIds: string[];
    date: Timestamp;
    startTime: string;
    endTime: string;
    hours: number;
    hourlyRate: number;
    totalPrice: number;
    status: BookingStatus;
    location: string;
    notes: string;
    createdAt: Timestamp;
    confirmedAt?: Timestamp;
    // Actual shift execution details
    actualStart?: Timestamp;
    actualEnd?: Timestamp;
    totalMinutes?: number;
    totalAmount?: number;
    updatedAt?: Timestamp;
}

/**
 * Create a new booking
 */
export async function createBooking(
    sitterId: string,
    sitterName: string,
    childIds: string[],
    date: Date,
    startTime: string,
    endTime: string,
    hourlyRate: number,
    location: string,
    notes: string
): Promise<string> {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    // Calculate hours and price
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const hours = (endMinutes - startMinutes) / 60;
    const totalPrice = hours * hourlyRate;

    // Get user name
    const userDoc = await getDoc(doc(db, 'users', userId));
    const userData = userDoc.data();

    const bookingRef = await addDoc(collection(db, 'bookings'), {
        sitterId,
        parentId: userId,
        sitterName,
        parentName: userData?.name || 'הורה',
        childIds,
        date: Timestamp.fromDate(date),
        startTime,
        endTime,
        hours,
        hourlyRate,
        totalPrice,
        status: 'pending' as BookingStatus,
        location,
        notes,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    // Send push notification to sitter
    const sitterToken = await getUserPushToken(sitterId);
    if (sitterToken) {
        await sendPushNotification(
            sitterToken,
            '📅 הזמנה חדשה!',
            `${userData?.name || 'הורה'} רוצה להזמין אותך ל-${startTime}-${endTime}`,
            { type: 'booking_update', bookingId: bookingRef.id }
        );
    }

    return bookingRef.id;
}

/**
 * Update booking status
 */
export async function updateBookingStatus(
    bookingId: string,
    status: BookingStatus
): Promise<void> {
    const updateData: any = { status };

    if (status === 'confirmed') {
        updateData.confirmedAt = serverTimestamp();
    }

    await updateDoc(doc(db, 'bookings', bookingId), updateData);

    // Send push notification
    const bookingDoc = await getDoc(doc(db, 'bookings', bookingId));
    if (bookingDoc.exists()) {
        const booking = bookingDoc.data();
        const currentUserId = auth.currentUser?.uid;

        // Determine who to notify
        const notifyUserId = currentUserId === booking.babysitterId
            ? booking.parentId
            : booking.babysitterId;

        const notifyToken = await getUserPushToken(notifyUserId);
        if (notifyToken) {
            const statusMessages: Record<BookingStatus, string> = {
                pending: 'ההזמנה נוצרה',
                confirmed: '✅ ההזמנה אושרה!',
                completed: '🎉 ההזמנה הסתיימה',
                cancelled: '❌ ההזמנה בוטלה',
            };

            await sendPushNotification(
                notifyToken,
                statusMessages[status],
                `הזמנה ב-${booking.date.toDate().toLocaleDateString('he-IL')} ב-${booking.startTime}`,
                { type: 'booking_update', bookingId }
            );
        }
    }
}

/**
 * Subscribe to user's bookings (as parent)
 */
export function subscribeToParentBookings(
    callback: (bookings: Booking[]) => void
): () => void {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    const q = query(
        collection(db, 'bookings'),
        where('parentId', '==', userId),
        orderBy('date', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const bookings: Booking[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        } as Booking));
        callback(bookings);
    });
}

/**
 * Subscribe to sitter's bookings (as sitter)
 */
export function subscribeToSitterBookings(
    callback: (bookings: Booking[]) => void
): () => void {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    const q = query(
        collection(db, 'bookings'),
        where('sitterId', '==', userId),
        orderBy('date', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const bookings: Booking[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        } as Booking));
        callback(bookings);
    });
}
