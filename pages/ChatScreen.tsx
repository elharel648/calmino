// pages/ChatScreen.tsx - Real-time Firebase Chat

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { MessageCircle } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getDoc, doc } from 'firebase/firestore';
import { auth, db } from '../services/firebaseConfig';
import { getOrCreateChat, sendMessage, markMessagesAsRead } from '../services/chatService';
import { useMessages } from '../hooks/useMessages';
import { useTheme } from '../context/ThemeContext';

// Navigation types
type RootStackParamList = {
    ChatScreen: {
        // Option 1: Pass sitter info (from profile)
        sitterName?: string;
        sitterImage?: string;
        sitterId?: string;
        // Option 2: Pass chatId directly (from notification)
        chatId?: string;
    };
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
    const { theme, isDarkMode } = useTheme();
    const { sitterName: paramSitterName, sitterImage: paramSitterImage, sitterId: paramSitterId, chatId: paramChatId } = route.params || {};
    const [messageText, setMessageText] = useState('');
    const [chatId, setChatId] = useState<string | null>(paramChatId || null);
    const [chatData, setChatData] = useState<{
        sitterName: string;
        sitterImage: string;
        sitterId: string;
    } | null>(null);
    const [initLoading, setInitLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const insets = useSafeAreaInsets();
    const flatListRef = useRef<FlatList>(null);
    const markAsReadTimeoutRef = useRef<NodeJS.Timeout>();
    const inputRef = useRef<TextInput>(null);

    // Tab bar height: 90px on iOS, 72px on Android
    const tabBarHeight = Platform.OS === 'ios' ? 90 : 72;

    const { messages, loading: messagesLoading } = useMessages(chatId);

    // Effective sitter info (from params or fetched chat data)
    const sitterName = chatData?.sitterName || paramSitterName || 'בייביסיטר';
    const sitterImage = chatData?.sitterImage || paramSitterImage || '';
    const sitterId = chatData?.sitterId || paramSitterId || '';

    // Fetch chat data when chatId is provided (from notification)
    useEffect(() => {
        if (paramChatId && !paramSitterId) {
            const fetchChatData = async () => {
                try {
                    const chatDoc = await getDoc(doc(db, 'chats', paramChatId));
                    if (chatDoc.exists()) {
                        const data = chatDoc.data();
                        const userId = auth.currentUser?.uid;
                        const isParent = data.parentId === userId;

                        setChatData({
                            sitterName: isParent ? data.sitterName : data.parentName,
                            sitterImage: data.sitterImage || '',
                            sitterId: isParent ? data.sitterId : data.parentId,
                        });
                    }
                } catch (error) {
                    console.error('Failed to load chat:', error);
                } finally {
                    setInitLoading(false);
                }
            };
            fetchChatData();
        }
    }, [paramChatId, paramSitterId]);

    // Initialize chat when sitter info is provided (from profile)
    useEffect(() => {
        const initChat = async () => {
            if (!paramSitterId) {
                if (!paramChatId) setInitLoading(false);
                return;
            }

            try {
                const id = await getOrCreateChat(paramSitterId, paramSitterName || 'בייביסיטר', paramSitterImage || '');
                setChatId(id);
            } catch (error) {
                console.error('Failed to init chat:', error);
            } finally {
                setInitLoading(false);
            }
        };

        initChat();
    }, [paramSitterId, paramSitterName, paramSitterImage, paramChatId]);

    // Convert Firebase messages to display format
    const displayMessages: DisplayMessage[] = useMemo(() => {
        return messages.map((msg) => ({
            id: msg.id,
            text: msg.text,
            sender: msg.senderId === auth.currentUser?.uid ? 'me' : 'other',
            time: msg.timestamp?.toDate?.()
                ? msg.timestamp.toDate().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
                : '',
        }));
    }, [messages]);

    // Optimize: Reverse array only once, memoized
    const reversedMessages = useMemo(() => {
        return [...displayMessages].reverse();
    }, [displayMessages]);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (reversedMessages.length > 0 && !messagesLoading) {
            // Small delay to ensure render is complete
            setTimeout(() => {
                flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
            }, 100);
        }
    }, [reversedMessages.length, messagesLoading]);

    // Mark messages as read after they are displayed (with debounce)
    useEffect(() => {
        if (chatId && reversedMessages.length > 0) {
            // Clear previous timeout
            if (markAsReadTimeoutRef.current) {
                clearTimeout(markAsReadTimeoutRef.current);
            }
            // Debounce - mark as read 500ms after messages are displayed
            markAsReadTimeoutRef.current = setTimeout(() => {
                markMessagesAsRead(chatId).catch(console.error);
            }, 500);
        }
        return () => {
            if (markAsReadTimeoutRef.current) {
                clearTimeout(markAsReadTimeoutRef.current);
            }
        };
    }, [chatId, reversedMessages.length]);

    // Keyboard handling - auto-scroll when keyboard opens
    useEffect(() => {
        const keyboardWillShow = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            () => {
                // Auto-scroll when keyboard opens
                setTimeout(() => {
                    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
                }, 150);
            }
        );

        return () => {
            keyboardWillShow.remove();
        };
    }, []);

    const handleSendMessage = async () => {
        if (!messageText.trim() || !chatId) return;

        const text = messageText.trim();
        setMessageText('');

        try {
            setSending(true);
            await sendMessage(chatId, text);
            // Keep focus on input for quick replies
            setTimeout(() => inputRef.current?.focus(), 100);
        } catch (error) {
            console.error('Failed to send message:', error);
            setMessageText(text); // Restore on error
        } finally {
            setSending(false);
        }
    };

    const renderMessage = ({ item }: { item: DisplayMessage }) => (
        <View style={[
            styles.bubble,
            item.sender === 'me'
                ? [styles.myBubble, { backgroundColor: theme.primary }]
                : [styles.otherBubble, { backgroundColor: theme.card, borderColor: theme.border }]
        ]}>
            <Text style={[styles.msgText, item.sender === 'me' ? [styles.myText, { color: theme.card }] : [styles.otherText, { color: theme.textPrimary }]]}>
                {item.text}
            </Text>
            <Text style={[styles.timeText, item.sender === 'me' ? styles.myTimeText : [styles.otherTimeText, { color: theme.textSecondary }]]}>
                {item.time}
            </Text>
        </View>
    );

    const [imageError, setImageError] = useState(false);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-forward" size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={[styles.headerName, { color: theme.textPrimary }]}>{sitterName}</Text>
                    <View style={styles.statusContainer}>
                        <View style={[styles.statusDot, { backgroundColor: theme.success }]} />
                        <Text style={[styles.statusText, { color: theme.textSecondary }]}>מחובר/ת</Text>
                    </View>
                </View>
                {!imageError && sitterImage ? (
                    <Image
                        source={{ uri: sitterImage }}
                        style={styles.avatar}
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <View style={[styles.avatar, { backgroundColor: theme.cardSecondary, alignItems: 'center', justifyContent: 'center' }]}>
                        <Ionicons name="person" size={20} color={theme.textSecondary} />
                    </View>
                )}
            </View>

            {initLoading || messagesLoading ? (
                <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : reversedMessages.length === 0 ? (
                <View style={[styles.emptyState, { backgroundColor: theme.background }]}>
                    <MessageCircle size={56} color={theme.textTertiary} strokeWidth={1.5} />
                    <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                        אין הודעות עדיין
                    </Text>
                    <Text style={[styles.emptySubtext, { color: theme.textTertiary }]}>
                        שלח/י הודעה ראשונה כדי להתחיל שיחה
                    </Text>
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={reversedMessages}
                    inverted
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    renderItem={renderMessage}
                    showsVerticalScrollIndicator={false}
                    removeClippedSubviews={true}
                    maxToRenderPerBatch={10}
                    windowSize={10}
                    style={{ backgroundColor: theme.background }}
                    onContentSizeChange={() => {
                        // Auto-scroll when content size changes (new message)
                        if (reversedMessages.length > 0) {
                            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
                        }
                    }}
                />
            )}

            {/* Input Area */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? tabBarHeight + insets.bottom : tabBarHeight}
            >
                <View style={[styles.inputContainer, { paddingBottom: tabBarHeight + insets.bottom, backgroundColor: theme.card, borderTopColor: theme.border }]}>
                    <TouchableOpacity
                        style={[styles.sendBtn, (!messageText.trim() || sending) && styles.sendBtnDisabled, { backgroundColor: theme.primary }]}
                        onPress={handleSendMessage}
                        disabled={!messageText.trim() || sending}
                    >
                        {sending ? (
                            <ActivityIndicator size="small" color={theme.card} />
                        ) : (
                            <Ionicons name="send" size={18} color={theme.card} />
                        )}
                    </TouchableOpacity>
                    <TextInput
                        ref={inputRef}
                        style={[styles.input, { backgroundColor: theme.card, color: theme.textPrimary, borderColor: theme.border }]}
                        placeholder="כתוב הודעה..."
                        placeholderTextColor={theme.textSecondary}
                        value={messageText}
                        onChangeText={setMessageText}
                        textAlign="right"
                        multiline
                        maxLength={500}
                        returnKeyType="send"
                        onSubmitEditing={handleSendMessage}
                        blurOnSubmit={false}
                    />
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        gap: 16,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
    },
    emptySubtext: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 60,
        paddingBottom: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 8,
    },
    headerInfo: {
        alignItems: 'center',
    },
    headerName: {
        fontSize: 17,
        fontWeight: '600',
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
    },
    statusText: {
        fontSize: 12,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
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
        borderBottomLeftRadius: 4,
    },
    otherBubble: {
        alignSelf: 'flex-end',
        borderBottomRightRadius: 4,
        borderWidth: 1,
    },

    msgText: {
        fontSize: 15,
        lineHeight: 22,
    },
    myText: {
    },
    otherText: {
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
        textAlign: 'right',
    },

    inputContainer: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'flex-end',
        gap: 12,
        borderTopWidth: 1,
    },
    input: {
        flex: 1,
        borderRadius: 24,
        paddingHorizontal: 18,
        paddingVertical: 12,
        fontSize: 15,
        textAlign: 'right',
        maxHeight: 100,
        borderWidth: 1,
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendBtnDisabled: {
        opacity: 0.5,
    },
});

export default ChatScreen;
