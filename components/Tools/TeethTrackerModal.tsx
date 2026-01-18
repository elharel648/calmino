import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Image, Platform } from 'react-native';
import { X, Check, Sparkles } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { useActiveChild } from '../../context/ActiveChildContext';
import { db } from '../../services/firebaseConfig';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface TeethTrackerModalProps {
    visible: boolean;
    onClose: () => void;
}

// Teeth Layout Configuration matching the "Oval" design
// We'll arrange them in a continuous loop or two arcs that meet.
// IDs must match standard naming we used before to preserve data.
// 20 Primary Teeth.
// Numbering/Types for visual reference:
// Central Incisor (1), Lateral Incisor (2), Canine (3), First Molar (4), Second Molar (5)
// Quadrants: Upper Right (UR), Upper Left (UL), Lower Left (LL), Lower Right (LR)

const TEETH_CONFIG = [
    // --- Upper Arch (Left to Right) ---
    // Upper Left (Outer to Center)
    { id: 'start_upper_left_molar_2', label: 'טוחנת שנייה', type: 'molar_2', color: '#A78BFA', rot: 30, top: 100, left: 40 }, // Purple
    { id: 'start_upper_left_molar_1', label: 'טוחנת ראשונה', type: 'molar_1', color: '#60A5FA', rot: 20, top: 60, left: 50 }, // Blue
    { id: 'start_upper_left_canine', label: 'ניב', type: 'canine', color: '#34D399', rot: 10, top: 35, left: 75 }, // Green
    { id: 'start_upper_left_incisor_2', label: 'חותכת צידית', type: 'incisor_lat', color: '#A3E635', rot: 5, top: 15, left: 105 }, // Lime
    { id: 'start_upper_left_incisor_1', label: 'חותכת מרכזית', type: 'incisor_cen', color: '#F87171', rot: 0, top: 10, left: 135 }, // Red

    // Upper Right (Center to Outer)
    { id: 'start_upper_right_incisor_1', label: 'חותכת מרכזית', type: 'incisor_cen', color: '#F87171', rot: 0, top: 10, left: 175 },
    { id: 'start_upper_right_incisor_2', label: 'חותכת צידית', type: 'incisor_lat', color: '#A3E635', rot: -5, top: 15, left: 205 },
    { id: 'start_upper_right_canine', label: 'ניב', type: 'canine', color: '#34D399', rot: -10, top: 35, left: 235 },
    { id: 'start_upper_right_molar_1', label: 'טוחנת ראשונה', type: 'molar_1', color: '#60A5FA', rot: -20, top: 60, left: 260 },
    { id: 'start_upper_right_molar_2', label: 'טוחנת שנייה', type: 'molar_2', color: '#A78BFA', rot: -30, top: 100, left: 270 },

    // --- Lower Arch (Left to Right) ---
    // Lower Left (Outer to Center)
    { id: 'start_lower_left_molar_2', label: 'טוחנת שנייה', type: 'molar_2', color: '#A78BFA', rot: -30, top: 280, left: 40 },
    { id: 'start_lower_left_molar_1', label: 'טוחנת ראשונה', type: 'molar_1', color: '#60A5FA', rot: -20, top: 320, left: 50 },
    { id: 'start_lower_left_canine', label: 'ניב', type: 'canine', color: '#34D399', rot: -10, top: 345, left: 75 },
    { id: 'start_lower_left_incisor_2', label: 'חותכת צידית', type: 'incisor_lat', color: '#A3E635', rot: -5, top: 365, left: 105 },
    { id: 'start_lower_left_incisor_1', label: 'חותכת מרכזית', type: 'incisor_cen', color: '#F87171', rot: 0, top: 370, left: 135 },

    // Lower Right (Center to Outer)
    { id: 'start_lower_right_incisor_1', label: 'חותכת מרכזית', type: 'incisor_cen', color: '#F87171', rot: 0, top: 370, left: 175 },
    { id: 'start_lower_right_incisor_2', label: 'חותכת צידית', type: 'incisor_lat', color: '#A3E635', rot: 5, top: 365, left: 205 },
    { id: 'start_lower_right_canine', label: 'ניב', type: 'canine', color: '#34D399', rot: 10, top: 345, left: 235 },
    { id: 'start_lower_right_molar_1', label: 'טוחנת ראשונה', type: 'molar_1', color: '#60A5FA', rot: 20, top: 320, left: 260 },
    { id: 'start_lower_right_molar_2', label: 'טוחנת שנייה', type: 'molar_2', color: '#A78BFA', rot: 30, top: 280, left: 270 },
];

