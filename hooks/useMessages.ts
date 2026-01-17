// hooks/useMessages.ts - Real-time messages hook

import { useState, useEffect } from 'react';
import { subscribeToMessages, Message, markMessagesAsRead } from '../services/chatService';

export function useMessages(chatId: string | null) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!chatId) {
            setMessages([]);
            setLoading(false);
            return;
        }

        try {
            const unsubscribe = subscribeToMessages(chatId, (newMessages) => {
                setMessages(newMessages);
                setLoading(false);
            });

            // Mark as read when opening chat
            markMessagesAsRead(chatId);

            return unsubscribe;
        } catch (err) {
            setError(err as Error);
            setLoading(false);
            return () => { };
        }
    }, [chatId]);

    return { messages, loading, error };
}
