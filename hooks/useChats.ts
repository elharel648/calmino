// hooks/useChats.ts - Real-time chats hook

import { useState, useEffect } from 'react';
import { subscribeToChats, Chat } from '../services/chatService';

export function useChats() {
    const [chats, setChats] = useState<Chat[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        try {
            const unsubscribe = subscribeToChats((newChats) => {
                setChats(newChats);
                setLoading(false);
            });

            return unsubscribe;
        } catch (err) {
            setError(err as Error);
            setLoading(false);
            return () => { };
        }
    }, []);

    return { chats, loading, error };
}
