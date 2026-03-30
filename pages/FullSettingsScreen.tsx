import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  Alert,
  Switch,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  Linking,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Share,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import {
  LogOut,
  Trash2,
  Bell,
  Moon,
  Globe,
  Shield,
  FileText,
  MessageCircle,
  Share2,
  Key,
  X,
  Check,
  Send,
  Utensils,
  Pill,
  UserX,
  ChevronLeft,
  ChevronRight,
  Mail,
  Instagram,
} from 'lucide-react-native';
import { auth, db, callFirebaseFunction } from '../services/firebaseConfig';
import LegalModal from '../components/Legal/LegalModal';
import { deleteUser, signOut, updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, deleteDoc, deleteField } from 'firebase/firestore';
import { getStorage, ref, deleteObject } from 'firebase/storage';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { Language } from '../types';
import { useNotifications } from '../hooks/useNotifications';
import { useChildProfile } from '../hooks/useChildProfile';
import { useActiveChild } from '../context/ActiveChildContext';
import { deleteChild } from '../services/babyService';
import { IntervalPicker } from '../components/Settings/IntervalPicker';
import { TimePicker } from '../components/Settings/TimePicker';
import PremiumNotificationSettings from '../components/Settings/PremiumNotificationSettings';
import { useMedications } from '../hooks/useMedications';
import { useGuest } from '../context/GuestContext';
import { logger } from '../utils/logger';

const LANGUAGES = [
  { key: 'he', labelKey: 'settings.hebrew' },
  { key: 'en', labelKey: 'settings.english' },
  { key: 'es', labelKey: 'settings.spanish' },
  { key: 'ar', labelKey: 'settings.arabic' },
  { key: 'fr', labelKey: 'settings.french' },
  { key: 'de', labelKey: 'settings.german' },
];


