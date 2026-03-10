import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { Calendar, Check, User, ChevronRight, Heart, Baby, X, Sparkles } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInUp, useSharedValue, useAnimatedStyle, withSpring, withRepeat, withTiming } from 'react-native-reanimated';
import { saveBabyProfile } from '../services/babyService';
import { LiquidGlassBackground } from '../components/LiquidGlass';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import JoinFamilyModal from '../components/Family/JoinFamilyModal';

const { width, height } = Dimensions.get('window');

type BabyProfileScreenProps = {
  onProfileSaved: () => void;
  onSkip?: () => void;
  onClose?: () => void;
};

export default function BabyProfileScreen({ onProfileSaved, onSkip, onClose }: BabyProfileScreenProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [gender, setGender] = useState<'boy' | 'girl'>('boy');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const [savedName, setSavedName] = useState('');

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
    if (!name.trim()) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(t('baby.nameRequired'), t('baby.nameRequiredMessage'));
      return;
    }
    if (!birthDate) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('שגיאה', 'יש לבחור תאריך לידה');
      return;
    }

    setLoading(true);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await saveBabyProfile(name, birthDate, gender);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSavedName(name);
      setWelcomeVisible(true);
    } catch (error) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common.error'), t('errors.saveError'));
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setBirthDate(selectedDate);
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleGenderSelect = (selected: 'boy' | 'girl') => {
    setGender(selected);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const isFormValid = name.trim().length > 0 && birthDate !== null;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Premium Liquid Glass Background */}
      <LiquidGlassBackground />

      {/* Close button */}
      {onClose && (
        <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
          <BlurView intensity={60} tint="light" style={styles.closeButtonBlur}>
            <X size={20} color="#6B7280" strokeWidth={2} />
          </BlurView>
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
              <BlurView intensity={80} tint="light" style={styles.iconBlur}>
                <Baby size={32} color="#6366F1" strokeWidth={1.5} />
              </BlurView>
              <View style={styles.sparkleWrap}>
                <Sparkles size={14} color="#8B5CF6" strokeWidth={2} />
              </View>
            </View>
            <Text style={styles.title}>רישום ילד חדש</Text>
            <Text style={styles.subtitle}>נא למלא את הפרטים הבאים</Text>
          </Animated.View>

          {/* Name Input Card */}
          <Animated.View>
            <View style={styles.glassCard}>
              <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
              <View style={styles.cardOverlay} />

              <View style={styles.cardRow}>
                <View style={styles.cardIconWrap}>
                  <User size={18} color="#6366F1" strokeWidth={1.5} />
                </View>
                <Text style={styles.cardLabel}>שם הילד</Text>
              </View>

              <TextInput
                style={styles.input}
                placeholder="הקלידו את השם..."
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
                textAlign="right"
                autoFocus
              />

              {name.length > 0 && (
                <View style={styles.checkBadge}>
                  <Check size={14} color="#fff" strokeWidth={3} />
                </View>
              )}
            </View>
          </Animated.View>

          {/* Birth Date Card */}
          <Animated.View>
            <View style={styles.glassCard}>
              <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
              <View style={styles.cardOverlay} />

              <View style={styles.cardRow}>
                <View style={styles.cardIconWrap}>
                  <Calendar size={18} color="#8B5CF6" strokeWidth={1.5} />
                </View>
                <Text style={styles.cardLabel}>תאריך לידה</Text>
              </View>

              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <ChevronRight size={18} color="#6B7280" />
                <Text style={[styles.dateText, !birthDate && { color: '#9CA3AF', fontWeight: '400' }]}>
                  {birthDate
                    ? birthDate.toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' })
                    : 'בחר תאריך לידה...'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {showDatePicker && (
            <DateTimePicker
              value={birthDate ?? new Date()}
              mode="date"
              display="spinner"
              locale="he"
              maximumDate={new Date()}
              onChange={onDateChange}
            />
          )}

          {/* Gender Selection */}
          <Animated.View>
            <Text style={styles.sectionTitle}>מין הילד</Text>
            <View style={styles.genderRow}>
              {/* Boy Option */}
              <TouchableOpacity
                style={[styles.genderCard, gender === 'boy' && styles.genderCardActive]}
                onPress={() => handleGenderSelect('boy')}
                activeOpacity={0.8}
              >
                <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
                <View style={[styles.genderOverlay, gender === 'boy' && styles.genderOverlayBoy]} />

                <View style={[styles.genderIcon, { backgroundColor: gender === 'boy' ? '#3B82F6' : '#E5E7EB' }]}>
                  <User size={22} color="#fff" strokeWidth={2} />
                </View>
                <Text style={[styles.genderText, gender === 'boy' && styles.genderTextActive]}>בן</Text>

                {gender === 'boy' && (
                  <View style={[styles.genderBadge, { backgroundColor: '#3B82F6' }]}>
                    <Check size={12} color="#fff" strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>

              {/* Girl Option */}
              <TouchableOpacity
                style={[styles.genderCard, gender === 'girl' && styles.genderCardActive]}
                onPress={() => handleGenderSelect('girl')}
                activeOpacity={0.8}
              >
                <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
                <View style={[styles.genderOverlay, gender === 'girl' && styles.genderOverlayGirl]} />

                <View style={[styles.genderIcon, { backgroundColor: gender === 'girl' ? '#EC4899' : '#E5E7EB' }]}>
                  <User size={22} color="#fff" strokeWidth={2} />
                </View>
                <Text style={[styles.genderText, gender === 'girl' && styles.genderTextActive]}>בת</Text>

                {gender === 'girl' && (
                  <View style={[styles.genderBadge, { backgroundColor: '#EC4899' }]}>
                    <Check size={12} color="#fff" strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Submit Button */}
          <Animated.View style={[styles.submitContainer, buttonAnimatedStyle]}>
            <TouchableOpacity
              style={[styles.submitButton, !isFormValid && styles.submitButtonDisabled]}
              onPress={handleSave}
              disabled={loading || !isFormValid}
              activeOpacity={0.9}
            >
              <BlurView intensity={isFormValid ? 0 : 40} tint="light" style={StyleSheet.absoluteFill} />
              <View style={[styles.submitGradient, !isFormValid && styles.submitGradientDisabled]}>
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={styles.submitText}>שמירה והמשך</Text>
                    <ChevronRight size={22} color="#fff" style={{ marginLeft: -4 }} />
                  </>
                )}
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Bottom tip */}
          <Animated.View style={styles.tipContainer}>
            <Heart size={14} color="#EC4899" />
            <Text style={styles.tipText}>אפשר לערוך את הפרופיל בהמשך בכל עת</Text>
          </Animated.View>

          {/* Bottom Actions for Guest/Sitter/Skip */}
          <Animated.View style={styles.secondaryActions}>
            <TouchableOpacity
              style={styles.joinButton}
              onPress={() => setShowJoinModal(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.joinText}>יש לך קוד הזמנה? הצטרף כאורח/בייביסיטר</Text>
            </TouchableOpacity>

            {onSkip && (
              <TouchableOpacity style={styles.skipButton} onPress={onSkip} activeOpacity={0.7}>
                <Text style={styles.skipText}>דלג לעכשיו (אפשר למלא אחר כך)</Text>
              </TouchableOpacity>
            )}
          </Animated.View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Join Family / Sitter Guest Modal */}
      <JoinFamilyModal
        visible={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onSuccess={() => {
          setShowJoinModal(false);
          if (onProfileSaved) {
            onProfileSaved();
          }
        }}
      />

      {/* Welcome Modal */}
      <Modal visible={welcomeVisible} transparent animationType="fade">
        <View style={styles.welcomeOverlay}>
          <Animated.View entering={FadeInUp.springify()} style={styles.welcomeCard}>
            {/* Icon */}
            <View style={styles.welcomeIconWrap}>
              <Sparkles size={28} color="#8B5CF6" strokeWidth={1.5} />
            </View>

            {/* Text — RTL aligned */}
            <Text style={styles.welcomeTitle}>!איזה כיף</Text>
            <Text style={styles.welcomeMessage}>
              {`ברוכים הבאים ${savedName} למשפחת Calmino!`}
            </Text>

            {/* Button */}
            <TouchableOpacity
              style={styles.welcomeBtn}
              onPress={() => {
                setWelcomeVisible(false);
                onProfileSaved();
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.welcomeBtnText}>!בואו נתחיל</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 80,
    paddingBottom: 30,
  },

  // Close button
  closeButton: {
    position: 'absolute',
    top: 54,
    right: 16,
    zIndex: 100,
  },
  closeButtonBlur: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    marginBottom: 12,
    position: 'relative',
  },
  iconBlur: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  sparkleWrap: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EDE9FE',
    padding: 4,
    borderRadius: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E1B4B',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },

  // Glass Card
  glassCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    position: 'relative',
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  cardRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  cardIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    flex: 1,
    textAlign: 'right',
  },
  input: {
    fontSize: 18,
    color: '#1F2937',
    fontWeight: '600',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(99, 102, 241, 0.2)',
  },
  checkBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Date button
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(249, 250, 251, 0.8)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  dateText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
  },

  // Gender section
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  genderCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
    position: 'relative',
  },
  genderCardActive: {
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  genderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  genderOverlayBoy: {
    backgroundColor: 'rgba(219, 234, 254, 0.8)',
  },
  genderOverlayGirl: {
    backgroundColor: 'rgba(252, 231, 243, 0.8)',
  },
  genderIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  genderText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  genderTextActive: {
    color: '#1F2937',
  },
  genderBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Submit button
  submitContainer: {
    marginBottom: 16,
  },
  submitButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  submitButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  submitGradient: {
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  submitGradientDisabled: {
    backgroundColor: '#D1D5DB',
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },

  // Tip
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  tipText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
  },

  // Secondary Actions
  secondaryActions: {
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
    paddingBottom: 20,
  },
  joinButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)',
  },
  joinText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '700',
    textAlign: 'center',
  },
  skipButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 13,
    color: '#9CA3AF',
    textDecorationLine: 'underline',
  },

  // Welcome Modal
  welcomeOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  welcomeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 28,
    alignItems: 'flex-end',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
  },
  welcomeIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'right',
    marginBottom: 8,
    writingDirection: 'rtl',
  },
  welcomeMessage: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'right',
    lineHeight: 22,
    marginBottom: 28,
    writingDirection: 'rtl',
  },
  welcomeBtn: {
    backgroundColor: '#6366F1',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  welcomeBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});