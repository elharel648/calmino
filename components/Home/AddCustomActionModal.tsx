import React, { memo, useState, useRef, useEffect, useCallback } from 'react';
import { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, interpolate, default as Reanimated } from 'react-native-reanimated';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, Platform, Animated as RNAnimated, TouchableWithoutFeedback, KeyboardAvoidingView } from 'react-native';
import { X, Sparkles, Baby, Bath, Stethoscope, Pill, Thermometer, Camera, Book, Music, Star, Clock, Calendar, FileText, Check, Heart, Smile, MessageSquare, Zap, Gift, Gamepad2, Sun, Droplets, Coffee, Footprints, Bike, Leaf, Bug } from 'lucide-react-native';

import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../context/ThemeContext';

interface AddCustomActionModalProps {
    visible: boolean;
    onClose: () => void;
    onAdd: (action: CustomAction) => void;
}

export interface CustomAction {
    id: string;
    name: string;
    icon: string;
    color: string;
    createdAt: string;
    date?: string;
    time?: string;
    notes?: string;
}

// Extended preset icons with more variety
const PRESET_ICONS = [
    // Row 1 - Activities
    { key: 'sparkles', icon: Sparkles, color: '#F59E0B', label: 'כוכב' },
    { key: 'baby', icon: Baby, color: '#EC4899', label: 'תינוק' },
    { key: 'bath', icon: Bath, color: '#06B6D4', label: 'אמבטיה' },
    { key: 'stethoscope', icon: Stethoscope, color: '#10B981', label: 'בדיקה' },
    { key: 'pill', icon: Pill, color: '#8B5CF6', label: 'תרופה' },
    { key: 'thermometer', icon: Thermometer, color: '#EF4444', label: 'חום' },
    // Row 2 - Fun & Care
    { key: 'camera', icon: Camera, color: '#6366F1', label: 'צילום' },
    { key: 'book', icon: Book, color: '#14B8A6', label: 'ספר' },
    { key: 'music', icon: Music, color: '#A855F7', label: 'מוזיקה' },
    { key: 'star', icon: Star, color: '#FBBF24', label: 'הישג' },
    { key: 'heart', icon: Heart, color: '#F43F5E', label: 'אהבה' },
    { key: 'smile', icon: Smile, color: '#22C55E', label: 'חיוך' },
    // Row 3 - More activities
    { key: 'gamepad', icon: Gamepad2, color: '#3B82F6', label: 'משחק' },
    { key: 'sun', icon: Sun, color: '#F97316', label: 'שמש' },
    { key: 'droplets', icon: Droplets, color: '#0EA5E9', label: 'שתייה' },
    { key: 'footprints', icon: Footprints, color: '#84CC16', label: 'הליכה' },
    { key: 'gift', icon: Gift, color: '#D946EF', label: 'מתנה' },
    { key: 'zap', icon: Zap, color: '#EAB308', label: 'אנרגיה' },
];

// Quick action presets for common activities
const QUICK_PRESETS = [
    { name: 'אמבטיה', icon: 'bath', color: '#06B6D4' },
    { name: 'משחק', icon: 'gamepad', color: '#3B82F6' },
    { name: 'סיפור', icon: 'book', color: '#14B8A6' },
    { name: 'שתייה', icon: 'droplets', color: '#0EA5E9' },
    { name: 'טיול', icon: 'footprints', color: '#84CC16' },
];

