import React, { memo, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Platform, Alert, TextInput, Animated, Dimensions, Image, ActivityIndicator, PanResponder, TouchableWithoutFeedback, KeyboardAvoidingView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, Syringe, Thermometer, Pill, Stethoscope, X, ChevronLeft, ChevronRight, Plus, Check, Trash2, Camera, FileText, Image as ImageIcon, Minus, ClipboardList, HeartPulse, Clock, Bell } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import Slider from '@react-native-community/slider';
import { BlurView } from 'expo-blur';
import { auth, db } from '../../services/firebaseConfig';
import { addMedication, getMedications, deleteMedication, logMedicationTaken } from '../../services/medicationService';
import AddMedicationForm from './AddMedicationForm';
import { Medication } from '../../types/home';
import { saveEventToFirebase } from '../../services/firebaseService';
import { doc, getDoc, updateDoc, arrayUnion, collection, query, where, limit, getDocs, Timestamp } from 'firebase/firestore';
import { VACCINE_SCHEDULE, CustomVaccine } from '../../types/profile';
import { useActiveChild } from '../../context/ActiveChildContext';
import { useTheme } from '../../context/ThemeContext';
import { logger } from '../../utils/logger';
import { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, interpolate, default as ReAnimated } from 'react-native-reanimated';
import SwipeableRow from '../SwipeableRow';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface HealthCardProps {
    dynamicStyles: { text: string };
    visible?: boolean;
    onClose?: () => void;
}

type HealthScreen = 'menu' | 'vaccines' | 'doctor' | 'illness' | 'temperature' | 'medications' | 'medications_add' | 'history';

interface HealthOption {
    key: HealthScreen;
    label: string;
    icon: any;
    iconColor: string;
}

// Common illnesses and medications
const COMMON_ILLNESSES = [
    'אדמת', 'אבעבועות רוח', 'ברונכיטיס', 'דלקת הגרון', 'דלקת אוזניים',
    'זיהום בדרכי הנשימה', 'כאבי בקיעת שיניים', 'נזלת', 'קר', 'שלשול',
    'שפעת', 'שיעול יבש', 'שיעול רטוב', 'חום'
];

const COMMON_MEDICATIONS = [
    'אנטיביוטיקה', 'אנטי דלקתי', 'הקלה בכאב', 'ויטמין C', 'ויטמין D',
    'טיפות', 'מחטא', 'נוגד חום', 'פרוביוטיקה', 'תרסיסים'
];

const HEALTH_OPTIONS: HealthOption[] = [
    { key: 'doctor', label: 'ביקור רופא', icon: Stethoscope, iconColor: '#34D399' },
    { key: 'vaccines', label: 'חיסונים', icon: Syringe, iconColor: '#9F7AEA' },
    { key: 'illness', label: 'מחלות', icon: Heart, iconColor: '#F87171' },
    { key: 'temperature', label: 'טמפרטורה', icon: Thermometer, iconColor: '#FF9F1C' },
    { key: 'medications', label: 'תרופות', icon: Pill, iconColor: '#A78BFA' },
    { key: 'history', label: 'היסטוריה', icon: ClipboardList, iconColor: '#3B82F6' },
];

