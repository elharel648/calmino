import React, { useState, useEffect, useMemo } from 'react';
import InlineLoader from '../components/Common/InlineLoader';
import { StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  
  Platform,
  KeyboardAvoidingView,
  ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { Calendar, User, Users, ChevronRight, Heart, Baby, X, Check } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInUp, useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { saveBabyProfile } from '../services/babyService';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useGuest } from '../context/GuestContext';
import JoinFamilyModal from '../components/Family/JoinFamilyModal';
import { TYPOGRAPHY, SPACING } from '../utils/designSystem';

type BabyProfileScreenProps = {
  onProfileSaved: () => void;
  onSkip?: () => void;
  onClose?: () => void;
};

export default function BabyProfileScreen({ onProfileSaved, onSkip, onClose }: BabyProfileScreenProps) {
  const { theme, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const { isGuest, promptLogin } = useGuest();
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [gender, setGender] = useState<'boy' | 'girl'>('boy');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pendingDate, setPendingDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  const styles = useMemo(() => getStyles(theme, isDarkMode), [theme, isDarkMode]);

  // Subtle pulse animation for button
  const buttonScale = useSharedValue(1);

  useEffect(() => {
    buttonScale.value = withRepeat(
      withTiming(1.02, { duration: 1500 }),
      -1,
      true
    );
  }, []);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: name.trim() ? buttonScale.value : 1 }],
  }));

  const handleSave = async () => {
    if (isGuest) { promptLogin(); return; }

    if (!name.trim()) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(t('baby.nameRequired'), t('baby.nameRequiredMessage'));
      return;
    }
    if (!birthDate) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(t('common.error'), t('babyProfile.birthdateError'));
      return;
    }

    setLoading(true);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await saveBabyProfile(name, lastName, birthDate, gender);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (onProfileSaved) {
        onProfileSaved();
      }
    } catch (error) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common.error'), t('errors.saveError'));
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (selectedDate) {
        setBirthDate(selectedDate);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } else {
      if (selectedDate) setPendingDate(selectedDate);
    }
  };

  const handleDateConfirm = () => {
    const chosen = pendingDate ?? birthDate ?? new Date();
    setBirthDate(chosen);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowDatePicker(false);
    setPendingDate(null);
  };

  const handleDateCancel = () => {
    setShowDatePicker(false);
    setPendingDate(null);
  };

  const handleGenderSelect = (selected: 'boy' | 'girl') => {
    setGender(selected);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const isFormValid = name.trim().length > 0 && birthDate !== null;

  return (
    <View style={styles.container}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />

      {/* Close button */}
      {onClose && (
        <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
          <View style={styles.closeButtonWrap}>
            <X size={20} color={theme.textSecondary} strokeWidth={2} />
          </View>
        </TouchableOpacity>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <Animated.View style={styles.header}>
            <View style={styles.iconContainer}>
              <View style={styles.iconShadowWrap}>
                <View style={styles.iconWrap}>
                  <Baby size={34} color={theme.primary} strokeWidth={1.8} />
                </View>
              </View>
            </View>
            <Text style={styles.title}>{t('babyProfile.title')}</Text>
            <Text style={styles.subtitle}>{t('babyProfile.subtitle')}</Text>
          </Animated.View>

          {/* Core Inset Grouped Form */}
          <Animated.View>
            <View style={styles.groupedCard}>
              
              {/* Name Row */}
              <View style={styles.formRow}>
                <View style={styles.rowRight}>
                  <View style={[styles.inlineIconWrap, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                    <User size={16} color={theme.textSecondary} strokeWidth={2} />
                  </View>
                  <Text style={styles.rowLabel}>{t('child.name')}</Text>
                </View>
                <TextInput
                  style={styles.inlineInput}
                  placeholder={t('babyProfile.namePlaceholder')}
                  placeholderTextColor={theme.textTertiary}
                  value={name}
                  onChangeText={setName}
                  textAlign="right"
                  autoFocus
                />
              </View>

              <View style={styles.divider} />

              {/* Last Name Row */}
              <View style={styles.formRow}>
                <View style={styles.rowRight}>
                  <View style={[styles.inlineIconWrap, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                    <Users size={16} color={theme.textSecondary} strokeWidth={2} />
                  </View>
                  <Text style={styles.rowLabel}>{t('babyProfile.lastName')}</Text>
                </View>
                <TextInput
                  style={styles.inlineInput}
                  placeholder={t('babyProfile.lastNamePlaceholder')}
                  placeholderTextColor={theme.textTertiary}
                  value={lastName}
                  onChangeText={setLastName}
                  textAlign="right"
                />
              </View>

              <View style={styles.divider} />

              {/* Birth Date Row */}
              <TouchableOpacity style={styles.formRow} onPress={() => setShowDatePicker(true)} activeOpacity={0.6}>
                <View style={styles.rowRight}>
                  <View style={[styles.inlineIconWrap, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                    <Calendar size={16} color={theme.textSecondary} strokeWidth={2} />
                  </View>
                  <Text style={styles.rowLabel}>{t('child.birthDate')}</Text>
                </View>
                <View style={styles.dateSelector}>
                  <Text style={[styles.dateSelectorText, !birthDate && { color: theme.textTertiary, fontWeight: '400' }]}>
                    {birthDate
                      ? birthDate.toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' })
                      : t('babyProfile.selectBirthdate')}
                  </Text>
                  <ChevronRight size={16} color={theme.textTertiary} />
                </View>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Gender Segmented Row */}
          <Animated.View style={styles.genderSection}>
            <Text style={styles.sectionTitle}>{t('babyProfile.gender')}</Text>

            {/* Apple-style Segmented Control */}
            <View style={styles.segmentedControl}>
              <View
                style={[
                  styles.segmentedActivePill,
                  gender === 'boy' ? styles.segmentedPillBoy : styles.segmentedPillGirl,
                ]}
              />

              <TouchableOpacity style={styles.segmentedTab} onPress={() => handleGenderSelect('boy')} activeOpacity={1}>
                <Text style={[styles.segmentedTabText, gender === 'boy' && styles.segmentedTabTextActiveBoy]}>
                  {t('child.boy')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.segmentedTab} onPress={() => handleGenderSelect('girl')} activeOpacity={1}>
                <Text style={[styles.segmentedTabText, gender === 'girl' && styles.segmentedTabTextActiveGirl]}>
                  {t('child.girl')}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {showDatePicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={birthDate ?? new Date()}
              mode="date"
              display="spinner"
              locale="he"
              maximumDate={new Date()}
              onChange={onDateChange}
            />
          )}

          {showDatePicker && Platform.OS === 'ios' && (
            <View style={styles.datePickerIosWrapper}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={handleDateCancel} style={styles.datePickerHeaderBtn}>
                  <Text style={styles.datePickerCancel}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDateConfirm} style={styles.datePickerHeaderBtn}>
                  <Text style={styles.datePickerConfirm}>{t('common.confirm')}</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={pendingDate ?? birthDate ?? new Date()}
                mode="date"
                display="spinner"
                locale="he"
                maximumDate={new Date()}
                onChange={onDateChange}
                style={{ width: '100%' }}
                textColor={theme.textPrimary}
              />
            </View>
          )}

          {/* Premium Submit Button */}
          <Animated.View style={[styles.submitContainer, buttonAnimatedStyle]}>
            <TouchableOpacity
              style={[styles.primaryBtn, !isFormValid && styles.primaryBtnDisabled]}
              onPress={handleSave}
              disabled={loading || !isFormValid}
              activeOpacity={0.9}
            >
              {loading ? (
                <InlineLoader color={!isFormValid ? theme.textTertiary : "#fff"} size="small"  />
              ) : (
                <Text style={[styles.primaryBtnText, !isFormValid && styles.primaryBtnTextDisabled]}>{t('babyProfile.saveAndContinue')}</Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Bottom Actions */}
          <Animated.View style={styles.secondaryActions}>
            <View style={styles.tipContainer}>
              <Heart size={14} color={theme.textTertiary} />
              <Text style={styles.tipText}>{t('babyProfile.editLater')}</Text>
            </View>

            <TouchableOpacity style={styles.joinButton} onPress={() => setShowJoinModal(true)} activeOpacity={0.7}>
              <Text style={styles.joinText}>{t('babyProfile.joinInvite')}</Text>
            </TouchableOpacity>

            {onSkip && (
              <TouchableOpacity style={styles.skipButton} onPress={onSkip} activeOpacity={0.7}>
                <Text style={styles.skipText}>{t('babyProfile.skipForNow')}</Text>
              </TouchableOpacity>
            )}
          </Animated.View>

        </ScrollView>
      </KeyboardAvoidingView>

      <JoinFamilyModal
        visible={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onSuccess={() => {
          setShowJoinModal(false);
          if (onProfileSaved) onProfileSaved();
        }}
      />

    </View>
  );
}

const getStyles = (theme: any, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 80,
    paddingBottom: 40,
  },
  closeButton: {
    position: 'absolute',
    top: 54,
    right: 20,
    zIndex: 100,
  },
  closeButtonWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  iconShadowWrap: {
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: isDarkMode ? 0.3 : 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: theme.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
  },
  title: {
    ...TYPOGRAPHY.h2,
    color: theme.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    fontSize: 15,
    color: theme.textSecondary,
    textAlign: 'center',
  },

  // Apple Inset Grouped List
  groupedCard: {
    backgroundColor: theme.card,
    borderRadius: 18,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDarkMode ? 0.3 : 0.04,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: isDarkMode ? 1 : 0,
    borderColor: isDarkMode ? theme.border : 'transparent',
  },
  formRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
    marginLeft: 16,
    marginRight: 54,
  },
  rowRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    minWidth: 110,
  },
  inlineIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  inlineInput: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: theme.textPrimary,
    paddingVertical: 0,
    paddingRight: 16,
    paddingLeft: 8,
    marginLeft: 12,
  },
  dateSelector: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  dateSelectorText: {
    ...TYPOGRAPHY.body,
    fontWeight: '500',
    color: theme.textSecondary,
  },

  // Apple Segmented Control for Gender
  genderSection: {
    marginBottom: 32,
    alignItems: 'center',
  },
  sectionTitle: {
    ...TYPOGRAPHY.labelSmall,
    color: theme.textSecondary,
    marginBottom: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  segmentedControl: {
    flexDirection: 'row-reverse',
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(118,118,128,0.12)',
    borderRadius: 14,
    padding: 3,
    width: '100%',
    maxWidth: 240,
    height: 44,
    position: 'relative',
  },
  segmentedActivePill: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    width: '49%',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0.4 : 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  segmentedPillBoy: {
    right: 3,
    backgroundColor: isDarkMode ? 'rgba(59,130,246,0.25)' : 'rgba(59,130,246,0.12)',
  },
  segmentedPillGirl: {
    left: 3,
    backgroundColor: isDarkMode ? 'rgba(236,72,153,0.25)' : 'rgba(236,72,153,0.12)',
  },
  segmentedTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  segmentedTabText: {
    ...TYPOGRAPHY.label,
    fontWeight: '500',
    color: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
  },
  segmentedTabTextActiveBoy: {
    fontWeight: '700',
    color: isDarkMode ? '#93C5FD' : '#2563EB',
  },
  segmentedTabTextActiveGirl: {
    fontWeight: '700',
    color: isDarkMode ? '#F9A8D4' : '#DB2777',
  },

  // iOS date picker wrapper
  datePickerIosWrapper: {
    marginTop: -8,
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
  },
  datePickerHeaderBtn: {
    minWidth: 60,
  },
  datePickerCancel: {
    fontSize: 16,
    textAlign: 'right',
    color: theme.textSecondary,
  },
  datePickerConfirm: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.primary,
    textAlign: 'left',
  },

  // Submit button
  submitContainer: {
    marginBottom: 24,
  },
  primaryBtn: {
    backgroundColor: theme.primary,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: isDarkMode ? 0.4 : 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryBtnDisabled: {
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  primaryBtnTextDisabled: {
    color: isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
  },

  // Bottom Actions
  secondaryActions: {
    alignItems: 'center',
    marginTop: 12,
    gap: 24,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tipText: {
    ...TYPOGRAPHY.labelSmall,
    color: theme.textTertiary,
  },
  joinButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  joinText: {
    fontSize: 14,
    color: theme.textSecondary,
    textDecorationLine: 'underline',
  },
  skipButton: {
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    color: theme.textTertiary,
    textDecorationLine: 'underline',
  },

});