import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Linking, Platform, Alert, Animated } from 'react-native';
import { X, Phone, Siren, Shield, Skull, AlertTriangle } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';

interface CalmModeModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function CalmModeModal({ visible, onClose }: CalmModeModalProps) {
  const { theme, isDarkMode } = useTheme();

  // Animations
  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 180,
          mass: 0.8,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(400);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  const makeCall = async (phoneNumber: string, name: string) => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }

    const url = Platform.OS === 'android' ? `tel:${phoneNumber}` : `telprompt:${phoneNumber}`;
    const supported = await Linking.canOpenURL(url);

    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert(
        "סימולטור זוהה",
        `במכשיר אמיתי השיחה הייתה יוצאת ל${name}: ${phoneNumber}`,
        [{ text: "הבנתי" }]
      );
    }
  };

  const emergencyContacts = [
    { name: 'מד"א', subtitle: 'חירום רפואי', number: '101', Icon: Siren, color: '#EF4444', bgColor: '#FEE2E2' },
    { name: 'משטרה', subtitle: 'סכנה מיידית', number: '100', Icon: Shield, color: '#3B82F6', bgColor: '#DBEAFE' },
    { name: 'הרעלות', subtitle: 'בליעת חומר', number: '048541900', Icon: Skull, color: '#8B5CF6', bgColor: '#EDE9FE' },
  ];

  const hmoContacts = [
    { name: 'כללית', subtitle: 'מוקד אחיות 24/7', number: '*2700' },
    { name: 'מכבי', subtitle: 'מוקד אחיות', number: '*3555' },
    { name: 'מאוחדת', subtitle: 'היריון ולידה', number: '*3833' },
    { name: 'לאומית', subtitle: 'מוקד רפואי', number: '*507' },
  ];

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ translateY: slideAnim }],
              opacity: fadeAnim,
              backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF',
            }
          ]}
        >
          {/* Drag Handle */}
          <View style={styles.dragHandle}>
            <View style={[
              styles.dragHandleBar,
              { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)' }
            ]} />
          </View>

          {/* Glass Header */}
          <View style={styles.header}>
            {Platform.OS === 'ios' && (
              <BlurView
                intensity={60}
                tint={isDarkMode ? 'dark' : 'light'}
                style={StyleSheet.absoluteFill}
              />
            )}
            <View style={[
              styles.headerContent,
              { backgroundColor: isDarkMode ? 'rgba(28,28,30,0.85)' : 'rgba(255,255,255,0.85)' }
            ]}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={20} color={theme.textSecondary} strokeWidth={2} />
              </TouchableOpacity>

              <View style={styles.titleContainer}>
                <View style={styles.titleIcon}>
                  <AlertTriangle size={18} color="#EF4444" strokeWidth={2} />
                </View>
                <Text style={[styles.mainTitle, { color: theme.textPrimary }]}>מצב חירום</Text>
              </View>

              <View style={{ width: 36 }} />
            </View>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Emergency - Premium Row */}
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>חירום מיידי</Text>
            <View style={styles.emergencyRow}>
              {emergencyContacts.map((contact, index) => {
                const { Icon } = contact;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.emergencyCard,
                      { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#F9FAFB' }
                    ]}
                    onPress={() => makeCall(contact.number, contact.name)}
                    activeOpacity={0.7}
                  >
                    {/* Icon with color */}
                    <View style={[styles.emergencyIcon, { backgroundColor: contact.bgColor }]}>
                      <Icon size={22} color={contact.color} strokeWidth={2} />
                    </View>
                    <Text style={[styles.emergencyName, { color: theme.textPrimary }]}>
                      {contact.name}
                    </Text>
                    <Text style={[styles.emergencyNumber, { color: contact.color }]}>
                      {contact.number}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* HMO - Clean List */}
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>קופות חולים</Text>
            <View style={[
              styles.hmoContainer,
              { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : '#F9FAFB' }
            ]}>
              {hmoContacts.map((hmo, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.hmoRow,
                    index < hmoContacts.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#E5E7EB',
                    }
                  ]}
                  onPress={() => makeCall(hmo.number, hmo.name)}
                  activeOpacity={0.7}
                >
                  <View style={styles.hmoInfo}>
                    <Text style={[styles.hmoName, { color: theme.textPrimary }]}>{hmo.name}</Text>
                    <Text style={[styles.hmoSubtitle, { color: theme.textSecondary }]}>{hmo.subtitle}</Text>
                  </View>
                  <View style={styles.hmoCall}>
                    <View style={[
                      styles.phoneIcon,
                      { backgroundColor: isDarkMode ? 'rgba(59,130,246,0.2)' : '#DBEAFE' }
                    ]}>
                      <Phone size={14} color="#3B82F6" strokeWidth={2} />
                    </View>
                    <Text style={[styles.hmoNumber, { color: theme.textSecondary }]}>{hmo.number}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    minHeight: '60%',
    // Premium shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
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
  },

  // Glass Header
  header: {
    marginHorizontal: -24,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  headerContent: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },

  // Content
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 50,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 14,
    textAlign: 'right',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Emergency Row - Premium
  emergencyRow: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginBottom: 32,
  },
  emergencyCard: {
    flex: 1,
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
  },
  emergencyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emergencyName: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  emergencyNumber: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
  },

  // HMO List - Premium
  hmoContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  hmoRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  hmoInfo: {
    alignItems: 'flex-end',
  },
  hmoName: {
    fontSize: 15,
    fontWeight: '600',
  },
  hmoSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  hmoCall: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  phoneIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hmoNumber: {
    fontSize: 14,
    fontWeight: '600',
  },
});