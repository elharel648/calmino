// hooks/useBookings.ts - Real-time bookings hook

import { useState, useEffect } from 'react';
import { subscribeToParentBookings, subscribeToSitterBookings, Booking } from '../services/bookingService';

export function useBookings(type: 'parent' | 'sitter' = 'parent') {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        try {
            const subscribe = type === 'parent'
                ? subscribeToParentBookings
                : subscribeToSitterBookings;

            const unsubscribe = subscribe((newBookings) => {
                setBookings(newBookings);
                setLoading(false);
            });

            return unsubscribe;
        } catch (err) {
            setError(err as Error);
            setLoading(false);
            return () => { };
        }
    }, [type]);

    return { bookings, loading, error };
}