const HealthCard = memo(({ dynamicStyles, visible, onClose }: HealthCardProps) => {
    const { theme, isDarkMode } = useTheme();
    const [isModalOpen, setIsModalOpen] = useState(visible || false);
    const [currentScreen, setCurrentScreen] = useState<HealthScreen>('menu');
    const scaleAnims = useRef(HEALTH_OPTIONS.map(() => new Animated.Value(1))).current;

    // Swipe down animations
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;

    // Health icon animation
    const healthIconPulse = useSharedValue(0);
    const healthIconBounce = useSharedValue(1);

    const healthIconPulseStyle = useAnimatedStyle(() => ({
        opacity: interpolate(healthIconPulse.value, [0, 1], [0.4, 0]),
        transform: [{ scale: interpolate(healthIconPulse.value, [0, 1], [1, 1.7]) }],
    }));

    const healthIconBounceStyle = useAnimatedStyle(() => ({
        transform: [{ scale: healthIconBounce.value }],
    }));

    useEffect(() => {
        if (isModalOpen) {
            healthIconPulse.value = withRepeat(withTiming(1, { duration: 1600 }), -1, false);
            healthIconBounce.value = withRepeat(
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
            healthIconPulse.value = 0;
            healthIconBounce.value = 1;
        }
    }, [isModalOpen]);

    // Vaccine state
    const [vaccines, setVaccines] = useState<Record<string, boolean>>({});
    const [customVaccines, setCustomVaccines] = useState<CustomVaccine[]>([]);
    const [babyId, setBabyId] = useState<string | null>(null);
    const [newVaccineName, setNewVaccineName] = useState('');
    const [showAddVaccine, setShowAddVaccine] = useState(false);

    // Temperature state with slider
    const [temperature, setTemperature] = useState(37.0);
    const [tempNote, setTempNote] = useState('');

    // Illness state
    const [selectedIllness, setSelectedIllness] = useState<string | null>(null);
    const [customIllness, setCustomIllness] = useState('');
    const [illnessNote, setIllnessNote] = useState('');

    // Medication state (new form-based system)
    const [savedMedications, setSavedMedications] = useState<Medication[]>([]);
    const [loadingMeds, setLoadingMeds] = useState(false);
    const [savingMed, setSavingMed] = useState(false);
    const [medSaveSuccess, setMedSaveSuccess] = useState(false);

    // Legacy state kept for backwards compat (used in resetForms)
    const [selectedMed, setSelectedMed] = useState<string | null>(null);
    const [customMed, setCustomMed] = useState('');
    const [medNote, setMedNote] = useState('');

    // Doctor visit state with real uploads
    const [doctorReason, setDoctorReason] = useState('');
    const [doctorNote, setDoctorNote] = useState('');
    const [doctorPhoto, setDoctorPhoto] = useState<string | null>(null);
    const [doctorDocument, setDoctorDocument] = useState<string | null>(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [uploadingDoc, setUploadingDoc] = useState(false);

    // History state
    const [healthLog, setHealthLog] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [historyFilter, setHistoryFilter] = useState<'all' | 'temperature' | 'doctor' | 'illness' | 'medication'>('all');

    // Save success state
    const [saveSuccess, setSaveSuccess] = useState(false);

    useEffect(() => {
        if (isModalOpen && currentScreen === 'vaccines') {
            loadVaccines();
        }
        if (isModalOpen && currentScreen === 'history') {
            loadHealthLog();
        }
    }, [isModalOpen, currentScreen]);

    const { activeChild } = useActiveChild();
    // Sync babyId with activeChild
    useEffect(() => {
        if (activeChild?.childId) {
            setBabyId(activeChild.childId);
        }
    }, [activeChild]);

    const loadVaccines = async () => {
        if (!activeChild?.childId) return;

        try {
            const babyDoc = await getDoc(doc(db, 'babies', activeChild.childId));
            if (babyDoc.exists()) {
                const data = babyDoc.data();
                setVaccines(data.vaccines || {});
                setCustomVaccines(data.customVaccines || []);
            }
        } catch (error) {
            logger.log('Error loading vaccines:', error);
        }
    };

    const loadHealthLog = async () => {
        setLoadingHistory(true);
        if (!activeChild?.childId) {
            setLoadingHistory(false);
            return;
        }

        try {
            const babyDoc = await getDoc(doc(db, 'babies', activeChild.childId));
            if (babyDoc.exists()) {
                const data = babyDoc.data();
                const log = data.healthLog || [];
                // Sort by timestamp descending
                log.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                setHealthLog(log);
            }
        } catch (error) {
            logger.log('Error loading health log:', error);
        }
        setLoadingHistory(false);
    };

    const toggleVaccine = async (key: string, date?: Date) => {
        if (!babyId) return;
        const user = auth.currentUser;
        if (!user) return;

        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        const currentStatus = vaccines[key];
        const isDone = currentStatus && typeof currentStatus === 'object' ? (currentStatus as any).isDone : !!currentStatus;
        const newVal = !isDone;

        // Prepare value to save
        const timestamp = date ? Timestamp.fromDate(date) : Timestamp.now();
        const valueToSave = newVal ? { isDone: true, date: timestamp } : false;

        // Optimistically update UI
        const updated = { ...vaccines, [key]: valueToSave };
        // @ts-ignore
        setVaccines(updated);

        try {
            await updateDoc(doc(db, 'babies', babyId), { [`vaccines.${key}`]: valueToSave });

            // If marked as done, add to History and Timeline
            if (newVal) {
                // 1. Add to Health History (healthLog)
                const vaccineName = VACCINE_SCHEDULE.flatMap(g => g.vaccines).find(v => v.key === key)?.name || key;
                const historyEntry = {
                    type: 'vaccine',
                    name: vaccineName,
                    note: 'בוצע',
                    timestamp: timestamp.toDate().toISOString() // Store as ISO string for consistency with other logs
                };
                await updateDoc(doc(db, 'babies', babyId), { healthLog: arrayUnion(historyEntry) });
                // Refresh local history log if visible
                if (currentScreen === 'history') loadHealthLog();

                // 2. Add to Daily Timeline (events collection)
                await saveEventToFirebase(user.uid, babyId, {
                    type: 'custom',
                    subType: 'vaccine',
                    note: `חיסון: ${vaccineName}`,
                    timestamp: date || new Date()
                });
            }
        } catch (error) {
            logger.log('Error updating vaccine:', error);
            // Rollback optimistic update on failure
            setVaccines(prev => ({ ...prev, [key]: currentStatus }));
        }
    };

    const addCustomVaccine = async () => {
        if (!babyId || !newVaccineName.trim()) return;

        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        const newVaccine: CustomVaccine = {
            id: Date.now().toString(),
            name: newVaccineName.trim(),
            date: new Date().toISOString(),
        };

        const updated = [...customVaccines, newVaccine];
        setCustomVaccines(updated);
        setNewVaccineName('');
        setShowAddVaccine(false);

        try {
            await updateDoc(doc(db, 'babies', babyId), { customVaccines: updated });
        } catch (error) {
            logger.log('Error adding custom vaccine:', error);
        }
    };

    const deleteCustomVaccine = async (id: string) => {
        if (!babyId) return;

        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        const updated = customVaccines.filter(v => v.id !== id);
        setCustomVaccines(updated);

        try {
            await updateDoc(doc(db, 'babies', babyId), { customVaccines: updated });
        } catch (error) {
            logger.log('Error deleting custom vaccine:', error);
        }
    };

    // Photo picker for doctor visit
    const pickPhoto = async () => {
        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                Alert.alert('שגיאה', 'נדרשת הרשאה לגלריה');
                return;
            }

            setUploadingPhoto(true);
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.7,
            });

            if (!result.canceled && result.assets[0]) {
                setDoctorPhoto(result.assets[0].uri);
                if (Platform.OS !== 'web') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
            }
        } catch (error) {
            logger.log('Photo pick error:', error);
        } finally {
            setUploadingPhoto(false);
        }
    };

    // Document picker for doctor visit
    const pickDocument = async () => {
        try {
            setUploadingDoc(true);
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'image/*'],
            });

            if (result.canceled === false && result.assets?.[0]) {
                setDoctorDocument(result.assets[0].name);
                if (Platform.OS !== 'web') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
            }
        } catch (error) {
            logger.log('Document pick error:', error);
        } finally {
            setUploadingDoc(false);
        }
    };

    const handleCardPressIn = (index: number) => {
        Animated.spring(scaleAnims[index], { toValue: 0.95, useNativeDriver: true }).start();
    };

    const handleCardPressOut = (index: number) => {
        Animated.spring(scaleAnims[index], { toValue: 1, friction: 3, useNativeDriver: true }).start();
    };

    const handleOptionPress = (option: HealthOption) => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setCurrentScreen(option.key);
    };

    const openModal = () => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCurrentScreen('menu');
        setIsModalOpen(true);
    };

    const resetForms = useCallback(() => {
        setTemperature(37.0);
        setTempNote('');
        setSelectedIllness(null);
        setIllnessNote('');
        setSelectedMed(null);
        setMedNote('');
        setDoctorReason('');
        setDoctorNote('');
        setDoctorPhoto(null);
        setDoctorDocument(null);
    }, []);

    const closeModal = useCallback(() => {
        setIsModalOpen(false);
        setCurrentScreen('menu');
        resetForms();
        onClose?.();
    }, [onClose, resetForms]);

    // Tracking scroll refs
    const scrollViewRef = useRef<ScrollView>(null);
    const scrollOffsetY = useRef(0);

    // Swipe down to dismiss - exact perfect logic from QuickReminderModal!
    const panResponder = useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => {
            const { dy, dx } = gestureState;
            return dy > 10 && Math.abs(dy) > Math.abs(dx);
        },
        onPanResponderMove: (_, gestureState) => {
            if (gestureState.dy > 0) {
                slideAnim.setValue(gestureState.dy);
                const opacity = Math.max(0, 1 - gestureState.dy / 300);
                backdropAnim.setValue(opacity);
            }
        },
        onPanResponderRelease: (_, gestureState) => {
            if (gestureState.dy > 120 || gestureState.vy > 0.5) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Animated.parallel([
                    Animated.timing(slideAnim, {
                        toValue: SCREEN_HEIGHT,
                        duration: 250,
                        useNativeDriver: true,
                    }),
                    Animated.timing(backdropAnim, {
                        toValue: 0,
                        duration: 250,
                        useNativeDriver: true,
                    }),
                ]).start(() => {
                    closeModal();
                });
            } else {
                Animated.parallel([
                    Animated.spring(slideAnim, {
                        toValue: 0,
                        useNativeDriver: true,
                        tension: 65,
                        friction: 11,
                    }),
                    Animated.spring(backdropAnim, {
                        toValue: 1,
                        useNativeDriver: true,
                    }),
                ]).start();
            }
        },
    }), [slideAnim, backdropAnim, closeModal]);

    // Sync with external visible prop
    useEffect(() => {
        if (visible !== undefined) {
            setIsModalOpen(visible);
        }
    }, [visible]);

    // Animate modal in/out
    useEffect(() => {
        if (isModalOpen) {
            slideAnim.setValue(SCREEN_HEIGHT);
            backdropAnim.setValue(0);
            Animated.parallel([
                Animated.timing(backdropAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 65,
                    friction: 11,
                }),
            ]).start();
        } else {
            slideAnim.setValue(SCREEN_HEIGHT);
            backdropAnim.setValue(0);
        }
    }, [isModalOpen, slideAnim, backdropAnim]);

    // (resetForms moved to top level)

    const goBack = () => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCurrentScreen('menu');
    };

    const saveEntry = async (type: string, data: any) => {
        if (!babyId) {
            // Fetch babyId if not already loaded
            const user = auth.currentUser;
            if (!user) return;
            try {
                const q = query(collection(db, 'babies'), where('parentId', '==', user.uid), limit(1));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    const docId = querySnapshot.docs[0].id;
                    setBabyId(docId);
                    const entry = { ...data, timestamp: new Date().toISOString(), type };
                    await updateDoc(doc(db, 'babies', docId), { healthLog: arrayUnion(entry) });
                }
            } catch (error) {
                logger.log('Error saving entry:', error);
                Alert.alert('שגיאה', 'לא ניתן לשמור');
                return;
            }
        } else {
            try {
                const entry = { ...data, timestamp: new Date().toISOString(), type };
                await updateDoc(doc(db, 'babies', babyId), { healthLog: arrayUnion(entry) });
            } catch (error) {
                logger.log('Error saving entry:', error);
                Alert.alert('שגיאה', 'לא ניתן לשמור');
                return;
            }
        }

        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        // Show checkmark then go back
        setSaveSuccess(true);
        setTimeout(() => {
            setSaveSuccess(false);
            goBack();
        }, 800);
    };

    const deleteHistoryEntry = async (index: number) => {
        if (!babyId) return;

        try {
            const updatedLog = [...healthLog];
            updatedLog.splice(index, 1);
            await updateDoc(doc(db, 'babies', babyId), { healthLog: updatedLog });
            setHealthLog(updatedLog);

            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } catch (error) {
            logger.log('Error deleting entry:', error);
            Alert.alert('שגיאה', 'לא ניתן למחוק');
        }
    };

    // Get temperature color based on value
    const getTemperatureColor = () => {
        if (temperature < 37.5) return '#10B981';
        if (temperature < 38) return '#F59E0B';
        return '#EF4444';
    };

    // Menu - Minimal Premium Style
    const renderMenu = () => (
        <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.menuContainer}
            showsVerticalScrollIndicator={false}
            onScroll={(e) => {
                scrollOffsetY.current = e.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
        >
            <View style={styles.optionsList}>
                {HEALTH_OPTIONS.map((option, index) => {
                    const Icon = option.icon;
                    return (
                        <Animated.View key={option.key} style={[{ transform: [{ scale: scaleAnims[index] }] }]}>
                            <TouchableOpacity
                                style={styles.optionRow}
                                onPress={() => handleOptionPress(option)}
                                onPressIn={() => handleCardPressIn(index)}
                                onPressOut={() => handleCardPressOut(index)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.optionIconCircle}>
                                    <Icon size={22} color={option.iconColor} strokeWidth={1.2} />
                                </View>
                                <Text style={styles.optionLabel}>{option.label}</Text>
                                <ChevronLeft size={18} color="#9CA3AF" />
                            </TouchableOpacity>
                        </Animated.View>
                    );
                })}
            </View>
        </ScrollView>
    );

    // Vaccines with strikethrough
    const renderVaccines = () => (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.screenContent}>
            <View style={styles.screenHeader}>
                <View style={styles.screenHeaderIconMinimal}>
                    <Syringe size={24} color="#6366F1" strokeWidth={1.2} />
                </View>
                <Text style={styles.screenSubtitle}>לפי המלצות משרד הבריאות</Text>
            </View>

            {/* Add Custom Vaccine Button */}
            <TouchableOpacity
                style={styles.addVaccineBtn}
                onPress={() => setShowAddVaccine(!showAddVaccine)}
            >
                <Plus size={20} color="#6366F1" />
                <Text style={styles.addVaccineBtnText}>הוסף חיסון</Text>
            </TouchableOpacity>

            {showAddVaccine && (
                <View style={styles.addVaccineForm}>
                    <TextInput
                        style={styles.addVaccineInput}
                        value={newVaccineName}
                        onChangeText={setNewVaccineName}
                        placeholder="שם החיסון"
                        placeholderTextColor="#9CA3AF"
                        textAlign="right"
                        textAlignVertical="center"
                    />
                    <TouchableOpacity style={styles.addVaccineSubmit} onPress={addCustomVaccine}>
                        <Check size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            )}

            {/* Custom Vaccines */}
            {customVaccines.length > 0 && (
                <View style={styles.vaccineGroup}>
                    <View style={styles.ageBadgeMinimal}>
                        <Text style={styles.ageBadgeTextMinimal}>חיסונים מותאמים</Text>
                    </View>
                    {customVaccines.map(vaccine => (
                        <SwipeableRow key={vaccine.id} onDelete={() => deleteCustomVaccine(vaccine.id)}>
                            <View style={styles.vaccineRowDone}>
                                <View style={[styles.checkbox, styles.checkboxChecked]}>
                                    <Check size={14} color="#fff" />
                                </View>
                                <Text style={[styles.vaccineNameDone, { textAlign: 'right', writingDirection: 'rtl', flex: 1 }]}>{vaccine.name}</Text>
                            </View>
                        </SwipeableRow>
                    ))}
                </View>
            )}

            {VACCINE_SCHEDULE.map((group, gIdx) => (
                <View key={gIdx} style={styles.vaccineGroup}>
                    <View style={styles.ageBadgeMinimal}>
                        <Text style={styles.ageBadgeTextMinimal}>{group.ageTitle}</Text>
                    </View>

                    {group.vaccines.map((vaccine, vIdx) => {
                        const isChecked = vaccines[vaccine.key] || false;
                        const row = (
                            <TouchableOpacity
                                style={[styles.vaccineRow, isChecked && styles.vaccineRowDone]}
                                onPress={() => toggleVaccine(vaccine.key)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                                    {isChecked && <Check size={14} color="#fff" />}
                                </View>
                                <Text style={[styles.vaccineName, isChecked && styles.vaccineNameDone]}>
                                    {vaccine.name}
                                </Text>
                            </TouchableOpacity>
                        );
                        return isChecked ? (
                            <SwipeableRow key={vIdx} onDelete={() => toggleVaccine(vaccine.key)}>
                                {row}
                            </SwipeableRow>
                        ) : (
                            <React.Fragment key={vIdx}>{row}</React.Fragment>
                        );
                    })}
                </View>
            ))}
        </ScrollView>
    );

    // Temperature with Slider
    const renderTemperature = () => (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.screenContent}>
            <View style={styles.screenHeader}>
                <View style={styles.screenHeaderIconMinimal}>
                    <Thermometer size={24} color="#9CA3AF" strokeWidth={1.2} />
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>טמפרטורה (°C)</Text>

                {/* Big temperature display - minimalist with thin color border */}
                <View style={[styles.temperatureDisplayMinimal, { borderWidth: 1.5, borderColor: getTemperatureColor() }]}>
                    <Text style={styles.temperatureValueMinimal}>
                        {temperature.toFixed(1)}
                    </Text>
                    <Text style={styles.temperatureUnitMinimal}>°C</Text>
                </View>

                {/* Slider */}
                <View style={styles.sliderContainer}>
                    <TouchableOpacity
                        style={styles.sliderBtn}
                        onPress={() => setTemperature(Math.max(35, temperature - 0.1))}
                    >
                        <Minus size={20} color="#6B7280" />
                    </TouchableOpacity>

                    <Slider
                        style={styles.slider}
                        minimumValue={35}
                        maximumValue={42}
                        step={0.1}
                        value={temperature}
                        onValueChange={setTemperature}
                        minimumTrackTintColor={getTemperatureColor()}
                        maximumTrackTintColor="#E5E7EB"
                        thumbTintColor={getTemperatureColor()}
                    />

                    <TouchableOpacity
                        style={styles.sliderBtn}
                        onPress={() => setTemperature(Math.min(42, temperature + 0.1))}
                    >
                        <Plus size={20} color="#6B7280" />
                    </TouchableOpacity>
                </View>

                {/* Quick buttons - minimalist, RTL */}
                <View style={styles.quickSelectRowRTL}>
                    {[36.6, 37.0, 37.5, 38.0, 38.5, 39.0].map(temp => (
                        <TouchableOpacity
                            key={temp}
                            style={[
                                styles.quickSelectBtnMinimal,
                                Math.abs(temperature - temp) < 0.05 && styles.quickSelectBtnMinimalActive
                            ]}
                            onPress={() => setTemperature(temp)}
                        >
                            <Text style={[
                                styles.quickSelectTextMinimal,
                                Math.abs(temperature - temp) < 0.05 && styles.quickSelectTextMinimalActive
                            ]}>{temp.toFixed(1)}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>הערות</Text>
                <TextInput
                    style={styles.textArea}
                    value={tempNote}
                    onChangeText={setTempNote}
                    placeholder="הוסף הערות..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={() => saveEntry('temperature', { value: temperature.toFixed(1), note: tempNote })} disabled={saveSuccess}>
                <View style={[styles.saveButtonSolid, saveSuccess && styles.saveButtonSuccess]}>
                    {saveSuccess ? <Check size={18} color="#10B981" strokeWidth={2} /> : <Text style={styles.saveButtonText}>שמור</Text>}
                </View>
            </TouchableOpacity>
        </ScrollView>
    );

    // Doctor with real uploads
    const renderDoctor = () => (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.screenContent}>
            <View style={styles.screenHeader}>
                <View style={styles.screenHeaderIconMinimal}>
                    <Stethoscope size={24} color="#10B981" strokeWidth={1.2} />
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>סיבת הביקור</Text>
                <TextInput
                    style={styles.textInput}
                    value={doctorReason}
                    onChangeText={setDoctorReason}
                    placeholder="למשל: בדיקה שגרתית, חום..."
                    placeholderTextColor="#9CA3AF"
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>סיכום / המלצות הרופא</Text>
                <TextInput
                    style={styles.textArea}
                    value={doctorNote}
                    onChangeText={setDoctorNote}
                    placeholder="המלצות, תרופות שנרשמו..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                />
            </View>

            {/* Photo Upload */}
            <View style={styles.uploadSection}>
                <TouchableOpacity
                    style={[styles.uploadButton, doctorPhoto && styles.uploadButtonSuccess]}
                    onPress={pickPhoto}
                    disabled={uploadingPhoto}
                >
                    {uploadingPhoto ? (
                        <ActivityIndicator color="#6B7280" />
                    ) : doctorPhoto ? (
                        <>
                            <Image source={{ uri: doctorPhoto }} style={styles.uploadPreview} />
                            <Text style={styles.uploadButtonTextSuccess}>תמונה הועלתה ✓</Text>
                        </>
                    ) : (
                        <>
                            <Camera size={24} color="#6B7280" />
                            <Text style={styles.uploadButtonText}>הוסף תמונה</Text>
                        </>
                    )}
                </TouchableOpacity>

                {/* Document Upload */}
                <TouchableOpacity
                    style={[styles.uploadButton, doctorDocument && styles.uploadButtonSuccess]}
                    onPress={pickDocument}
                    disabled={uploadingDoc}
                >
                    {uploadingDoc ? (
                        <ActivityIndicator color="#6B7280" />
                    ) : doctorDocument ? (
                        <>
                            <FileText size={24} color="#10B981" />
                            <Text style={styles.uploadButtonTextSuccess} numberOfLines={1}>
                                {doctorDocument} ✓
                            </Text>
                        </>
                    ) : (
                        <>
                            <FileText size={24} color="#6B7280" />
                            <Text style={styles.uploadButtonText}>הוסף מסמך</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            <TouchableOpacity
                style={styles.saveButton}
                onPress={() => saveEntry('doctor', {
                    reason: doctorReason,
                    note: doctorNote,
                    photoUri: doctorPhoto || null,
                    documentName: doctorDocument || null
                })}
                disabled={saveSuccess}
            >
                <View style={[styles.saveButtonSolid, saveSuccess && styles.saveButtonSuccess]}>
                    {saveSuccess ? <Check size={18} color="#10B981" strokeWidth={2} /> : <Text style={styles.saveButtonText}>שמור ביקור</Text>}
                </View>
            </TouchableOpacity>
        </ScrollView>
    );

    // Illness
    const renderIllness = () => (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.screenContent}>
            <View style={styles.screenHeader}>
                <View style={styles.screenHeaderIconMinimal}>
                    <Heart size={24} color="#EF4444" strokeWidth={1.2} />
                </View>
            </View>

            <Text style={styles.sectionTitle}>בחר מחלה</Text>
            <View style={styles.chipsContainerRTL}>
                {COMMON_ILLNESSES.map(illness => (
                    <TouchableOpacity
                        key={illness}
                        style={[styles.chip, selectedIllness === illness && styles.chipActive]}
                        onPress={() => { setSelectedIllness(illness); setCustomIllness(''); }}
                    >
                        <Text style={[styles.chipText, selectedIllness === illness && styles.chipTextActive]}>{illness}</Text>
                    </TouchableOpacity>
                ))}
                {/* Plus button for custom illness */}
                <TouchableOpacity
                    style={[styles.chip, styles.chipPlus]}
                    onPress={() => setSelectedIllness('custom')}
                >
                    <Plus size={16} color="#9CA3AF" strokeWidth={1.5} />
                </TouchableOpacity>
            </View>

            {/* Custom illness input */}
            {selectedIllness === 'custom' && (
                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>שם המחלה</Text>
                    <TextInput
                        style={styles.textInput}
                        value={customIllness}
                        onChangeText={setCustomIllness}
                        placeholder="כתוב שם מחלה..."
                        placeholderTextColor="#9CA3AF"
                    />
                </View>
            )}

            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>הערות</Text>
                <TextInput style={styles.textArea} value={illnessNote} onChangeText={setIllnessNote} placeholder="תסמינים, טיפול..." placeholderTextColor="#9CA3AF" multiline />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={() => saveEntry('illness', { name: selectedIllness === 'custom' ? customIllness : selectedIllness, note: illnessNote })} disabled={saveSuccess}>
                <View style={[styles.saveButtonSolid, saveSuccess && styles.saveButtonSuccess]}>
                    {saveSuccess ? <Check size={18} color="#10B981" strokeWidth={2} /> : <Text style={styles.saveButtonText}>שמור</Text>}
                </View>
            </TouchableOpacity>
        </ScrollView>
    );

    // Load medications when entering medications screen
    useEffect(() => {
        if (currentScreen === 'medications' && babyId) {
            setLoadingMeds(true);
            getMedications(babyId).then(meds => {
                setSavedMedications(meds);
                setLoadingMeds(false);
            });
        }
    }, [currentScreen, babyId]);

    // Handle saving a new medication
    const handleSaveMedication = async (med: Omit<Medication, 'id' | 'createdAt'>) => {
        if (!babyId) return;
        setSavingMed(true);
        const saved = await addMedication(babyId, med);
        setSavingMed(false);
        if (saved) {
            setMedSaveSuccess(true);
            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            // Refresh list and go back
            setTimeout(async () => {
                setMedSaveSuccess(false);
                const refreshed = await getMedications(babyId);
                setSavedMedications(refreshed);
                setCurrentScreen('medications');
            }, 800);
        }
    };

    // Handle deleting a medication
    const handleDeleteMedication = async (medId: string) => {
        if (!babyId) return;
        const success = await deleteMedication(babyId, medId);
        if (success) {
            setSavedMedications(prev => prev.filter(m => m.id !== medId));
            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        }
    };

    // Handle marking medication as taken
    const handleMedTaken = async (med: Medication) => {
        if (!babyId) return;
        await logMedicationTaken(babyId, med);
        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        Alert.alert('✅', `${med.name} סומנה כנלקחה`);
    };

    // Medications List View
    const renderMedications = () => (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.screenContent}>
            {/* Add medication button */}
            <TouchableOpacity
                style={styles.addVaccineBtn}
                onPress={() => setCurrentScreen('medications_add' as any)}
            >
                <Plus size={20} color="#8B5CF6" />
                <Text style={[styles.addVaccineBtnText, { color: '#8B5CF6' }]}>הוסף תרופה חדשה</Text>
            </TouchableOpacity>

            {loadingMeds ? (
                <View style={{ alignItems: 'center', marginTop: 40 }}>
                    <ActivityIndicator size="large" color="#8B5CF6" />
                </View>
            ) : savedMedications.length === 0 ? (
                <View style={{ alignItems: 'center', marginTop: 40 }}>
                    <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center' }}>
                        <Pill size={36} color="#C4B5FD" />
                    </View>
                    <Text style={{ fontSize: 16, color: '#374151', fontWeight: '600', marginTop: 16 }}>אין תרופות עדיין</Text>
                    <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>לחץ על "הוסף תרופה" כדי להתחיל</Text>
                </View>
            ) : (
                savedMedications.map((med) => (
                    <SwipeableRow key={med.id} onDelete={() => handleDeleteMedication(med.id)}>
                        <View style={{
                            backgroundColor: '#FFFFFF',
                            borderRadius: 16,
                            padding: 16,
                            marginBottom: 12,
                            borderWidth: 1,
                            borderColor: '#E5E7EB',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.04,
                            shadowRadius: 4,
                            elevation: 1,
                        }}>
                            {/* Header row */}
                            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 10 }}>
                                <View style={{
                                    width: 40, height: 40, borderRadius: 12,
                                    backgroundColor: '#F5F3FF',
                                    alignItems: 'center', justifyContent: 'center',
                                    marginLeft: 12,
                                }}>
                                    <Pill size={20} color="#8B5CF6" strokeWidth={1.5} />
                                </View>
                                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#1F2937', textAlign: 'right' }}>
                                        {med.name}
                                    </Text>
                                    <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 2, textAlign: 'right' }}>
                                        {med.dosage} · {med.frequency}x ביום
                                    </Text>
                                </View>
                            </View>

                            {/* Times chips */}
                            <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                                {med.times.map((time, idx) => (
                                    <View key={idx} style={{
                                        backgroundColor: '#F5F3FF',
                                        paddingHorizontal: 10,
                                        paddingVertical: 5,
                                        borderRadius: 8,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 4,
                                    }}>
                                        <Clock size={12} color="#8B5CF6" />
                                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#7C3AED' }}>{time}</Text>
                                    </View>
                                ))}
                                {med.remindersEnabled && (
                                    <View style={{
                                        backgroundColor: '#FEF3C7',
                                        paddingHorizontal: 8,
                                        paddingVertical: 5,
                                        borderRadius: 8,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 4,
                                    }}>
                                        <Bell size={12} color="#D97706" />
                                        <Text style={{ fontSize: 11, color: '#D97706', fontWeight: '500' }}>תזכורת</Text>
                                    </View>
                                )}
                            </View>

                            {/* Notes */}
                            {med.notes ? (
                                <Text style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'right', marginBottom: 10 }}>
                                    {med.notes}
                                </Text>
                            ) : null}

                            {/* Taken button */}
                            <TouchableOpacity
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6,
                                    backgroundColor: '#F0FDF4',
                                    borderRadius: 12,
                                    paddingVertical: 10,
                                    borderWidth: 1,
                                    borderColor: '#BBF7D0',
                                }}
                                onPress={() => handleMedTaken(med)}
                            >
                                <Check size={16} color="#10B981" strokeWidth={2} />
                                <Text style={{ fontSize: 14, fontWeight: '600', color: '#10B981' }}>נלקחה ✓</Text>
                            </TouchableOpacity>
                        </View>
                    </SwipeableRow>
                ))
            )}
        </ScrollView>
    );

    // Add Medication Form
    const renderMedicationsAdd = () => (
        <AddMedicationForm
            onSave={handleSaveMedication}
            saving={savingMed}
            saveSuccess={medSaveSuccess}
        />
    );

    // History - beautiful tabbed view with premium cards
    const renderHistory = () => {
        const formatDate = (timestamp: string) => {
            const d = new Date(timestamp);
            const today = new Date();
            const isToday = d.toDateString() === today.toDateString();
            if (isToday) {
                return `היום, ${d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`;
            }
            return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
        };

        const getTypeConfig = (type: string) => {
            switch (type) {
                case 'temperature': return { label: 'חום', icon: Thermometer, color: '#F59E0B', bg: '#F3F4F6' };
                case 'doctor': return { label: 'רופא', icon: Stethoscope, color: '#10B981', bg: '#F3F4F6' };
                case 'illness': return { label: 'מחלה', icon: Heart, color: '#EF4444', bg: '#F3F4F6' };
                case 'medication': return { label: 'תרופה', icon: Pill, color: '#8B5CF6', bg: '#F3F4F6' };
                default: return { label: 'שונות', icon: ClipboardList, color: '#0EA5E9', bg: '#F3F4F6' };
            }
        };

        const filterTabs = [
            { key: 'all', label: 'הכל' },
            { key: 'temperature', label: 'חום' },
            { key: 'doctor', label: 'רופא' },
            { key: 'illness', label: 'מחלות' },
            { key: 'medication', label: 'תרופות' },
        ];

        const filteredLogs = historyFilter === 'all'
            ? healthLog
            : healthLog.filter(item => item.type === historyFilter);

        return (
            <View style={{ flex: 1, paddingTop: 8 }}>
                {/* Filter Tabs */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginBottom: 16, flexGrow: 0 }}
                    contentContainerStyle={{ paddingHorizontal: 8, gap: 10, justifyContent: 'center', flexGrow: 1 }}
                >
                    {filterTabs.map((tab) => (
                        <TouchableOpacity
                            key={tab.key}
                            onPress={() => {
                                setHistoryFilter(tab.key as any);
                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }}
                            style={{
                                paddingHorizontal: 16,
                                paddingVertical: 8,
                                borderRadius: 20,
                                backgroundColor: historyFilter === tab.key ? theme.primary : theme.cardSecondary,
                            }}
                        >
                            <Text style={{
                                fontSize: 14,
                                fontWeight: '600',
                                color: historyFilter === tab.key ? theme.card : theme.textSecondary,
                            }}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Content */}
                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                    {loadingHistory ? (
                        <View style={{ alignItems: 'center', marginTop: 40 }}>
                            <ActivityIndicator size="large" color={theme.textPrimary} />
                            <Text style={{ color: theme.textSecondary, marginTop: 12 }}>טוען...</Text>
                        </View>
                    ) : filteredLogs.length === 0 ? (
                        <View style={{ alignItems: 'center', marginTop: 40 }}>
                            <View style={{
                                width: 80, height: 80, borderRadius: 40,
                                backgroundColor: theme.cardSecondary, alignItems: 'center', justifyContent: 'center'
                            }}>
                                <ClipboardList size={36} color={theme.textTertiary} />
                            </View>
                            <Text style={{ fontSize: 16, color: theme.textPrimary, fontWeight: '600', marginTop: 16 }}>
                                {historyFilter === 'all' ? 'אין שמירות עדיין' : 'אין שמירות בקטגוריה זו'}
                            </Text>
                        </View>
                    ) : (
                        filteredLogs.map((item: any, index: number) => {
                            const config = getTypeConfig(item.type);
                            const Icon = config.icon;
                            return (
                                <SwipeableRow key={index} onDelete={() => deleteHistoryEntry(healthLog.indexOf(item))}>
                                    <View style={{
                                        backgroundColor: theme.card,
                                        borderRadius: 16,
                                        padding: 16,
                                        marginBottom: 12,
                                        flexDirection: 'row-reverse',
                                        alignItems: 'flex-start',
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 1 },
                                        shadowOpacity: 0.05,
                                        shadowRadius: 4,
                                        elevation: 2,
                                    }}>
                                        {/* Icon Badge - circular like menu */}
                                        <View style={{
                                            width: 48, height: 48, borderRadius: 24,
                                            backgroundColor: config.bg,
                                            alignItems: 'center', justifyContent: 'center',
                                            marginLeft: 16,
                                        }}>
                                            <Icon size={22} color={config.color} strokeWidth={1.2} />
                                        </View>

                                        {/* Content - on left in RTL */}
                                        <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                            <Text style={{ fontSize: 12, color: config.color, fontWeight: '500', marginBottom: 2 }}>
                                                {config.label}
                                            </Text>

                                            {item.value && (
                                                <Text style={{ fontSize: 15, fontWeight: '500', color: '#374151', marginTop: 2, textAlign: 'right' }}>
                                                    {item.value}°
                                                </Text>
                                            )}
                                            {item.name && (
                                                <Text style={{ fontSize: 15, fontWeight: '500', color: '#374151', marginTop: 2, textAlign: 'right' }}>
                                                    {item.name}
                                                </Text>
                                            )}
                                            {item.reason && (
                                                <Text style={{ fontSize: 14, color: '#374151', marginTop: 2, textAlign: 'right' }}>{item.reason}</Text>
                                            )}
                                            {item.note && (
                                                <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 4, textAlign: 'right' }}>{item.note}</Text>
                                            )}
                                            {/* Show photo/document attachments */}
                                            {(item.photoUri || item.documentName) && (
                                                <View style={{ flexDirection: 'row-reverse', gap: 8, marginTop: 8 }}>
                                                    {item.photoUri && (
                                                        <TouchableOpacity
                                                            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.successLight, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
                                                            onPress={() => {
                                                                // Open photo in a lightbox or share
                                                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                            }}
                                                        >
                                                            <Camera size={14} color={theme.success} />
                                                            <Text style={{ fontSize: 12, color: theme.success, fontWeight: '500' }}>תמונה</Text>
                                                        </TouchableOpacity>
                                                    )}
                                                    {item.documentName && (
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.primaryLight, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                                                            <FileText size={14} color={theme.primary} />
                                                            <Text style={{ fontSize: 12, color: theme.primary, fontWeight: '500' }} numberOfLines={1}>{item.documentName}</Text>
                                                        </View>
                                                    )}
                                                </View>
                                            )}
                                            <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>
                                                {formatDate(item.timestamp)}
                                            </Text>
                                        </View>
                                    </View>
                                </SwipeableRow>
                            );
                        })
                    )}
                </ScrollView>
            </View>
        );
    };

    const getScreenTitle = () => {
        switch (currentScreen) {
            case 'vaccines': return 'פנקס חיסונים';
            case 'doctor': return 'ביקור רופא';
            case 'illness': return 'מחלות';
            case 'temperature': return 'טמפרטורה';
            case 'medications': return 'תרופות';
            case 'medications_add': return 'תרופה חדשה';
            case 'history': return 'היסטוריה';
            default: return 'בריאות';
        }
    };

    const getHeaderGradient = (): [string, string] => {
        switch (currentScreen) {
            case 'vaccines': return ['#6366F1', '#4F46E5'];
            case 'doctor': return ['#10B981', '#059669'];
            case 'illness': return ['#EF4444', '#DC2626'];
            case 'temperature': return ['#F59E0B', '#D97706'];
            case 'medications': return ['#8B5CF6', '#7C3AED'];
            case 'medications_add': return ['#8B5CF6', '#7C3AED'];
            case 'history': return ['#0EA5E9', '#0284C7'];
            default: return ['#10B981', '#059669'];
        }
    };

    return (
        <Modal visible={isModalOpen} transparent animationType="none" onRequestClose={closeModal} statusBarTranslucent>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end' }}>
                <TouchableWithoutFeedback onPress={closeModal}>
                    <Animated.View style={[StyleSheet.absoluteFill, { opacity: backdropAnim }]}>
                        {Platform.OS === 'ios' ? (
                            <BlurView
                                intensity={isDarkMode ? 40 : 20}
                                tint={isDarkMode ? 'dark' : 'dark'}
                                style={StyleSheet.absoluteFill}
                                blurReductionFactor={4}
                            />
                        ) : (
                            <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.modalOverlay || 'rgba(0,0,0,0.5)' }]} />
                        )}
                    </Animated.View>
                </TouchableWithoutFeedback>
                <Animated.View
                    style={[
                        styles.modalContent,
                        {
                            backgroundColor: theme.card,
                            transform: [{ translateY: slideAnim }],
                        }
                    ]}
                >
                    {/* Drag Handle */}
                    <View style={styles.dragHandle} {...panResponder.panHandlers}>
                        <View style={[styles.dragHandleBar, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)' }]} />
                    </View>

                    {/* Minimal Header */}
                    <View style={[styles.modalHeader, { borderBottomColor: theme.border }]} {...panResponder.panHandlers}>
                        {currentScreen !== 'menu' ? (
                            <TouchableOpacity onPress={goBack} style={[styles.headerBtn, { backgroundColor: theme.inputBackground }]}>
                                <ChevronRight size={22} color={theme.textPrimary} />
                            </TouchableOpacity>
                        ) : (
                            <View style={{ width: 40 }} />
                        )}
                        <View style={styles.headerTitleContainer}>
                            {currentScreen === 'menu' && (
                                <View style={styles.headerIconWrapper}>
                                    <View style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center' }}>
                                        <ReAnimated.View style={[StyleSheet.absoluteFill, { borderRadius: 28, backgroundColor: '#14B8A6' }, healthIconPulseStyle]} />
                                        <View style={[styles.headerIconCircle, { borderColor: theme.border || '#E5E7EB' }]}>
                                            <ReAnimated.View style={healthIconBounceStyle}>
                                                <HeartPulse size={20} color="#14B8A6" strokeWidth={2} />
                                            </ReAnimated.View>
                                        </View>
                                    </View>
                                </View>
                            )}
                            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{getScreenTitle()}</Text>
                        </View>
                        <View style={{ width: 40 }} />
                    </View>

                    <View style={[styles.modalBody, { backgroundColor: 'transparent' }]}>
                        {currentScreen === 'menu' && renderMenu()}
                        {currentScreen === 'vaccines' && renderVaccines()}
                        {currentScreen === 'doctor' && renderDoctor()}
                        {currentScreen === 'illness' && renderIllness()}
                        {currentScreen === 'temperature' && renderTemperature()}
                        {currentScreen === 'medications' && renderMedications()}
                        {currentScreen === ('medications_add' as any) && renderMedicationsAdd()}
                        {currentScreen === 'history' && renderHistory()}
                    </View>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
});

