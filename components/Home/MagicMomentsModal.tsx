import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Platform,
    Alert,
    Animated as RNAnimated,
} from 'react-native';
import { X, Sparkles, Camera } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../context/ThemeContext';
import { useBabyProfile } from '../../hooks/useBabyProfile';
import { useActiveChild } from '../../context/ActiveChildContext';
import AlbumCarousel from '../Profile/AlbumCarousel';
import Animated from 'react-native-reanimated';
import { ANIMATIONS } from '../../utils/designSystem';

interface MagicMomentsModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function MagicMomentsModal({ visible, onClose }: MagicMomentsModalProps) {
    const { theme, isDarkMode } = useTheme();
    const { activeChild } = useActiveChild();
    const { baby, updatePhoto, updateAlbumNote } = useBabyProfile(activeChild?.childId);
    const fadeAnim = useRef(new RNAnimated.Value(0)).current;
    const scaleAnim = useRef(new RNAnimated.Value(0.9)).current;

    useEffect(() => {
        if (visible) {
            RNAnimated.parallel([
                RNAnimated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                RNAnimated.spring(scaleAnim, {
                    toValue: 1,
                    damping: 20,
                    stiffness: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            fadeAnim.setValue(0);
            scaleAnim.setValue(0.9);
        }
    }, [visible]);

    const handleClose = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        RNAnimated.parallel([
            RNAnimated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            RNAnimated.timing(scaleAnim, {
                toValue: 0.9,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => onClose());
    };

    const handleMonthPress = async (month: number) => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        await updatePhoto('album', month);
    };

    const handleAddCustomPhoto = async (month: number) => {
        // Month picker is now in AlbumCarousel - just handle the photo upload
        await updatePhoto('album', month);
    };

    const handleNoteUpdate = async (month: number, note: string) => {
        await updateAlbumNote(month, note);
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={handleClose}
        >
            <RNAnimated.View 
                style={[
                    styles.overlay,
                    {
                        opacity: fadeAnim,
                        backgroundColor: theme.modalOverlay,
                    }
                ]}
            >
                {Platform.OS === 'ios' && (
                    <BlurView
                        intensity={20}
                        tint={isDarkMode ? 'dark' : 'light'}
                        style={StyleSheet.absoluteFill}
                    />
                )}
                <TouchableOpacity 
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={handleClose}
                />
                <RNAnimated.View
                    style={[
                        styles.modal,
                        {
                            backgroundColor: theme.card,
                            transform: [{ scale: scaleAnim }],
                        }
                    ]}
                >
                    {/* Premium Header */}
                    <Animated.View 
                        entering={ANIMATIONS.fadeInDown(0)}
                        style={styles.header}
                    >
                        <View style={{ width: 40 }} />
                        <View style={styles.headerContent}>
                            <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? 'rgba(167, 139, 250, 0.2)' : 'rgba(167, 139, 250, 0.15)' }]}>
                                <Sparkles size={20} color={theme.accent} strokeWidth={2.5} />
                            </View>
                            <Text style={[styles.title, { color: theme.textPrimary }]}>רגעים קסומים</Text>
                        </View>
                        <TouchableOpacity 
                            onPress={handleClose} 
                            style={[styles.closeBtn, { backgroundColor: theme.inputBackground }]}
                            activeOpacity={0.7}
                        >
                            <X size={20} color={theme.textSecondary} strokeWidth={2.5} />
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Premium Description */}
                    <Animated.View entering={ANIMATIONS.fadeInDown(50)}>
                        <Text style={[styles.description, { color: theme.textSecondary }]}>
                            לחצו על חודש כדי להוסיף תמונה מהרגע הקסום
                        </Text>
                    </Animated.View>

                    {/* Album Carousel */}
                    <Animated.View 
                        entering={ANIMATIONS.fadeInDown(100)}
                        style={styles.carouselContainer}
                    >
                        <AlbumCarousel
                            album={baby?.album}
                            albumNotes={baby?.albumNotes}
                            onMonthPress={handleMonthPress}
                            onAddCustomPhoto={handleAddCustomPhoto}
                            onNoteUpdate={handleNoteUpdate}
                        />
                    </Animated.View>

                    {/* Baby Name with Camera Icon - Premium */}
                    {baby?.name && (
                        <Animated.View 
                            entering={ANIMATIONS.fadeInDown(150)}
                            style={[styles.babyNameRow, { borderTopColor: theme.border }]}
                        >
                            <View style={[styles.cameraIconWrapper, { backgroundColor: theme.cardSecondary }]}>
                                <Camera size={14} color={theme.textSecondary} strokeWidth={2} />
                            </View>
                            <Text style={[styles.babyName, { color: theme.textPrimary }]}>
                                האלבום של {baby.name}
                            </Text>
                        </Animated.View>
                    )}
                </RNAnimated.View>
            </RNAnimated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modal: {
        width: '100%',
        maxWidth: 420,
        borderRadius: 28,
        padding: 28,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
        elevation: 12,
    },
    header: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    headerContent: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    description: {
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 28,
        lineHeight: 22,
        letterSpacing: -0.2,
    },
    carouselContainer: {
        marginBottom: 24,
    },
    babyNameRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 4,
        paddingTop: 16,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    cameraIconWrapper: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    babyName: {
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
        letterSpacing: -0.2,
    },
});
