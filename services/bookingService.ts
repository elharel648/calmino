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

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface Booking {
    id: string;
    sitterId: string;
    parentId: string;
    sitterName: string;
    parentName: string;
    childIds: string[];
    date: Timestamp;
    startTime: string;
    endTime: string;
    hours: number;
    totalPrice: number;
    status: BookingStatus;
    location: string;
    notes: string;
    createdAt: Timestamp;
    confirmedAt?: Timestamp;
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
        totalPrice,
        status: 'pending' as BookingStatus,
        location,
        notes,
        createdAt: serverTimestamp(),
    });

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
