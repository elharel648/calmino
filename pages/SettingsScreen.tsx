import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Image, Alert, Linking, Modal, Animated as RNAnimated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Users, Settings, Camera, User, Pencil, Crown, Sparkles, Check, Star, ChevronLeft, UserPlus, Link as LinkIcon, Trash2, LogOut, Shield, Download, Lock, Baby } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import Animated from 'react-native-reanimated';
import { ANIMATIONS } from '../utils/designSystem';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';

// Hooks
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useFamily } from '../hooks/useFamily';
import { useActiveChild } from '../context/ActiveChildContext';
import { useBabyProfile } from '../hooks/useBabyProfile';
import { auth, db } from '../services/firebaseConfig';
import { leaveGuestAccess } from '../services/familyService';
import { logger } from '../utils/logger';
import { usePremium } from '../context/PremiumContext';
import { getShowPremiumUpgrade } from '../services/remoteConfigService';

// Components
import { FamilyMembersCard } from '../components/Family/FamilyMembersCard';
import { InviteFamilyModal } from '../components/Family/InviteFamilyModal';
import { JoinFamilyModal } from '../components/Family/JoinFamilyModal';
import GuestInviteModal from '../components/Family/GuestInviteModal';
import { EditBasicInfoModal } from '../components/Profile';
import DynamicPromoModal from '../components/Premium/DynamicPromoModal';
import PremiumPaywall from '../components/Premium/PremiumPaywall';

const getInitials = (name: string) => {
  if (!name) return '';
  const names = name.trim().split(' ');
  if (names.length === 0) return '';
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
};

