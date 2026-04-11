import React, { memo, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Platform, Alert, TextInput, Animated, Dimensions, Image, PanResponder, TouchableWithoutFeedback, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import InlineLoader from '../../components/Common/InlineLoader';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, Syringe, Thermometer, Pill, Stethoscope, X, ChevronLeft, ChevronRight, Plus, Check, Trash2, Camera, FileText, Image as ImageIcon, Minus, ClipboardList, HeartPulse, Clock, Bell, CalendarPlus, Info, Award, MapPin, ShieldAlert, Download, Milk, Egg, Bean, Nut, Wheat, Fish, CircleDot, Wind, AlertTriangle, type LucideIcon } from 'lucide-react-native';
import { LineChart } from 'react-native-chart-kit';
import * as ExpoCalendar from 'expo-calendar';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import Slider from '@react-native-community/slider';
import DateTimePicker from '@react-native-community/datetimepicker';
import AndroidHebrewCalendar from '../Common/AndroidHebrewCalendar';
import { BlurView } from 'expo-blur';
import { auth, db } from '../../services/firebaseConfig';
import { addMedication, getMedications, deleteMedication, logMedicationTaken } from '../../services/medicationService';
import AddMedicationForm from './AddMedicationForm';
import TipatHalavLocator from './TipatHalavLocator';
import { exportHealthPDF } from '../../services/healthPdfService';
import { Medication } from '../../types/home';
import { saveEventToFirebase } from '../../services/firebaseService';
import { doc, getDoc, updateDoc, setDoc, arrayUnion, collection, query, where, limit, getDocs, Timestamp } from 'firebase/firestore';
import { VACCINE_SCHEDULE, CustomVaccine } from '../../types/profile';
import { useActiveChild } from '../../context/ActiveChildContext';
import { useTheme } from '../../context/ThemeContext';
import { logger } from '../../utils/logger';
import { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, withSpring, interpolate, default as ReAnimated } from 'react-native-reanimated';
import SwipeableRow from '../SwipeableRow';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useLanguage } from '../../context/LanguageContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface HealthCardProps {
    dynamicStyles: { text: string };
    visible?: boolean;
    onClose?: () => void;
}

type HealthScreen = 'menu' | 'vaccines' | 'doctor' | 'illness' | 'temperature' | 'medications' | 'medications_add' | 'history' | 'tipat_halav' | 'allergies';

interface AllergyEntry {
    id: string;
    name: string;
    severity: 'mild' | 'moderate' | 'severe';
    diagnosisDate: string;
    note?: string;
}

const PRESET_ALLERGENS: { key: string; name: string; icon: LucideIcon }[] = [
    { key: 'milk', name: 'חלב', icon: Milk },
    { key: 'eggs', name: 'ביצים', icon: Egg },
    { key: 'peanuts', name: 'בוטנים', icon: Bean },
    { key: 'treeNuts', name: 'אגוזים', icon: Nut },
    { key: 'soy', name: 'סויה', icon: Bean },
    { key: 'wheat', name: 'חיטה/גלוטן', icon: Wheat },
    { key: 'fish', name: 'דגים', icon: Fish },
    { key: 'sesame', name: 'שומשום', icon: CircleDot },
    { key: 'medication', name: 'תרופות', icon: Pill },
    { key: 'dust', name: 'אבק', icon: Wind },
];

interface HealthOption {
    key: HealthScreen;
    label: string;
    description: string;
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

// Health Options will be defined inside the component to use ThemeContext

// Animated Vaccine Row with completion animation (dotted burst + strikethrough + check bounce)
const AnimatedVaccineRow = ({ vaccine, isDone, justCompleted, theme, isDarkMode, vaccines, onPress, onLongPress, onUnmark, onCalendar, onInfo, styles: s }: {
    vaccine: any; isDone: boolean; justCompleted: boolean; theme: any; isDarkMode: boolean; vaccines: any;
    onPress: () => void; onLongPress: () => void; onUnmark: () => void; onCalendar: () => void; onInfo: () => void; styles: any;
}) => {
    // Animation values
    const checkScale = useRef(new Animated.Value(justCompleted ? 0 : 1)).current;
    const checkOpacity = useRef(new Animated.Value(justCompleted ? 0 : 1)).current;
    const burstScale = useRef(new Animated.Value(0.5)).current;
    const burstOpacity = useRef(new Animated.Value(0)).current;
    const strikeWidth = useRef(new Animated.Value(justCompleted ? 0 : (isDone ? 1 : 0))).current;
    const textOpacity = useRef(new Animated.Value(1)).current;
    const rowBg = useRef(new Animated.Value(justCompleted ? 0 : (isDone ? 1 : 0))).current;
    const hasAnimated = useRef(false);

    useEffect(() => {
        if (justCompleted && !hasAnimated.current) {
            hasAnimated.current = true;

            Animated.sequence([
                // Phase 1: Row background gently transitions + checkbox fades in
                Animated.parallel([
                    Animated.timing(rowBg, { toValue: 1, duration: 400, useNativeDriver: false }),
                    Animated.timing(checkOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
                ]),
                // Phase 2: Premium reveal - burst ring expands, check bounces, text strikes
                Animated.parallel([
                    // Dotted burst ring - elegant scale up and fade out
                    Animated.sequence([
                        Animated.timing(burstOpacity, { toValue: 0.8, duration: 150, useNativeDriver: true }),
                        Animated.parallel([
                            Animated.spring(burstScale, { toValue: 2.0, friction: 8, tension: 80, useNativeDriver: true }),
                            Animated.timing(burstOpacity, { toValue: 0, duration: 600, useNativeDriver: true }),
                        ]),
                    ]),
                    // Checkmark bounces in with satisfying overshoot
                    Animated.sequence([
                        Animated.delay(100),
                        Animated.spring(checkScale, { toValue: 1.25, friction: 4, tension: 180, useNativeDriver: true }),
                        Animated.spring(checkScale, { toValue: 1, friction: 6, tension: 250, useNativeDriver: true }),
                    ]),
                    // Strikethrough grows across text - slower for premium feel
                    Animated.sequence([
                        Animated.delay(200),
                        Animated.timing(strikeWidth, { toValue: 1, duration: 700, useNativeDriver: false }),
                    ]),
                    // Text fades to muted - graceful
                    Animated.sequence([
                        Animated.delay(150),
                        Animated.timing(textOpacity, { toValue: 0.5, duration: 600, useNativeDriver: true }),
                    ]),
                ]),
            ]).start();
        }
    }, [justCompleted]);

    const vaccineData = vaccines[vaccine.key];
    const dateVal = isDone && typeof vaccineData === 'object' ? (vaccineData as any)?.date : null;
    const dateStr = dateVal
        ? (dateVal?.seconds
            ? new Date(dateVal.seconds * 1000).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })
            : new Date(dateVal).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' }))
        : '';

    const animatedBg = rowBg.interpolate({
        inputRange: [0, 1],
        outputRange: [isDarkMode ? 'rgba(255,255,255,0.04)' : '#FFFFFF', isDarkMode ? 'rgba(107, 154, 196, 0.1)' : 'rgba(107, 154, 196, 0.08)'],
    });

    const healthColor = '#6B9AC4'; // Steel blue matching reference design

    return (
        <Animated.View style={[
            s.vaccineRow,
            isDone && !justCompleted && s.vaccineRowDone,
            justCompleted && {
                backgroundColor: animatedBg,
                borderWidth: 1,
                borderColor: healthColor,
            },
            !isDone && !justCompleted && { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : '#FFFFFF' },
        ]}>
            {isDone ? (
                <TouchableOpacity onPress={onUnmark} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Trash2 size={16} color="#EF4444" />
                </TouchableOpacity>
            ) : (
                <TouchableOpacity onPress={onCalendar} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <CalendarPlus size={16} color={healthColor} />
                </TouchableOpacity>
            )}
            <TouchableOpacity
                style={{ flexDirection: 'row-reverse', alignItems: 'center', flex: 1, gap: 10 }}
                onPress={onPress}
                onLongPress={onLongPress}
                delayLongPress={400}
                activeOpacity={0.7}
            >
                {/* Checkbox with burst ring */}
                <View style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }}>
                    {/* Dotted burst ring (behind checkbox) */}
                    {justCompleted && (
                        <Animated.View style={{
                            position: 'absolute',
                            alignSelf: 'center',
                            width: 48, height: 48, borderRadius: 24,
                            borderWidth: 2,
                            borderColor: healthColor,
                            borderStyle: 'dashed',
                            opacity: burstOpacity,
                            transform: [{ scale: burstScale }],
                        }} />
                    )}
                    {/* Actual checkbox */}
                    <Animated.View style={[
                        s.checkbox,
                        isDone && s.checkboxChecked,
                        justCompleted && {
                            transform: [{ scale: checkScale }],
                            opacity: checkOpacity,
                        },
                    ]}>
                        {isDone && <Check size={16} color="#fff" strokeWidth={3} />}
                    </Animated.View>
                </View>

                {/* Text content */}
                <Animated.View style={{ flex: 1, alignItems: 'flex-end', opacity: justCompleted ? textOpacity : 1 }}>
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
                        <View style={{ position: 'relative' }}>
                            <Text style={[
                                s.vaccineName,
                                isDone && !justCompleted && s.vaccineNameDone,
                                isDone && justCompleted && { color: theme.textSecondary, fontWeight: '500' },
                            ]}>
                                {vaccine.name}
                            </Text>
                            {/* Animated strikethrough line */}
                            {(justCompleted || (isDone && !justCompleted)) && justCompleted && (
                                <Animated.View style={{
                                    position: 'absolute', top: '50%', right: 0,
                                    height: 1.5,
                                    backgroundColor: theme.textSecondary,
                                    width: strikeWidth.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: ['0%', '100%'],
                                    }),
                                }} />
                            )}
                        </View>
                        {vaccine.description && !isDone && (
                            <TouchableOpacity onPress={onInfo} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                                <Info size={14} color={theme.textTertiary} />
                            </TouchableOpacity>
                        )}
                    </View>
                    {isDone && dateStr ? (
                        <Text style={{ fontSize: 11, color: healthColor, marginTop: 2, fontWeight: '500' }}>
                            בוצע: {dateStr}
                        </Text>
                    ) : null}
                </Animated.View>
            </TouchableOpacity>
        </Animated.View>
    );
};