HealthCard.displayName = 'HealthCard';

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 18,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2
    },
    cardContent: { flexDirection: 'row-reverse', alignItems: 'center' },
    cardIconWrapper: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: '#D1FAE5',
        alignItems: 'center',
        justifyContent: 'center'
    },
    cardText: { flex: 1, marginRight: 14, alignItems: 'flex-end' },
    cardTitle: { fontSize: 17, fontWeight: '700', color: '#1F2937' },
    cardSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
    cardArrow: { opacity: 0.6 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 44, maxHeight: '92%', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: -8 }, elevation: 12, flex: 1, width: '100%' },
    dragHandle: { alignItems: 'center', paddingTop: 16, paddingBottom: 4, paddingHorizontal: 50, zIndex: 10, minHeight: 40 },
    dragHandleBar: { width: 36, height: 4, borderRadius: 2 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    headerBtn: { padding: 8, backgroundColor: '#F3F4F6', borderRadius: 10 },
    headerTitleContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column' },
    headerIconWrapper: { marginBottom: 8, alignItems: 'center' },
    headerIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    modalTitle: { fontSize: 17, fontWeight: '600', color: '#1F2937' },
    modalBody: { flex: 1, backgroundColor: '#FFFFFF' },

    menuContainer: { padding: 16 },
    optionsList: { gap: 10 },
    optionRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        padding: 14,
        gap: 12,
    },
    optionIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    optionLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#374151', textAlign: 'right' },

    screenContent: { padding: 20, paddingBottom: 40 },
    screenHeader: { alignItems: 'center', marginBottom: 16 },
    screenHeaderIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    screenHeaderIconMinimal: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
    screenSubtitle: { fontSize: 13, color: '#9CA3AF', marginTop: 10 },

    // Vaccine styles
    addVaccineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#EEF2FF', padding: 14, borderRadius: 14, marginBottom: 20 },
    addVaccineBtnText: { fontSize: 15, fontWeight: '600', color: '#6366F1' },
    addVaccineForm: { flexDirection: 'row-reverse', gap: 10, marginBottom: 20 },
    addVaccineInput: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 15, textAlign: 'right', textAlignVertical: 'center', borderWidth: 1, borderColor: '#E5E7EB', writingDirection: 'rtl' },
    addVaccineSubmit: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#6366F1', alignItems: 'center', justifyContent: 'center' },
    vaccineGroup: { marginBottom: 20 },
    ageBadge: { alignSelf: 'flex-end', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginBottom: 12 },
    ageBadgeText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    ageBadgeMinimal: { alignSelf: 'flex-end', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, marginBottom: 10, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB' },
    ageBadgeTextMinimal: { color: '#6B7280', fontWeight: '600', fontSize: 13 },
    vaccineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
    vaccineRowDone: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F0FDF4', padding: 16, borderRadius: 16, marginBottom: 8, borderWidth: 1, borderColor: '#10B981' },
    vaccineName: { fontSize: 15, color: '#1F2937', fontWeight: '500', textAlign: 'right', writingDirection: 'rtl' },
    vaccineNameDone: { fontSize: 15, color: '#10B981', fontWeight: '600', textDecorationLine: 'line-through', textAlign: 'right', writingDirection: 'rtl' },
    checkbox: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
    checkboxChecked: { backgroundColor: '#10B981', borderColor: '#10B981' },

    // Temperature slider
    temperatureDisplay: { backgroundColor: '#fff', borderRadius: 20, padding: 20, alignItems: 'center', borderWidth: 3, marginBottom: 20 },
    temperatureValue: { fontSize: 64, fontWeight: '800' },
    temperatureUnit: { fontSize: 24, color: '#6B7280', marginTop: -8 },
    temperatureDisplayMinimal: { backgroundColor: '#F9FAFB', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 20 },
    temperatureValueMinimal: { fontSize: 56, fontWeight: '700', color: '#374151' },
    temperatureUnitMinimal: { fontSize: 20, color: '#9CA3AF', marginTop: -4 },
    quickSelectBtnMinimal: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8, marginBottom: 8 },
    quickSelectBtnMinimalActive: { backgroundColor: '#E5E7EB' },
    quickSelectTextMinimal: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
    quickSelectTextMinimalActive: { color: '#374151', fontWeight: '600' },
    sliderContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    sliderBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
    slider: { flex: 1, marginHorizontal: 10, height: 40 },

    // Forms
    inputGroup: { marginBottom: 20 },
    inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8, textAlign: 'right' },
    textInput: { backgroundColor: '#fff', borderRadius: 16, padding: 16, fontSize: 16, textAlign: 'right', borderWidth: 1, borderColor: '#E5E7EB' },
    textArea: { backgroundColor: '#fff', borderRadius: 16, padding: 16, fontSize: 16, textAlign: 'right', borderWidth: 1, borderColor: '#E5E7EB', minHeight: 100, textAlignVertical: 'top' },
    quickSelectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    quickSelectRowRTL: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'flex-start', gap: 8, marginBottom: 20 },
    quickSelectBtn: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB' },
    quickSelectBtnActive: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
    quickSelectBtnWarning: { borderColor: '#EF4444' },
    quickSelectText: { fontSize: 14, fontWeight: '600', color: '#374151' },
    quickSelectTextActive: { color: '#fff' },

    // Upload
    uploadSection: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    uploadButton: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB', minHeight: 100 },
    uploadButtonSuccess: { backgroundColor: '#F0FDF4', borderColor: '#10B981' },
    uploadButtonText: { fontSize: 14, color: '#6B7280', marginTop: 8, fontWeight: '500' },
    uploadButtonTextSuccess: { fontSize: 12, color: '#10B981', marginTop: 8, fontWeight: '600' },
    uploadPreview: { width: 50, height: 50, borderRadius: 8 },

    // Chips
    sectionTitle: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 12, textAlign: 'right' },
    chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
    chipsContainerRTL: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    chip: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#F9FAFB', borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB' },
    chipPlus: { paddingHorizontal: 12, paddingVertical: 10 },
    chipActive: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
    chipActivePurple: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
    chipText: { fontSize: 14, fontWeight: '500', color: '#374151' },
    chipTextActive: { color: '#fff' },

    saveButton: { marginTop: 16 },
    saveButtonSolid: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 24, alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB' },
    saveButtonSuccess: { backgroundColor: '#ECFDF5', borderColor: '#10B981' },
    saveButtonText: { fontSize: 15, fontWeight: '600', color: '#374151' },
});

export default HealthCard;
