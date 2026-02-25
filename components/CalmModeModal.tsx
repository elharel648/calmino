import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Linking, Platform, Alert, Animated as RNAnimated, PanResponder, Dimensions } from 'react-native';
import { Phone, Siren, Shield, Skull, AlertTriangle } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, withRepeat, withSequence } from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import ScrollFadeWrapper from './Common/ScrollFadeWrapper';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const RNAnimatedView = RNAnimated.createAnimatedComponent(View);

interface CalmModeModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function CalmModeModal({ visible, onClose }: CalmModeModalProps) {
  const { theme, isDarkMode } = useTheme();

  // Animations
  const slideAnim = useRef(new RNAnimated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new RNAnimated.Value(0)).current;
  const backdropAnim = useRef(new RNAnimated.Value(0)).current;

  // Premium animation
  const iconScaleAnim = useSharedValue(1);

  // Track if we're dragging and scroll position
  const isDragging = useRef(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollOffsetY = useRef(0);
  const dragStartY = useRef(0);

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(SCREEN_HEIGHT);
      fadeAnim.setValue(0);
      backdropAnim.setValue(0);
      RNAnimated.parallel([
        RNAnimated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        RNAnimated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        RNAnimated.timing(backdropAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      // Start premium breathing animation for icon
      iconScaleAnim.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 1500 }),
          withTiming(1, { duration: 1500 })
        ),
        -1,
        true
      );
    } else {
      slideAnim.setValue(SCREEN_HEIGHT);
      fadeAnim.setValue(0);
      backdropAnim.setValue(0);
      iconScaleAnim.value = 1;
    }
  }, [visible]);

  // Swipe down to dismiss - exact premium equivalent
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
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
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        RNAnimated.parallel([
          RNAnimated.timing(slideAnim, {
            toValue: SCREEN_HEIGHT,
            duration: 250,
            useNativeDriver: true,
          }),
          RNAnimated.timing(backdropAnim, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onClose();
        });
      } else {
        RNAnimated.parallel([
          RNAnimated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }),
          RNAnimated.spring(backdropAnim, {
            toValue: 1,
            useNativeDriver: true,
          }),
        ]).start();
      }
    },
  }), [slideAnim, backdropAnim, onClose]);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScaleAnim.value }]
  }));

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
    <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
      <View style={styles.modalWrapper}>
        <TouchableOpacity activeOpacity={1} onPress={onClose} style={StyleSheet.absoluteFill}>
          <RNAnimatedView style={[styles.overlay, { opacity: backdropAnim }]} />
        </TouchableOpacity>
        <RNAnimatedView
          style={[
            styles.container,
            {
              transform: [{ translateY: slideAnim }],
              opacity: fadeAnim,
              backgroundColor: theme.card,
              zIndex: 1000,
            }
          ]}
        >
          {/* Drag Handle */}
          <View style={styles.dragHandle} {...panResponder.panHandlers}>
            <View style={[
              styles.dragHandleBar,
              { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)' }
            ]} />
          </View>

          {/* Premium Header - Centered Icon with Title Below */}
          <View style={styles.header} {...panResponder.panHandlers}>
            {Platform.OS === 'ios' && (
              <BlurView
                intensity={30}
                tint={isDarkMode ? 'dark' : 'light'}
                style={StyleSheet.absoluteFill}
              />
            )}
            <View style={[
              styles.headerContent,
              { backgroundColor: theme.card }
            ]}>
              <Animated.View style={[styles.titleIcon, iconAnimatedStyle]}>
                <LinearGradient
                  colors={['#EF4444', '#FCA5A5']}
                  style={styles.iconGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <AlertTriangle size={32} color="#fff" strokeWidth={2.5} />
                </LinearGradient>
              </Animated.View>
              <Text style={[styles.mainTitle, { color: theme.textPrimary }]}>מצב חירום</Text>
            </View>
          </View>

          {/* Content */}
          <ScrollFadeWrapper fadeHeight={80}>
            <ScrollView
              ref={scrollViewRef}
              style={styles.content}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              onScroll={(e) => {
                scrollOffsetY.current = e.nativeEvent.contentOffset.y;
              }}
              scrollEventThrottle={16}
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
                        {
                          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
                          borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                        }
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
                      <Text
                        style={[styles.emergencyNumber, { color: contact.color }]}
                        numberOfLines={1}
                        adjustsFontSizeToFit={true}
                        minimumFontScale={0.8}
                      >
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
                {
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                }
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
          </ScrollFadeWrapper>
        </RNAnimatedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    zIndex: 999,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 998,
  },
  container: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    minHeight: '85%',
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

  // Glass Header - Centered
  header: {
    marginHorizontal: -24,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  headerContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 12,
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
    alignItems: 'center',
    gap: 12,
  },
  titleIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  iconGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  // Content
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 150,
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
    minHeight: 140,
    justifyContent: 'flex-start',
    borderWidth: 1,
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
    textAlign: 'center',
  },

  // HMO List - Premium
  hmoContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
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