export default function SettingsScreen() {
  const { isDarkMode, setDarkMode, theme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const navigation = useNavigation<any>();
  const { activeChild, allChildren, setActiveChild, refreshChildren } = useActiveChild();
  const { meds, customSupplements, refresh: refreshMeds } = useMedications(activeChild?.childId);
  const { isGuest, exitGuestMode } = useGuest();
  useEffect(() => { refreshMeds(); }, [activeChild?.childId]);
  const { settings: notifSettings, updateSettings: updateNotifSettings } = useNotifications();

  const [userData, setUserData] = useState({ name: '', email: '', photoURL: null });
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [isLanguageModalVisible, setLanguageModalVisible] = useState(false);
  const [isContactModalVisible, setContactModalVisible] = useState(false);
  const [isPrivacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [isTermsModalVisible, setTermsModalVisible] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const [messageSent, setMessageSent] = useState(false);
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      fetchUserData();
    }, [])
  );

  const fetchUserData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        setUserData({
          name: data.displayName || user.displayName || t('settings.parentFallback'),
          email: user.email || '',
          photoURL: data.photoURL || user.photoURL || null
        });

        if (data.settings) {
if (data.settings.language !== undefined) {
            const lang = data.settings.language;
            setSelectedLanguage(lang);
            setLanguage(lang);
          }
        }
      } else {
        setUserData({
          name: user.displayName || t('settings.parentFallback'),
          email: user.email || '',
          photoURL: user.photoURL || null
        });
      }
    } catch (error) {
      logger.log('Error fetching settings:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const saveSettingToDB = async (key: string, value: any) => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
          settings: {
            [key]: value
          }
        }, { merge: true });
      }
    } catch (error) {
      logger.log('Failed to save setting:', key);
    }
  };

  const handleDarkModeToggle = (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDarkMode(value);
  };

  const handleLanguageSelect = async (langKey: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const lang = langKey as Language;
    setSelectedLanguage(lang);
    await setLanguage(lang);
    saveSettingToDB('language', langKey);
    setLanguageModalVisible(false);
  };

  const handleShareApp = async () => {
    try {
      await Share.share({ message: t('share.message') });
    } catch (error) { logger.warn('SettingsScreen share error', error); }
  };

  const handleChangePassword = async () => {
    Alert.alert(
      t('alerts.passwordReset'),
      `${t('alerts.passwordResetQuestion')}\n${userData.email}?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('alerts.sendEmail'), onPress: async () => {
            if (userData.email) {
              try {
                await callFirebaseFunction('sendPasswordResetEmailBranded', { email: userData.email });
                Alert.alert(t('alerts.sentSuccessfully'), t('alerts.checkEmail'));
              } catch (e) {
                Alert.alert(t('common.error'), t('alerts.couldNotSendEmail'));
              }
            }
          }
        }
      ]
    );
  };

  const handleSendContactMessage = async () => {
    if (contactMessage.trim().length < 10) {
      Alert.alert(t('common.error'), t('alerts.messageTooShort'));
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (user) {
        const contactRef = doc(db, 'contactMessages', `${user.uid}_${Date.now()}`);
        await setDoc(contactRef, {
          userId: user.uid,
          userEmail: user.email,
          userName: userData.name,
          message: contactMessage,
          timestamp: new Date().toISOString(),
          status: 'pending'
        });

        // שלח מייל דרך Firebase "Trigger Email from Firestore" Extension
        const mailRef = doc(collection(db, 'mail'));
        await setDoc(mailRef, {
          to: ['calminogroup@gmail.com'],
          message: {
            subject: `${t('settings.contactSubject', { name: userData.name || t('settings.userFallback') })}`,
            html: `
              <div dir="rtl" style="font-family: sans-serif; max-width: 500px;">
                <h2 style="color: #007AFF;">${t('settings.contactTitle')}</h2>
                <p><strong>שם:</strong> ${userData.name || t('common.unknown')}</p>
                <p><strong>${t('settings.contactEmailLabel')}:</strong> ${user.email || t('common.unknown')}</p>
                <hr/>
                <p><strong>${t('settings.contactMessageLabel')}:</strong></p>
                <p style="background: #f5f5f5; padding: 12px; border-radius: 8px;">${contactMessage}</p>
              </div>
            `,
          },
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setContactMessage('');
        setMessageSent(true);
        setTimeout(() => {
          setMessageSent(false);
          setContactModalVisible(false);
        }, 2800);
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('alerts.couldNotSendMessage'));
    } finally {
      setLoading(false);
    }
  };

  // --- CACHE DELETION HELPER ---
  // We only target specific keys to avoid deleting user preferences like Language and Theme 
  const clearUserCache = async () => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const keysToRemove = allKeys.filter(k => 
        k === 'offline_childrenList' || 
        k.startsWith('history_cache_') ||
        k === '@sitters_cache' ||
        k === '@offline_queue'
      );
      if (keysToRemove.length > 0) await AsyncStorage.multiRemove(keysToRemove);
    } catch (e) {
      logger.warn('Failed to clear specific user cache', e);
    }
  };

  const handleLogout = () => {
    if (isGuest) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      exitGuestMode();
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(t('alerts.logoutTitle'), t('alerts.logoutQuestion'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('alerts.yesLogout'),
        style: 'destructive',
        onPress: async () => {
          try {
            await clearUserCache();
            await signOut(auth);
          } catch (error) {
            logger.error('Sign out error:', error);
          }
        }
      }
    ]);
  };

  const handleDeleteChild = async () => {
    if (!activeChild) return Alert.alert(t('common.error'), t('alerts.noChildSelected'));

    // Only the baby's creator (parentUid) can delete the child
    const currentUid = auth.currentUser?.uid;
    if (activeChild.parentUid && activeChild.parentUid !== currentUid) {
      return Alert.alert(t('common.error'), t('settings.onlyCreatorCanDelete'));
    }

    const childName = activeChild.childName;

    Alert.alert(
      `${t('alerts.deleteChild')} ${childName}?`,
      t('alerts.deleteChildWarning'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              t('alerts.areYouSure'),
              `${t('alerts.irreversible')} ${childName}.`,
              [
                { text: t('common.cancel'), style: 'cancel' },
                {
                  text: t('alerts.yesDeleteAll'),
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      const deletedChildId = activeChild.childId;
                      await deleteChild(deletedChildId);

                      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

                      await refreshChildren();

                      const remainingChildren = allChildren.filter(child => child.childId !== deletedChildId);

                      if (remainingChildren.length === 0) {
                        Alert.alert(t('alerts.deleted'), `${childName} ${t('alerts.deletedAddNew')}`, [
                          { text: t('alerts.confirm'), onPress: () => navigation.navigate('CreateBaby') }
                        ]);
                      } else {
                        setActiveChild(remainingChildren[0]);
                        Alert.alert(t('alerts.deleted'), `${childName} ${t('alerts.deletedSwitched')}${remainingChildren[0].childName}`);
                      }
                    } catch (error) {
                      Alert.alert(t('common.error'), t('alerts.couldNotDeleteChild'));
                    }
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

  const handleDeleteAccount = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      t('settings.deleteAccountTitle'),
      t('settings.deleteAccountMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.deleteAccountYes'),
          style: 'destructive',
          onPress: () => {
            // Second confirmation
            Alert.alert(
              t('settings.deleteAccountConfirmTitle'),
              t('settings.deleteAccountConfirmMessage'),
              [
                { text: t('common.cancel'), style: 'cancel' },
                {
                  text: t('settings.deleteAccountButton'),
                  style: 'destructive',
                  onPress: async () => {
                    setLoading(true);
                    try {
                      const user = auth.currentUser;
                      if (!user) {
                        setLoading(false);
                        return;
                      }

                      const userId = user.uid;

                      // --- STORAGE DELETION HELPER ---
                      const deleteStorageObjectByUrl = async (url?: string) => {
                        if (!url || typeof url !== 'string' || !url.startsWith('https://firebasestorage')) return;
                        try {
                          const storageInstance = getStorage();
                          const fileRef = ref(storageInstance, url);
                          await deleteObject(fileRef);
                        } catch (e) {
                          logger.warn('Failed to clean up storage object during account deletion', url);
                        }
                      };

                      // 1. Delete all children (babies) created by this user
                      try {
                        const babiesQuery = query(
                          collection(db, 'babies'),
                          where('parentId', '==', userId)
                        );
                        const babiesSnapshot = await getDocs(babiesQuery);
                        const deleteBabyPromises = babiesSnapshot.docs.map(async (babyDoc) => {
                          const babyId = babyDoc.id;
                          const babyData = babyDoc.data();
                          
                          // Delete baby's avatar from Storage
                          if (babyData.photoUrl) {
                             await deleteStorageObjectByUrl(babyData.photoUrl);
                          }
                          // Delete ALL of the baby's album photos from Storage
                          if (babyData.album && typeof babyData.album === 'object') {
                             const albumUrls = Object.values(babyData.album) as string[];
                             await Promise.all(albumUrls.map(url => deleteStorageObjectByUrl(url)));
                          }

                          // Delete all events for this baby
                          const eventsQuery = query(
                            collection(db, 'events'),
                            where('childId', '==', babyId)
                          );
                          const eventsSnapshot = await getDocs(eventsQuery);
                          const deleteEventPromises = eventsSnapshot.docs.map((eventDoc) =>
                            deleteDoc(doc(db, 'events', eventDoc.id))
                          );
                          await Promise.all(deleteEventPromises);
                          // Delete the baby
                          await deleteDoc(doc(db, 'babies', babyId));
                        });
                        await Promise.all(deleteBabyPromises);
                        logger.log('✅ Deleted all babies and their events');
                      } catch (error) {
                        logger.error('Error deleting babies:', error);
                      }

                      // 2. Delete all events created by this user (fallback for old data)
                      try {
                        const eventsQuery = query(
                          collection(db, 'events'),
                          where('userId', '==', userId)
                        );
                        const eventsSnapshot = await getDocs(eventsQuery);
                        const deleteEventPromises = eventsSnapshot.docs.map((eventDoc) =>
                          deleteDoc(doc(db, 'events', eventDoc.id))
                        );
                        await Promise.all(deleteEventPromises);
                        logger.log('✅ Deleted all user events');
                      } catch (error) {
                        logger.error('Error deleting events:', error);
                      }

                      // 2.5 Delete all dailyLogs (Charts Data) created by this user
                      try {
                        const logsQuery = query(
                          collection(db, 'dailyLogs'),
                          where('parentId', '==', userId)
                        );
                        const logsSnapshot = await getDocs(logsQuery);
                        const deleteLogsPromises = logsSnapshot.docs.map((logDoc) =>
                          deleteDoc(doc(db, 'dailyLogs', logDoc.id))
                        );
                        await Promise.all(deleteLogsPromises);
                        logger.log('✅ Deleted all dailyLogs');
                      } catch (error) {
                        logger.error('Error deleting dailyLogs:', error);
                      }

                      // 3. Remove user from families
                      try {
                        const userDoc = await getDoc(doc(db, 'users', userId));
                        const userData = userDoc.data();
                        if (userData?.familyId) {
                          const familyRef = doc(db, 'families', userData.familyId);
                          const familyDoc = await getDoc(familyRef);
                          if (familyDoc.exists()) {
                            const familyData = familyDoc.data();
                            const currentMembers = Object.keys(familyData?.members || {});

                            if (currentMembers.length <= 1 && currentMembers.includes(userId)) {
                               // Sole member left or owner: scrub the entire orphaned Family logic document
                               await deleteDoc(familyRef);
                            } else {
                               // Others remain: simply sever membership
                               await updateDoc(familyRef, {
                                 [`members.${userId}`]: deleteField()
                               });
                            }
                            await updateDoc(doc(db, 'users', userId), {
                              familyId: deleteField()
                            });
                          }
                        }
                        logger.log('✅ Removed user from families');
                      } catch (error) {
                        logger.error('Error leaving family:', error);
                      }

                      // 4. Delete bookings where user is parent or babysitter
                      try {
                        const parentBookingsQuery = query(
                          collection(db, 'bookings'),
                          where('parentId', '==', userId)
                        );
                        const babysitterBookingsQuery = query(
                          collection(db, 'bookings'),
                          where('babysitterId', '==', userId)
                        );
                        const [parentBookingsSnapshot, babysitterBookingsSnapshot] = await Promise.all([
                          getDocs(parentBookingsQuery),
                          getDocs(babysitterBookingsQuery)
                        ]);
                        const deleteBookingPromises = [
                          ...parentBookingsSnapshot.docs.map((bookingDoc) => deleteDoc(doc(db, 'bookings', bookingDoc.id))),
                          ...babysitterBookingsSnapshot.docs.map((bookingDoc) => deleteDoc(doc(db, 'bookings', bookingDoc.id)))
                        ];
                        await Promise.all(deleteBookingPromises);
                        logger.log('✅ Deleted all bookings');
                      } catch (error) {
                        logger.error('Error deleting bookings:', error);
                      }

                      // 5. Remove user from chats (update participants list)
                      try {
                        const chatsQuery = query(
                          collection(db, 'chats'),
                          where('participants', 'array-contains', userId)
                        );
                        const chatsSnapshot = await getDocs(chatsQuery);
                        const updateChatPromises = chatsSnapshot.docs
                          .filter((chatDoc) => {
                            const data = chatDoc.data();
                            return data.participants && Array.isArray(data.participants) && data.participants.includes(userId);
                          })
                          .map(async (chatDoc) => {
                            try {
                              const chatData = chatDoc.data();
                              const participants = chatData.participants || [];
                              const updatedParticipants = participants.filter((id: string) => id !== userId);

                              // If only one participant left or none, we can't delete due to security rules
                              // Just remove the user from participants
                              if (updatedParticipants.length > 0) {
                                await updateDoc(doc(db, 'chats', chatDoc.id), {
                                  participants: updatedParticipants
                                });
                              }
                            } catch (chatError) {
                              // Ignore individual chat errors and continue
                              logger.warn('Error updating chat:', chatDoc.id, chatError);
                            }
                          });
                        await Promise.all(updateChatPromises);
                        logger.log('✅ Removed user from all chats');
                      } catch (error) {
                        // Continue even if there's an error - user deletion should not fail due to chats
                        logger.error('Error updating chats:', error);
                      }

                      // 6. Delete sitter document if user is a sitter
                      try {
                        const sitterDoc = doc(db, 'sitters', userId);
                        const sitterSnap = await getDoc(sitterDoc);
                        if (sitterSnap.exists()) {
                          const sitterData = sitterSnap.data();
                          if (sitterData.image) await deleteStorageObjectByUrl(sitterData.image);

                          await deleteDoc(sitterDoc);
                          logger.log('✅ Deleted sitter document');
                        }
                      } catch (error) {
                        logger.error('Error deleting sitter document:', error);
                      }

                      // 7. Delete notifications for this user
                      try {
                        const notificationsQuery = query(
                          collection(db, 'notifications'),
                          where('userId', '==', userId)
                        );
                        const notificationsSnapshot = await getDocs(notificationsQuery);
                        const deleteNotificationPromises = notificationsSnapshot.docs.map((notificationDoc) =>
                          deleteDoc(doc(db, 'notifications', notificationDoc.id))
                        );
                        await Promise.all(deleteNotificationPromises);
                        logger.log('✅ Deleted all notifications');
                      } catch (error) {
                        logger.error('Error deleting notifications:', error);
                      }

                      // 8. Delete user document from Firestore + Storage
                      try {
                        const userDoc = await getDoc(doc(db, 'users', userId));
                        if (userDoc.exists() && userDoc.data().photoUrl) {
                           await deleteStorageObjectByUrl(userDoc.data().photoUrl);
                        }
                        await deleteDoc(doc(db, 'users', userId));
                        logger.log('✅ Deleted user document');
                      } catch (error) {
                        logger.error('Error deleting user document:', error);
                      }

                      // 9. Delete user from Firebase Auth (this must be last)
                      try {
                        await deleteUser(user);
                        logger.log('✅ Firebase Auth user deleted');
                      } catch (authErr: any) {
                        if (authErr?.code === 'auth/requires-recent-login') {
                          logger.warn('requires-recent-login — Firestore data already cleaned, signing out');
                        } else {
                          logger.error('Failed to delete Auth user:', authErr);
                        }
                      }

                      // 10. Always sign out — whether deleteUser succeeded or not
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      setLoading(false);
                      try {
                        await clearUserCache();
                        await signOut(auth);
                      } catch (_) {}
                    } catch (e: any) {
                      // Catastrophic failure — sign out anyway to prevent stuck state
                      logger.error('Delete account catastrophic error:', e);
                      setLoading(false);
                      try {
                        await clearUserCache();
                        await signOut(auth);
                      } catch (_) {}
                    }
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

  const currentLang = LANGUAGES.find(l => l.key === selectedLanguage);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      {/* Minimal Header - Apple Style */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>{t('settings.title', { defaultValue: t('settings.title') })}</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.6}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ChevronRight size={22} color={theme.textSecondary} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* התראות ותזכורות - Premium Design */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Bell size={18} color={isDarkMode ? '#E68A00' : '#FF9F1C'} strokeWidth={2} />
            </View>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('settings.notifications')}</Text>
          </View>

          <PremiumNotificationSettings supplements={[
            ...(!meds.hiddenDefaults?.includes('vitaminD') ? [{ id: 'vitaminD', name: t('settings.vitaminD') }] : []),
            ...(!meds.hiddenDefaults?.includes('iron') ? [{ id: 'iron', name: t('settings.ironSupplement') }] : []),
            ...customSupplements.map(s => ({ id: s.id, name: s.name })),
          ]} />
        </View>

        {/* תצוגה והתנהגות */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Moon size={18} color={isDarkMode ? '#7C3AED' : '#8B5CF6'} strokeWidth={2} />
            </View>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('settings.display')}</Text>
          </View>

          <View style={[styles.listContainer, { backgroundColor: theme.card }]}>
            <View style={[styles.listItem, styles.listItemFirst]}>
              <View style={styles.listItemContent}>
                <View style={[styles.listItemIcon, { backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.1)' }]}>
                  <Moon size={18} color="#8B5CF6" strokeWidth={2} />
                </View>
                <View style={styles.listItemTextContainer}>
                  <Text style={[styles.listItemText, { color: theme.textPrimary }]}>{t('settings.nightMode')}</Text>
                </View>
              </View>
              <Switch
                trackColor={{ false: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)', true: '#3B82F6' }}
                thumbColor={isDarkMode ? (isDarkMode ? '#000' : '#999') : '#fff'}
                ios_backgroundColor={isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}
                onValueChange={handleDarkModeToggle}
                value={isDarkMode}
              />
            </View>

            <View style={[styles.listDivider, { backgroundColor: theme.divider }]} />

            <TouchableOpacity
              style={styles.listItem}
              onPress={() => setLanguageModalVisible(true)}
              activeOpacity={0.6}
            >
              <View style={styles.listItemContent}>
                <View style={[styles.listItemIcon, { backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)' }]}>
                  <Globe size={18} color="#10B981" strokeWidth={2} />
                </View>
                <View style={styles.listItemTextContainer}>
                  <Text style={[styles.listItemText, { color: theme.textPrimary }]}>{t('settings.language')}</Text>
                  <Text style={[styles.listItemSubtext, { color: theme.textSecondary }]}>
                    {currentLang ? t(currentLang.labelKey) : ''}
                  </Text>
                </View>
              </View>
              <ChevronLeft size={20} color={theme.textTertiary} strokeWidth={2} />
            </TouchableOpacity>

          </View>
        </View>

        {/* פרטיות ותמיכה */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Shield size={18} color={isDarkMode ? '#059669' : '#10B981'} strokeWidth={2} />
            </View>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('settings.privacy')}</Text>
          </View>

          <View style={[styles.listContainer, { backgroundColor: theme.card }]}>
            <TouchableOpacity
              style={[styles.listItem, styles.listItemFirst]}
              onPress={() => setPrivacyModalVisible(true)}
              activeOpacity={0.6}
            >
              <View style={styles.listItemContent}>
                <View style={[styles.listItemIcon, { backgroundColor: isDarkMode ? 'rgba(100, 116, 139, 0.15)' : 'rgba(100, 116, 139, 0.1)' }]}>
                  <FileText size={18} color="#64748B" strokeWidth={2} />
                </View>
                <Text style={[styles.listItemText, { color: theme.textPrimary }]}>{t('settings.privacyPolicy')}</Text>
              </View>
              <ChevronLeft size={20} color={theme.textTertiary} strokeWidth={2} />
            </TouchableOpacity>

            <View style={[styles.listDivider, { backgroundColor: theme.divider }]} />

            <TouchableOpacity
              style={styles.listItem}
              onPress={() => setTermsModalVisible(true)}
              activeOpacity={0.6}
            >
              <View style={styles.listItemContent}>
                <View style={[styles.listItemIcon, { backgroundColor: isDarkMode ? 'rgba(100, 116, 139, 0.15)' : 'rgba(100, 116, 139, 0.1)' }]}>
                  <FileText size={18} color="#64748B" strokeWidth={2} />
                </View>
                <Text style={[styles.listItemText, { color: theme.textPrimary }]}>{t('settings.termsOfService')}</Text>
              </View>
              <ChevronLeft size={20} color={theme.textTertiary} strokeWidth={2} />
            </TouchableOpacity>

            <View style={[styles.listDivider, { backgroundColor: theme.divider }]} />

            <TouchableOpacity
              style={styles.listItem}
              onPress={() => setContactModalVisible(true)}
              activeOpacity={0.6}
            >
              <View style={styles.listItemContent}>
                <View style={[styles.listItemIcon, { backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)' }]}>
                  <MessageCircle size={18} color="#3B82F6" strokeWidth={2} />
                </View>
                <View style={styles.listItemTextContainer}>
                  <Text style={[styles.listItemText, { color: theme.textPrimary }]}>{t('settings.contact')}</Text>
                  <Text style={[styles.listItemSubtext, { color: theme.textSecondary }]}>{t('settings.contactSubtitle')}</Text>
                </View>
              </View>
              <ChevronLeft size={20} color={theme.textTertiary} strokeWidth={2} />
            </TouchableOpacity>



            <View style={[styles.listDivider, { backgroundColor: theme.divider }]} />

            {/* Instagram Link */}
            <TouchableOpacity
              style={styles.listItem}
              onPress={() => Linking.openURL('https://www.instagram.com/calmino_app?igsh=ZjB3NnNrcXVzZGU2')}
              activeOpacity={0.6}
            >
              <View style={styles.listItemContent}>
                <View style={[styles.listItemIcon, { backgroundColor: 'rgba(225, 48, 108, 0.1)' }]}>
                  <Instagram size={18} color="#E1306C" strokeWidth={2} />
                </View>
                <View style={styles.listItemTextContainer}>
                  <Text style={[styles.listItemText, { color: theme.textPrimary }]}>{t('settings.followInstagram')}</Text>
                  <Text style={[styles.listItemSubtext, { color: theme.textSecondary }]}>{t('settings.joinCommunity')}</Text>
                </View>
              </View>
              <ChevronLeft size={20} color={theme.textTertiary} strokeWidth={2} />
            </TouchableOpacity>

            <View style={[styles.listDivider, { backgroundColor: theme.divider }]} />

            <TouchableOpacity
              style={[styles.listItem, styles.listItemLast]}
              onPress={handleShareApp}
              activeOpacity={0.6}
            >
              <View style={styles.listItemContent}>
                <View style={[styles.listItemIcon, { backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.1)' }]}>
                  <Share2 size={18} color="#8B5CF6" strokeWidth={2} />
                </View>
                <Text style={[styles.listItemText, { color: theme.textPrimary }]}>{t('settings.shareFriends')}</Text>
              </View>
              <ChevronLeft size={20} color={theme.textTertiary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>

        {/* אזור מסוכן */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Trash2 size={18} color={isDarkMode ? '#DC2626' : '#EF4444'} strokeWidth={2} />
            </View>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('settings.dangerZone')}</Text>
          </View>

          <View style={[styles.listContainer, { backgroundColor: theme.card }]}>
            {!isGuest && (
              <>
            <TouchableOpacity
              style={[styles.listItem, styles.listItemFirst]}
              onPress={handleChangePassword}
              activeOpacity={0.6}
            >
              <View style={styles.listItemContent}>
                <View style={[styles.listItemIcon, { backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)' }]}>
                  <Key size={18} color="#3B82F6" strokeWidth={2} />
                </View>
                <View style={styles.listItemTextContainer}>
                  <Text style={[styles.listItemText, { color: theme.textPrimary }]}>{t('settings.changePassword')}</Text>
                  <Text style={[styles.listItemSubtext, { color: theme.textSecondary }]}>{t('settings.changePasswordSubtitle')}</Text>
                </View>
              </View>
              <ChevronLeft size={20} color={theme.textTertiary} strokeWidth={2} />
            </TouchableOpacity>

            <View style={[styles.listDivider, { backgroundColor: theme.divider }]} />

            <TouchableOpacity
              style={styles.listItem}
              onPress={handleDeleteChild}
              activeOpacity={0.6}
            >
              <View style={styles.listItemContent}>
                <View style={[styles.listItemIcon, { backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)' }]}>
                  <Trash2 size={18} color="#EF4444" strokeWidth={2} />
                </View>
                <View style={styles.listItemTextContainer}>
                  <Text style={[styles.listItemText, { color: isDarkMode ? '#FCA5A5' : '#F87171' }]}>{t('settings.deleteCurrentChild')}</Text>
                  <Text style={[styles.listItemSubtext, { color: theme.textSecondary }]}>
                    {activeChild ? t('settings.deleteChildLabel', { name: activeChild.childName }) : t('settings.noChildSelected')}
                  </Text>
                </View>
              </View>
              <ChevronLeft size={20} color={theme.textTertiary} strokeWidth={2} />
            </TouchableOpacity>

            <View style={[styles.listDivider, { backgroundColor: theme.divider }]} />
              </>
            )}

            <TouchableOpacity
              style={isGuest ? [styles.listItem, styles.listItemFirst] : styles.listItem}
              onPress={handleLogout}
              activeOpacity={0.6}
            >
              <View style={styles.listItemContent}>
                <View style={[styles.listItemIcon, { backgroundColor: isGuest
                  ? (isDarkMode ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)')
                  : (isDarkMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)') }]}>
                  <LogOut size={18} color={isGuest ? '#6366F1' : '#EF4444'} strokeWidth={2} />
                </View>
                <Text style={[styles.listItemText, { color: isGuest
                  ? (isDarkMode ? '#818CF8' : '#6366F1')
                  : (isDarkMode ? '#FCA5A5' : '#F87171') }]}>
                  {isGuest ? t('guest.exitGuestMode') : t('settings.logout')}
                </Text>
              </View>
              <ChevronLeft size={20} color={theme.textTertiary} strokeWidth={2} />
            </TouchableOpacity>

            {!isGuest && (
              <>
            <View style={[styles.listDivider, { backgroundColor: theme.divider }]} />

            <TouchableOpacity
              style={[styles.listItem, styles.listItemLast]}
              onPress={handleDeleteAccount}
              activeOpacity={0.6}
            >
              <View style={styles.listItemContent}>
                <View style={[styles.listItemIcon, { backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)' }]}>
                  <Trash2 size={18} color="#EF4444" strokeWidth={2} />
                </View>
                <View style={styles.listItemTextContainer}>
                  <Text style={[styles.listItemText, { color: isDarkMode ? '#FCA5A5' : '#F87171' }]}>{t('account.deleteAccount')}</Text>
                  <Text style={[styles.listItemSubtext, { color: theme.textSecondary }]}>{t('account.deleteAccountWarning')}</Text>
                </View>
              </View>
              <ChevronLeft size={20} color={theme.textTertiary} strokeWidth={2} />
            </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Logo + version + website link */}
        <TouchableOpacity
          style={{ alignItems: 'center', marginTop: 8, marginBottom: 20 }}
          onPress={() => Linking.openURL('https://www.calmino.co.il')}
          activeOpacity={0.7}
        >
          <Image
            source={require('../assets/icon.png')}
            style={{ width: 52, height: 52, borderRadius: 14, marginBottom: 6 }}
            resizeMode="cover"
          />
          <Text style={[styles.version, { color: theme.textSecondary, marginTop: 0, marginBottom: 2 }]}>
            Calmino v{Constants.expoConfig?.version}
          </Text>
          <Text style={{ fontSize: 12, color: theme.primary, fontWeight: '500' }}>www.calmino.co.il</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Language Modal */}
      <Modal visible={isLanguageModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{t('settings.selectLanguage')}</Text>
              <TouchableOpacity
                onPress={() => setLanguageModalVisible(false)}
                style={styles.modalClose}
                activeOpacity={0.6}
              >
                <X size={24} color={theme.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              {LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang.key}
                  style={[
                    styles.languageItem,
                    { backgroundColor: theme.background },
                    selectedLanguage === lang.key && { backgroundColor: theme.primaryLight }
                  ]}
                  onPress={() => handleLanguageSelect(lang.key)}
                  activeOpacity={0.6}
                >
                  <View style={styles.languageContent}>
                    <Text style={[styles.languageLabel, { color: theme.textPrimary }]}>{t(lang.labelKey)}</Text>
                  </View>
                  {selectedLanguage === lang.key && (
                    <Check size={20} color={theme.primary} strokeWidth={2.5} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      <LegalModal
        visible={isPrivacyModalVisible}
        type="privacy"
        onClose={() => setPrivacyModalVisible(false)}
      />

      <LegalModal
        visible={isTermsModalVisible}
        type="terms"
        onClose={() => setTermsModalVisible(false)}
      />

      {/* Contact Modal */}
      <Modal visible={isContactModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setContactModalVisible(false); }}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={[
                  styles.contactSheetContainer,
                  { backgroundColor: theme.card, paddingBottom: insets.bottom + 16 }
                ]}>
                  {/* Handle */}
                  <View style={[styles.contactHandle, { backgroundColor: theme.divider }]} />

                  {messageSent ? (
                    /* ─── Success state ─── */
                    <MotiView
                      from={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ type: 'timing', duration: 300 }}
                      style={styles.successContainer}
                    >
                      {/* Floating envelope */}
                      <MotiView
                        from={{ translateY: 0 }}
                        animate={{ translateY: -10 }}
                        transition={{ type: 'timing', duration: 1000, loop: true, repeatReverse: true }}
                      >
                        <MotiView
                          from={{ scale: 0.4, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: 'spring', damping: 14, stiffness: 120 }}
                          style={[styles.successIconCircle, { backgroundColor: theme.primaryLight }]}
                        >
                          <Mail size={44} color={theme.primary} strokeWidth={1.5} />
                        </MotiView>
                      </MotiView>

                      {/* Checkmark pop */}
                      <MotiView
                        from={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', damping: 12, delay: 300 }}
                        style={[styles.successCheck, { backgroundColor: theme.success }]}
                      >
                        <Check size={14} color="#fff" strokeWidth={3} />
                      </MotiView>

                      <MotiView
                        from={{ opacity: 0, translateY: 10 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 400, delay: 200 }}
                      >
                        <Text style={[styles.successTitle, { color: theme.textPrimary }]}>{t('settings.messageSent')}</Text>
                        <Text style={[styles.successDesc, { color: theme.textSecondary }]}>{t('settings.messageSentDesc')}</Text>
                      </MotiView>
                    </MotiView>
                  ) : (
                    /* ─── Form state ─── */
                    <>
                      {/* Close button */}
                      <TouchableOpacity
                        onPress={() => setContactModalVisible(false)}
                        style={[styles.contactCloseBtn, { backgroundColor: theme.cardSecondary }]}
                        activeOpacity={0.6}
                      >
                        <X size={18} color={theme.textSecondary} strokeWidth={2.5} />
                      </TouchableOpacity>

                      {/* Icon */}
                      <View style={[styles.contactIconCircle, { backgroundColor: theme.primaryLight }]}>
                        <Mail size={28} color={theme.primary} strokeWidth={2} />
                      </View>

                      {/* Title */}
                      <Text style={[styles.contactSheetTitle, { color: theme.textPrimary }]}>
                        {t('settings.contact')}
                      </Text>

                      {/* Subtitle */}
                      <Text style={[styles.contactSheetDesc, { color: theme.textSecondary }]}>
                        {t('settings.contactPrompt')}
                      </Text>

                      {/* Text area */}
                      <View style={[
                        styles.contactInputWrapper,
                        {
                          backgroundColor: theme.background,
                          borderColor: contactMessage.length > 0 ? theme.primary : theme.border,
                        }
                      ]}>
                        <TextInput
                          style={[styles.contactInput, { color: theme.textPrimary }]}
                          value={contactMessage}
                          onChangeText={(text) => text.length <= 500 && setContactMessage(text)}
                          textAlign="right"
                          multiline
                          numberOfLines={5}
                          placeholder={t('settings.contactPlaceholder')}
                          placeholderTextColor={theme.textSecondary}
                          textAlignVertical="top"
                        />
                      </View>

                      {/* Character counter */}
                      <Text style={[
                        styles.contactCharCount,
                        { color: contactMessage.length > 450 ? theme.warning : theme.textTertiary }
                      ]}>
                        {contactMessage.length}/500
                      </Text>

                      {/* Send button */}
                      <TouchableOpacity
                        style={[styles.contactSendBtn, { backgroundColor: theme.primary, opacity: loading ? 0.7 : 1 }]}
                        onPress={handleSendContactMessage}
                        activeOpacity={0.85}
                        disabled={loading}
                      >
                        {loading ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <View style={styles.sendButtonContent}>
                            <Send size={18} color="#fff" strokeWidth={2.5} />
                            <Text style={styles.sendButtonText}>{t('settings.sendMessage')}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  backButton: {
    padding: 4,
  },
  scrollContent: {
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 140,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionIconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  listContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 0,
  },
  listItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    minHeight: 60,
  },
  listItemFirst: {
    paddingTop: 16,
  },
  listItemLast: {
    paddingBottom: 16,
  },
  listDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 20,
    marginRight: 20,
  },
  listItemContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  listItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItemTextContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  listItemText: {
    fontSize: 17,
    fontWeight: '400',
    letterSpacing: -0.41,
  },
  listItemSubtext: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: 2,
    letterSpacing: -0.08,
  },
  version: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '400',
    marginTop: 8,
    marginBottom: 20,
    letterSpacing: -0.08,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  modalClose: {
    padding: 4,
  },
  modalContent: {
    gap: 8,
  },
  languageItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
  },
  languageContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  languageFlag: {
    fontSize: 24,
  },
  languageLabel: {
    fontSize: 17,
    fontWeight: '400',
    letterSpacing: -0.41,
  },
  contactHint: {
    fontSize: 15,
    fontWeight: '400',
    textAlign: 'right',
    marginBottom: 16,
    letterSpacing: -0.24,
  },
  textArea: {
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
    minHeight: 120,
    textAlign: 'right',
  },
  sendButton: {
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 0,
  },
  sendButtonContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.41,
  },
  // ─── Contact Modal (redesigned) ─────────────────────────────────────
  contactSheetContainer: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 48 : 28,
    alignItems: 'center',
  },
  contactHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 20,
  },
  contactCloseBtn: {
    position: 'absolute',
    top: 18,
    left: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  contactSheetTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 6,
    textAlign: 'center',
  },
  contactSheetDesc: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 22,
    letterSpacing: -0.2,
  },
  contactInputWrapper: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    minHeight: 130,
    marginBottom: 8,
  },
  contactInput: {
    fontSize: 16,
    textAlign: 'right',
    minHeight: 100,
    letterSpacing: -0.2,
  },
  contactCharCount: {
    fontSize: 13,
    alignSelf: 'flex-start',
    marginBottom: 20,
    letterSpacing: -0.1,
  },
  contactSendBtn: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 0,
  },
  // ─── Success state ───────────────────────────────────────────────────
  successContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    gap: 12,
  },
  successIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  successDesc: {
    fontSize: 15,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  policyText: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'right',
    paddingBottom: 24,
  },
  policyTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  policySubtitle: {
    fontSize: 16,
    fontWeight: '700',
  },
});
