// services/chatService.ts - Firebase Chat Operations

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
    setDoc,
    increment,
} from 'firebase/firestore';
import { db, auth } from './firebaseConfig';
import { getUserPushToken, sendPushNotification } from './pushNotificationService';

export interface Message {
    id: string;
    senderId: string;
    text: string;
    timestamp: Timestamp;
    read: boolean;
}

export interface Chat {
    id: string;
    participants: string[];
    sitterId: string;
    parentId: string;
    sitterName: string;
    sitterImage: string;
    parentName: string;
    lastMessage: string;
    lastMessageTime: Timestamp;
    unreadCount: { [userId: string]: number };
    createdAt: Timestamp;
}

/**
 * Get or create a chat between parent and sitter
 */
export async function getOrCreateChat(
    sitterId: string,
    sitterName: string,
    sitterImage: string
): Promise<string> {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    // Check if chat already exists
    const chatsRef = collection(db, 'chats');
    const q = query(
        chatsRef,
        where('participants', 'array-contains', userId)
    );

    const snapshot = await new Promise<any>((resolve, reject) => {
        const unsubscribe = onSnapshot(q, resolve, reject);
        setTimeout(() => {
            unsubscribe();
            reject(new Error('Timeout'));
        }, 5000);
    });

    // Find chat with this sitter
    const existingChat = snapshot.docs.find((doc: any) => {
        const data = doc.data();
        return data.participants.includes(sitterId);
    });

    if (existingChat) {
        return existingChat.id;
    }

    // Create new chat
    const userDoc = await getDoc(doc(db, 'users', userId));
    const userData = userDoc.data();

    const newChatRef = await addDoc(chatsRef, {
        participants: [userId, sitterId],
        sitterId,
        parentId: userId,
        sitterName,
        sitterImage,
        parentName: userData?.name || 'הורה',
        lastMessage: '',
        lastMessageTime: serverTimestamp(),
        unreadCount: {
            [userId]: 0,
            [sitterId]: 0,
        },
        createdAt: serverTimestamp(),
    });

    return newChatRef.id;
}

/**
 * Send a message in a chat
 */
export async function sendMessage(chatId: string, text: string): Promise<void> {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    // Get chat to find other participant
    const chatDoc = await getDoc(doc(db, 'chats', chatId));
    if (!chatDoc.exists()) throw new Error('Chat not found');

    const chatData = chatDoc.data();
    const otherUserId = chatData.participants.find((id: string) => id !== userId);

    // Add message
    await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: userId,
        text: text.trim(),
        timestamp: serverTimestamp(),
        read: false,
    });

    // Update chat metadata
    await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: text.trim(),
        lastMessageTime: serverTimestamp(),
        [`unreadCount.${otherUserId}`]: increment(1),
    });

    // Send push notification to other user
    if (otherUserId) {
        const otherUserToken = await getUserPushToken(otherUserId);
        if (otherUserToken) {
            const senderName = chatData.parentId === userId
                ? chatData.parentName
                : chatData.sitterName;

            await sendPushNotification(
                otherUserToken,
                `הודעה חדשה מ${senderName}`,
                text.trim().length > 50 ? text.trim().substring(0, 50) + '...' : text.trim(),
                { type: 'chat_message', chatId }
            );
        }
    }
}

/**
 * Mark all messages as read
 */
export async function markMessagesAsRead(chatId: string): Promise<void> {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    await updateDoc(doc(db, 'chats', chatId), {
        [`unreadCount.${userId}`]: 0,
    });
}

/**
 * Subscribe to user's chats (real-time)
 */
export function subscribeToChats(
    callback: (chats: Chat[]) => void
): () => void {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    const q = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', userId),
        orderBy('lastMessageTime', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const chats: Chat[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        } as Chat));
        callback(chats);
    });
}

/**
 * Subscribe to messages in a chat (real-time)
 */
export function subscribeToMessages(
    chatId: string,
    callback: (messages: Message[]) => void
): () => void {
    const q = query(
        collection(db, 'chats', chatId, 'messages'),
        orderBy('timestamp', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
        const messages: Message[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        } as Message));
        callback(messages);
    });
}