const AddCustomActionModal = memo<AddCustomActionModalProps>(({ visible, onClose, onAdd }) => {
    const { theme, isDarkMode } = useTheme();
    const [name, setName] = useState('');
    const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
    const [notes, setNotes] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Apple-style Animations
    const slideAnim = useRef(new RNAnimated.Value(400)).current;
    const backdropAnim = useRef(new RNAnimated.Value(0)).current;

    const customIconPulse = useSharedValue(0);
    const customIconBounce = useSharedValue(1);

    const customIconPulseStyle = useAnimatedStyle(() => ({
        opacity: interpolate(customIconPulse.value, [0, 1], [0.4, 0]),
        transform: [{ scale: interpolate(customIconPulse.value, [0, 1], [1, 1.7]) }],
    }));

    const customIconBounceStyle = useAnimatedStyle(() => ({
        transform: [{ scale: customIconBounce.value }],
    }));

    useEffect(() => {
        if (visible) {
            customIconPulse.value = withRepeat(withTiming(1, { duration: 1600 }), -1, false);
            customIconBounce.value = withRepeat(
                withSequence(
                    withTiming(1.12, { duration: 300 }),
                    withTiming(0.94, { duration: 200 }),
                    withTiming(1.05, { duration: 150 }),
                    withTiming(1, { duration: 150 }),
                    withTiming(1, { duration: 2200 }),
                ),
                -1,
                false
            );
        } else {
            customIconPulse.value = 0;
            customIconBounce.value = 1;
        }
    }, [visible]);

    useEffect(() => {
        if (visible) {
            resetForm();
            // Apple-style sheet animation
            RNAnimated.parallel([
                RNAnimated.timing(backdropAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                RNAnimated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    damping: 20,
                    stiffness: 200,
                    mass: 0.8,
                }),
            ]).start();
        }
    }, [visible, slideAnim, backdropAnim]);

    const handleClose = () => {
        RNAnimated.parallel([
            RNAnimated.timing(backdropAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            RNAnimated.timing(slideAnim, {
                toValue: 400,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start(() => {
            resetForm();
            onClose();
        });
    };

    const formatDate = (date: Date) => {
        const today = new Date();
        if (date.toDateString() === today.toDateString()) {
            return 'היום';
        }
        return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    };

    const handleAdd = () => {
        if (!name.trim() || !selectedIcon) return;

        const iconConfig = PRESET_ICONS.find(i => i.key === selectedIcon);

        const newAction: CustomAction = {
            id: Date.now().toString(),
            name: name.trim(),
            icon: selectedIcon,
            color: iconConfig?.color || '#6B7280',
            createdAt: new Date().toISOString(),
            date: selectedDate.toISOString().split('T')[0],
            time: formatTime(selectedDate),
            notes: notes.trim() || undefined,
        };

        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        // Show checkmark and delay close
        setSaveSuccess(true);
        setTimeout(() => {
            setSaveSuccess(false);
            onAdd(newAction);
            handleClose();
        }, 600);
    };

    const resetForm = () => {
        setName('');
        setSelectedIcon(null);
        setNotes('');
        setSelectedDate(new Date());
        setSaveSuccess(false);
    };

    const selectQuickPreset = (preset: typeof QUICK_PRESETS[0]) => {
        setName(preset.name);
        setSelectedIcon(preset.icon);
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
    };

    const isFormValid = name.trim() && selectedIcon;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose} statusBarTranslucent>
            <KeyboardAvoidingView
                style={styles.overlay}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* Backdrop */}
                <TouchableWithoutFeedback onPress={handleClose}>
                    <RNAnimated.View
                        style={[
                            styles.backdrop,
                            { opacity: backdropAnim }
                        ]}
                    />
                </TouchableWithoutFeedback>

                {/* Modal Card */}
                <RNAnimated.View
                    style={[
                        styles.modalCard,
                        {
                            backgroundColor: theme.card,
                            transform: [{ translateY: slideAnim }],
                        },
                    ]}
                >
                    {/* Drag Handle - iOS Sheet Style */}
                    <View style={styles.dragHandle}>
                        <View style={[styles.dragHandleBar, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)' }]} />
                    </View>

                    {/* Close Button */}
                    <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
                        <X size={24} color={theme.textSecondary} />
                    </TouchableOpacity>

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={{ width: 60, height: 60, alignItems: 'center', justifyContent: 'center' }}>
                            <Reanimated.View style={[StyleSheet.absoluteFill, { borderRadius: 30, backgroundColor: '#10B981' }, customIconPulseStyle]} />
                            <View style={[styles.emojiCircle, { backgroundColor: isDarkMode ? 'rgba(16,185,129,0.2)' : '#10B98115' }]}>
                                <Reanimated.View style={customIconBounceStyle}>
                                    <Sparkles size={28} color="#10B981" strokeWidth={2.5} />
                                </Reanimated.View>
                            </View>
                        </View>
                        <Text style={[styles.title, { color: theme.textPrimary }]}>הוספת פעולה</Text>
                    </View>

                    {/* Content */}
                    <ScrollView
                        style={{ width: '100%' }}
                        contentContainerStyle={styles.content}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                    >
                        {/* Quick Presets */}
                        <View style={styles.quickPresetsSection}>
                            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>פעולות מהירות</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View style={styles.quickPresetsRow}>
                                    {QUICK_PRESETS.map((preset) => {
                                        const IconComponent = PRESET_ICONS.find(i => i.key === preset.icon)?.icon || Sparkles;
                                        const isSelected = name === preset.name && selectedIcon === preset.icon;
                                        return (
                                            <TouchableOpacity
                                                key={preset.name}
                                                style={[
                                                    styles.quickPresetBtn,
                                                    { backgroundColor: preset.color + '15', borderColor: preset.color + '30' },
                                                    isSelected && { borderColor: preset.color, backgroundColor: preset.color + '25' }
                                                ]}
                                                onPress={() => selectQuickPreset(preset)}
                                            >
                                                <IconComponent size={18} color={preset.color} strokeWidth={2} />
                                                <Text style={[styles.quickPresetText, { color: preset.color }]}>{preset.name}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </ScrollView>
                        </View>

                        {/* Name Input */}
                        <View style={styles.inputSection}>
                            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>שם הפעולה</Text>
                            <TextInput
                                style={[styles.input, {
                                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#F9FAFB',
                                    color: theme.textPrimary,
                                    borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#E5E7EB'
                                }]}
                                value={name}
                                onChangeText={setName}
                                placeholder="למשל: אמבטיה, משחק..."
                                placeholderTextColor={theme.textSecondary}
                                textAlign="right"
                            />
                        </View>

                        {/* Icon Selection - Grid Layout */}
                        <View style={styles.inputSection}>
                            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>בחר אייקון</Text>
                            <View style={styles.iconsGrid}>
                                {PRESET_ICONS.map(({ key, icon: Icon, color }) => {
                                    const isSelected = selectedIcon === key;
                                    return (
                                        <TouchableOpacity
                                            key={key}
                                            style={[
                                                styles.iconOption,
                                                { backgroundColor: color + '15' },
                                                isSelected && {
                                                    borderColor: color,
                                                    borderWidth: 2.5,
                                                    backgroundColor: color + '25',
                                                    transform: [{ scale: 1.05 }]
                                                }
                                            ]}
                                            onPress={() => {
                                                setSelectedIcon(key);
                                                if (Platform.OS !== 'web') {
                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                }
                                            }}
                                        >
                                            <Icon size={22} color={color} strokeWidth={isSelected ? 2.5 : 2} />
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Date & Time Row - Premium Style */}
                        <View style={styles.inputSection}>
                            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>תאריך ושעה</Text>
                            <View style={styles.dateTimeRow}>
                                <TouchableOpacity
                                    style={[styles.dateTimeBtn, {
                                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#F9FAFB',
                                        borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#E5E7EB'
                                    }]}
                                    onPress={() => {
                                        setShowTimePicker(true);
                                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    }}
                                >
                                    <Clock size={18} color="#6366F1" strokeWidth={2} />
                                    <Text style={[styles.dateTimeText, { color: theme.textPrimary }]}>
                                        {formatTime(selectedDate)}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.dateTimeBtn, {
                                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#F9FAFB',
                                        borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#E5E7EB'
                                    }]}
                                    onPress={() => {
                                        setShowDatePicker(true);
                                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    }}
                                >
                                    <Calendar size={18} color="#6366F1" strokeWidth={2} />
                                    <Text style={[styles.dateTimeText, { color: theme.textPrimary }]}>
                                        {formatDate(selectedDate)}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Notes Input - Premium Style */}
                        <View style={styles.inputSection}>
                            <View style={styles.labelRow}>
                                <MessageSquare size={14} color={theme.textSecondary} strokeWidth={2} />
                                <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginBottom: 0 }]}>הערות (אופציונלי)</Text>
                            </View>
                            <TextInput
                                style={[styles.notesInput, {
                                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#F9FAFB',
                                    color: theme.textPrimary,
                                    borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#E5E7EB'
                                }]}
                                value={notes}
                                onChangeText={setNotes}
                                placeholder="הוסף פרטים נוספים..."
                                placeholderTextColor={theme.textSecondary}
                                textAlign="right"
                                multiline
                                numberOfLines={3}
                            />
                        </View>
                    </ScrollView>

                    {/* Save Button - Premium Full Width */}
                    <TouchableOpacity
                        style={[
                            styles.saveBtn,
                            !isFormValid && styles.saveBtnDisabled,
                            saveSuccess && styles.saveBtnSuccess
                        ]}
                        onPress={handleAdd}
                        disabled={!isFormValid || saveSuccess}
                    >
                        <Check size={18} color="#fff" strokeWidth={2.5} />
                        <Text style={styles.saveBtnText}>
                            {saveSuccess ? 'נשמר!' : 'הוסף פעולה'}
                        </Text>
                    </TouchableOpacity>

                    {/* Date Picker Modal */}
                    {showDatePicker && (
                        <View style={styles.pickerOverlay}>
                            <View style={[styles.pickerContainer, { backgroundColor: theme.card }]}>
                                <DateTimePicker
                                    value={selectedDate}
                                    mode="date"
                                    display="spinner"
                                    onChange={(event, date) => {
                                        if (Platform.OS === 'android') setShowDatePicker(false);
                                        if (date) setSelectedDate(date);
                                    }}
                                    locale="he-IL"
                                />
                                {Platform.OS === 'ios' && (
                                    <TouchableOpacity
                                        style={styles.pickerDoneBtn}
                                        onPress={() => setShowDatePicker(false)}
                                    >
                                        <Text style={styles.pickerDoneBtnText}>סיום</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    )}

                    {/* Time Picker Modal */}
                    {showTimePicker && (
                        <View style={styles.pickerOverlay}>
                            <View style={[styles.pickerContainer, { backgroundColor: theme.card }]}>
                                <DateTimePicker
                                    value={selectedDate}
                                    mode="time"
                                    display="spinner"
                                    onChange={(event, date) => {
                                        if (Platform.OS === 'android') setShowTimePicker(false);
                                        if (date) setSelectedDate(date);
                                    }}
                                    locale="he-IL"
                                />
                                {Platform.OS === 'ios' && (
                                    <TouchableOpacity
                                        style={styles.pickerDoneBtn}
                                        onPress={() => setShowTimePicker(false)}
                                    >
                                        <Text style={styles.pickerDoneBtnText}>סיום</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    )}
                </RNAnimated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
});

AddCustomActionModal.displayName = 'AddCustomActionModal';

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end'
    },
    backdrop: {
        backgroundColor: 'rgba(0,0,0,0.4)',
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0
    },
    modalCard: {
        backgroundColor: 'white',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingBottom: 44,
        paddingHorizontal: 24,
        maxHeight: '92%',
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: -8 },
        elevation: 12,
    },
    // Drag Handle
    dragHandle: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 8,
    },
    dragHandleBar: {
        width: 36,
        height: 5,
        borderRadius: 3,
        backgroundColor: 'rgba(0,0,0,0.15)',
    },
    closeBtn: {
        position: 'absolute',
        top: 24,
        right: 20,
        zIndex: 10,
        padding: 8
    },
    // Header
    header: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    emojiCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        marginTop: 14,
        letterSpacing: -0.5
    },
    content: {
        paddingVertical: 20,
        paddingHorizontal: 4
    },
    // Quick Presets
    quickPresetsSection: {
        marginBottom: 24,
    },
    quickPresetsRow: {
        flexDirection: 'row',
        gap: 10,
        paddingRight: 4,
    },
    quickPresetBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        borderWidth: 1.5,
    },
    quickPresetText: {
        fontSize: 14,
        fontWeight: '600',
    },
    // Sections
    inputSection: {
        marginBottom: 22,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 10,
        textAlign: 'right',
    },
    labelRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        marginBottom: 10,
    },
    input: {
        borderRadius: 16,
        padding: 16,
        fontSize: 16,
        borderWidth: 1,
    },
    notesInput: {
        borderRadius: 16,
        padding: 16,
        fontSize: 15,
        minHeight: 90,
        textAlignVertical: 'top',
        borderWidth: 1,
    },
    // Icons Grid
    iconsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'flex-start',
    },
    iconOption: {
        width: 50,
        height: 50,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    // Date Time Row
    dateTimeRow: {
        flexDirection: 'row-reverse',
        gap: 12,
    },
    dateTimeBtn: {
        flex: 1,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    dateTimeText: {
        fontSize: 16,
        fontWeight: '600',
    },
    // Save Button
    saveBtn: {
        flexDirection: 'row',
        backgroundColor: '#10B981',
        borderRadius: 16,
        paddingVertical: 18,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginTop: 8,
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    saveBtnDisabled: {
        backgroundColor: '#D1D5DB',
        shadowOpacity: 0,
    },
    saveBtnSuccess: {
        backgroundColor: '#059669',
    },
    saveBtnText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
    },
    // Picker Overlay
    pickerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
        zIndex: 100,
    },
    pickerContainer: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 34,
        paddingTop: 16,
    },
    pickerDoneBtn: {
        alignSelf: 'center',
        paddingHorizontal: 32,
        paddingVertical: 14,
        backgroundColor: '#6366F1',
        borderRadius: 14,
        marginTop: 12,
    },
    pickerDoneBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default AddCustomActionModal;