const HealthCard = memo(({ dynamicStyles, visible, onClose }: HealthCardProps) => {
    const { theme, isDarkMode } = useTheme();
    const styles = React.useMemo(() => getStyles(theme, isDarkMode), [theme, isDarkMode]);
    const { t } = useLanguage();
    const [isModalOpen, setIsModalOpen] = useState(visible || false);
    const [currentScreen, setCurrentScreen] = useState<HealthScreen>('menu');
    const HEALTH_OPTIONS: HealthOption[] = useMemo(() => [
        { key: 'doctor', label: 'health.doctorVisit', description: 'רישום ומעקב ביקורי רופא', icon: Stethoscope, iconColor: theme.actionColors.health.color },
        { key: 'vaccines', label: 'health.vaccines', description: 'מעקב חיסוני שגרה', icon: Syringe, iconColor: theme.actionColors.tools.color },
        { key: 'illness', label: 'health.illnesses', description: 'תיעוד מחלות ותסמינים', icon: Heart, iconColor: theme.actionColors.sos.color },
        { key: 'temperature', label: 'health.temperature', description: 'מדידת חום ומעקב מגמות', icon: Thermometer, iconColor: theme.actionColors.food.color },
        { key: 'medications', label: 'health.medications', description: 'ניהול תרופות ותזכורות', icon: Pill, iconColor: theme.actionColors.supplements.color },
        { key: 'tipat_halav', label: 'health.tipatHalav', description: 'מציאת תחנה קרובה', icon: MapPin, iconColor: theme.actionColors.growth.color },
        { key: 'allergies' as HealthScreen, label: 'health.allergies', description: 'רישום ומעקב אלרגיות', icon: ShieldAlert, iconColor: theme.actionColors.sos.color },
        { key: 'history', label: 'health.history', description: 'צפייה בכל הרשומות', icon: ClipboardList, iconColor: theme.actionColors.custom.color },
    ], [theme]);

    const scaleAnims = useRef(HEALTH_OPTIONS.map(() => new Animated.Value(1))).current;

    // Swipe down animations
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;

    // Health icon animation — premium heartbeat
    const healthIconPulse = useSharedValue(0);
    const healthIconPulse2 = useSharedValue(0);
    const healthIconBounce = useSharedValue(1);
    const healthIconRotate = useSharedValue(0);

    // Download button animation (matching Reports screen)
    const [isDownloadPressed, setIsDownloadPressed] = useState(false);
    const downloadScale = useSharedValue(1);
    const downloadRotation = useSharedValue(0);

    const handleHealthDownload = async () => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsDownloadPressed(true);

        downloadScale.value = withSequence(
            withSpring(0.85, { damping: 14, stiffness: 280 }),
            withSpring(1.12, { damping: 10, stiffness: 240 }),
            withSpring(1, { damping: 14, stiffness: 240 })
        );
        downloadRotation.value = withSequence(
            withSpring(15, { damping: 14, stiffness: 280 }),
            withSpring(-8, { damping: 10, stiffness: 240 }),
            withSpring(0, { damping: 14, stiffness: 240 })
        );

        setTimeout(async () => {
            const childId = babyId || activeChild?.childId;
            if (!childId) {
                Alert.alert(t('misc.saveError'), t('health.noBabyProfile'));
                setIsDownloadPressed(false);
                return;
            }
            const success = await exportHealthPDF({
                childId,
                childName: activeChild?.childName || t('profile.childFallback'),
                birthDate: undefined,
            });
            if (!success) {
                Alert.alert(t('misc.saveError'), t('reports.share.error'));
            }
            setTimeout(() => {
                setIsDownloadPressed(false);
                downloadRotation.value = withSpring(0, { damping: 14, stiffness: 240 });
                downloadScale.value = withSpring(1, { damping: 14, stiffness: 240 });
            }, 800);
        }, 250);
    };

    const animatedDownloadStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: downloadScale.value },
            { rotate: `${downloadRotation.value}deg` }
        ] as any
    }));

    const healthIconPulseStyle = useAnimatedStyle(() => ({
        opacity: interpolate(healthIconPulse.value, [0, 0.5, 1], [0.5, 0.2, 0]),
        transform: [{ scale: interpolate(healthIconPulse.value, [0, 1], [1, 2.0]) }],
    }));

    // Second pulse ring — staggered for depth
    const healthIconPulse2Style = useAnimatedStyle(() => ({
        opacity: interpolate(healthIconPulse2.value, [0, 0.5, 1], [0.35, 0.15, 0]),
        transform: [{ scale: interpolate(healthIconPulse2.value, [0, 1], [1, 2.4]) }],
    }));

    const healthIconBounceStyle = useAnimatedStyle(() => ({
        transform: [{ scale: healthIconBounce.value }],
    }));

    const healthIconRotateStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${interpolate(healthIconRotate.value, [0, 1], [0, 6])}deg` }],
    }));

    useEffect(() => {
        if (isModalOpen) {
            // Primary pulse ring
            healthIconPulse.value = withRepeat(withTiming(1, { duration: 1400 }), -1, false);
            // Secondary pulse ring — delayed by starting slower
            healthIconPulse2.value = withRepeat(
                withSequence(
                    withTiming(0, { duration: 400 }),
                    withTiming(1, { duration: 1600 }),
                ),
                -1,
                false
            );
            // Realistic heartbeat: "lub-dub" + rest
            healthIconBounce.value = withRepeat(
                withSequence(
                    withTiming(1.22, { duration: 100 }),  // lub (sharp)
                    withTiming(0.92, { duration: 80 }),   // recoil
                    withTiming(1.15, { duration: 90 }),   // dub
                    withTiming(0.96, { duration: 70 }),   // recoil
                    withTiming(1.02, { duration: 100 }),  // settle
                    withTiming(1, { duration: 120 }),     // rest start
                    withTiming(1, { duration: 2000 }),    // rest
                ),
                -1,
                false
            );
            // Subtle rotation wiggle
            healthIconRotate.value = withRepeat(
                withSequence(
                    withTiming(1, { duration: 150 }),
                    withTiming(-0.5, { duration: 120 }),
                    withTiming(0, { duration: 200 }),
                    withTiming(0, { duration: 2200 }),
                ),
                -1,
                false
            );
        } else {
            healthIconPulse.value = 0;
            healthIconPulse2.value = 0;
            healthIconBounce.value = 1;
            healthIconRotate.value = 0;
        }
    }, [isModalOpen]);

    // Vaccine state
    const [vaccines, setVaccines] = useState<Record<string, boolean>>({});
    const [customVaccines, setCustomVaccines] = useState<CustomVaccine[]>([]);
    const [babyId, setBabyId] = useState<string | null>(null);
    const [newVaccineName, setNewVaccineName] = useState('');
    const [showAddVaccine, setShowAddVaccine] = useState(false);
    const [showTipatHalav, setShowTipatHalav] = useState(false);
    // Date picker for marking vaccine done
    const [pendingVaccineKey, setPendingVaccineKey] = useState<string | null>(null);
    const [vaccineMarkDate, setVaccineMarkDate] = useState(new Date());
    // Calendar appointment picker
    const [calendarVaccineKey, setCalendarVaccineKey] = useState<string | null>(null);
    const [calendarAppointmentDate, setCalendarAppointmentDate] = useState(new Date());

    // Temperature state with slider
    const [temperature, setTemperature] = useState(37.0);
    const [tempNote, setTempNote] = useState('');
    const [savingTemp, setSavingTemp] = useState(false);

    // Illness state
    const [selectedIllness, setSelectedIllness] = useState<string | null>(null);
    const [customIllness, setCustomIllness] = useState('');
    const [illnessNote, setIllnessNote] = useState('');
    const [illnessStartDate, setIllnessStartDate] = useState<Date>(new Date());
    const [illnessEndDate, setIllnessEndDate] = useState<Date | null>(null);
    const [showIllnessStartPicker, setShowIllnessStartPicker] = useState(false);
    const [showIllnessEndPicker, setShowIllnessEndPicker] = useState(false);
    const [illnessOngoing, setIllnessOngoing] = useState(true);
    const [savingIllness, setSavingIllness] = useState(false);

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
    const [doctorName, setDoctorName] = useState('');
    const [doctorVisitDate, setDoctorVisitDate] = useState(new Date());
    const [showDoctorDatePicker, setShowDoctorDatePicker] = useState(false);
    const [doctorPhoto, setDoctorPhoto] = useState<string | null>(null);
    const [doctorDocument, setDoctorDocument] = useState<string | null>(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const [savingDoctor, setSavingDoctor] = useState(false);

    // History state
    const [healthLog, setHealthLog] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [historyFilter, setHistoryFilter] = useState<'all' | 'temperature' | 'doctor' | 'illness' | 'medication' | 'vaccine'>('all');
    const [selectedVaccineInfo, setSelectedVaccineInfo] = useState<{ name: string; description: string } | null>(null);
    const [unmarkVaccineKey, setUnmarkVaccineKey] = useState<string | null>(null);

    // Allergy state
    const [allergies, setAllergies] = useState<AllergyEntry[]>([]);
    const [loadingAllergies, setLoadingAllergies] = useState(false);
    const [showAllergyForm, setShowAllergyForm] = useState(false);
    const [selectedAllergen, setSelectedAllergen] = useState<string | null>(null);
    const [customAllergenName, setCustomAllergenName] = useState('');
    const [allergySeverity, setAllergySeverity] = useState<'mild' | 'moderate' | 'severe'>('mild');
    const [allergyNote, setAllergyNote] = useState('');
    const [savingAllergy, setSavingAllergy] = useState(false);

    // Vaccine completion animation tracking
    const [justCompletedKeys, setJustCompletedKeys] = useState<Set<string>>(new Set());

    // Save success state
    const [saveSuccess, setSaveSuccess] = useState(false);

    useEffect(() => {
        if (isModalOpen && currentScreen === 'vaccines') {
            loadVaccines();
        }
        if (isModalOpen && (currentScreen === 'history' || currentScreen === 'temperature')) {
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
        const childId = babyId || activeChild?.childId;
        if (!childId) return;
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
            await updateDoc(doc(db, 'babies', childId), { [`vaccines.${key}`]: valueToSave });

            // If marked as done, add to History and Timeline
            if (newVal) {
                // 1. Add to Health History (healthLog)
                const vaccineName = VACCINE_SCHEDULE.flatMap(g => g.vaccines).find(v => v.key === key)?.name || key;
                const vaccineDate = timestamp.toDate();
                const dateStr = vaccineDate.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
                const historyEntry = {
                    type: 'vaccine',
                    name: vaccineName,
                    note: `בוצע: ${dateStr}`,
                    timestamp: timestamp.toDate().toISOString()
                };
                await updateDoc(doc(db, 'babies', childId), { healthLog: arrayUnion(historyEntry) });
                if (currentScreen === 'history') loadHealthLog();

                // 2. Add to Daily Timeline (events collection)
                await saveEventToFirebase(user.uid, childId, {
                    type: 'custom',
                    subType: 'vaccine',
                    note: `חיסון: ${vaccineName}`,
                    timestamp: date || new Date()
                });
            }
        } catch (error) {
            logger.log('Error updating vaccine:', error);
            setVaccines(prev => ({ ...prev, [key]: currentStatus }));
        }
    };

    const addCustomVaccine = async () => {
        const childId = babyId || activeChild?.childId;
        if (!childId || !newVaccineName.trim()) return;

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
            await updateDoc(doc(db, 'babies', childId), { customVaccines: updated });
        } catch (error) {
            logger.log('Error adding custom vaccine:', error);
        }
    };

    const deleteCustomVaccine = async (id: string) => {
        const childId = babyId || activeChild?.childId;
        if (!childId) return;

        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        const updated = customVaccines.filter(v => v.id !== id);
        setCustomVaccines(updated);

        try {
            await updateDoc(doc(db, 'babies', childId), { customVaccines: updated });
        } catch (error) {
            logger.log('Error deleting custom vaccine:', error);
        }
    };

    // Opens date picker before marking vaccine done
    const handleVaccinePress = (key: string) => {
        const currentStatus = vaccines[key];
        const isDone = currentStatus && typeof currentStatus === 'object' ? (currentStatus as any).isDone : !!currentStatus;
        if (isDone) {
            // Already done — just toggle off directly (no date needed)
            toggleVaccine(key);
        } else {
            setPendingVaccineKey(key);
            setVaccineMarkDate(new Date());
        }
    };

    const confirmVaccineMark = () => {
        if (pendingVaccineKey) {
            toggleVaccine(pendingVaccineKey, vaccineMarkDate);
            // Trigger completion animation
            setJustCompletedKeys(prev => new Set(prev).add(pendingVaccineKey));
            // Clear after animation finishes
            setTimeout(() => {
                setJustCompletedKeys(prev => {
                    const next = new Set(prev);
                    next.delete(pendingVaccineKey);
                    return next;
                });
            }, 2000);
        }
        setPendingVaccineKey(null);
    };

    // Add vaccine appointment to device calendar
    const addVaccineToCalendar = async (vaccineName: string, dateObj?: Date) => {
        const childId = babyId || activeChild?.childId;
        const user = auth.currentUser;
        try {
            const { status } = await ExpoCalendar.requestCalendarPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(t('health.permissionRequired'), t('health.calendarAccessNeeded'));
                return;
            }

            const calendars = await ExpoCalendar.getCalendarsAsync(ExpoCalendar.EntityTypes.EVENT);
            const defaultCal = calendars.find(c => c.allowsModifications && c.source?.isLocalAccount) || calendars.find(c => c.allowsModifications);
            if (!defaultCal) {
                Alert.alert(t('misc.saveError'), t('health.noCalendarFound'));
                return;
            }

            const startDate = new Date(dateObj || calendarAppointmentDate);
            startDate.setHours(9, 0, 0, 0);
            const endDate = new Date(startDate);
            endDate.setMinutes(endDate.getMinutes() + 30);

            await ExpoCalendar.createEventAsync(defaultCal.id, {
                title: `חיסון: ${vaccineName}`,
                startDate,
                endDate,
                notes: `תזכורת חיסון לתינוק - ${vaccineName}`,
                alarms: [{ relativeOffset: -60 }, { relativeOffset: -1440 }], // 1hr and 1day before
            });

            // Save appointment to health history
            if (childId) {
                const appointmentEntry = {
                    type: 'vaccine',
                    name: vaccineName,
                    note: `תור חיסון: ${vaccineName} - ${startDate.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}`,
                    timestamp: new Date().toISOString(),
                    appointmentDate: startDate.toISOString(),
                };
                await updateDoc(doc(db, 'babies', childId), { healthLog: arrayUnion(appointmentEntry) });
                if (currentScreen === 'history') loadHealthLog();
            }

            // Also add to daily timeline
            if (user && childId) {
                await saveEventToFirebase(user.uid, childId, {
                    type: 'custom',
                    subType: 'vaccine',
                    note: `תור חיסון: ${vaccineName} (${startDate.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })})`,
                    timestamp: new Date(),
                });
            }

            Alert.alert(t('health.addedToCalendar'), t('health.vaccineAddedToCalendar', { name: vaccineName }));
        } catch (error) {
            logger.log('Error adding to calendar:', error);
            Alert.alert(t('misc.saveError'), t('health.cannotSave'));
        }
        setCalendarVaccineKey(null);
    };

    // Photo picker for doctor visit
    const pickPhoto = async () => {
        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                Alert.alert(t('misc.saveError'), t('health.galleryPermissionNeeded'));
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
        setDoctorName('');
        setDoctorVisitDate(new Date());
        setShowDoctorDatePicker(false);
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
        if (currentScreen === 'allergies' && showAllergyForm) {
            setShowAllergyForm(false);
            return;
        }
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
                Alert.alert(t('misc.saveError'), t('health.cannotSave'));
                return;
            }
        } else {
            try {
                const entry = { ...data, timestamp: new Date().toISOString(), type };
                await updateDoc(doc(db, 'babies', babyId), { healthLog: arrayUnion(entry) });
            } catch (error) {
                logger.log('Error saving entry:', error);
                Alert.alert(t('misc.saveError'), t('health.cannotSave'));
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
            Alert.alert(t('misc.saveError'), t('health.cannotDelete'));
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

                    // Compute badge for each item
                    let badge: string | null = null;
                    if (option.key === 'vaccines') {
                        const total = VACCINE_SCHEDULE.reduce((acc, g) => acc + g.vaccines.length, 0);
                        const done = VACCINE_SCHEDULE.reduce((acc, g) => {
                            return acc + g.vaccines.filter(v => {
                                const status = vaccines[v.key];
                                return status && (typeof status === 'object' ? (status as any).isDone : !!status);
                            }).length;
                        }, 0);
                        if (total > 0) badge = `${done}/${total}`;
                    } else if (option.key === 'allergies') {
                        if (allergies.length > 0) badge = `${allergies.length}`;
                    } else if (option.key === 'medications') {
                        if (savedMedications.length > 0) badge = `${savedMedications.length}`;
                    } else if (option.key === 'history') {
                        if (healthLog.length > 0) badge = `${healthLog.length}`;
                    }

                    return (
                        <Animated.View key={option.key} style={[{ transform: [{ scale: scaleAnims[index] }] }]}>
                            <TouchableOpacity
                                style={styles.optionRow}
                                onPress={() => handleOptionPress(option)}
                                onPressIn={() => handleCardPressIn(index)}
                                onPressOut={() => handleCardPressOut(index)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.optionIconCircle, { backgroundColor: option.iconColor, borderColor: 'transparent' }]}>
                                    <Icon size={22} color="#FFFFFF" strokeWidth={1.2} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.optionLabel}>{t(option.label)}</Text>
                                    <Text style={styles.optionDescription}>{option.description}</Text>
                                </View>
                                {badge && (
                                    <View style={{
                                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                        borderRadius: 10,
                                        paddingHorizontal: 10,
                                        paddingVertical: 4,
                                        marginLeft: 8,
                                    }}>
                                        <Text style={{
                                            fontSize: 12,
                                            fontWeight: '700',
                                            color: option.iconColor,
                                        }}>{badge}</Text>
                                    </View>
                                )}
                                <ChevronLeft size={18} color="#9CA3AF" />
                            </TouchableOpacity>
                        </Animated.View>
                    );
                })}
            </View>
        </ScrollView>
    );

    // Vaccines with strikethrough
    const renderVaccines = () => {
        // Calculate progress
        const totalVaccines = VACCINE_SCHEDULE.reduce((acc, g) => acc + g.vaccines.length, 0);
        const doneVaccines = VACCINE_SCHEDULE.reduce((acc, g) => {
            return acc + g.vaccines.filter(v => {
                const status = vaccines[v.key];
                return status && (typeof status === 'object' ? (status as any).isDone : !!status);
            }).length;
        }, 0);
        const progress = totalVaccines > 0 ? doneVaccines / totalVaccines : 0;

        // Find next undone vaccine
        let nextVaccine: { name: string; ageTitle: string; key: string; description?: string } | null = null;
        for (const group of VACCINE_SCHEDULE) {
            for (const v of group.vaccines) {
                const status = vaccines[v.key];
                const isDone = status && (typeof status === 'object' ? (status as any).isDone : !!status);
                if (!isDone) {
                    nextVaccine = { name: v.name, ageTitle: group.ageTitle, key: v.key, description: v.description };
                    break;
                }
            }
            if (nextVaccine) break;
        }

        // Confirmation for unmark/delete vaccine
        // Confirmation for unmark/delete vaccine
        const confirmUnmarkVaccine = (key: string) => {
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setUnmarkVaccineKey(key);
        };

        // Info tooltip for vaccine
        const showVaccineInfo = (vaccine: { name: string; description?: string }) => {
            if (vaccine.description) {
                setSelectedVaccineInfo({ name: vaccine.name, description: vaccine.description });
            }
        };

        return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.screenContent}>
            {/* Custom Vaccine Info Modal */}
            {selectedVaccineInfo && (
                <Modal transparent animationType="fade" visible={!!selectedVaccineInfo} onRequestClose={() => setSelectedVaccineInfo(null)}>
                    <TouchableWithoutFeedback onPress={() => setSelectedVaccineInfo(null)}>
                        <View style={styles.modalOverlayCenter}>
                            <TouchableWithoutFeedback>
                                <View style={[styles.datePickerCard, { width: '85%', padding: 24, alignItems: 'flex-end' }]}>
                            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 12, gap: 12 }}>
                                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(107, 154, 196, 0.12)', alignItems: 'center', justifyContent: 'center' }}>
                                    <Info size={20} color="#6B9AC4" />
                                </View>
                                <Text style={[styles.datePickerTitle, { flex: 1, textAlign: 'right', marginBottom: 0 }]}>{selectedVaccineInfo.name}</Text>
                            </View>
                            
                            <Text style={{ fontSize: 16, color: theme.textSecondary, textAlign: 'right', writingDirection: 'rtl', lineHeight: 24, marginBottom: 24 }}>
                                {selectedVaccineInfo.description}
                            </Text>

                            <TouchableOpacity 
                                style={[styles.datePickerConfirm, { width: '100%', alignItems: 'center', paddingVertical: 14 }]} 
                                onPress={() => setSelectedVaccineInfo(null)}
                            >
                                <Text style={[styles.datePickerConfirmText, { fontSize: 16 }]}>הבנתי</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
                </Modal>
            )}

            {/* Custom Unmark Confirmation Modal */}
            {unmarkVaccineKey && (
                <Modal transparent animationType="fade" visible={!!unmarkVaccineKey} onRequestClose={() => setUnmarkVaccineKey(null)}>
                    <TouchableWithoutFeedback onPress={() => setUnmarkVaccineKey(null)}>
                        <View style={styles.modalOverlayCenter}>
                            <TouchableWithoutFeedback>
                                <View style={[styles.datePickerCard, { width: '85%', padding: 24, alignItems: 'center' }]}>
                                    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                        <Trash2 size={28} color="#EF4444" />
                                    </View>
                                    
                                    <Text style={[styles.datePickerTitle, { textAlign: 'center', marginBottom: 8 }]}>
                                        {t('health.removeVaccineTitle') || 'ביטול סימון חיסון'}
                                    </Text>
                                    
                                    <Text style={{ fontSize: 15, color: theme.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 22 }}>
                                        {t('health.removeVaccineMessage') || 'האם אתה בטוח שברצונך לבטל את סימון החיסון?'}
                                    </Text>

                                    <View style={{ flexDirection: 'row-reverse', gap: 12, width: '100%' }}>
                                        <TouchableOpacity 
                                            style={[styles.datePickerConfirm, { flex: 1, backgroundColor: '#EF4444', alignItems: 'center' }]} 
                                            onPress={() => {
                                                toggleVaccine(unmarkVaccineKey);
                                                setUnmarkVaccineKey(null);
                                            }}
                                        >
                                            <Text style={styles.datePickerConfirmText}>{t('common.confirm') || 'אישור'}</Text>
                                        </TouchableOpacity>
                                        
                                        <TouchableOpacity 
                                            style={[styles.datePickerCancel, { flex: 1, alignItems: 'center' }]} 
                                            onPress={() => setUnmarkVaccineKey(null)}
                                        >
                                            <Text style={styles.datePickerCancelText}>{t('common.cancel') || 'ביטול'}</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>
            )}

            <View style={styles.screenHeader}>
                <View style={[styles.screenHeaderIconMinimal, { backgroundColor: theme.actionColors.tools.color, borderColor: 'transparent' }]}>
                    <Syringe size={24} color="#FFFFFF" strokeWidth={1.8} />
                </View>
                <Text style={styles.screenSubtitle}>{t('health.perHealthMinistry')}</Text>
            </View>

            {/* Progress Bar */}
            <View style={{ backgroundColor: theme.cardSecondary, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: theme.border }}>
                <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: theme.textPrimary }}>
                        {doneVaccines}/{totalVaccines} {t('health.vaccinesCompleted') || 'חיסונים הושלמו'}
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#6B9AC4' }}>
                        {Math.round(progress * 100)}%
                    </Text>
                </View>
                <View style={{ height: 8, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
                    <View style={{
                        height: 8,
                        width: `${Math.round(progress * 100)}%`,
                        backgroundColor: '#6B9AC4',
                        borderRadius: 4,
                    }} />
                </View>
            </View>

            {/* Next Vaccine Highlight OR Celebration Card */}
            {progress >= 1 ? (
                <View style={{
                    backgroundColor: 'rgba(107, 154, 196, 0.1)',
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 20,
                    borderWidth: 1,
                    borderColor: 'rgba(107, 154, 196, 0.25)',
                    flexDirection: 'row-reverse',
                    alignItems: 'center',
                    gap: 12,
                }}>
                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#6B9AC4', alignItems: 'center', justifyContent: 'center' }}>
                        <Award size={24} color="#FFFFFF" strokeWidth={2.5} />
                    </View>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#6B9AC4', textAlign: 'right', marginBottom: 2 }}>
                            כל הכבוד!
                        </Text>
                        <Text style={{ fontSize: 13, color: theme.textSecondary, textAlign: 'right' }}>
                            השלמתם את כל חיסוני השגרה המומלצים בהצלחה.
                        </Text>
                    </View>
                </View>
            ) : nextVaccine && (
                <TouchableOpacity
                    style={{
                        backgroundColor: 'rgba(107, 154, 196, 0.1)',
                        borderRadius: 16,
                        padding: 16,
                        marginBottom: 20,
                        borderWidth: 1.5,
                        borderColor: 'transparent',
                        flexDirection: 'row-reverse',
                        alignItems: 'center',
                        gap: 12,
                    }}
                    onPress={() => handleVaccinePress(nextVaccine!.key)}
                    activeOpacity={0.7}
                >
                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#6B9AC4', alignItems: 'center', justifyContent: 'center' }}>
                        <Syringe size={20} color="#FFFFFF" strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 11, color: '#6B9AC4', fontWeight: '600', marginBottom: 2 }}>
                            {t('health.nextVaccine') || 'החיסון הבא'}
                        </Text>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: theme.textPrimary, textAlign: 'right' }}>
                            {nextVaccine.name}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#6B9AC4', fontWeight: '500', marginTop: 2 }}>
                            {nextVaccine.ageTitle}
                        </Text>
                    </View>
                </TouchableOpacity>
            )}

            {/* Date picker — mark vaccine done */}
            {pendingVaccineKey && (
                Platform.OS === 'android' ? (
                    <AndroidHebrewCalendar
                        visible={!!pendingVaccineKey}
                        value={vaccineMarkDate}
                        onSelect={(d) => {
                            setVaccineMarkDate(d);
                            toggleVaccine(pendingVaccineKey!, d);
                            setPendingVaccineKey(null);
                        }}
                        onDismiss={() => setPendingVaccineKey(null)}
                        theme={theme}
                        t={t}
                        maximumDate={new Date()}
                    />
                ) : (
                    <Modal transparent animationType="fade" visible={!!pendingVaccineKey} onRequestClose={() => setPendingVaccineKey(null)}>
                        <TouchableWithoutFeedback onPress={() => setPendingVaccineKey(null)}>
                            <View style={styles.modalOverlayCenter}>
                                <TouchableWithoutFeedback>
                                    <View style={styles.datePickerCard}>
                                        <Text style={styles.datePickerTitle}>{t('health.whenWasVaccine')}</Text>
                                        <DateTimePicker
                                            value={vaccineMarkDate}
                                            mode="date"
                                            display="spinner"
                                            onChange={(_, d) => d && setVaccineMarkDate(d)}
                                            maximumDate={new Date()}
                                            locale="he-IL"
                                        />
                                        <View style={styles.datePickerButtons}>
                                            <TouchableOpacity style={[styles.datePickerConfirm, { flex: 1, alignItems: 'center' }]} onPress={confirmVaccineMark}>
                                                <Text style={styles.datePickerConfirmText}>{t('common.confirm')}</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={[styles.datePickerCancel, { flex: 1, alignItems: 'center' }]} onPress={() => setPendingVaccineKey(null)}>
                                                <Text style={styles.datePickerCancelText}>{t('common.cancel')}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </TouchableWithoutFeedback>
                            </View>
                        </TouchableWithoutFeedback>
                    </Modal>
                )
            )}

            {/* Calendar appointment picker */}
            {calendarVaccineKey && (
                Platform.OS === 'android' ? (
                    <AndroidHebrewCalendar
                        visible={!!calendarVaccineKey}
                        value={calendarAppointmentDate}
                        onSelect={(d) => {
                            setCalendarAppointmentDate(d);
                            const name = VACCINE_SCHEDULE.flatMap(g => g.vaccines).find(v => v.key === calendarVaccineKey)?.name || calendarVaccineKey;
                            setTimeout(() => addVaccineToCalendar(name), 100);
                        }}
                        onDismiss={() => setCalendarVaccineKey(null)}
                        theme={theme}
                        t={t}
                        minimumDate={new Date()}
                        allowFuture={true}
                    />
                ) : (
                    <Modal transparent animationType="fade" visible={!!calendarVaccineKey} onRequestClose={() => setCalendarVaccineKey(null)}>
                        <TouchableWithoutFeedback onPress={() => setCalendarVaccineKey(null)}>
                            <View style={styles.modalOverlayCenter}>
                                <TouchableWithoutFeedback>
                                    <View style={styles.datePickerCard}>
                                        <Text style={styles.datePickerTitle}>{t('health.whenIsAppointment')}</Text>
                                        <Text style={styles.datePickerSubtitle}>
                                            {VACCINE_SCHEDULE.flatMap(g => g.vaccines).find(v => v.key === calendarVaccineKey)?.name}
                                        </Text>
                                        <DateTimePicker
                                            value={calendarAppointmentDate}
                                            mode="date"
                                            display="spinner"
                                            onChange={(_, d) => d && setCalendarAppointmentDate(d)}
                                            minimumDate={new Date()}
                                            locale="he-IL"
                                        />
                                        <View style={styles.datePickerButtons}>
                                            <TouchableOpacity style={[styles.datePickerConfirm, { flex: 1, alignItems: 'center' }]} onPress={() => {
                                                const name = VACCINE_SCHEDULE.flatMap(g => g.vaccines).find(v => v.key === calendarVaccineKey)?.name || calendarVaccineKey;
                                                addVaccineToCalendar(name);
                                            }}>
                                                <Text style={styles.datePickerConfirmText}>{t('health.addToCalendar')}</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={[styles.datePickerCancel, { flex: 1, alignItems: 'center' }]} onPress={() => setCalendarVaccineKey(null)}>
                                                <Text style={styles.datePickerCancelText}>{t('common.cancel')}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </TouchableWithoutFeedback>
                            </View>
                        </TouchableWithoutFeedback>
                    </Modal>
                )

            )}

            {/* Add Custom Vaccine Button */}
            {!showAddVaccine ? (
                <TouchableOpacity
                    style={styles.addVaccineBtn}
                    onPress={() => setShowAddVaccine(true)}
                >
                    <Plus size={20} color="#6B9AC4" />
                    <Text style={styles.addVaccineBtnText}>{t('health.addVaccine')}</Text>
                </TouchableOpacity>
            ) : (
                <View style={styles.addVaccineForm}>
                    <TextInput
                        style={styles.addVaccineInput}
                        value={newVaccineName}
                        onChangeText={setNewVaccineName}
                        placeholder={t('health.vaccineName')}
                        placeholderTextColor="#9CA3AF"
                        textAlign="right"
                        textAlignVertical="center"
                    />
                    <TouchableOpacity style={styles.addVaccineSubmit} onPress={addCustomVaccine}>
                        <Check size={20} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.addVaccineSubmit, { backgroundColor: theme.cardSecondary }]} onPress={() => {
                        setShowAddVaccine(false);
                        setNewVaccineName('');
                    }}>
                        <X size={20} color={theme.textSecondary} />
                    </TouchableOpacity>
                </View>
            )}



            {/* Custom Vaccines */}
            {customVaccines.length > 0 && (
                <View style={styles.vaccineGroup}>
                    <View style={styles.ageBadgeMinimal}>
                        <Text style={styles.ageBadgeTextMinimal}>{t('health.customVaccines')}</Text>
                    </View>
                    {customVaccines.map(vaccine => (
                        <View key={vaccine.id} style={styles.vaccineRow}>
                            <TouchableOpacity
                                onPress={() => deleteCustomVaccine(vaccine.id)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Trash2 size={16} color="#EF4444" />
                            </TouchableOpacity>
                            <View style={[styles.checkbox, styles.checkboxChecked]}>
                                <Check size={16} color="#fff" strokeWidth={3} />
                            </View>
                            <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                <Text style={[styles.vaccineName, { textAlign: 'right' }]}>{vaccine.name}</Text>
                                {vaccine.date && (
                                    <Text style={{ fontSize: 11, color: '#6B9AC4', marginTop: 2, fontWeight: '500' }}>
                                        נוסף: {new Date(vaccine.date).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </Text>
                                )}
                            </View>
                        </View>
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
                        const isDone = isChecked && typeof isChecked === 'object' ? (isChecked as any).isDone : !!isChecked;
                        const justCompleted = justCompletedKeys.has(vaccine.key);
                        return (
                            <AnimatedVaccineRow
                                key={vIdx}
                                vaccine={vaccine}
                                isDone={isDone}
                                justCompleted={justCompleted}
                                theme={theme}
                                isDarkMode={isDarkMode}
                                vaccines={vaccines}
                                onPress={() => handleVaccinePress(vaccine.key)}
                                onLongPress={() => showVaccineInfo(vaccine)}
                                onUnmark={() => confirmUnmarkVaccine(vaccine.key)}
                                onCalendar={() => { setCalendarAppointmentDate(new Date()); setCalendarVaccineKey(vaccine.key); }}
                                onInfo={() => showVaccineInfo(vaccine)}
                                styles={styles}
                            />
                        );
                    })}
                </View>
            ))}
        </ScrollView>
        );
    };

    // Temperature with Slider
    const tempReadings = useMemo(() => {
        return healthLog
            .filter((e: any) => e.type === 'temperature' && e.value)
            .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
            .slice(-10);
    }, [healthLog]);

    const renderTemperature = () => (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.screenContent}>
            <View style={styles.screenHeader}>
                <View style={[styles.screenHeaderIconMinimal, { backgroundColor: theme.actionColors.food.color, borderColor: 'transparent' }]}>
                    <Thermometer size={24} color="#FFFFFF" strokeWidth={1.8} />
                </View>
            </View>

            {/* Fever Trend Chart */}
            {tempReadings.length >= 2 ? (
                <View style={{ marginBottom: 20, backgroundColor: theme.cardSecondary, borderRadius: 16, padding: 16 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: theme.textPrimary, textAlign: 'right', marginBottom: 12 }}>
                        {t('health.feverTrend')}
                    </Text>
                    <LineChart
                        data={{
                            labels: tempReadings.map((r: any) => {
                                const d = new Date(r.timestamp);
                                return `${d.getDate()}/${d.getMonth() + 1}`;
                            }),
                            datasets: [{
                                data: tempReadings.map((r: any) => parseFloat(r.value)),
                                color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`,
                                strokeWidth: 2.5,
                            }, {
                                // Fever reference line at 38°C
                                data: tempReadings.map(() => 38),
                                color: (opacity = 1) => `rgba(239, 68, 68, ${opacity * 0.4})`,
                                strokeWidth: 1,
                                withDots: false,
                            }],
                        }}
                        width={SCREEN_WIDTH - 80}
                        height={160}
                        chartConfig={{
                            backgroundColor: 'transparent',
                            backgroundGradientFrom: theme.cardSecondary,
                            backgroundGradientTo: theme.cardSecondary,
                            decimalPlaces: 1,
                            color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`,
                            labelColor: () => theme.textSecondary,
                            style: { borderRadius: 16 },
                            propsForDots: {
                                r: '4',
                                strokeWidth: '2',
                                stroke: theme.actionColors.food.color,
                            },
                        }}
                        bezier
                        style={{ borderRadius: 12 }}
                        withHorizontalLabels={true}
                        withVerticalLabels={true}
                        withInnerLines={false}
                        fromZero={false}
                    />
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 8 }}>
                        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
                            <View style={{ width: 10, height: 3, backgroundColor: theme.actionColors.food.color, borderRadius: 2 }} />
                            <Text style={{ fontSize: 11, color: theme.textSecondary }}>{t('health.temperature')}</Text>
                        </View>
                        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
                            <View style={{ width: 10, height: 2, backgroundColor: 'rgba(239, 68, 68, 0.5)', borderRadius: 2 }} />
                            <Text style={{ fontSize: 11, color: theme.textSecondary }}>38°C ({t('health.feverLine')})</Text>
                        </View>
                    </View>
                </View>
            ) : tempReadings.length > 0 ? (
                <View style={{ marginBottom: 20, backgroundColor: theme.cardSecondary, borderRadius: 16, padding: 20, alignItems: 'center' }}>
                    <Thermometer size={28} color={theme.textTertiary} strokeWidth={1.5} />
                    <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: 8, textAlign: 'center' }}>
                        {t('health.addTwoReadings')}
                    </Text>
                </View>
            ) : null}

            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('health.temperatureC')}</Text>

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
                <Text style={styles.inputLabel}>{t('health.notes')}</Text>
                <TextInput
                    style={styles.textArea}
                    value={tempNote}
                    onChangeText={setTempNote}
                    placeholder={t('health.addNotes')}
                    placeholderTextColor="#9CA3AF"
                    multiline
                />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={async () => {
                setSavingTemp(true);
                try {
                    await saveEntry('temperature', { value: temperature.toFixed(1), note: tempNote });
                } finally {
                    setSavingTemp(false);
                }
            }} disabled={saveSuccess || savingTemp}>
                <View style={[styles.saveButtonSolid, saveSuccess && styles.saveButtonSuccess]}>
                    {savingTemp ? (
                        <ActivityIndicator size="small" color={theme.textSecondary} />
                    ) : saveSuccess ? (
                        <Check size={18} color="#10B981" strokeWidth={2} />
                    ) : (
                        <Text style={styles.saveButtonText}>{t('health.save')}</Text>
                    )}
                </View>
            </TouchableOpacity>
        </ScrollView>
    );

    // Doctor with real uploads
    const renderDoctor = () => (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.screenContent}>
            <View style={styles.screenHeader}>
                <View style={[styles.screenHeaderIconMinimal, { backgroundColor: theme.actionColors.health.color, borderColor: 'transparent' }]}>
                    <Stethoscope size={24} color="#FFFFFF" strokeWidth={1.8} />
                </View>
            </View>

            {/* Doctor Name */}
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('health.doctorName') || 'שם הרופא'}</Text>
                <TextInput
                    style={styles.textInput}
                    value={doctorName}
                    onChangeText={setDoctorName}
                    placeholder={t('health.doctorNamePlaceholder') || 'ד"ר...'}
                    placeholderTextColor="#9CA3AF"
                />
            </View>

            {/* Visit Date */}
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('health.visitDate') || 'תאריך הביקור'}</Text>
                <TouchableOpacity
                    style={{
                        flexDirection: 'row-reverse',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: theme.cardSecondary,
                        borderRadius: 14,
                        padding: 14,
                        borderWidth: 1.5,
                        borderColor: theme.border,
                    }}
                    onPress={() => setShowDoctorDatePicker(!showDoctorDatePicker)}
                >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: theme.textPrimary, textAlign: 'right' }}>
                        {doctorVisitDate.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </Text>
                    <CalendarPlus size={18} color={theme.textSecondary} />
                </TouchableOpacity>
                {showDoctorDatePicker && (
                    <View style={{ backgroundColor: theme.cardSecondary, borderRadius: 12, marginTop: 8, overflow: 'hidden', borderWidth: 1, borderColor: theme.border }}>
                        <DateTimePicker
                            value={doctorVisitDate}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={(e: any, d?: Date) => {
                                if (Platform.OS === 'android') setShowDoctorDatePicker(false);
                                if (d) setDoctorVisitDate(d);
                            }}
                            maximumDate={new Date()}
                        />
                        <TouchableOpacity
                            style={{
                                alignSelf: 'center',
                                backgroundColor: '#6B9AC4',
                                paddingVertical: 10,
                                paddingHorizontal: 32,
                                borderRadius: 10,
                                marginBottom: 12,
                            }}
                            onPress={() => setShowDoctorDatePicker(false)}
                        >
                            <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>אישור</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('health.visitReason')}</Text>
                <TextInput
                    style={styles.textInput}
                    value={doctorReason}
                    onChangeText={setDoctorReason}
                    placeholder={t('health.visitReasonPlaceholder')}
                    placeholderTextColor="#9CA3AF"
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('health.doctorSummary')}</Text>
                <TextInput
                    style={styles.textArea}
                    value={doctorNote}
                    onChangeText={setDoctorNote}
                    placeholder={t('health.doctorSummaryPlaceholder')}
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
                        <InlineLoader color="#6B7280"  />
                    ) : doctorPhoto ? (
                        <>
                            <Image source={{ uri: doctorPhoto }} style={styles.uploadPreview} />
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Check size={14} color="#10B981" strokeWidth={2.5} />
                                <Text style={styles.uploadButtonTextSuccess}>תמונה הועלתה</Text>
                            </View>
                        </>
                    ) : (
                        <>
                            <Camera size={24} color="#6B7280" />
                            <Text style={styles.uploadButtonText}>{t('health.addPhoto')}</Text>
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
                        <InlineLoader color="#6B7280"  />
                    ) : doctorDocument ? (
                        <>
                            <Check size={14} color="#10B981" strokeWidth={2.5} />
                            <Text style={styles.uploadButtonTextSuccess} numberOfLines={1}>
                                {doctorDocument}
                            </Text>
                        </>
                    ) : (
                        <>
                            <FileText size={24} color="#6B7280" />
                            <Text style={styles.uploadButtonText}>{t('health.addDocument')}</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            <TouchableOpacity
                style={styles.saveButton}
                onPress={async () => {
                    setSavingDoctor(true);
                    try {
                        await saveEntry('doctor', {
                            doctorName: doctorName || null,
                            visitDate: doctorVisitDate.toISOString(),
                            reason: doctorReason,
                            note: doctorNote,
                            photoUri: doctorPhoto || null,
                            documentName: doctorDocument || null
                        });
                    } finally {
                        setSavingDoctor(false);
                    }
                }}
                disabled={saveSuccess || savingDoctor}
            >
                <View style={[styles.saveButtonSolid, saveSuccess && styles.saveButtonSuccess]}>
                    {savingDoctor ? (
                        <ActivityIndicator size="small" color={theme.textSecondary} />
                    ) : saveSuccess ? (
                        <Check size={18} color="#10B981" strokeWidth={2} />
                    ) : (
                        <Text style={styles.saveButtonText}>{t('health.saveVisit')}</Text>
                    )}
                </View>
            </TouchableOpacity>
        </ScrollView>
    );

    // Illness
    const renderIllness = () => (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.screenContent}>
            <View style={styles.screenHeader}>
                <View style={[styles.screenHeaderIconMinimal, { backgroundColor: theme.actionColors.sos.color, borderColor: 'transparent' }]}>
                    <Heart size={24} color="#FFFFFF" strokeWidth={1.8} />
                </View>
            </View>

            <Text style={styles.sectionTitle}>{t('health.selectIllness')}</Text>
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

            {/* Date Range */}
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('health.dates')}</Text>

                {/* Start Date */}
                <TouchableOpacity
                    style={{
                        flexDirection: 'row-reverse',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: theme.cardSecondary,
                        borderRadius: 14,
                        padding: 14,
                        borderWidth: 1.5,
                        borderColor: theme.border,
                        marginBottom: 10,
                    }}
                    onPress={() => setShowIllnessStartPicker(!showIllnessStartPicker)}
                >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: theme.textPrimary, textAlign: 'right' }}>{t('health.illnessStart')}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Clock size={14} color="#EF4444" />
                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#EF4444' }}>
                            {illnessStartDate.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Text>
                    </View>
                </TouchableOpacity>

                {showIllnessStartPicker && Platform.OS !== 'android' && (
                    <View style={{ backgroundColor: '#FAFAFE', borderRadius: 12, marginBottom: 10, overflow: 'hidden', borderWidth: 1, borderColor: theme.border }}>
                        <DateTimePicker
                            value={illnessStartDate}
                            mode="date"
                            display="spinner"
                            onChange={(e: any, d?: Date) => {
                                if (d) setIllnessStartDate(d);
                            }}
                            maximumDate={new Date()}
                            locale="he-IL"
                            style={{ height: 160 }}
                        />
                        <TouchableOpacity style={{ alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#E5E7EB' }} onPress={() => setShowIllnessStartPicker(false)}>
                            <Text style={{ fontSize: 15, fontWeight: '600', color: '#EF4444' }}>אישור</Text>
                        </TouchableOpacity>
                    </View>
                )}
                {Platform.OS === 'android' && (
                    <AndroidHebrewCalendar
                        visible={showIllnessStartPicker}
                        value={illnessStartDate}
                        onSelect={(d) => {
                            setIllnessStartDate(d);
                            setShowIllnessStartPicker(false);
                        }}
                        onDismiss={() => setShowIllnessStartPicker(false)}
                        theme={theme}
                        t={t}
                        maximumDate={new Date()}
                    />
                )}

                {/* Ongoing toggle */}
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 4 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: theme.textSecondary }}>{t('health.illnessStillActive')}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TouchableOpacity
                            onPress={() => { setIllnessOngoing(true); setIllnessEndDate(null); }}
                            style={{
                                paddingHorizontal: 18, paddingVertical: 8, borderRadius: 12,
                                backgroundColor: illnessOngoing ? '#FEE2E2' : theme.cardSecondary,
                                borderWidth: 1.5,
                                borderColor: illnessOngoing ? '#FECACA' : theme.border,
                            }}
                        >
                            <Text style={{ fontSize: 14, fontWeight: '600', color: illnessOngoing ? '#EF4444' : '#9CA3AF' }}>כן</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => { setIllnessOngoing(false); setIllnessEndDate(new Date()); }}
                            style={{
                                paddingHorizontal: 18, paddingVertical: 8, borderRadius: 12,
                                backgroundColor: !illnessOngoing ? '#DCFCE7' : theme.cardSecondary,
                                borderWidth: 1.5,
                                borderColor: !illnessOngoing ? '#BBF7D0' : theme.border,
                            }}
                        >
                            <Text style={{ fontSize: 14, fontWeight: '600', color: !illnessOngoing ? '#10B981' : '#9CA3AF' }}>{t('health.recovered')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* End Date (only if not ongoing) */}
                {!illnessOngoing && (
                    <>
                        <TouchableOpacity
                            style={{
                                flexDirection: 'row-reverse',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                backgroundColor: '#F0FDF4',
                                borderRadius: 14,
                                padding: 14,
                                borderWidth: 1.5,
                                borderColor: '#BBF7D0',
                                marginBottom: 10,
                            }}
                            onPress={() => setShowIllnessEndPicker(!showIllnessEndPicker)}
                        >
                            <Text style={{ fontSize: 14, fontWeight: '600', color: theme.textPrimary, textAlign: 'right' }}>סיום / החלמה</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Clock size={14} color="#10B981" />
                                <Text style={{ fontSize: 15, fontWeight: '700', color: '#10B981' }}>
                                    {illnessEndDate?.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' }) || '-'}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        {showIllnessEndPicker && illnessEndDate && Platform.OS !== 'android' && (
                            <View style={{ backgroundColor: '#FAFAFE', borderRadius: 12, marginBottom: 10, overflow: 'hidden', borderWidth: 1, borderColor: theme.border }}>
                                <DateTimePicker
                                    value={illnessEndDate}
                                    mode="date"
                                    display="spinner"
                                    onChange={(e: any, d?: Date) => {
                                        if (d) setIllnessEndDate(d);
                                    }}
                                    minimumDate={illnessStartDate}
                                    maximumDate={new Date()}
                                    locale="he-IL"
                                    style={{ height: 160 }}
                                />
                                <TouchableOpacity style={{ alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#E5E7EB' }} onPress={() => setShowIllnessEndPicker(false)}>
                                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#10B981' }}>אישור</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        {Platform.OS === 'android' && illnessEndDate && (
                            <AndroidHebrewCalendar
                                visible={showIllnessEndPicker}
                                value={illnessEndDate}
                                onSelect={(d) => {
                                    setIllnessEndDate(d);
                                    setShowIllnessEndPicker(false);
                                }}
                                onDismiss={() => setShowIllnessEndPicker(false)}
                                theme={theme}
                                t={t}
                                minimumDate={illnessStartDate}
                                maximumDate={new Date()}
                            />
                        )}
                    </>
                )}

                {/* Duration summary */}
                {!illnessOngoing && illnessEndDate && (
                    <View style={{ backgroundColor: theme.cardSecondary, borderRadius: 10, padding: 10, alignItems: 'center' }}>
                        <Text style={{ fontSize: 13, color: '#6B7280' }}>
                            משך: {Math.max(1, Math.ceil((illnessEndDate.getTime() - illnessStartDate.getTime()) / (1000 * 60 * 60 * 24)))} ימים
                        </Text>
                    </View>
                )}
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('health.notes')}</Text>
                <TextInput style={styles.textArea} value={illnessNote} onChangeText={setIllnessNote} placeholder={t('health.symptomPlaceholder')} placeholderTextColor="#9CA3AF" multiline />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={async () => {
                setSavingIllness(true);
                try {
                    const saveData: any = {
                        name: selectedIllness === 'custom' ? customIllness : selectedIllness,
                        note: illnessNote,
                        startDate: illnessStartDate.toISOString(),
                        ongoing: illnessOngoing,
                    };
                    if (!illnessOngoing && illnessEndDate) {
                        saveData.endDate = illnessEndDate.toISOString();
                        saveData.durationDays = Math.max(1, Math.ceil((illnessEndDate.getTime() - illnessStartDate.getTime()) / (1000 * 60 * 60 * 24)));
                    }
                    await saveEntry('illness', saveData);
                } finally {
                    setSavingIllness(false);
                }
            }} disabled={saveSuccess || savingIllness}>
                <View style={[styles.saveButtonSolid, saveSuccess && styles.saveButtonSuccess]}>
                    {savingIllness ? (
                        <ActivityIndicator size="small" color={theme.textSecondary} />
                    ) : saveSuccess ? (
                        <Check size={18} color="#10B981" strokeWidth={2} />
                    ) : (
                        <Text style={styles.saveButtonText}>{t('health.save')}</Text>
                    )}
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
        let targetBabyId = babyId || activeChild?.childId;

        // If still no babyId, try to discover it
        if (!targetBabyId) {
            const user = auth.currentUser;
            if (!user) {
                Alert.alert(t('misc.saveError'), t('health.mustLoginToSave'));
                return;
            }
            try {
                const q = query(collection(db, 'babies'), where('parentId', '==', user.uid), limit(1));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    targetBabyId = querySnapshot.docs[0].id;
                    setBabyId(targetBabyId);
                }
            } catch (error) {
                logger.log('Error discovering babyId:', error);
            }
        }

        if (!targetBabyId) {
            Alert.alert(t('misc.saveError'), t('health.noBabyProfile'));
            return;
        }

        setSavingMed(true);
        const saved = await addMedication(targetBabyId, med);
        setSavingMed(false);
        if (saved) {
            setMedSaveSuccess(true);
            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            // Refresh list and go back
            setTimeout(async () => {
                setMedSaveSuccess(false);
                const refreshed = await getMedications(targetBabyId!);
                setSavedMedications(refreshed);
                setCurrentScreen('medications');
            }, 800);
        } else {
            Alert.alert(t('misc.saveError'), t('health.cannotSaveMedication'));
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
        Alert.alert('✅', t('health.markedAsTaken', { name: med.name }));
    };

    // Medications List View
    const renderMedications = () => (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.screenContent}>
            {/* Add medication button */}
            <TouchableOpacity
                style={styles.addVaccineBtn}
                onPress={() => setCurrentScreen('medications_add' as any)}
            >
                <Plus size={20} color={theme.actionColors.supplements.color} />
                <Text style={[styles.addVaccineBtnText, { color: theme.actionColors.supplements.color }]}>הוסף תרופה חדשה</Text>
            </TouchableOpacity>

            {loadingMeds ? (
                <View style={{ alignItems: 'center', marginTop: 40 }}>
                    <InlineLoader size="large" color={theme.actionColors.supplements.color}  />
                </View>
            ) : savedMedications.length === 0 ? (
                <View style={{ alignItems: 'center', marginTop: 40 }}>
                    <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: theme.actionColors.supplements.lightColor, alignItems: 'center', justifyContent: 'center' }}>
                        <Pill size={36} color={theme.actionColors.supplements.color} />
                    </View>
                    <Text style={{ fontSize: 16, color: theme.textPrimary, fontWeight: '600', marginTop: 16 }}>אין תרופות עדיין</Text>
                    <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>לחץ על "הוסף תרופה" כדי להתחיל</Text>
                </View>
            ) : (
                savedMedications.map((med) => (
                    <SwipeableRow key={med.id} onDelete={() => handleDeleteMedication(med.id)}>
                        <View style={{
                            backgroundColor: theme.card,
                            borderRadius: 16,
                            padding: 16,
                            marginBottom: 12,
                            borderWidth: 1,
                            borderColor: theme.border,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.04,
                            shadowRadius: 4,
                            elevation: 0,
                        }}>
                            {/* Header row */}
                            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 10 }}>
                                <View style={{
                                    width: 40, height: 40, borderRadius: 12,
                                    backgroundColor: theme.actionColors.supplements.lightColor,
                                    alignItems: 'center', justifyContent: 'center',
                                    marginLeft: 12,
                                }}>
                                    <Pill size={20} color={theme.actionColors.supplements.color} strokeWidth={1.5} />
                                </View>
                                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                    <Text style={{ fontSize: 16, fontWeight: '700', color: theme.textPrimary, textAlign: 'right' }}>
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
                                        backgroundColor: theme.actionColors.supplements.lightColor,
                                        paddingHorizontal: 10,
                                        paddingVertical: 5,
                                        borderRadius: 8,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 4,
                                    }}>
                                        <Clock size={12} color={theme.actionColors.supplements.color} />
                                        <Text style={{ fontSize: 13, fontWeight: '600', color: theme.actionColors.supplements.color }}>{time}</Text>
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
                                <Text style={{ fontSize: 14, fontWeight: '600', color: '#10B981' }}>נלקחה</Text>
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
    // ─── Allergies CRUD ──────────────────────────────────────────────────────────
    const loadAllergies = async () => {
        const childId = babyId || activeChild?.childId;
        if (!childId) return;
        setLoadingAllergies(true);
        try {
            const babyDoc = await getDoc(doc(db, 'babies', childId));
            if (babyDoc.exists()) {
                setAllergies(babyDoc.data()?.allergies || []);
            }
        } catch (error) {
            logger.log('Error loading allergies:', error);
        } finally {
            setLoadingAllergies(false);
        }
    };

    const saveAllergy = async () => {
        const childId = babyId || activeChild?.childId;
        if (!childId) return;

        const allergenName = selectedAllergen
            ? PRESET_ALLERGENS.find(a => a.key === selectedAllergen)?.name || selectedAllergen
            : customAllergenName.trim();

        if (!allergenName) return;

        const newAllergy: AllergyEntry = {
            id: Date.now().toString(),
            name: allergenName,
            severity: allergySeverity,
            diagnosisDate: new Date().toISOString(),
            ...(allergyNote.trim() ? { note: allergyNote.trim() } : {}),
        };

        try {
            setSavingAllergy(true);
            const updated = [...allergies, newAllergy];
            await setDoc(doc(db, 'babies', childId), { allergies: updated }, { merge: true });
            setAllergies(updated);
            setShowAllergyForm(false);
            setSelectedAllergen(null);
            setCustomAllergenName('');
            setAllergySeverity('mild');
            setAllergyNote('');
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            logger.log('Error saving allergy:', error);
            Alert.alert(t('misc.saveError'), t('health.cannotSave'));
        } finally {
            setSavingAllergy(false);
        }
    };

    const deleteAllergy = async (id: string) => {
        const childId = babyId || activeChild?.childId;
        if (!childId) return;
        try {
            const updated = allergies.filter(a => a.id !== id);
            await setDoc(doc(db, 'babies', childId), { allergies: updated }, { merge: true });
            setAllergies(updated);
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            logger.log('Error deleting allergy:', error);
        }
    };

    const getSeverityConfig = (severity: string) => {
        switch (severity) {
            case 'mild': return { label: t('health.severityMild'), color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0' };
            case 'moderate': return { label: t('health.severityModerate'), color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' };
            case 'severe': return { label: t('health.severitySevere'), color: '#EF4444', bg: '#FEF2F2', border: '#FECACA' };
            default: return { label: severity, color: '#6B7280', bg: '#F3F4F6', border: '#D1D5DB' };
        }
    };

    // ─── Render Allergies ────────────────────────────────────────────────────────
    // Load when entering screen
    useEffect(() => {
        if (currentScreen === 'allergies') loadAllergies();
    }, [currentScreen]);

    const renderAllergies = () => {
        return (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.screenContent}>
                <View style={styles.screenHeader}>
                    <View style={[styles.screenHeaderIconMinimal, { backgroundColor: theme.actionColors.sos.color, borderColor: 'transparent' }]}>
                        <ShieldAlert size={24} color="#FFFFFF" strokeWidth={1.8} />
                    </View>
                </View>

                {!showAllergyForm ? (
                    <>
                        {/* Add Button */}
                        <TouchableOpacity
                            style={{
                                flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8,
                                backgroundColor: theme.actionColors.sos.color, borderRadius: 14, paddingVertical: 14, marginBottom: 20
                            }}
                            onPress={() => {
                                setShowAllergyForm(true);
                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            }}
                        >
                            <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
                            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>{t('health.addAllergy')}</Text>
                        </TouchableOpacity>

                        {/* Allergy List */}
                        {allergies.length === 0 ? (
                            <View style={{ alignItems: 'center', paddingVertical: 40, backgroundColor: theme.cardSecondary, borderRadius: 16 }}>
                                <ShieldAlert size={40} color={theme.textTertiary} strokeWidth={1.2} />
                                <Text style={{ fontSize: 15, fontWeight: '600', color: theme.textSecondary, marginTop: 12 }}>
                                    {t('health.noAllergies')}
                                </Text>
                                <Text style={{ fontSize: 13, color: theme.textTertiary, marginTop: 4, textAlign: 'center', paddingHorizontal: 40 }}>
                                    {t('health.noAllergiesHint')}
                                </Text>
                            </View>
                        ) : (
                            allergies.map((allergy, index) => {
                                const severityConfig = getSeverityConfig(allergy.severity);
                                const allergenPreset = PRESET_ALLERGENS.find(a => a.name === allergy.name);
                                const AllergenIcon = allergenPreset?.icon || AlertTriangle;
                                return (
                                    <SwipeableRow
                                        key={allergy.id}
                                        onDelete={() => {
                                            Alert.alert(
                                                t('health.deleteAllergyTitle'),
                                                t('health.deleteAllergyMessage'),
                                                [
                                                    { text: t('common.cancel'), style: 'cancel' },
                                                    { text: t('common.delete'), style: 'destructive', onPress: () => deleteAllergy(allergy.id) },
                                                ]
                                            );
                                        }}
                                    >
                                        <View style={{
                                            backgroundColor: theme.card,
                                            borderRadius: 14, padding: 16, marginBottom: 10,
                                            borderWidth: 1, borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                                            flexDirection: 'row-reverse', alignItems: 'center', gap: 14,
                                        }}>
                                            {/* Allergen Icon */}
                                            <View style={{
                                                width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
                                                backgroundColor: severityConfig.bg, borderWidth: 1, borderColor: severityConfig.border,
                                            }}>
                                                <AllergenIcon size={22} color={severityConfig.color} strokeWidth={1.8} />
                                            </View>

                                            {/* Info */}
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ fontSize: 16, fontWeight: '600', color: theme.textPrimary, textAlign: 'right' }}>
                                                    {allergy.name}
                                                </Text>
                                                {allergy.note ? (
                                                    <Text style={{ fontSize: 12, color: theme.textSecondary, textAlign: 'right', marginTop: 2 }} numberOfLines={1}>
                                                        {allergy.note}
                                                    </Text>
                                                ) : null}
                                                <Text style={{ fontSize: 11, color: theme.textTertiary, textAlign: 'right', marginTop: 4 }}>
                                                    {new Date(allergy.diagnosisDate).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </Text>
                                            </View>

                                            {/* Severity Badge */}
                                            <View style={{
                                                backgroundColor: severityConfig.bg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
                                                borderWidth: 1, borderColor: severityConfig.border,
                                            }}>
                                                <Text style={{ fontSize: 12, fontWeight: '700', color: severityConfig.color }}>
                                                    {severityConfig.label}
                                                </Text>
                                            </View>
                                        </View>
                                    </SwipeableRow>
                                );
                            })
                        )}
                    </>
                ) : (
                    /* Add Allergy Form */
                    <>
                        {/* Preset Allergens Grid */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>{t('health.allergen')}</Text>
                            <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>
                                {PRESET_ALLERGENS.map(allergen => {
                                    const isSelected = selectedAllergen === allergen.key;
                                    const AllergenIcon = allergen.icon;
                                    return (
                                        <TouchableOpacity
                                            key={allergen.key}
                                            style={{
                                                flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
                                                paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
                                                backgroundColor: isSelected ? theme.actionColors.sos.color : (isDarkMode ? 'rgba(255,255,255,0.08)' : '#F3F4F6'),
                                                borderWidth: 1.5,
                                                borderColor: isSelected ? theme.actionColors.sos.color : 'transparent',
                                            }}
                                            onPress={() => {
                                                setSelectedAllergen(allergen.key);
                                                setCustomAllergenName('');
                                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            }}
                                        >
                                            <AllergenIcon size={16} color={isSelected ? '#FFFFFF' : theme.textSecondary} strokeWidth={1.8} />
                                            <Text style={{
                                                fontSize: 14, fontWeight: isSelected ? '700' : '500',
                                                color: isSelected ? '#FFFFFF' : theme.textPrimary,
                                            }}>{allergen.name}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Custom Allergen */}
                            <TextInput
                                style={[styles.textArea, { marginTop: 12, minHeight: 44 }]}
                                value={customAllergenName}
                                onChangeText={(text) => {
                                    setCustomAllergenName(text);
                                    if (text.trim()) setSelectedAllergen(null);
                                }}
                                placeholder={t('health.enterAllergenName')}
                                placeholderTextColor="#9CA3AF"
                            />
                        </View>

                        {/* Severity Selection */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>{t('health.severity')}</Text>
                            <View style={{ flexDirection: 'row-reverse', gap: 10 }}>
                                {(['mild', 'moderate', 'severe'] as const).map(sev => {
                                    const config = getSeverityConfig(sev);
                                    const isActive = allergySeverity === sev;
                                    return (
                                        <TouchableOpacity
                                            key={sev}
                                            style={{
                                                flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 14,
                                                backgroundColor: isActive ? config.color : (isDarkMode ? 'rgba(255,255,255,0.08)' : '#F3F4F6'),
                                                borderWidth: 1.5, borderColor: isActive ? config.color : 'transparent',
                                            }}
                                            onPress={() => {
                                                setAllergySeverity(sev);
                                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            }}
                                        >
                                            <Text style={{
                                                fontSize: 14, fontWeight: '700',
                                                color: isActive ? '#FFFFFF' : theme.textPrimary,
                                            }}>{config.label}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Note */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>{t('health.notes')}</Text>
                            <TextInput
                                style={styles.textArea}
                                value={allergyNote}
                                onChangeText={setAllergyNote}
                                placeholder={t('health.addNotes')}
                                placeholderTextColor="#9CA3AF"
                                multiline
                            />
                        </View>

                        {/* Actions */}
                        <View style={{ flexDirection: 'row-reverse', gap: 12 }}>
                            <TouchableOpacity
                                style={{
                                    flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 14,
                                    backgroundColor: (selectedAllergen || customAllergenName.trim()) && !savingAllergy ? theme.actionColors.sos.color : '#D1D5DB',
                                    opacity: savingAllergy ? 0.7 : 1,
                                }}
                                onPress={saveAllergy}
                                disabled={(!selectedAllergen && !customAllergenName.trim()) || savingAllergy}
                            >
                                {savingAllergy ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>{t('health.save')}</Text>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{
                                    flex: 0.5, alignItems: 'center', paddingVertical: 16, borderRadius: 14,
                                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#F3F4F6',
                                }}
                                onPress={() => {
                                    setShowAllergyForm(false);
                                    setSelectedAllergen(null);
                                    setCustomAllergenName('');
                                    setAllergyNote('');
                                }}
                            >
                                <Text style={{ color: theme.textSecondary, fontSize: 16, fontWeight: '600' }}>{t('common.cancel')}</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </ScrollView>
        );
    };

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
                case 'temperature': return { label: 'חום', icon: Thermometer, color: theme.actionColors.food.color, bg: theme.actionColors.food.lightColor };
                case 'doctor': return { label: 'רופא', icon: Stethoscope, color: theme.actionColors.health.color, bg: theme.actionColors.health.lightColor };
                case 'illness': return { label: 'מחלה', icon: Heart, color: theme.actionColors.sos.color, bg: theme.actionColors.sos.lightColor };
                case 'medication': return { label: 'תרופה', icon: Pill, color: theme.actionColors.supplements.color, bg: theme.actionColors.supplements.lightColor };
                case 'vaccine': return { label: 'חיסון', icon: Syringe, color: theme.actionColors.tools.color, bg: theme.actionColors.tools.lightColor };
                default: return { label: 'שונות', icon: ClipboardList, color: theme.actionColors.custom.color, bg: theme.actionColors.custom.lightColor };
            }
        };

        const filterTabs = [
            { key: 'all', label: t('common.all') },
            { key: 'vaccine', label: t('health.vaccines') },
            { key: 'temperature', label: t('health.fever') },
            { key: 'doctor', label: t('health.doctorVisit') },
            { key: 'illness', label: t('health.illnesses') },
            { key: 'medication', label: t('health.medications') },
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
                            <InlineLoader size="large" color={theme.textPrimary}  />
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
                                        elevation: 0,
                                    }}>
                                        {/* Icon Badge - solid like menu */}
                                        <View style={{
                                            width: 48, height: 48, borderRadius: 24,
                                            backgroundColor: config.color,
                                            alignItems: 'center', justifyContent: 'center',
                                            marginLeft: 16,
                                        }}>
                                            <Icon size={22} color="#FFFFFF" strokeWidth={1.2} />
                                        </View>

                                        {/* Content - on left in RTL */}
                                        <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                            <Text style={{ fontSize: 12, color: config.color, fontWeight: '500', marginBottom: 2 }}>
                                                {config.label}
                                            </Text>

                                            {item.value && (
                                                <Text style={{ fontSize: 15, fontWeight: '500', color: theme.textPrimary, marginTop: 2, textAlign: 'right' }}>
                                                    {item.value}°
                                                </Text>
                                            )}
                                            {item.name && (
                                                <Text style={{ fontSize: 15, fontWeight: '500', color: theme.textPrimary, marginTop: 2, textAlign: 'right' }}>
                                                    {item.name}
                                                </Text>
                                            )}
                                            {item.reason && (
                                                <Text style={{ fontSize: 14, color: theme.textPrimary, marginTop: 2, textAlign: 'right' }}>{item.reason}</Text>
                                            )}

                                            {/* Vaccine-specific: show date badges */}
                                            {item.type === 'vaccine' && item.appointmentDate ? (
                                                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: 6, backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}>
                                                    <Bell size={13} color="#6366F1" />
                                                    <Text style={{ fontSize: 13, color: '#6366F1', fontWeight: '600' }}>
                                                        תור: {new Date(item.appointmentDate).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                    </Text>
                                                </View>
                                            ) : item.type === 'vaccine' && item.note?.startsWith('בוצע') ? (
                                                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: 6, backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}>
                                                    <Check size={13} color="#10B981" />
                                                    <Text style={{ fontSize: 13, color: '#10B981', fontWeight: '600' }}>
                                                        {item.note}
                                                    </Text>
                                                </View>
                                            ) : item.note ? (
                                                <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 4, textAlign: 'right' }}>{item.note}</Text>
                                            ) : null}

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
            case 'vaccines': return t('health.vaccines');
            case 'doctor': return t('health.doctorVisit');
            case 'illness': return t('health.illnesses');
            case 'temperature': return t('health.temperature');
            case 'medications': return t('health.medications');
            case 'medications_add': return t('health.medications');
            case 'history': return t('health.history');
            case 'allergies': return t('health.allergies');
            default: return t('health.title');
        }
    };

    const getHeaderGradient = (): [string, string] => {
        switch (currentScreen) {
            case 'vaccines': return ['#6366F1', '#4F46E5'];
            case 'doctor': return ['#10B981', '#059669'];
            case 'illness': return ['#EF4444', '#DC2626'];
            case 'temperature': return ['#F59E0B', '#D97706'];
            case 'medications': return [theme.actionColors.supplements.color, theme.actionColors.supplements.color];
            case 'medications_add': return [theme.actionColors.supplements.color, theme.actionColors.supplements.color];
            case 'history': return ['#0EA5E9', '#0284C7'];
            case 'allergies': return [theme.actionColors.sos.color, theme.actionColors.sos.color];
            default: return ['#10B981', '#059669'];
        }
    };

    return (
        <>
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
                                    <View style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center', marginBottom: 8, zIndex: 2 }}>
                                        <ReAnimated.View style={[StyleSheet.absoluteFill, { borderRadius: 32, backgroundColor: theme.actionColors.health.color }, healthIconPulseStyle]} />
                                        <ReAnimated.View style={[StyleSheet.absoluteFill, { borderRadius: 32, backgroundColor: theme.actionColors.health.color }, healthIconPulse2Style]} />
                                        <ReAnimated.View style={healthIconRotateStyle}>
                                            <ReAnimated.View style={healthIconBounceStyle}>
                                                <View style={[{
                                                    width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
                                                    backgroundColor: theme.actionColors.health.color,
                                                    shadowColor: isDarkMode ? 'transparent' : theme.actionColors.health.color,
                                                    shadowOpacity: 0.35,
                                                    shadowRadius: 10,
                                                    shadowOffset: { width: 0, height: 5 },
                                                    borderWidth: 2.5,
                                                    borderColor: isDarkMode ? '#1C1C1E' : '#FFFFFF',
                                                }]}>
                                                    <HeartPulse size={28} color="#FFFFFF" strokeWidth={2.2} />
                                                </View>
                                            </ReAnimated.View>
                                        </ReAnimated.View>
                                    </View>
                                </View>
                            )}
                            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{getScreenTitle()}</Text>
                        </View>
                        <View style={{ width: 44 }}>
                            {currentScreen === 'menu' && (
                                <TouchableOpacity
                                    onPress={handleHealthDownload}
                                    activeOpacity={1}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <ReAnimated.View style={[
                                        animatedDownloadStyle,
                                        {
                                            width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
                                            backgroundColor: isDownloadPressed ? '#C8806A' : (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)'),
                                            borderWidth: 1,
                                            borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.02)',
                                        }
                                    ]}>
                                        <Download size={22} color={isDownloadPressed ? '#FFFFFF' : (isDarkMode ? '#FFF' : theme.textPrimary)} strokeWidth={isDownloadPressed ? 2.5 : 2} />
                                    </ReAnimated.View>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    <GestureHandlerRootView style={[styles.modalBody, { backgroundColor: 'transparent' }]}>
                        {currentScreen === 'menu' && renderMenu()}
                        {currentScreen === 'vaccines' && renderVaccines()}
                        {currentScreen === 'doctor' && renderDoctor()}
                        {currentScreen === 'illness' && renderIllness()}
                        {currentScreen === 'temperature' && renderTemperature()}
                        {currentScreen === 'medications' && renderMedications()}
                        {currentScreen === ('medications_add' as any) && renderMedicationsAdd()}
                        {currentScreen === 'history' && renderHistory()}
                        {currentScreen === 'allergies' && renderAllergies()}
                        {currentScreen === 'tipat_halav' && <TipatHalavLocator visible={true} onClose={goBack} />}
                    </GestureHandlerRootView>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
        </>
    );
});

HealthCard.displayName = 'HealthCard';

const getStyles = (theme: any, isDarkMode: boolean) => StyleSheet.create({
    card: {
        backgroundColor: theme.card,
        borderRadius: 20,
        padding: 18,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 0
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
    cardTitle: { fontSize: 17, fontWeight: '700', color: theme.textPrimary },
    cardSubtitle: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
    cardArrow: { opacity: 0.6 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: theme.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 44, maxHeight: '92%', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: -8 }, elevation: 0, flex: 1, width: '100%' },
    dragHandle: { alignItems: 'center', paddingTop: 16, paddingBottom: 4, paddingHorizontal: 50, zIndex: 10, minHeight: 40 },
    dragHandleBar: { width: 36, height: 4, borderRadius: 2 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.cardSecondary },
    headerBtn: { padding: 8, backgroundColor: theme.cardSecondary, borderRadius: 10 },
    headerTitleContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column' },
    headerIconWrapper: { marginBottom: 8, alignItems: 'center' },
    headerIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: theme.card,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 0,
    },
    modalTitle: { fontSize: 17, fontWeight: '600', color: theme.textPrimary },
    modalBody: { flex: 1, backgroundColor: theme.card },

    menuContainer: { padding: 16 },
    optionsList: { gap: 10 },
    optionRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: theme.cardSecondary,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.border,
        padding: 14,
        gap: 12,
    },
    optionIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.card,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: theme.cardSecondary,
    },
    optionLabel: { fontSize: 15, fontWeight: '600', color: theme.textPrimary, textAlign: 'right' },
    optionDescription: { fontSize: 12, color: theme.textSecondary, textAlign: 'right', marginTop: 2 },

    screenContent: { padding: 20, paddingBottom: 40 },
    screenHeader: { alignItems: 'center', marginBottom: 16 },
    screenHeaderIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    screenHeaderIconMinimal: { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.cardSecondary, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
    screenSubtitle: { fontSize: 13, color: theme.textTertiary, marginTop: 10 },

    // Vaccine styles
    addVaccineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(107, 154, 196, 0.1)', padding: 14, borderRadius: 14, marginBottom: 20 },
    addVaccineBtnText: { fontSize: 15, fontWeight: '600', color: '#6B9AC4' },
    addVaccineForm: { flexDirection: 'row-reverse', gap: 10, marginBottom: 20 },
    addVaccineInput: { flex: 1, backgroundColor: theme.card, borderRadius: 12, padding: 14, fontSize: 15, textAlign: 'right', textAlignVertical: 'center', borderWidth: 1, borderColor: theme.border, writingDirection: 'rtl' },
    addVaccineSubmit: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#6B9AC4', alignItems: 'center', justifyContent: 'center' },
    vaccineGroup: { marginBottom: 20 },
    ageBadge: { alignSelf: 'flex-end', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginBottom: 12 },
    ageBadgeText: { color: theme.card, fontWeight: '700', fontSize: 14 },
    ageBadgeMinimal: { alignSelf: 'flex-end', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, marginBottom: 10, backgroundColor: theme.cardSecondary, borderWidth: 1, borderColor: theme.border },
    ageBadgeTextMinimal: { color: theme.textSecondary, fontWeight: '600', fontSize: 13 },
    vaccineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.card, padding: 16, borderRadius: 16, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 0 },
    vaccineRowDone: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: isDarkMode ? 'rgba(107, 154, 196, 0.1)' : 'rgba(107, 154, 196, 0.08)', padding: 16, borderRadius: 16, marginBottom: 8, borderWidth: 1, borderColor: isDarkMode ? 'rgba(107, 154, 196, 0.3)' : 'rgba(107, 154, 196, 0.25)' },
    vaccineName: { fontSize: 15, color: theme.textPrimary, fontWeight: '500', textAlign: 'right', writingDirection: 'rtl' },
    vaccineNameDone: { fontSize: 15, color: '#8BAFC8', fontWeight: '500', textDecorationLine: 'line-through', textAlign: 'right', writingDirection: 'rtl' },
    checkbox: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
    checkboxChecked: { backgroundColor: '#6B9AC4', borderColor: '#6B9AC4' },
    modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    datePickerCard: { backgroundColor: theme.card, borderRadius: 20, padding: 20, width: '85%', alignItems: 'center' },
    datePickerTitle: { fontSize: 18, fontWeight: '700', color: theme.textPrimary, marginBottom: 4 },
    datePickerSubtitle: { fontSize: 13, color: '#6B9AC4', marginBottom: 8 },
    datePickerButtons: { flexDirection: 'row-reverse', gap: 12, marginTop: 16, width: '100%', justifyContent: 'center' },
    datePickerConfirm: { backgroundColor: '#6B9AC4', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 10 },
    datePickerConfirmText: { color: theme.card, fontWeight: '700' },
    datePickerCancel: { backgroundColor: theme.cardSecondary, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 10 },
    datePickerCancelText: { color: theme.textSecondary, fontWeight: '600' },

    // Temperature slider
    temperatureDisplay: { backgroundColor: theme.card, borderRadius: 20, padding: 20, alignItems: 'center', borderWidth: 3, marginBottom: 20 },
    temperatureValue: { fontSize: 64, fontWeight: '800' },
    temperatureUnit: { fontSize: 24, color: theme.textSecondary, marginTop: -8 },
    temperatureDisplayMinimal: { backgroundColor: theme.cardSecondary, borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 20 },
    temperatureValueMinimal: { fontSize: 56, fontWeight: '700', color: theme.textPrimary },
    temperatureUnitMinimal: { fontSize: 20, color: theme.textTertiary, marginTop: -4 },
    quickSelectBtnMinimal: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, backgroundColor: theme.cardSecondary, marginRight: 8, marginBottom: 8 },
    quickSelectBtnMinimalActive: { backgroundColor: theme.border },
    quickSelectTextMinimal: { fontSize: 14, fontWeight: '500', color: theme.textSecondary },
    quickSelectTextMinimalActive: { color: theme.textPrimary, fontWeight: '600' },
    sliderContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    sliderBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border },
    slider: { flex: 1, marginHorizontal: 10, height: 40 },

    // Forms
    inputGroup: { marginBottom: 20 },
    inputLabel: { fontSize: 14, fontWeight: '600', color: theme.textPrimary, marginBottom: 8, textAlign: 'right' },
    textInput: { backgroundColor: theme.card, borderRadius: 16, padding: 16, fontSize: 16, textAlign: 'right', borderWidth: 1, borderColor: theme.border },
    textArea: { backgroundColor: theme.card, borderRadius: 16, padding: 16, fontSize: 16, textAlign: 'right', borderWidth: 1, borderColor: theme.border, minHeight: 100, textAlignVertical: 'top' },
    quickSelectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    quickSelectRowRTL: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'flex-start', gap: 8, marginBottom: 20 },
    quickSelectBtn: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: theme.card, borderRadius: 20, borderWidth: 1, borderColor: theme.border },
    quickSelectBtnActive: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
    quickSelectBtnWarning: { borderColor: '#EF4444' },
    quickSelectText: { fontSize: 14, fontWeight: '600', color: theme.textPrimary },
    quickSelectTextActive: { color: theme.card },

    // Upload
    uploadSection: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    uploadButton: { flex: 1, backgroundColor: theme.card, borderRadius: 16, padding: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border, minHeight: 100 },
    uploadButtonSuccess: { backgroundColor: '#F0FDF4', borderColor: '#10B981' },
    uploadButtonText: { fontSize: 14, color: theme.textSecondary, marginTop: 8, fontWeight: '500' },
    uploadButtonTextSuccess: { fontSize: 12, color: '#10B981', marginTop: 8, fontWeight: '600' },
    uploadPreview: { width: 50, height: 50, borderRadius: 8 },

    // Chips
    sectionTitle: { fontSize: 15, fontWeight: '600', color: theme.textPrimary, marginBottom: 12, textAlign: 'right' },
    chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
    chipsContainerRTL: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    chip: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: theme.cardSecondary, borderRadius: 20, borderWidth: 1, borderColor: theme.border },
    chipPlus: { paddingHorizontal: 12, paddingVertical: 10 },
    chipActive: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
    chipActivePurple: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
    chipText: { fontSize: 14, fontWeight: '500', color: theme.textPrimary },
    chipTextActive: { color: theme.card },

    saveButton: { marginTop: 16 },
    saveButtonSolid: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 24, alignItems: 'center', backgroundColor: theme.cardSecondary, borderWidth: 1, borderColor: theme.border },
    saveButtonSuccess: { backgroundColor: '#ECFDF5', borderColor: '#10B981' },
    saveButtonText: { fontSize: 15, fontWeight: '600', color: theme.textPrimary },
});

export default HealthCard;
