import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Switch,
  Alert,
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import {
  LogOut,
  Trash2,
  Bell,
  Moon,
  Lock,
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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import { auth, db } from '../services/firebaseConfig';
import { deleteUser, signOut, updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, deleteDoc, deleteField } from 'firebase/firestore';
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

const LANGUAGES = [
  { key: 'he', labelKey: 'settings.hebrew', flag: '🇮🇱' },
  { key: 'en', labelKey: 'settings.english', flag: '🇺🇸' },
];

export default function SettingsScreen() {
  const { isDarkMode, setDarkMode, theme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const navigation = useNavigation<any>();
  const { activeChild, allChildren, setActiveChild, refreshChildren } = useActiveChild();
  const { settings: notifSettings, updateSettings: updateNotifSettings } = useNotifications();

  const [userData, setUserData] = useState({ name: '', email: '', photoURL: null });
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [isLanguageModalVisible, setLanguageModalVisible] = useState(false);
  const [isContactModalVisible, setContactModalVisible] = useState(false);
  const [isPrivacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [isTermsModalVisible, setTermsModalVisible] = useState(false);
  const [contactMessage, setContactMessage] = useState('');

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
          name: data.displayName || user.displayName || 'הורה יקר',
          email: user.email || '',
          photoURL: data.photoURL || user.photoURL || null
        });

        if (data.settings) {
          if (data.settings.biometricsEnabled !== undefined) setBiometricsEnabled(data.settings.biometricsEnabled);
          if (data.settings.language !== undefined) {
            const lang = data.settings.language;
            setSelectedLanguage(lang);
            setLanguage(lang);
          }
        }
      } else {
        setUserData({
          name: user.displayName || 'הורה יקר',
          email: user.email || '',
          photoURL: user.photoURL || null
        });
      }
    } catch (error) {
      if (__DEV__) console.log('Error fetching settings:', error);
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
      if (__DEV__) console.log('Failed to save setting:', key);
    }
  };

  const handleBiometricsToggle = async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (!value) {
      setBiometricsEnabled(false);
      saveSettingToDB('biometricsEnabled', false);
      return;
    }

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert(t('alerts.notAvailable'), t('alerts.biometricNotSupported'));
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('biometric.authenticate'),
        fallbackLabel: t('biometric.usePassword')
      });

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setBiometricsEnabled(true);
        saveSettingToDB('biometricsEnabled', true);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setBiometricsEnabled(false);
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('alerts.authError'));
      setBiometricsEnabled(false);
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
    } catch (error) { }
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
                await sendPasswordResetEmail(auth, userData.email);
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

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(t('alerts.sentSuccessfully') + ' ✅', t('alerts.messageSent'));
        setContactMessage('');
        setContactModalVisible(false);
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('alerts.couldNotSendMessage'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(t('alerts.logoutTitle'), t('alerts.logoutQuestion'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('alerts.yesLogout'), style: 'destructive', onPress: () => signOut(auth) }
    ]);
  };

  const handleDeleteChild = async () => {
    if (!activeChild) return Alert.alert(t('common.error'), t('alerts.noChildSelected'));

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
      'מחיקת חשבון לצמיתות ⚠️',
      'פעולה זו אינה הפיכה ותמחק את כל הנתונים שלך לצמיתות. האם אתה בטוח?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'כן, מחק הכל',
          style: 'destructive',
          onPress: () => {
            // Second confirmation
            Alert.alert(
              'אישור אחרון',
              'לאחר המחיקה לא ניתן יהיה לשחזר את החשבון והנתונים. להמשיך?',
              [
                { text: 'ביטול', style: 'cancel' },
                {
                  text: 'מחק לצמיתות',
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

                      // 1. Delete all children (babies) created by this user
                      try {
                        const babiesQuery = query(
                          collection(db, 'babies'),
                          where('parentId', '==', userId)
                        );
                        const babiesSnapshot = await getDocs(babiesQuery);
                        const deleteBabyPromises = babiesSnapshot.docs.map(async (babyDoc) => {
                          const babyId = babyDoc.id;
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
                        if (__DEV__) console.log('✅ Deleted all babies and their events');
                      } catch (error) {
                        if (__DEV__) console.error('Error deleting babies:', error);
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
                        if (__DEV__) console.log('✅ Deleted all user events');
                      } catch (error) {
                        if (__DEV__) console.error('Error deleting events:', error);
                      }

                      // 3. Remove user from families
                      try {
                        const userDoc = await getDoc(doc(db, 'users', userId));
                        const userData = userDoc.data();
                        if (userData?.familyId) {
                          const familyRef = doc(db, 'families', userData.familyId);
                          const familyDoc = await getDoc(familyRef);
                          if (familyDoc.exists()) {
                            await updateDoc(familyRef, {
                              [`members.${userId}`]: deleteField()
                            });
                            await updateDoc(doc(db, 'users', userId), {
                              familyId: deleteField()
                            });
                          }
                        }
                        if (__DEV__) console.log('✅ Removed user from families');
                      } catch (error) {
                        if (__DEV__) console.error('Error leaving family:', error);
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
                        if (__DEV__) console.log('✅ Deleted all bookings');
                      } catch (error) {
                        if (__DEV__) console.error('Error deleting bookings:', error);
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
                              if (__DEV__) console.warn('Error updating chat:', chatDoc.id, chatError);
                            }
                          });
                        await Promise.all(updateChatPromises);
                        if (__DEV__) console.log('✅ Removed user from all chats');
                      } catch (error) {
                        // Continue even if there's an error - user deletion should not fail due to chats
                        if (__DEV__) console.error('Error updating chats:', error);
                      }

                      // 6. Delete sitter document if user is a sitter
                      try {
                        const sitterDoc = doc(db, 'sitters', userId);
                        const sitterSnap = await getDoc(sitterDoc);
                        if (sitterSnap.exists()) {
                          await deleteDoc(sitterDoc);
                          if (__DEV__) console.log('✅ Deleted sitter document');
                        }
                      } catch (error) {
                        if (__DEV__) console.error('Error deleting sitter document:', error);
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
                        if (__DEV__) console.log('✅ Deleted all notifications');
                      } catch (error) {
                        if (__DEV__) console.error('Error deleting notifications:', error);
                      }

                      // 8. Delete user document from Firestore
                      try {
                        await deleteDoc(doc(db, 'users', userId));
                        if (__DEV__) console.log('✅ Deleted user document');
                      } catch (error) {
                        if (__DEV__) console.error('Error deleting user document:', error);
                      }

                      // 9. Delete user from Firebase Auth (this must be last)
                      await deleteUser(user);

                      // User is automatically signed out after deletion
                      try {
                        await signOut(auth);
                      } catch (e) {
                        // Ignore - user already deleted
                      }

                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      // No alert needed - navigation will handle redirect to login
                    } catch (e: any) {
                      setLoading(false);
                      if (e?.code === 'auth/requires-recent-login') {
                        Alert.alert(
                          t('account.reauthRequired'),
                          t('account.reauthRequiredMessage'),
                          [
                            { text: t('common.cancel'), style: 'cancel' },
                            {
                              text: t('account.logoutNow'),
                              style: 'destructive',
                              onPress: () => signOut(auth)
                            }
                          ]
                        );
                      } else {
                        console.error('Delete account error:', e);
                        Alert.alert(t('common.error'), t('alerts.deleteAccountError'));
                      }
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
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>הגדרות</Text>
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
            <View style={[styles.sectionIconContainer, { backgroundColor: '#FFF4E6' }]}>
              <Bell size={18} color="#FF9500" strokeWidth={2} />
            </View>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('settings.notifications')}</Text>
          </View>

          <PremiumNotificationSettings />
        </View>

        {/* תצוגה והתנהגות */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconContainer, { backgroundColor: '#EDE9FE' }]}>
              <Moon size={18} color="#8B5CF6" strokeWidth={2} />
            </View>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('settings.display')}</Text>
          </View>

          <View style={[styles.listContainer, { backgroundColor: theme.card }]}>
            <View style={[styles.listItem, styles.listItemFirst]}>
              <View style={styles.listItemContent}>
                <View style={[styles.listItemIcon, { backgroundColor: '#EDE9FE' }]}>
                  <Moon size={18} color="#8B5CF6" strokeWidth={2} />
                </View>
                <View style={styles.listItemTextContainer}>
                  <Text style={[styles.listItemText, { color: theme.textPrimary }]}>{t('settings.nightMode')}</Text>
                </View>
              </View>
              <Switch
                trackColor={{ false: theme.divider, true: theme.primary }}
                thumbColor="#fff"
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
                <View style={[styles.listItemIcon, { backgroundColor: '#D1FAE5' }]}>
                  <Globe size={18} color="#10B981" strokeWidth={2} />
                </View>
                <View style={styles.listItemTextContainer}>
                  <Text style={[styles.listItemText, { color: theme.textPrimary }]}>שפה</Text>
                  <Text style={[styles.listItemSubtext, { color: theme.textSecondary }]}>
                    {currentLang?.flag} {currentLang ? t(currentLang.labelKey) : ''}
                  </Text>
                </View>
              </View>
              <ChevronLeft size={20} color={theme.textTertiary} strokeWidth={2} />
            </TouchableOpacity>

            <View style={[styles.listDivider, { backgroundColor: theme.divider }]} />

            <View style={[styles.listItem, styles.listItemLast]}>
              <View style={styles.listItemContent}>
                <View style={[styles.listItemIcon, { backgroundColor: '#D1FAE5' }]}>
                  <Lock size={18} color="#10B981" strokeWidth={2} />
                </View>
                <View style={styles.listItemTextContainer}>
                  <Text style={[styles.listItemText, { color: theme.textPrimary }]}>{t('settings.biometric')}</Text>
                  <Text style={[styles.listItemSubtext, { color: theme.textSecondary }]}>Face ID / Touch ID</Text>
                </View>
              </View>
              <Switch
                trackColor={{ false: theme.divider, true: '#10B981' }}
                thumbColor="#fff"
                onValueChange={handleBiometricsToggle}
                value={biometricsEnabled}
              />
            </View>
          </View>
        </View>

        {/* פרטיות ותמיכה */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconContainer, { backgroundColor: '#D1FAE5' }]}>
              <Shield size={18} color="#10B981" strokeWidth={2} />
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
                <View style={[styles.listItemIcon, { backgroundColor: theme.divider }]}>
                  <FileText size={18} color={theme.textSecondary} strokeWidth={2} />
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
                <View style={[styles.listItemIcon, { backgroundColor: theme.divider }]}>
                  <FileText size={18} color={theme.textSecondary} strokeWidth={2} />
                </View>
                <Text style={[styles.listItemText, { color: theme.textPrimary }]}>{t('settings.termsOfService')}</Text>
              </View>
              <ChevronLeft size={20} color={theme.textTertiary} strokeWidth={2} />
            </TouchableOpacity>

            <View style={[styles.listDivider, { backgroundColor: theme.divider }]} />

            <TouchableOpacity
              style={styles.listItem}
              onPress={() => Linking.openURL('mailto:Calmperent@Gmail.com?subject=פנייה מאפליקציית CalmParent')}
              activeOpacity={0.6}
            >
              <View style={styles.listItemContent}>
                <View style={[styles.listItemIcon, { backgroundColor: '#E0F2FE' }]}>
                  <MessageCircle size={18} color="#0EA5E9" strokeWidth={2} />
                </View>
                <View style={styles.listItemTextContainer}>
                  <Text style={[styles.listItemText, { color: theme.textPrimary }]}>{t('settings.contact')}</Text>
                  <Text style={[styles.listItemSubtext, { color: theme.textSecondary }]}>{t('settings.contactSubtitle')}</Text>
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
                <View style={[styles.listItemIcon, { backgroundColor: '#F3E8FF' }]}>
                  <Share2 size={18} color="#A78BFA" strokeWidth={2} />
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
            <View style={[styles.sectionIconContainer, { backgroundColor: '#FEE2E2' }]}>
              <Trash2 size={18} color="#EF4444" strokeWidth={2} />
            </View>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('settings.dangerZone')}</Text>
          </View>

          <View style={[styles.listContainer, { backgroundColor: theme.card }]}>
            <TouchableOpacity
              style={[styles.listItem, styles.listItemFirst]}
              onPress={handleChangePassword}
              activeOpacity={0.6}
            >
              <View style={styles.listItemContent}>
                <View style={[styles.listItemIcon, { backgroundColor: '#DBEAFE' }]}>
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
                <View style={[styles.listItemIcon, { backgroundColor: '#FEE2E2' }]}>
                  <Trash2 size={18} color="#EF4444" strokeWidth={2} />
                </View>
                <View style={styles.listItemTextContainer}>
                  <Text style={[styles.listItemText, { color: '#EF4444' }]}>{t('settings.deleteCurrentChild')}</Text>
                  <Text style={[styles.listItemSubtext, { color: theme.textSecondary }]}>
                    {activeChild ? `מחק את ${activeChild.childName}` : 'אין ילד נבחר'}
                  </Text>
                </View>
              </View>
              <ChevronLeft size={20} color={theme.textTertiary} strokeWidth={2} />
            </TouchableOpacity>

            <View style={[styles.listDivider, { backgroundColor: theme.divider }]} />

            <TouchableOpacity
              style={styles.listItem}
              onPress={handleLogout}
              activeOpacity={0.6}
            >
              <View style={styles.listItemContent}>
                <View style={[styles.listItemIcon, { backgroundColor: '#FEE2E2' }]}>
                  <LogOut size={18} color="#EF4444" strokeWidth={2} />
                </View>
                <Text style={[styles.listItemText, { color: '#EF4444' }]}>{t('settings.logout')}</Text>
              </View>
              <ChevronLeft size={20} color={theme.textTertiary} strokeWidth={2} />
            </TouchableOpacity>

            <View style={[styles.listDivider, { backgroundColor: theme.divider }]} />

            <TouchableOpacity
              style={[styles.listItem, styles.listItemLast]}
              onPress={handleDeleteAccount}
              activeOpacity={0.6}
            >
              <View style={styles.listItemContent}>
                <View style={[styles.listItemIcon, { backgroundColor: '#FEE2E2' }]}>
                  <Trash2 size={18} color="#EF4444" strokeWidth={2} />
                </View>
                <View style={styles.listItemTextContainer}>
                  <Text style={[styles.listItemText, { color: '#EF4444' }]}>{t('account.deleteAccount')}</Text>
                  <Text style={[styles.listItemSubtext, { color: theme.textSecondary }]}>{t('account.deleteAccountWarning')}</Text>
                </View>
              </View>
              <ChevronLeft size={20} color={theme.textTertiary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Version */}
        <Text style={[styles.version, { color: theme.textSecondary }]}>CalmParent v1.0.4</Text>
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
                    <Text style={styles.languageFlag}>{lang.flag}</Text>
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

      {/* Privacy Policy Modal */}
      <Modal visible={isPrivacyModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.card, maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>מדיניות פרטיות</Text>
              <TouchableOpacity
                onPress={() => setPrivacyModalVisible(false)}
                style={styles.modalClose}
                activeOpacity={0.6}
              >
                <X size={24} color={theme.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <Text style={[styles.policyText, { color: theme.textPrimary }]}>
                <Text style={styles.policyTitle}>עודכן לאחרונה: 20 בינואר 2026{'\n\n'}</Text>

                <Text style={styles.policySubtitle}>{t('privacy.intro')}{'\n'}</Text>
                ברוכים הבאים לאפליקציית CalmParent. אנו מחויבים להגן על פרטיותכם ולשמור על המידע האישי שלכם בצורה מאובטחת. מדיניות פרטיות זו מסבירה כיצד אנו אוספים, משתמשים ומגנים על המידע שלכם.{'\n\n'}

                <Text style={styles.policySubtitle}>{t('privacy.collection')}{'\n'}</Text>
                אנו אוספים את המידע הבא:{'\n'}
                • פרטי חשבון: שם, כתובת אימייל, תמונת פרופיל{'\n'}
                • נתוני ילדים: שם, תאריך לידה, מגדר{'\n'}
                • נתוני מעקב: זמני שינה, האכלה, החתלה ותרופות{'\n'}
                • נתונים טכניים: סוג מכשיר, גרסת מערכת הפעלה{'\n\n'}

                <Text style={styles.policySubtitle}>{t('privacy.usage')}{'\n'}</Text>
                המידע שלכם משמש אותנו ל:{'\n'}
                • מתן שירותי האפליקציה והתאמה אישית{'\n'}
                • שליחת תזכורות והתראות{'\n'}
                • שיפור חוויית המשתמש{'\n'}
                • תמיכה טכנית{'\n\n'}

                <Text style={styles.policySubtitle}>{t('privacy.security')}{'\n'}</Text>
                אנו משתמשים בטכנולוגיות אבטחה מתקדמות כולל הצפנת נתונים, אחסון מאובטח בענן (Firebase), וגיבוי אוטומטי. המידע שלכם מאוחסן בשרתים מאובטחים וזמין רק לכם ולמי שתבחרו לשתף עמו.{'\n\n'}

                <Text style={styles.policySubtitle}>{t('privacy.sharing')}{'\n'}</Text>
                אנו לא מוכרים או משתפים את המידע האישי שלכם עם צדדים שלישיים למטרות שיווק. המידע עשוי להיות משותף רק עם בני משפחה שהוזמנו על ידכם לאפליקציה. אנו משתמשים בשירותי ענן (Firebase/Google) לאחסון הנתונים, אשר כפופים למדיניות הפרטיות שלהם.{'\n\n'}

                <Text style={styles.policySubtitle}>7. זכויות המשתמש{'\n'}</Text>
                יש לכם זכות:{'\n'}
                • לגשת למידע האישי שלכם{'\n'}
                • לבקש תיקון או עדכון של מידע לא מדויק{'\n'}
                • לבקש מחיקה של המידע האישי שלכם{'\n'}
                • לבקש העתק של המידע שלכם{'\n'}
                • להתנגד לעיבוד המידע שלכם{'\n'}
                • לבטל את הסכמתכם בכל עת{'\n\n'}

                <Text style={styles.policySubtitle}>8. שמירת נתונים{'\n'}</Text>
                אנו שומרים את המידע שלכם כל עוד החשבון פעיל. לאחר מחיקת החשבון, המידע יימחק תוך 30 יום, למעט מידע שנדרש לשמירה על פי דין.{'\n\n'}

                <Text style={styles.policySubtitle}>9. קטינים{'\n'}</Text>
                האפליקציה מיועדת להורים ומטפלים. אנו לא אוספים מידע ישירות מקטינים. כל המידע על ילדים נאסף על ידי הורים או מטפלים מורשים בלבד.{'\n\n'}

                <Text style={styles.policySubtitle}>10. שימוש בנתונים אנונימיים{'\n'}</Text>
                אנו רשאים להשתמש בנתונים אנונימיים ומוסווים (ללא זיהוי אישי) למטרות סטטיסטיקה, מחקר ושיפור השירות.{'\n\n'}

                <Text style={styles.policySubtitle}>11. העברת נתונים{'\n'}</Text>
                הנתונים מאוחסנים בשרתי Google Cloud/Firebase אשר עשויים להיות ממוקמים מחוץ לישראל. אנו נוקטים באמצעים מתאימים להבטיח הגנה על המידע בהתאם לתקנות הגנת הפרטיות.{'\n\n'}

                <Text style={styles.policySubtitle}>{t('privacy.contact')}{'\n'}</Text>
                לשאלות, בקשות או תלונות בנוגע למדיניות הפרטיות או למימוש זכויותיכם, אנא פנו אלינו בכתובת: Calmperent@Gmail.com{'\n\n'}

                <Text style={styles.policySubtitle}>12. שינויים במדיניות{'\n'}</Text>
                אנו שומרים לעצמנו את הזכות לעדכן מדיניות זו מעת לעת. שינויים משמעותיים יפורסמו באפליקציה. המשך השימוש באפליקציה לאחר שינוי מהווה הסכמה למדיניות המעודכנת.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Terms of Service Modal */}
      <Modal visible={isTermsModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.card, maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{t('settings.termsOfService')}</Text>
              <TouchableOpacity
                onPress={() => setTermsModalVisible(false)}
                style={styles.modalClose}
                activeOpacity={0.6}
              >
                <X size={24} color={theme.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <Text style={[styles.policyText, { color: theme.textPrimary }]}>
                <Text style={styles.policyTitle}>עודכן לאחרונה: 20 בינואר 2026{'\n\n'}</Text>

                <Text style={styles.policySubtitle}>{t('terms.agreement')}{'\n'}</Text>
                בשימוש באפליקציית CalmParent, הנכם מסכימים לתנאי שימוש אלה. אם אינכם מסכימים לתנאים, אנא הימנעו משימוש באפליקציה.{'\n\n'}

                <Text style={styles.policySubtitle}>{t('terms.serviceDescription')}{'\n'}</Text>
                CalmParent היא אפליקציה למעקב אחר פעילויות תינוקות וילדים. האפליקציה מאפשרת רישום שינה, האכלה, החתלה, תרופות ושיתוף מידע עם בני משפחה.{'\n\n'}

                <Text style={styles.policySubtitle}>{t('terms.userAccount')}{'\n'}</Text>
                • הנכם אחראים לשמירה על סודיות פרטי החשבון{'\n'}
                • יש לספק מידע מדויק ועדכני{'\n'}
                • אתם האחראים הבלעדיים לכל הפעילות בחשבונכם{'\n\n'}

                <Text style={styles.policySubtitle}>{t('terms.allowedUse')}{'\n'}</Text>
                האפליקציה מיועדת לשימוש אישי ומשפחתי בלבד. אסור להשתמש באפליקציה לכל מטרה בלתי חוקית או לא מורשית.{'\n\n'}

                <Text style={styles.policySubtitle}>{t('terms.liability')}{'\n'}</Text>
                האפליקציה מסופקת "כמות שהיא" (AS IS) וללא כל אחריות מפורשת או משתמעת. אנו לא נושאים באחריות לכל נזק ישיר, עקיף, מקרי, מיוחד או תוצאתי הנובע משימוש או אי יכולת להשתמש באפליקציה, כולל אך לא רק: אובדן נתונים, אובדן רווחים, הפרעה לעסקים או נזק אחר. האפליקציה אינה מהווה תחליף לייעוץ רפואי, אבחון או טיפול מקצועי. יש להתייעץ תמיד עם רופא או איש מקצוע רפואי מוסמך לפני קבלת החלטות רפואיות.{'\n\n'}

                <Text style={styles.policySubtitle}>6. שירותים של צד שלישי{'\n'}</Text>
                האפליקציה משתמשת בשירותים של צדדים שלישיים (כגון Firebase, Google Cloud) לאחסון ועיבוד נתונים. אנו לא נושאים באחריות לזמינות, ביצועים או אבטחה של שירותים אלה. השימוש בשירותים אלה כפוף לתנאי השימוש ומדיניות הפרטיות שלהם.{'\n\n'}

                <Text style={styles.policySubtitle}>{t('terms.intellectualProperty')}{'\n'}</Text>
                כל הזכויות באפליקציה, כולל אך לא רק: עיצוב, קוד, לוגו, סימני מסחר, תמונות ותוכן, שייכות ל-CalmParent או לבעליהם החוקיים. אין לשכפל, להפיץ, לשנות, ליצור יצירות נגזרות, להציג בפומבי או להשתמש מסחרית בתוכן ללא אישור מפורש בכתב מאתנו. כל הפרה של זכויות יוצרים או קניין רוחני תוביל לפעולה משפטית.{'\n\n'}

                <Text style={styles.policySubtitle}>7. תוכן המשתמש{'\n'}</Text>
                אתם אחראים לכל התוכן שאתם מעלים לאפליקציה (תמונות, הערות, נתונים). אתם מתחייבים שהתוכן אינו מפר זכויות של צדדים שלישיים, אינו בלתי חוקי, פוגעני או מפר כל חוק או תקנה. אנו שומרים לעצמנו את הזכות להסיר תוכן מפר או לא הולם ללא התראה מוקדמת.{'\n\n'}

                <Text style={styles.policySubtitle}>8. ביטול והשעיה{'\n'}</Text>
                אנו שומרים לעצמנו את הזכות לבטל, להשעות או להגביל את הגישה לחשבון שלכם בכל עת, ללא התראה מוקדמת, אם נדע או נחשוד שהפרתם תנאים אלה, או מסיבות אחרות לפי שיקול דעתנו הבלעדי. ביטול החשבון יוביל למחיקת כל הנתונים הקשורים לחשבון.{'\n\n'}

                <Text style={styles.policySubtitle}>9. שינויים בשירות{'\n'}</Text>
                אנו שומרים לעצמנו את הזכות לשנות, להפסיק או להשהות את השירות או חלקים ממנו בכל עת, ללא התראה מוקדמת. אנו לא נהיה אחראים כלפיכם או כלפי צד שלישי כלשהו על כל שינוי, השעיה או הפסקה של השירות.{'\n\n'}

                <Text style={styles.policySubtitle}>10. פיצוי{'\n'}</Text>
                אתם מסכימים לפצות ולהגן על CalmParent, עובדיה, מנהליה ושותפיה מפני כל תביעה, נזק, אחריות, הוצאה או אובדן (כולל שכר טרחה משפטי) הנובעים משימוש שלכם באפליקציה, הפרת תנאים אלה, או הפרת זכויות של צד שלישי.{'\n\n'}

                <Text style={styles.policySubtitle}>11. חוק ישראלי ובוררות{'\n'}</Text>
                תנאים אלה כפופים לחוקי מדינת ישראל. כל סכסוך הנובע מתנאים אלה או קשור אליהם ייפתר בבית המשפט המוסמך בתל אביב-יפו בלבד. במקרה של סכסוך, הצדדים יפעלו תחילה לפתרון בדרכי שלום באמצעות מגעים ישירים.{'\n\n'}

                <Text style={styles.policySubtitle}>12. היפרדות{'\n'}</Text>
                אם סעיף כלשהו בתנאים אלה יימצא כבלתי תקף או לא ניתן לאכיפה, הסעיף ייפרד מתנאים אלה והשאר יישארו בתוקף מלא.{'\n\n'}

                <Text style={styles.policySubtitle}>{t('terms.changes')}{'\n'}</Text>
                אנו שומרים לעצמנו את הזכות לעדכן תנאים אלה בכל עת. שינויים משמעותיים יפורסמו באפליקציה. שימוש מתמשך באפליקציה לאחר עדכון מהווה הסכמה לתנאים המעודכנים. אם אינכם מסכימים לתנאים המעודכנים, עליכם להפסיק את השימוש באפליקציה ולמחוק את החשבון.{'\n\n'}

                <Text style={styles.policySubtitle}>{t('terms.contact')}{'\n'}</Text>
                לשאלות, תלונות או בקשות בנוגע לתנאי השימוש, אנא פנו אלינו בכתובת: Calmperent@Gmail.com
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Contact Modal */}
      <Modal visible={isContactModalVisible} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setContactModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={[styles.modalContainer, { backgroundColor: theme.card }]}
              >
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{t('settings.contact')}</Text>
                  <TouchableOpacity
                    onPress={() => setContactModalVisible(false)}
                    style={styles.modalClose}
                    activeOpacity={0.6}
                  >
                    <X size={24} color={theme.textSecondary} strokeWidth={2} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.contactHint, { color: theme.textSecondary }]}>
                  יש לך שאלה או הצעה? נשמח לשמוע ממך!
                </Text>

                <TextInput
                  style={[styles.textArea, { backgroundColor: theme.background, color: theme.textPrimary }]}
                  value={contactMessage}
                  onChangeText={setContactMessage}
                  textAlign="right"
                  multiline
                  numberOfLines={5}
                  placeholder="כתוב את ההודעה שלך..."
                  placeholderTextColor={theme.textSecondary}
                  textAlignVertical="top"
                />

                <TouchableOpacity
                  style={[styles.sendButton, { backgroundColor: theme.primary }]}
                  onPress={handleSendContactMessage}
                  activeOpacity={0.9}
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
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
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
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.37,
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: -0.24,
  },
  backButton: {
    padding: 4,
  },
  scrollContent: {
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.35,
  },
  listContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  listItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    minHeight: 56,
  },
  listItemFirst: {
    paddingTop: 18,
  },
  listItemLast: {
    paddingBottom: 18,
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
    width: 32,
    height: 32,
    borderRadius: 8,
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
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.36,
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
    borderRadius: 16,
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
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
    minHeight: 120,
    textAlign: 'right',
  },
  sendButton: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
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
