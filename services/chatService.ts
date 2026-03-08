// services/chatService.ts
import { db } from './firebaseConfig';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, Timestamp } from 'firebase/firestore';

export interface Message {
    id: string;
    text: string;
    senderId: string;
    createdAt: Timestamp | null;
    readBy?: string[];
}

export function subscribeToMessages(
    chatId: string,
    callback: (messages: Message[]) => void
): () => void {
    const q = query(
        collection(db, 'chats', chatId, 'messages'),
        orderBy('createdAt', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
        const messages: Message[] = snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Message, 'id'>),
        }));
        callback(messages);
    });
}

export async function markMessagesAsRead(chatId: string, userId: string): Promise<void> {
    // no-op stub — implement when chat feature is built
}
