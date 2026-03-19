import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Linking, Platform, Alert, Animated as RNAnimated, PanResponder, Dimensions } from 'react-native';
import { Phone, Siren, Shield, Skull } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, withRepeat, withSequence, withDelay, withSpring } from 'react-native-reanimated';
import { useLanguage } from '../context/LanguageContext';
import SOSIcon from './Common/SOSIcon';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const RNAnimatedView = RNAnimated.createAnimatedComponent(View);

interface CalmModeModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function CalmModeModal({
  visible, onClose }: CalmModeModalProps) {
  const { t } = useLanguage();

  // Animations
  const slideAnim = useRef(new RNAnimated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new RNAnimated.Value(0)).current;
  const backdropAnim = useRef(new RNAnimated.Value(0)).current;

  // Animated header values
  const iconBounce = useSharedValue(0.7);
  const ring1Scale = useSharedValue(1);
  const ring1Opacity = useSharedValue(0);
  const ring2Scale = useSharedValue(1);
  const ring2Opacity = useSharedValue(0);

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

      // Icon bounce in
      iconBounce.value = withSpring(1, { damping: 10, stiffness: 180 });

      // Pulse ring 1 — slow, calm breathing rhythm
      ring1Scale.value = withRepeat(
        withSequence(withTiming(1, { duration: 0 }), withTiming(1.6, { duration: 2000 })),
        -1, false
      );
      ring1Opacity.value = withRepeat(
        withSequence(withTiming(0.4, { duration: 0 }), withTiming(0, { duration: 2000 })),
        -1, false
      );
      // Pulse ring 2 — delayed for gentle offset
      ring2Scale.value = withDelay(1000, withRepeat(
        withSequence(withTiming(1, { duration: 0 }), withTiming(1.6, { duration: 2000 })),
        -1, false
      ));
      ring2Opacity.value = withDelay(1000, withRepeat(
        withSequence(withTiming(0.3, { duration: 0 }), withTiming(0, { duration: 2000 })),
        -1, false
      ));
    } else {
      slideAnim.setValue(SCREEN_HEIGHT);
      fadeAnim.setValue(0);
      backdropAnim.setValue(0);
      iconBounce.value = 0.7;
      ring1Scale.value = 1;
      ring1Opacity.value = 0;
      ring2Scale.value = 1;
      ring2Opacity.value = 0;
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

  const iconBounceStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconBounce.value }],
  }));
  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1Scale.value }],
    opacity: ring1Opacity.value,
  }));
  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2Scale.value }],
    opacity: ring2Opacity.value,
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
              backgroundColor: '#FFFFFF',
              zIndex: 1000,
            }
          ]}
        >
          {/* Drag Handle */}
          <View style={styles.dragHandle} {...panResponder.panHandlers}>
            <View style={[styles.dragHandleBar, { backgroundColor: 'rgba(0,0,0,0.12)' }]} />
          </View>

          {/* Header */}
          <View style={styles.header} {...panResponder.panHandlers}>
            <View style={styles.headerContent}>
              {/* Animated icon with pulse rings */}
              <View style={styles.iconWrapper}>
                {/* Pulse ring 2 (outer) */}
                <Animated.View style={[styles.pulseRing, ring2Style, { backgroundColor: '#EF4444' }]} />
                {/* Pulse ring 1 (inner) */}
                <Animated.View style={[styles.pulseRing, ring1Style, { backgroundColor: '#EF4444' }]} />
                {/* Icon circle */}
                <Animated.View style={iconBounceStyle}>
                  <LinearGradient
                    colors={['#EF4444', '#FCA5A5']}
                    style={styles.iconGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <SOSIcon size={32} color="#fff" strokeWidth={2.2} />
                  </LinearGradient>
                </Animated.View>
              </View>
              <Text style={[styles.mainTitle, { color: '#111827' }]}>SOS</Text>
            </View>
          </View>

          {/* Content */}
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
              <Text style={[styles.sectionTitle, { color: '#6B7280' }]}>חירום מיידי</Text>
              <View style={styles.emergencyRow}>
                {emergencyContacts.map((contact, index) => {
                  const { Icon } = contact;
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.emergencyCard,
                        {
                          backgroundColor: '#FFFFFF',
                          borderColor: 'rgba(0,0,0,0.08)',
                        }
                      ]}
                      onPress={() => makeCall(contact.number, contact.name)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.emergencyIcon, { backgroundColor: contact.bgColor }]}>
                        <Icon size={22} color={contact.color} strokeWidth={2} />
                      </View>
                      <Text style={[styles.emergencyName, { color: '#111827' }]}>
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
              <Text style={[styles.sectionTitle, { color: '#6B7280' }]}>קופות חולים</Text>
              <View style={[styles.hmoContainer, { backgroundColor: '#FFFFFF', borderColor: 'rgba(0,0,0,0.08)' }]}>
                {hmoContacts.map((hmo, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.hmoRow,
                      index < hmoContacts.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: '#E5E7EB',
                      }
                    ]}
                    onPress={() => makeCall(hmo.number, hmo.name)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.hmoInfo}>
                      <Text style={[styles.hmoName, { color: '#111827' }]}>{hmo.name}</Text>
                      <Text style={[styles.hmoSubtitle, { color: '#6B7280' }]}>{hmo.subtitle}</Text>
                    </View>
                    <View style={styles.hmoCall}>
                      <View style={[styles.phoneIcon, { backgroundColor: '#DBEAFE' }]}>
                        <Phone size={14} color="#3B82F6" strokeWidth={2} />
                      </View>
                      <Text style={[styles.hmoNumber, { color: '#6B7280' }]}>{hmo.number}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
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
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  headerContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 12,
    backgroundColor: '#FFFFFF',
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
  iconWrapper: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  pulseRing: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  iconGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
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
    backgroundColor: '#FFFFFF',
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