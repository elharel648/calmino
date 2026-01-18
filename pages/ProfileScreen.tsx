import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Text, TouchableOpacity, Platform, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { Edit2, TrendingUp, Award, Sparkles, ChevronRight, Camera, UserPlus, Users, User, Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// Custom Hooks
import { useBabyProfile } from '../hooks/useBabyProfile';
import { useMilestones } from '../hooks/useMilestones';
import { useTheme } from '../context/ThemeContext';
import { useFamily } from '../hooks/useFamily';
import { useActiveChild } from '../context/ActiveChildContext';

// Components
import {
  AlbumCarousel,
  GrowthSection,
  MilestoneTimeline,
  EditMetricModal,
  MilestoneModal,
  EditBasicInfoModal,
} from '../components/Profile';
import GuestInviteModal from '../components/Family/GuestInviteModal';
import { FamilyMembersCard } from '../components/Family/FamilyMembersCard';
import { InviteFamilyModal } from '../components/Family/InviteFamilyModal';
import { JoinFamilyModal } from '../components/Family/JoinFamilyModal';
import GradientBackground from '../components/GradientBackground';

// Types
import { EditMetricState, Milestone } from '../types/profile';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { theme, isDarkMode } = useTheme();

  // Use activeChild instead of useBabyProfile
  const { activeChild } = useActiveChild();

  const {
    baby,
    loading,
    babyAgeMonths,
    birthDateObj,
    refresh,
    updatePhoto,
    updateStats,
    updateBasicInfo,
  } = useBabyProfile(activeChild?.childId);

  const { addNew: addMilestone, remove: removeMilestone } = useMilestones();

  const [editMetric, setEditMetric] = useState<EditMetricState | null>(null);
  const [isMilestoneOpen, setIsMilestoneOpen] = useState(false);
  const [isEditBasicInfoOpen, setIsEditBasicInfoOpen] = useState(false);
  const [isGuestInviteOpen, setIsGuestInviteOpen] = useState(false);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);

  const { family } = useFamily();

  const handleSaveMetric = useCallback(async (value: string) => {
    if (!editMetric) return;
    await updateStats(editMetric.type, value);
    setEditMetric(null);
  }, [editMetric, updateStats]);

  const handleAddMilestone = useCallback(async (title: string, date: Date) => {
    if (!baby?.id) return;
    await addMilestone(baby.id, title, date);
    refresh();
  }, [baby?.id, addMilestone, refresh]);

  const handleDeleteMilestone = useCallback((milestone: Milestone) => {
    if (!baby?.id) return;
    removeMilestone(baby.id, milestone, refresh);
  }, [baby?.id, removeMilestone, refresh]);

  const handleSaveBasicInfo = useCallback(async (data: { name: string; gender: 'boy' | 'girl' | 'other'; birthDate: Date }) => {
    await updateBasicInfo(data);
    setIsEditBasicInfoOpen(false);
    refresh();
  }, [updateBasicInfo, refresh]);

  const handleEditPhoto = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    updatePhoto('profile');
  }, [updatePhoto]);

  const getAgeDisplay = () => {
    if (babyAgeMonths < 1) {
      const days = Math.floor((new Date().getTime() - birthDateObj.getTime()) / (1000 * 60 * 60 * 24));
      return `${days} ימים`;
    }
    if (babyAgeMonths < 12) return `${babyAgeMonths} חודשים`;
    const years = Math.floor(babyAgeMonths / 12);
    const months = babyAgeMonths % 12;
    return months > 0 ? `${years} שנה ו-${months} חודשים` : `${years} שנה`;
  };

  // Get gender icon instead of emoji
  const getGenderIcon = () => {
    const color = baby?.gender === 'girl' ? '#EC4899' : '#60A5FA';
    return <User size={28} color={color} strokeWidth={1.5} />;
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <GradientBackground>
      <View style={[styles.container, { backgroundColor: 'transparent' }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />

        {/* Glass Header */}
        <BlurView intensity={80} tint={isDarkMode ? 'dark' : 'light'} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <ChevronRight size={22} color={theme.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>פרופיל</Text>
            <View style={{ width: 38 }} />
          </View>
        </BlurView>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Profile Card */}
          <View style={[styles.profileCard, { backgroundColor: theme.card }]}>
            <TouchableOpacity onPress={handleEditPhoto} style={styles.avatarContainer}>
              {baby?.photoUrl ? (
                <Image source={{ uri: baby.photoUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: isDarkMode ? '#2D2D3A' : '#EEF2FF' }]}>
                  {getGenderIcon()}
                </View>
              )}
              <View style={[styles.cameraBadge, { borderColor: theme.card }]}>
                <Camera size={14} color={theme.card} />
              </View>
            </TouchableOpacity>

            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: theme.textPrimary }]}>{baby?.name || 'הילד שלי'}</Text>
              <Text style={[styles.profileAge, { color: theme.primary }]}>{getAgeDisplay()}</Text>
              <Text style={[styles.profileDate, { color: theme.textSecondary }]}>{birthDateObj.toLocaleDateString('he-IL')}</Text>
            </View>

            <TouchableOpacity
              style={[styles.editProfileBtn, { backgroundColor: isDarkMode ? '#2D2D3A' : '#EEF2FF' }]}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                setIsEditBasicInfoOpen(true);
              }}
            >
              <Edit2 size={14} color={theme.primary} />
            </TouchableOpacity>
          </View>

          {/* Growth Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <TrendingUp size={18} color="#10B981" />
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>צמיחה והתפתחות</Text>
            </View>
            <GrowthSection
              stats={baby?.stats}
              onEditWeight={() => setEditMetric({ type: 'weight', title: 'משקל', unit: 'ק"ג', value: baby?.stats?.weight || '' })}
              onEditHeight={() => setEditMetric({ type: 'height', title: 'גובה', unit: 'ס"מ', value: baby?.stats?.height || '' })}
              onEditHead={() => setEditMetric({ type: 'head', title: 'היקף ראש', unit: 'ס"מ', value: baby?.stats?.headCircumference || '' })}
            />
          </View>

          {/* Milestones Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Award size={18} color="#F59E0B" />
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>אבני דרך</Text>
              <TouchableOpacity
                style={styles.addTextBtn}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  setIsMilestoneOpen(true);
                }}
              >
                <Plus size={18} color={theme.primary} />
              </TouchableOpacity>
            </View>
            <MilestoneTimeline
              milestones={baby?.milestones || []}
              onAdd={() => setIsMilestoneOpen(true)}
              onDelete={handleDeleteMilestone}
            />
          </View>

          {/* Magical Moments Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Sparkles size={18} color="#8B5CF6" />
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>רגעים קסומים</Text>
            </View>
            <AlbumCarousel
              album={baby?.album}
              onMonthPress={(month) => updatePhoto('album', month)}
            />
          </View>

        </ScrollView>

        {/* Modals */}
        <EditBasicInfoModal
          visible={isEditBasicInfoOpen}
          initialData={{
            name: baby?.name || '',
            gender: baby?.gender || 'boy',
            birthDate: birthDateObj,
          }}
          onSave={handleSaveBasicInfo}
          onClose={() => setIsEditBasicInfoOpen(false)}
        />

        <EditMetricModal
          visible={!!editMetric}
          title={editMetric?.title || ''}
          unit={editMetric?.unit || ''}
          initialValue={editMetric?.value || ''}
          onSave={handleSaveMetric}
          onClose={() => setEditMetric(null)}
        />

        <MilestoneModal
          visible={isMilestoneOpen}
          onAdd={handleAddMilestone}
          onClose={() => setIsMilestoneOpen(false)}
        />

        {/* Guest Invite Modal */}
        <GuestInviteModal
          visible={isGuestInviteOpen}
          onClose={() => setIsGuestInviteOpen(false)}
          familyId={family?.id}
        />

        {/* Family Invite Modal */}
        {baby?.id && family && (
          <InviteFamilyModal
            visible={inviteModalVisible}
            onClose={() => setInviteModalVisible(false)}
            babyId={baby.id}
            babyName={baby.name || 'הילד'}
          />
        )}

        {/* Join Family Modal */}
        <JoinFamilyModal
          visible={joinModalVisible}
          onClose={() => setJoinModalVisible(false)}
        />
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Glass Header
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  scrollContent: {
    paddingTop: 110, // Account for glass header
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  // Profile Card
  profileCard: {
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
    marginRight: 16,
    alignItems: 'flex-end',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  profileAge: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  profileDate: {
    fontSize: 13,
  },
  editProfileBtn: {
    padding: 12,
    borderRadius: 12,
  },
  // Sections
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
  },
  addTextBtn: {
    padding: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 10,
  },
});