// Helper to get organic "stone" shapes
const getToothShapeStyle = (type: string) => {
    switch (type) {
        case 'incisor_cen': return { width: 28, height: 32, borderRadius: 10, borderTopLeftRadius: 14, borderTopRightRadius: 14 };
        case 'incisor_lat': return { width: 26, height: 30, borderRadius: 12, borderBottomLeftRadius: 18 };
        case 'canine': return { width: 28, height: 28, borderRadius: 14, borderTopLeftRadius: 4 }; // Pointy
        case 'molar_1': return { width: 34, height: 34, borderRadius: 12, borderTopRightRadius: 16, borderBottomLeftRadius: 16 }; // Irregular square
        case 'molar_2': return { width: 38, height: 36, borderRadius: 14, borderTopLeftRadius: 18, borderBottomRightRadius: 18 }; // Big irregular
        default: return { width: 30, height: 30, borderRadius: 15 };
    }
};

export default function TeethTrackerModal({ visible, onClose }: TeethTrackerModalProps) {
    const { theme, isDarkMode } = useTheme();
    const { activeChild } = useActiveChild();
    const [teethData, setTeethData] = useState<Record<string, Date | null>>({});
    const [selectedTooth, setSelectedTooth] = useState<string | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        if (visible && activeChild?.childId) {
            loadTeethData();
        }
    }, [visible, activeChild?.childId]);

    const loadTeethData = async () => {
        if (!activeChild?.childId) return;
        try {
            const docRef = doc(db, 'babies', activeChild.childId);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                const data = snap.data();
                const rawTeeth = data.teeth || {};
                const parsed: Record<string, Date | null> = {};

                Object.keys(rawTeeth).forEach(key => {
                    const val = rawTeeth[key];
                    if (val) {
                        try {
                            if (val.seconds) {
                                parsed[key] = new Date(val.seconds * 1000);
                            } else if (val instanceof Date) {
                                parsed[key] = val;
                            } else {
                                parsed[key] = new Date(val);
                            }
                        } catch (e) {
                            console.log('Error parsing date', e);
                        }
                    }
                });
                setTeethData(parsed);
            }
        } catch (e) {
            console.error('Failed to load teeth data', e);
        }
    };

    const handleToothPress = (id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedTooth(id);
        const existingDate = teethData[id];
        // If exists, default to that date. If not, default to today.
        setCurrentDate(existingDate || new Date());

        // If it already exists, toggle off? Or just edit date?
        // Let's assume press opens date picker to confirm/change or Remove.
        // For now: Always open date picker.
        setShowDatePicker(true);
    };

    const handleDateChange = async (event: any, selectedDate?: Date) => {
        if (selectedDate && selectedTooth && activeChild?.childId) {
            const newDate = selectedDate;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // Optimistic
            setTeethData(prev => ({ ...prev, [selectedTooth]: newDate }));

            // Save
            try {
                const docRef = doc(db, 'babies', activeChild.childId);
                await updateDoc(docRef, {
                    [`teeth.${selectedTooth}`]: Timestamp.fromDate(newDate)
                });
            } catch (e) {
                console.error('Failed to save tooth', e);
            }
        }
        setShowDatePicker(false);
        setSelectedTooth(null);
    };

    // Toggle logic: If user cancels date picker but wants to remove tooth?
    // We can add a "Remove" button in a separate Alert or customized logic.
    // For now, let's keep it simple: Click -> Date Picker -> Set.

    const renderTooth = (tooth: typeof TEETH_CONFIG[0]) => {
        const isErupted = !!teethData[tooth.id];
        const shapeStyle = getToothShapeStyle(tooth.type);

        // For inactive: Outline only with theme color or gray
        // For active: Filled with specific color

        return (
            <TouchableOpacity
                key={tooth.id}
                style={[
                    styles.toothAbsolute,
                    {
                        top: tooth.top,
                        left: tooth.left,
                        transform: [{ rotate: `${tooth.rot}deg` }]
                    }
                ]}
                onPress={() => handleToothPress(tooth.id)}
                activeOpacity={0.7}
            >
                <View style={[
                    styles.toothShape,
                    shapeStyle,
                    isErupted
                        ? { backgroundColor: tooth.color, borderColor: tooth.color } // Filled
                        : { backgroundColor: 'transparent', borderColor: isDarkMode ? '#475569' : '#CBD5E1', borderWidth: 1.5 } // Outline
                ]}>
                    {/* Show number/icon only if erupted? Or maybe just shape. Screenshot shows plain shapes or numbers. Let's keep it clean shapes for now. */}
                    {isErupted && <Check size={14} color="#fff" strokeWidth={3} />}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                {/* Header */}
                <Animated.View 
                    entering={FadeInDown.duration(400).springify().damping(15)}
                    style={[styles.header, { borderBottomColor: theme.border }]}
                >
                    <TouchableOpacity 
                        onPress={onClose} 
                        style={[styles.closeBtn, { backgroundColor: theme.inputBackground }]}
                        activeOpacity={0.7}
                    >
                        <X size={22} color={theme.textSecondary} strokeWidth={2.5} />
                    </TouchableOpacity>
                    <View style={styles.headerContent}>
                        <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.15)' }]}>
                            <Sparkles size={20} color="#8B5CF6" strokeWidth={2.5} />
                        </View>
                        <Text style={[styles.title, { color: theme.textPrimary }]}>תרשים שיני תינוק</Text>
                    </View>
                    <View style={{ width: 40 }} />
                </Animated.View>

                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                    {/* Main Oval Chart */}
                    <Animated.View 
                        entering={FadeInDown.duration(400).delay(100).springify().damping(15)}
                        style={[styles.chartContainer, { backgroundColor: theme.card, borderColor: theme.border }]}
                    >
                        {/* Center Labels */}
                        <View style={styles.centerLabels}>
                            <Text style={[styles.jawLabel, { color: theme.textSecondary, marginBottom: 40 }]}>שיניים עליונות</Text>
                            <Text style={[styles.jawLabel, { color: theme.textSecondary }]}>שיניים תחתונות</Text>
                        </View>

                        {/* Render All Teeth */}
                        {TEETH_CONFIG.map(renderTooth)}

                        {/* Side Labels */}
                        <Text style={[styles.sideLabel, { left: 10, top: '50%', color: theme.textTertiary }]}>שמאל</Text>
                        <Text style={[styles.sideLabel, { right: 10, top: '50%', color: theme.textTertiary }]}>ימין</Text>
                    </Animated.View>

                    {/* Stats / Legend Card */}
                    <Animated.View 
                        entering={FadeInDown.duration(400).delay(200).springify().damping(15)}
                        style={[styles.legendCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                    >
                        <View style={styles.legendRow}>
                            <View style={[styles.legendDot, { backgroundColor: '#F87171' }]} />
                            <Text style={[styles.legendText, { color: theme.textPrimary }]}>חותכת מרכזית</Text>
                        </View>
                        <View style={styles.legendRow}>
                            <View style={[styles.legendDot, { backgroundColor: '#A3E635' }]} />
                            <Text style={[styles.legendText, { color: theme.textPrimary }]}>חותכת צידית</Text>
                        </View>
                        <View style={styles.legendRow}>
                            <View style={[styles.legendDot, { backgroundColor: '#34D399' }]} />
                            <Text style={[styles.legendText, { color: theme.textPrimary }]}>ניב</Text>
                        </View>
                        <View style={styles.legendRow}>
                            <View style={[styles.legendDot, { backgroundColor: '#60A5FA' }]} />
                            <Text style={[styles.legendText, { color: theme.textPrimary }]}>טוחנת ראשונה</Text>
                        </View>
                        <View style={styles.legendRow}>
                            <View style={[styles.legendDot, { backgroundColor: '#A78BFA' }]} />
                            <Text style={[styles.legendText, { color: theme.textPrimary }]}>טוחנת שנייה</Text>
                        </View>
                    </Animated.View>

                    <Animated.View 
                        entering={FadeInDown.duration(400).delay(300).springify().damping(15)}
                        style={styles.statsRow}
                    >
                        <View style={[styles.statsCard, { backgroundColor: theme.cardSecondary }]}>
                            <Text style={[styles.statsText, { color: theme.textPrimary }]}>
                                סה"כ שיניים שבקעו: {Object.keys(teethData).length} / 20
                            </Text>
                            {Object.keys(teethData).length === 20 && (
                                <View style={styles.completeBadge}>
                                    <Sparkles size={16} color={theme.primary} strokeWidth={2} />
                                    <Text style={[styles.completeText, { color: theme.primary }]}>כל השיניים בקעו! 🎉</Text>
                                </View>
                            )}
                        </View>
                    </Animated.View>

                </ScrollView>

                {/* Custom Date Picker Modal */}
                {showDatePicker && (
                    <Modal transparent visible={showDatePicker} animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
                        <View style={styles.datePickerOverlay}>
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
                                onPress={() => setShowDatePicker(false)}
                            />
                            <Animated.View 
                                entering={FadeInDown.duration(300).springify().damping(15)}
                                style={[styles.datePickerModal, { backgroundColor: theme.card }]}
                            >
                                <View style={[styles.datePickerHeader, { borderBottomColor: theme.border }]}>
                                    <Text style={[styles.datePickerTitle, { color: theme.textPrimary }]}>
                                        מתי בקעה השן?
                                    </Text>
                                    <TouchableOpacity 
                                        onPress={() => setShowDatePicker(false)}
                                        style={[styles.datePickerCloseBtn, { backgroundColor: theme.inputBackground }]}
                                        activeOpacity={0.7}
                                    >
                                        <X size={20} color={theme.textSecondary} strokeWidth={2.5} />
                                    </TouchableOpacity>
                                </View>
                                
                                <View style={styles.datePickerContent}>
                                    <DateTimePicker
                                        value={currentDate}
                                        mode="date"
                                        display="spinner"
                                        onChange={(event, date) => {
                                            if (date) {
                                                setCurrentDate(date);
                                            }
                                        }}
                                        maximumDate={new Date()}
                                        textColor={theme.textPrimary}
                                        locale="he-IL"
                                    />
                                </View>

                                <View style={[styles.datePickerActions, { borderTopColor: theme.border }]}>
                                    <TouchableOpacity
                                        style={[styles.datePickerCancelBtn, { backgroundColor: theme.cardSecondary }]}
                                        onPress={() => {
                                            setShowDatePicker(false);
                                            setSelectedTooth(null);
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.datePickerBtnText, { color: theme.textSecondary }]}>ביטול</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.datePickerConfirmBtn, { backgroundColor: theme.primary }]}
                                        onPress={() => {
                                            if (selectedTooth && activeChild?.childId) {
                                                handleDateChange({} as any, currentDate);
                                            }
                                        }}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[styles.datePickerBtnText, { color: theme.card }]}>אישור</Text>
                                    </TouchableOpacity>
                                </View>
                            </Animated.View>
                        </View>
                    </Modal>
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerContent: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
    },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
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
        fontSize: 22,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    content: {
        padding: 20,
        paddingBottom: 60,
        alignItems: 'center',
    },
    chartContainer: {
        width: 350,
        height: 420,
        position: 'relative',
        borderRadius: 24,
        marginTop: 20,
        marginBottom: 20,
        borderWidth: StyleSheet.hairlineWidth,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
    centerLabels: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    toothAbsolute: {
        position: 'absolute',
        zIndex: 10,
    },
    toothShape: {
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
    },
    jawLabel: {
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    sideLabel: {
        position: 'absolute',
        fontSize: 13,
        fontWeight: '600',
    },

    // Legend
    legendCard: {
        width: '100%',
        padding: 20,
        borderRadius: 20,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 16,
        borderWidth: StyleSheet.hairlineWidth,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    legendRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    legendDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    legendText: {
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    statsRow: {
        alignItems: 'center',
        marginTop: 20,
        width: '100%',
    },
    statsCard: {
        width: '100%',
        padding: 20,
        borderRadius: 20,
        alignItems: 'center',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'transparent',
    },
    statsText: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    completeBadge: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        marginTop: 12,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
    },
    completeText: {
        fontSize: 14,
        fontWeight: '700',
    },
    // Date Picker Modal
    datePickerOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    datePickerModal: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
        elevation: 12,
    },
    datePickerHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    datePickerTitle: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    datePickerCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    datePickerContent: {
        paddingVertical: 20,
        minHeight: 200,
    },
    datePickerActions: {
        flexDirection: 'row-reverse',
        gap: 12,
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    datePickerCancelBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    datePickerConfirmBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    datePickerBtnText: {
        fontSize: 16,
        fontWeight: '700',
    }
});
