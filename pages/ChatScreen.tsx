import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Image, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { auth } from '../services/firebaseConfig';
import { getOrCreateChat, sendMessage as sendFirebaseMessage, subscribeToChatMessages, markChatAsRead } from '../services/babysitterService';
import { ChatMessage } from '../types/babysitter';

// Navigation types
type RootStackParamList = {
    ChatScreen: { sitterName?: string; sitterImage?: string; sitterId?: string };
};

type ChatScreenProps = NativeStackScreenProps<RootStackParamList, 'ChatScreen'>;

// Message type for display
interface DisplayMessage {
    id: string;
    text: string;
    sender: 'me' | 'other';
    time: string;
}

const ChatScreen = ({ route, navigation }: ChatScreenProps) => {
    const { sitterName = 'בייביסיטר', sitterImage, sitterId } = route.params || {};
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<DisplayMessage[]>([]);
    const [chatId, setChatId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    // Initialize chat
    useEffect(() => {
        const initChat = async () => {
            const userId = auth.currentUser?.uid;
            if (!userId || !sitterId) {
                // Fallback to mock mode if no sitter ID
                setLoading(false);
                setMessages([
                    { id: '1', text: 'היי! ראיתי את הפרופיל שלך ואשמח לבדוק זמינות להיום בערב.', sender: 'me', time: '18:30' },
                    { id: '2', text: 'היי! בטח, אני פנויה החל מ-19:00. איפה אתם גרים?', sender: 'other', time: '18:32' },
                ]);
                return;
            }

            try {
                const chat = await getOrCreateChat(userId, sitterId);
                setChatId(chat.id);

                // Mark as read
                await markChatAsRead(chat.id, userId);
                setLoading(false);
            } catch (error) {
                console.error('Failed to init chat:', error);
                setLoading(false);
            }
        };

        initChat();
    }, [sitterId]);

    // Subscribe to messages
    useEffect(() => {
        if (!chatId) return;
        const userId = auth.currentUser?.uid;

        const unsubscribe = subscribeToChatMessages(chatId, (firebaseMessages: ChatMessage[]) => {
            const displayMessages: DisplayMessage[] = firebaseMessages.map(msg => ({
                id: msg.id,
                text: msg.text,
                sender: msg.senderId === userId ? 'me' : 'other',
                time: msg.createdAt?.toDate?.()
                    ? msg.createdAt.toDate().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
                    : '',
            }));
            setMessages(displayMessages);
        });

        return () => unsubscribe();
    }, [chatId]);

    const handleSendMessage = async () => {
        if (!message.trim()) return;

        const userId = auth.currentUser?.uid;
        const text = message.trim();
        setMessage('');

        if (!chatId || !userId) {
            // Mock mode - add locally
            const newMessage: DisplayMessage = {
                id: Date.now().toString(),
                text,
                sender: 'me',
                time: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
            };
            setMessages(prev => [...prev, newMessage]);
            return;
        }

        try {
            setSending(true);
            await sendFirebaseMessage(chatId, userId, text);
        } catch (error) {
            console.error('Failed to send message:', error);
            // Restore message on error
            setMessage(text);
        } finally {
            setSending(false);
        }
    };

    const renderMessage = ({ item }: { item: DisplayMessage }) => (
        <View style={[styles.bubble, item.sender === 'me' ? styles.myBubble : styles.otherBubble]}>
            <Text style={[styles.msgText, item.sender === 'me' ? styles.myText : styles.otherText]}>
                {item.text}
            </Text>
            <Text style={[styles.timeText, item.sender === 'me' ? styles.myTimeText : styles.otherTimeText]}>
                {item.time}
            </Text>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-forward" size={24} color="#1F2937" />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerName}>{sitterName}</Text>
                    <View style={styles.statusContainer}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusText}>מחובר/ת</Text>
                    </View>
                </View>
                <Image
                    source={{ uri: sitterImage || 'https://via.placeholder.com/50' }}
                    style={styles.avatar}
                />
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366F1" />
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={[...messages].reverse()}
                    inverted
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    renderItem={renderMessage}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* Input Area */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={10}
            >
                <View style={styles.inputContainer}>
                    <TouchableOpacity
                        style={[styles.sendBtn, (!message.trim() || sending) && styles.sendBtnDisabled]}
                        onPress={handleSendMessage}
                        disabled={!message.trim() || sending}
                    >
                        {sending ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Ionicons name="send" size={18} color="#fff" />
                        )}
                    </TouchableOpacity>
                    <TextInput
                        style={styles.input}
                        placeholder="כתוב הודעה..."
                        placeholderTextColor="#9CA3AF"
                        value={message}
                        onChangeText={setMessage}
                        textAlign="right"
                        multiline
                        maxLength={500}
                    />
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB'
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 60,
        paddingBottom: 16,
        paddingHorizontal: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    backButton: {
        padding: 8,
    },
    headerInfo: {
        alignItems: 'center'
    },
    headerName: {
        fontSize: 17,
        fontWeight: '600',
        color: '#1F2937'
    },
    statusContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginTop: 4,
        gap: 4,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#10B981'
    },
    statusText: {
        fontSize: 12,
        color: '#6B7280',
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F3F4F6',
    },

    listContent: {
        padding: 20,
        paddingBottom: 8,
    },
    bubble: {
        maxWidth: '80%',
        padding: 12,
        paddingBottom: 8,
        borderRadius: 18,
        marginBottom: 8,
    },
    myBubble: {
        alignSelf: 'flex-start',
        backgroundColor: '#6366F1',
        borderBottomLeftRadius: 4,
    },
    otherBubble: {
        alignSelf: 'flex-end',
        backgroundColor: '#fff',
        borderBottomRightRadius: 4,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },

    msgText: {
        fontSize: 15,
        lineHeight: 22,
    },
    myText: {
        color: '#fff'
    },
    otherText: {
        color: '#1F2937'
    },
    timeText: {
        fontSize: 11,
        marginTop: 4,
    },
    myTimeText: {
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'left',
    },
    otherTimeText: {
        color: '#9CA3AF',
        textAlign: 'right',
    },

    inputContainer: {
        flexDirection: 'row',
        padding: 16,
        paddingBottom: 32,
        backgroundColor: '#fff',
        alignItems: 'flex-end',
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    input: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        borderRadius: 24,
        paddingHorizontal: 18,
        paddingVertical: 12,
        fontSize: 15,
        textAlign: 'right',
        maxHeight: 100,
        color: '#1F2937',
    },
    sendBtn: {
        width: 44,
        height: 44,
        backgroundColor: '#6366F1',
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendBtnDisabled: {
        backgroundColor: '#D1D5DB',
    },
});

export default ChatScreen;