export default function SettingsScreen() {
  const { theme, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const navigation = useNavigation<any>();
  const { activeChild, refreshChildren } = useActiveChild();
  const { baby, updateBasicInfo, updatePhoto, refresh, birthDateObj, babyAgeMonths } = useBabyProfile(activeChild?.childId);
  const { family, members, rename: renameFamily, isAdmin, remove: removeMember, leave: leaveFamily } = useFamily();
  const { isPremium } = usePremium();
  const user = auth.currentUser;

  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [isGuestInviteOpen, setIsGuestInviteOpen] = useState(false);
  const [isEditBasicInfoOpen, setIsEditBasicInfoOpen] = useState(false);
  const [userPhotoURL, setUserPhotoURL] = useState<string | null>(
    user?.photoURL || null
  );
  const [userName, setUserName] = useState<string>(
    user?.displayName || ''
  );
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const [guestInvitedNames, setGuestInvitedNames] = useState<string[] | null>(null);
  const guestBannerOpacity = useRef(new RNAnimated.Value(0)).current;

  const showGuestBanner = useCallback((names: string[]) => {
    setGuestInvitedNames(names);
    guestBannerOpacity.setValue(0);
    RNAnimated.sequence([
      RNAnimated.timing(guestBannerOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      RNAnimated.delay(3500),
      RNAnimated.timing(guestBannerOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => setGuestInvitedNames(null));
  }, [guestBannerOpacity]);

  // Read remote config switch globally
  const showPremiumUpgrade = getShowPremiumUpgrade();

  const handleSettingsPress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    navigation.navigate('FullSettings');
  };

  const getAgeDisplay = () => {
    if (babyAgeMonths < 1) {
      const days = Math.floor((new Date().getTime() - birthDateObj.getTime()) / (1000 * 60 * 60 * 24));
      return t('age.days', { count: days });
    }
    if (babyAgeMonths < 12) return t('age.months', { count: babyAgeMonths });
    const years = Math.floor(babyAgeMonths / 12);
    const months = babyAgeMonths % 12;
    return months > 0 ? t('age.yearsMonths', { count: years, months }) : t('age.years', { count: years });
  };

  const renderLockedSection = (children: React.ReactNode, title: string = t('settings.premiumFeature')) => {
    if (isPremium) return children;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setIsPaywallOpen(true)}
        style={{ overflow: 'hidden', borderRadius: 16, marginTop: 0 }}
      >
        <View style={{ opacity: 0.4 }} pointerEvents="none">
          {children}
        </View>
        <BlurView
          intensity={Platform.OS === 'ios' ? 40 : 100}
          tint={isDarkMode ? 'dark' : 'light'}
          style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', padding: 12 }]}
        >
          <View style={{
            backgroundColor: theme.textPrimary,
            paddingVertical: 10,
            paddingHorizontal: 20,
            borderRadius: 100, // Keep as pill as user wanted!
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 8,
          }}>
            <Lock size={16} color={theme.card} strokeWidth={2} />
            <Text style={{ color: theme.card, fontWeight: '700', fontSize: 14 }}>{title}</Text>
          </View>
        </BlurView>
      </TouchableOpacity>
    );
  };

  const handleEditPhoto = useCallback(async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await updatePhoto('profile');
    await refreshChildren();
  }, [updatePhoto, refreshChildren]);

  const handleSaveBasicInfo = useCallback(async (data: { name: string; gender: 'boy' | 'girl' | 'other'; birthDate: Date; photoUrl?: string }) => {
    try {
      await updateBasicInfo(data);
      setIsEditBasicInfoOpen(false);
      await refreshChildren();
      refresh();
    } catch (e) {
      Alert.alert(t('common.error'), t('settings.saveError'));
    }
  }, [updateBasicInfo, refresh, refreshChildren, t]);

  const handleEditFamilyName = useCallback(() => {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        t('account.editFamilyName'),
        t('account.enterNewFamilyName'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.save'),
            onPress: async (newName) => {
              if (newName && newName.trim()) {
                const success = await renameFamily(newName.trim());
                if (success && Platform.OS !== 'web') {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
              }
            },
          },
        ],
        'plain-text',
        family?.babyName || ''
      );
    } else {
      Alert.alert(t('account.editFamilyName'), t('account.editFamilyNameIOS'));
    }
  }, [family?.babyName, renameFamily]);

  const openSettings = useCallback(() => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  }, []);

  const handleRemoveMember = useCallback((memberId: string, memberName: string) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      t('settings.removeMemberTitle'),
      t('settings.removeMemberMessage', { name: memberName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.remove'),
          style: 'destructive',
          onPress: async () => {
            const success = await removeMember(memberId);
            if (success && Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
        },
      ]
    );
  }, [removeMember]);

  const handleLeaveGuestAccess = useCallback(() => {
    const familyId = activeChild?.familyId;
    if (!familyId) return;
    const childName = activeChild?.childName || t('settings.theChild');
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      t('settings.leaveGuestTitle'),
      t('settings.leaveGuestMessage', { name: childName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.leave'),
          style: 'destructive',
          onPress: async () => {
            const success = await leaveGuestAccess(familyId);
            if (success) {
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              refreshChildren();
            }
          },
        },
      ]
    );
  }, [activeChild, refreshChildren, t]);

  const handleLeaveFamily = useCallback(() => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      t('settings.leaveFamilyTitle'),
      t('settings.leaveFamilyMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.leave'),
          style: 'destructive',
          onPress: async () => {
            const success = await leaveFamily();
            if (success) {
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              refreshChildren();
            }
          },
        },
      ]
    );
  }, [leaveFamily, refreshChildren]);

  const handleEditUserPhoto = useCallback(async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        t('settings.permissionRequired'),
        t('settings.galleryPermission'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('settings.openSettings'), onPress: openSettings }
        ]
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && user) {
      const newImageUri = result.assets[0].uri;
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { photoURL: newImageUri });
        await updateProfile(user, { photoURL: newImageUri }).catch((e) => { logger.log('Auth profile update error', e); });
        setUserPhotoURL(newImageUri);
        setPhotoError(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        Alert.alert(t('account.error'), t('account.couldNotSavePhoto'));
      }
    }
  }, [user, openSettings]);

  const handleEditUserName = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (Platform.OS === 'ios') {
      Alert.prompt(
        t('settings.editName'),
        t('settings.enterNewName'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.save'),
            onPress: async (newName) => {
              if (newName && newName.trim() && user) {
                try {
                  await updateProfile(user, { displayName: newName.trim() });
                  const userRef = doc(db, 'users', user.uid);
                  await updateDoc(userRef, { displayName: newName.trim() });
                  setUserName(newName.trim());
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                } catch (error) {
                  Alert.alert(t('common.error'), t('settings.saveNameError'));
                }
              }
            },
          },
        ],
        'plain-text',
        userName || ''
      );
    } else {
      Alert.alert(t('settings.editName'), t('settings.editNameiOSOnly'));
    }
  }, [user, userName]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      {/* Minimal Header - Apple Style */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>{t('account.title')}</Text>
          <TouchableOpacity
            onPress={handleSettingsPress}
            style={styles.settingsButton}
            activeOpacity={0.6}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Settings size={22} color={theme.textSecondary} strokeWidth={1.5} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Profile Section - Centered, Minimal */}
        <Animated.View entering={ANIMATIONS.fadeInDown(100)} style={styles.profileSection}>
          <TouchableOpacity
            onPress={handleEditUserPhoto}
            style={styles.avatarContainer}
            activeOpacity={0.8}
          >
            {userPhotoURL && !photoError ? (
              <>
                <View style={[styles.avatarGlow, { borderColor: isDarkMode ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.2)' }]}>
                  <Image
                    source={{ uri: userPhotoURL }}
                    style={styles.avatar}
                    onError={() => setPhotoError(true)}
                  />
                </View>
                <View style={[styles.cameraBadge, { backgroundColor: isDarkMode ? '#fff' : '#000', borderColor: isDarkMode ? theme.background : '#fff' }]}>
                  <Camera size={15} color={isDarkMode ? '#000' : '#fff'} strokeWidth={2.5} />
                </View>
              </>
            ) : (
              <>
                <View style={[styles.avatarPlaceholder, {
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                  borderWidth: 2,
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
                }]}>
                  <User size={46} color={isDarkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.35)'} strokeWidth={1.5} />
                </View>
                <View style={[styles.cameraBadge, { backgroundColor: isDarkMode ? '#fff' : '#000', borderColor: isDarkMode ? theme.background : '#fff' }]}>
                  <Camera size={15} color={isDarkMode ? '#000' : '#fff'} strokeWidth={2.5} />
                </View>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleEditUserName}
            style={styles.nameRow}
            activeOpacity={0.7}
          >
            <Text style={[styles.userName, { color: theme.textPrimary }]}>
              {userName || t('account.myUser')}
            </Text>
            <Pencil size={16} color={isDarkMode ? '#fff' : '#000'} strokeWidth={2} />
          </TouchableOpacity>

          {user?.email && (
            <Text style={[styles.userEmail, { color: theme.textSecondary }]}>{user?.email}</Text>
          )}
        </Animated.View>
        {/* Premium Card - Highlighted Premium Design - Remote Config controlled */}
        {showPremiumUpgrade && (
          <Animated.View entering={ANIMATIONS.fadeInDown(200)} style={styles.section}>
            <TouchableOpacity
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsPremiumModalOpen(true);
              }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FF6B35', '#F7931E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.premiumCardMinimal, { borderWidth: 0 }]}
              >
                <View style={styles.premiumContentMinimal}>
                  <View style={[styles.premiumIconMinimal, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
                    <Crown size={20} color="#FFFFFF" strokeWidth={2.5} />
                  </View>
                  <View style={styles.premiumTextMinimal}>
                    <Text style={[styles.premiumTitleMinimal, { color: '#ffffff', fontWeight: '800' }]}>{t('account.upgradePremium')}</Text>
                    <Text style={[styles.premiumSubtitleMinimal, { color: 'rgba(255,255,255,0.85)' }]}>{t('account.premiumSubtitle')}</Text>
                  </View>
                </View>
                <ChevronLeft size={18} color="rgba(255,255,255,0.6)" strokeWidth={2.5} />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Family Section - Unified, Clean Design */}
        <Animated.View entering={ANIMATIONS.fadeInDown(300)} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('account.family')}</Text>

          {/* Family Info Card - Only if in a family */}
          {family && (
            <Animated.View entering={ANIMATIONS.fadeInDown(400)} style={[styles.familyInfoCard, { backgroundColor: theme.card, borderWidth: 1, borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)' }]}>
              <View style={styles.familyInfoHeader}>
                <View style={styles.familyInfoLeft}>
                  <View style={[styles.familyInfoAvatar, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)' }]}>
                    <Users size={20} color={isDarkMode ? '#fff' : '#000'} strokeWidth={2} />
                  </View>
                  <View style={styles.familyInfoText}>
                    <Text style={[styles.familyInfoName, { color: theme.textPrimary }]}>
                      {t('premium.familyOf')} {family.babyName}
                    </Text>
                    <Text style={[styles.familyInfoCount, { color: theme.textSecondary }]}>
                      {members.length || 1} {t('premium.members')}
                    </Text>
                  </View>
                </View>
                {isAdmin && (
                  <TouchableOpacity
                    onPress={handleEditFamilyName}
                    style={styles.editFamilyButton}
                    activeOpacity={0.6}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Pencil size={14} color={theme.textTertiary} strokeWidth={2} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Members List */}
              <View style={[styles.membersList, { borderTopColor: theme.divider }]}>
                {members.map((member, index) => {
                  const isMe = member.id === auth.currentUser?.uid;
                  const roleConfig = {
                    admin: { label: t('family.admin'), color: isDarkMode ? '#fff' : '#000' },
                    member: { label: t('settings.roleMember'), color: isDarkMode ? '#fff' : '#000' },
                    viewer: { label: t('settings.roleViewer'), color: isDarkMode ? '#fff' : '#000' },
                    guest: { label: t('family.guest'), color: isDarkMode ? '#fff' : '#000' },
                  }[member.role] || { label: t('settings.memberFallback'), color: isDarkMode ? '#fff' : '#000' };

                  return (
                    <View key={member.id || index} style={[styles.memberRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.divider }]}>
                      {/* Remove button - only for admin, not for self */}
                      {isAdmin && !isMe && member.id && (
                        <TouchableOpacity
                          onPress={() => handleRemoveMember(member.id!, member.name || t('settings.memberFallback'))}
                          style={styles.removeButton}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Trash2 size={16} color={isDarkMode ? '#fff' : '#000'} strokeWidth={2} />
                        </TouchableOpacity>
                      )}
                      <View style={[styles.memberBadge, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)' }]}>
                        <Text style={[styles.memberBadgeText, { color: roleConfig.color }]}>{roleConfig.label}</Text>
                      </View>
                      <View style={styles.memberInfo}>
                        <Text style={[styles.memberName, { color: theme.textPrimary }]}>
                          {member.name || t('settings.userFallback')}{isMe ? ` (${t('settings.meLabel')})` : ''}
                        </Text>
                        {member.email && (
                          <Text style={[styles.memberEmail, { color: theme.textSecondary }]}>{member.email}</Text>
                        )}
                      </View>
                      <View style={[styles.memberAvatar, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)' }]}>
                        <Text style={[styles.memberInitial, { color: roleConfig.color }]}>
                          {(member.name || 'מ').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </Animated.View>
          )}

          {/* Family Actions - Premium Design with Visual Hierarchy */}
          {renderLockedSection(
            <Animated.View entering={ANIMATIONS.fadeInDown(500)} style={{ gap: 12 }}>
              {/* PRIMARY: Create/Invite Family - Minimalist Design */}
              {(isAdmin || !family) && (
                <TouchableOpacity
                  style={[styles.familyActionMinimal, { backgroundColor: theme.card, borderColor: theme.divider }]}
                  onPress={() => {
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setInviteModalVisible(true);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.familyActionContent}>
                    <View style={[styles.familyActionIcon, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)' }]}>
                      <UserPlus size={18} color={isDarkMode ? '#fff' : '#000'} strokeWidth={2} />
                    </View>
                    <View style={styles.familyActionText}>
                      <Text style={[styles.familyActionTitle, { color: theme.textPrimary }]}>
                        {family ? t('account.inviteFamily') : t('account.createFamily')}
                      </Text>
                      <Text style={[styles.familyActionSubtitle, { color: theme.textSecondary }]}>
                        {family ? t('account.inviteFamily_subtitle') : t('account.createFamily_subtitle')}
                      </Text>
                    </View>
                  </View>
                  <ChevronLeft size={18} color={theme.textTertiary} strokeWidth={2} />
                </TouchableOpacity>
              )}

              {/* Guest invite */}
              <TouchableOpacity
                style={[styles.familyActionMinimal, { backgroundColor: theme.card, borderColor: theme.divider }]}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIsGuestInviteOpen(true);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.familyActionContent}>
                  <View style={[styles.familyActionIcon, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)' }]}>
                    <Users size={18} color={isDarkMode ? '#fff' : '#000'} strokeWidth={2} />
                  </View>
                  <View style={styles.familyActionText}>
                    <View style={styles.familyActionTitleRow}>
                      <Text style={[styles.familyActionTitle, { color: theme.textPrimary }]}>{t('account.inviteGuest')}</Text>
                      <View style={[styles.badgeMinimal, { backgroundColor: 'transparent', borderWidth: 1, borderColor: isDarkMode ? '#fff' : '#000' }]}>
                        <Text style={[styles.badgeTextMinimal, { color: isDarkMode ? '#fff' : '#000' }]}>{t('settings.badgeTemporary')}</Text>
                      </View>
                    </View>
                    <Text style={[styles.familyActionSubtitle, { color: theme.textSecondary }]}>
                      {t('account.inviteGuest_subtitle')}
                    </Text>
                  </View>
                </View>
                <ChevronLeft size={18} color={theme.textTertiary} strokeWidth={2} />
              </TouchableOpacity>

              {/* Join with code */}
              <TouchableOpacity
                style={[styles.familyActionMinimal, { backgroundColor: theme.card, borderColor: theme.divider }]}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setJoinModalVisible(true);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.familyActionContent}>
                  <View style={[styles.familyActionIcon, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)' }]}>
                    <LinkIcon size={18} color={isDarkMode ? '#fff' : '#000'} strokeWidth={2} />
                  </View>
                  <View style={styles.familyActionText}>
                    <View style={styles.familyActionTitleRow}>
                      <Text style={[styles.familyActionTitle, { color: theme.textPrimary }]}>{t('account.joinWithCode')}</Text>
                      <View style={[styles.badgeMinimal, { backgroundColor: 'transparent', borderWidth: 1, borderColor: isDarkMode ? '#fff' : '#000' }]}>
                        <Text style={[styles.badgeTextMinimal, { color: isDarkMode ? '#fff' : '#000' }]}>{t('settings.badgeAutomatic')}</Text>
                      </View>
                    </View>
                    <Text style={[styles.familyActionSubtitle, { color: theme.textSecondary }]}>
                      {t('account.joinWithCode_subtitle')}
                    </Text>
                  </View>
                </View>
                <ChevronLeft size={18} color={theme.textTertiary} strokeWidth={2} />
              </TouchableOpacity>
            </Animated.View>,
            t('settings.familyManagement')
          )}

          {/* Leave Family - for non-admin members only */}
          {family && !isAdmin && (
            <Animated.View entering={ANIMATIONS.fadeInDown(700)} style={[styles.listContainer, { backgroundColor: theme.card, marginTop: 16 }]}>
              <TouchableOpacity
                style={[styles.listItem, styles.listItemFirst, styles.listItemLast]}
                onPress={handleLeaveFamily}
                activeOpacity={0.6}
              >
                <View style={styles.listItemContent}>
                  <View style={[styles.listItemIcon, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)' }]}>
                    <LogOut size={20} color={isDarkMode ? '#fff' : '#000'} strokeWidth={2.5} />
                  </View>
                  <View style={styles.listItemTextContainer}>
                    <Text style={[styles.listItemText, { color: theme.textPrimary }]}>{t('family.leaveFamily')}</Text>
                    <Text style={[styles.listItemSubtext, { color: theme.textSecondary }]}>
                      {t('settings.disconnectWarning')}
                    </Text>
                  </View>
                </View>
                <View style={styles.chevronWrap}>
                  <ChevronLeft size={18} color={theme.textTertiary} strokeWidth={2} />
                </View>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Leave Guest Access - for guests who joined with invite code */}
          {activeChild?.role === 'guest' && activeChild?.familyId && (
            <Animated.View entering={ANIMATIONS.fadeInDown(750)} style={[styles.listContainer, { backgroundColor: theme.card, marginTop: 16 }]}>
              <TouchableOpacity
                style={[styles.listItem, styles.listItemFirst, styles.listItemLast]}
                onPress={handleLeaveGuestAccess}
                activeOpacity={0.6}
              >
                <View style={styles.listItemContent}>
                  <View style={[styles.listItemIcon, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)' }]}>
                    <LogOut size={20} color={isDarkMode ? '#fff' : '#000'} strokeWidth={2.5} />
                  </View>
                  <View style={styles.listItemTextContainer}>
                    <Text style={[styles.listItemText, { color: theme.textPrimary }]}>{t('settings.leaveGuestAccess')}</Text>
                    <Text style={[styles.listItemSubtext, { color: theme.textSecondary }]}>
                      {t('settings.removeGuestWarning', { name: activeChild.childName })}
                    </Text>
                  </View>
                </View>
                <View style={styles.chevronWrap}>
                  <ChevronLeft size={18} color={theme.textTertiary} strokeWidth={2} />
                </View>
              </TouchableOpacity>
            </Animated.View>
          )}
        </Animated.View>

        {/* Child Profile Section */}
        {baby?.id && (
          <Animated.View entering={ANIMATIONS.fadeInDown(800)} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('settings.myChild')}</Text>
            <TouchableOpacity
              style={[styles.familyActionMinimal, { backgroundColor: theme.card, borderColor: theme.divider }]}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsEditBasicInfoOpen(true);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.familyActionContent}>
                <View style={[styles.familyActionIcon, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)' }]}>
                  <Baby size={18} color={isDarkMode ? '#fff' : '#000'} strokeWidth={2} />
                </View>
                <View style={styles.familyActionText}>
                  <Text style={[styles.familyActionTitle, { color: theme.textPrimary }]}>
                    {baby.name || t('settings.myChildFallback')}
                  </Text>
                  <Text style={[styles.familyActionSubtitle, { color: theme.textSecondary }]}>
                    {t('settings.editChildDetails')}
                  </Text>
                </View>
              </View>
              <Pencil size={16} color={theme.textTertiary} strokeWidth={2} />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Bottom Spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Guest invited banner */}
      {guestInvitedNames && (
        <RNAnimated.View style={[styles.guestBanner, { opacity: guestBannerOpacity }]}>
          <Text style={styles.guestBannerText}>
            {t('settings.guestCodeCreated', { names: guestInvitedNames.join(', ') })}
          </Text>
        </RNAnimated.View>
      )}

      {/* Guest Invite Modal */}
      <GuestInviteModal
        visible={isGuestInviteOpen}
        onClose={() => setIsGuestInviteOpen(false)}
        familyId={family?.id}
        onSuccess={showGuestBanner}
      />

      {/* Family Invite Modal */}
      {baby?.id && (
        <InviteFamilyModal
          visible={inviteModalVisible}
          onClose={() => setInviteModalVisible(false)}
          babyId={baby.id}
          babyName={baby.name || t('account.theChild')}
        />
      )}

      <JoinFamilyModal
        visible={joinModalVisible}
        onClose={() => setJoinModalVisible(false)}
      />

      {/* Edit Basic Info Modal */}
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

      {/* Premium Modal - Apple Style */}
      <Modal
        visible={isPremiumModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsPremiumModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          {Platform.OS === 'ios' && (
            <BlurView
              intensity={20}
              tint={isDarkMode ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          )}
          <Animated.View
            entering={ANIMATIONS.fadeInDown(0, 400)}
            style={[styles.modalContainer, { backgroundColor: theme.card }]}
          >
            {/* Header */}
            <Animated.View entering={ANIMATIONS.fadeInDown(100)} style={styles.modalHeader}>
              <LinearGradient
                colors={['#FF6B35', '#F7931E']}
                style={styles.modalIconContainer}
              >
                <Crown size={28} color="#fff" strokeWidth={2} />
              </LinearGradient>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                CalmParent Premium
              </Text>
              <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                {t('settings.fullPremiumAccess')}
              </Text>
            </Animated.View>

            {/* Plans */}
            <Animated.View entering={ANIMATIONS.fadeInDown(200)} style={styles.plansContainer}>
              {/* Monthly */}
              <TouchableOpacity
                style={[
                  styles.planCard,
                  {
                    borderColor: selectedPlan === 'monthly' ? theme.primary : theme.divider,
                    backgroundColor: selectedPlan === 'monthly'
                      ? (isDarkMode ? 'rgba(99,102,241,0.15)' : theme.primaryLight)
                      : (isDarkMode ? theme.card : theme.background),
                  },
                ]}
                onPress={() => {
                  setSelectedPlan('monthly');
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.planDuration, { color: theme.textPrimary }]}>{t('account.monthly')}</Text>
                <Text style={[styles.planPrice, { color: theme.primary }]}>₪19.90</Text>
                <Text style={[styles.planPer, { color: theme.textSecondary }]}>{t('account.perMonth')}</Text>
              </TouchableOpacity>

              {/* Yearly */}
              <TouchableOpacity
                style={[
                  styles.planCard,
                  {
                    borderColor: selectedPlan === 'yearly' ? theme.primary : theme.divider,
                    backgroundColor: selectedPlan === 'yearly'
                      ? (isDarkMode ? 'rgba(99,102,241,0.15)' : theme.primaryLight)
                      : (isDarkMode ? theme.card : theme.background),
                  },
                ]}
                onPress={() => {
                  setSelectedPlan('yearly');
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                activeOpacity={0.8}
              >
                <View style={styles.planBadge}>
                  <Text style={styles.planBadgeText}>{t('account.save40')}</Text>
                </View>
                <Text style={[styles.planDuration, { color: theme.textPrimary }]}>{t('account.yearly')}</Text>
                <Text style={[styles.planPrice, { color: theme.primary }]}>₪139</Text>
                <Text style={[styles.planPer, { color: theme.textSecondary }]}>{t('account.perYear')}</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Features */}
            <Animated.View entering={ANIMATIONS.fadeInDown(300)} style={styles.featuresContainer}>
              <Animated.View entering={ANIMATIONS.fadeInDown(400)} style={styles.featureRow}>
                <View style={[styles.checkContainer, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)' }]}>
                  <Check size={18} color={isDarkMode ? '#fff' : '#000'} strokeWidth={2.5} />
                </View>
                <Text style={[styles.featureText, { color: theme.textPrimary }]}>
                  {t('premium.detailedReports')}
                </Text>
                <View style={[styles.featureIcon, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)' }]}>
                  <Sparkles size={18} color={isDarkMode ? '#fff' : '#000'} strokeWidth={2} />
                </View>
              </Animated.View>
              <Animated.View entering={ANIMATIONS.fadeInDown(450)} style={styles.featureRow}>
                <View style={[styles.checkContainer, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)' }]}>
                  <Check size={18} color={isDarkMode ? '#fff' : '#000'} strokeWidth={2.5} />
                </View>
                <Text style={[styles.featureText, { color: theme.textPrimary }]}>
                  {t('premium.exportData')}
                </Text>
                <View style={[styles.featureIcon, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)' }]}>
                  <Download size={18} color={isDarkMode ? '#fff' : '#000'} strokeWidth={2} />
                </View>
              </Animated.View>
              <Animated.View entering={ANIMATIONS.fadeInDown(500)} style={styles.featureRow}>
                <View style={[styles.checkContainer, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)' }]}>
                  <Check size={18} color={isDarkMode ? '#fff' : '#000'} strokeWidth={2.5} />
                </View>
                <Text style={[styles.featureText, { color: theme.textPrimary }]}>
                  {t('premium.unlimitedSharing')}
                </Text>
                <View style={[styles.featureIcon, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)' }]}>
                  <Users size={18} color={isDarkMode ? '#fff' : '#000'} strokeWidth={2} />
                </View>
              </Animated.View>
              <Animated.View entering={ANIMATIONS.fadeInDown(550)} style={styles.featureRow}>
                <View style={[styles.checkContainer, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)' }]}>
                  <Check size={18} color={isDarkMode ? '#fff' : '#000'} strokeWidth={2.5} />
                </View>
                <Text style={[styles.featureText, { color: theme.textPrimary }]}>
                  {t('premium.autoBackup')}
                </Text>
                <View style={[styles.featureIcon, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)' }]}>
                  <Shield size={18} color={isDarkMode ? '#fff' : '#000'} strokeWidth={2} />
                </View>
              </Animated.View>
              <Animated.View entering={ANIMATIONS.fadeInDown(600)} style={styles.featureRow}>
                <View style={[styles.checkContainer, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)' }]}>
                  <Check size={18} color={isDarkMode ? '#fff' : '#000'} strokeWidth={2.5} />
                </View>
                <Text style={[styles.featureText, { color: theme.textPrimary }]}>
                  {t('premium.noAds')}
                </Text>
                <View style={[styles.featureIcon, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)' }]}>
                  <Star size={18} color={isDarkMode ? '#fff' : '#000'} strokeWidth={2} />
                </View>
              </Animated.View>
            </Animated.View>

            {/* Subscribe Button */}
            <Animated.View entering={ANIMATIONS.fadeInDown(700)}>
              <TouchableOpacity
                style={styles.subscribeButton}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  Alert.alert(t('premium.comingSoon'), t('premium.comingSoonMessage'));
                  setIsPremiumModalOpen(false);
                }}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['#6366F1', '#8B5CF6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.subscribeButtonGradient}
                >
                  <Text style={styles.subscribeButtonText}>
                    {selectedPlan === 'yearly' ? t('premium.subscribeYearly') : t('premium.subscribeMonthly')}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* Close */}
            <Animated.View entering={ANIMATIONS.fadeInDown(800)}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsPremiumModalOpen(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.closeButtonText, { color: theme.textSecondary }]}>{t('account.maybeLater')}</Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </View>
      </Modal>

      <DynamicPromoModal
        currentScreenName="Settings"
        onNavigateToPaywall={() => setIsPaywallOpen(true)}
      />

      <PremiumPaywall
        visible={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        trigger="promo_modal_settings"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  guestBanner: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  guestBannerText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 12 : 20,
    paddingBottom: 8,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.37,
  },
  settingsButton: {
    padding: 4,
  },
  scrollContent: {
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 0,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  avatarGlow: {
    borderWidth: 3.5,
    borderRadius: 60,
    padding: 2.5,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  avatarPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMinimal: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleMinimal: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3.5,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  cameraBadgeSmall: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  nameRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.36,
  },
  userEmail: {
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: -0.24,
  },
  // Minimalist Premium Card - Highlighted
  premiumCardMinimal: {
    marginTop: 16,
    marginBottom: 0,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  premiumContentMinimal: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  premiumIconMinimal: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumTextMinimal: {
    flex: 1,
    alignItems: 'flex-end',
  },
  premiumTitleMinimal: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  premiumSubtitleMinimal: {
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: -0.1,
    lineHeight: 18,
  },
  // Legacy styles (keeping for compatibility)
  premiumCard: {
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  premiumGradient: {
    padding: 18,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  premiumContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  premiumIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  sparklesContainer: {
    padding: 4,
  },
  premiumTextContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  premiumTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 3,
    letterSpacing: -0.3,
  },
  policySubtitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  premiumSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: -0.2,
    lineHeight: 18,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 16,
    textAlign: 'right',
    textTransform: 'uppercase',
    opacity: 0.65,
  },
  familyInfoCard: {
    borderRadius: 22,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  familyInfoHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  familyInfoLeft: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  familyInfoAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  familyInfoText: {
    alignItems: 'flex-end',
    flex: 1,
  },
  familyInfoName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  familyInfoCount: {
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: -0.2,
    opacity: 0.7,
  },
  editFamilyButton: {
    padding: 8,
    borderRadius: 8,
  },
  membersList: {
    marginTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 16,
  },
  memberRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInitial: {
    fontSize: 14,
    fontWeight: '700',
  },
  removeButton: {
    padding: 6,
    marginLeft: 4,
  },
  memberInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
  },
  memberEmail: {
    fontSize: 11,
    marginTop: 2,
    opacity: 0.7,
  },
  memberBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  memberBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  listContainer: {
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  listItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    minHeight: 68,
  },
  listItemFirst: {
    paddingTop: 20,
  },
  listItemLast: {
    paddingBottom: 20,
  },
  listDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 20,
    marginRight: 20,
  },
  listItemContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    flex: 1,
  },
  listItemIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  listItemTextContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  chevronWrap: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  listItemText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.35,
    textAlign: 'right',
    marginBottom: 4,
  },
  listItemSubtext: {
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: -0.25,
    textAlign: 'right',
    lineHeight: 20,
  },
  listItemTitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12,
    marginBottom: 3,
  },
  // Minimalist Family Actions
  familyActionsMinimal: {
    gap: 12,
  },
  familyActionMinimal: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  familyActionFirst: {
    marginTop: 0,
  },
  familyActionLast: {
    marginBottom: 0,
  },
  familyActionContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  familyActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  familyActionText: {
    flex: 1,
    alignItems: 'flex-end',
  },
  familyActionTitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  familyActionTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  familyActionSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: -0.1,
    lineHeight: 18,
  },
  badgeMinimal: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeTextMinimal: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Legacy styles (keeping for compatibility)
  primaryFamilyAction: {
    marginBottom: 20,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  primaryFamilyGradient: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 18,
  },
  primaryFamilyContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  primaryFamilyIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryFamilyTextContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  primaryFamilyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 3,
    letterSpacing: -0.3,
  },
  primaryFamilySubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: -0.2,
    lineHeight: 18,
  },
  // Badges
  memberCountBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginLeft: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  memberCountText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  timeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  timeBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  autoDetectBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  autoDetectText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '90%',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  modalIconContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.36,
  },
  modalSubtitle: {
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: -0.24,
  },
  plansContainer: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginBottom: 28,
  },
  planCard: {
    flex: 1,
    padding: 18,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
  },
  planBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  planBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.07,
  },
  planDuration: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: -0.24,
  },
  planPrice: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  planPer: {
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: -0.08,
  },
  featuresContainer: {
    gap: 14,
    marginBottom: 28,
  },
  featureRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 4,
  },
  checkContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: -0.2,
    textAlign: 'right',
  },
  subscribeButton: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  subscribeButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.41,
  },
  closeButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  closeButtonText: {
    fontSize: 17,
    fontWeight: '400',
    letterSpacing: -0.41,
  },
});
