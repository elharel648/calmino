import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback, Platform, Animated as RNAnimated } from 'react-native';
import { X, CloudRain, Wind, Heart, Fan, Volume2, Pause, VolumeX, Volume1, Clock, Play } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Slider from '@react-native-community/slider';
import { useTheme } from '../context/ThemeContext';
import { useAudio, SoundId } from '../context/AudioContext';

interface WhiteNoiseModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function WhiteNoiseModal({ visible, onClose }: WhiteNoiseModalProps) {
  const { theme, isDarkMode } = useTheme();
  const { activeSound, volume, isLoading, toggleSound, setVolume, stopSound, sleepTimer, timeRemaining, startTimer, stopTimer } = useAudio();

  const pulseAnim = useRef(new RNAnimated.Value(1)).current;
  const slideAnim = useRef(new RNAnimated.Value(100)).current;
  const fadeAnim = useRef(new RNAnimated.Value(0)).current;

  const sounds = [
    { id: 'rain', label: 'גשם', icon: CloudRain, gradient: ['#3B82F6', '#2563EB'] as [string, string], bg: isDarkMode ? 'rgba(59,130,246,0.08)' : '#EFF6FF' },
    { id: 'shh', label: 'שששש', icon: Wind, gradient: ['#8B5CF6', '#7C3AED'] as [string, string], bg: isDarkMode ? 'rgba(139,92,246,0.08)' : '#F5F3FF' },
    { id: 'heartbeat', label: 'דופק', icon: Heart, gradient: ['#EC4899', '#DB2777'] as [string, string], bg: isDarkMode ? 'rgba(236,72,153,0.08)' : '#FDF2F8' },
    { id: 'dryer', label: 'מאוורר', icon: Fan, gradient: ['#10B981', '#059669'] as [string, string], bg: isDarkMode ? 'rgba(16,185,129,0.08)' : '#ECFDF5' },
  ];

  // Entry animation
  useEffect(() => {
    if (visible) {
      RNAnimated.parallel([
        RNAnimated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 200,
        }),
        RNAnimated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(100);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  // Pulse animation for active sound
  useEffect(() => {
    if (activeSound) {
      const pulse = RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(pulseAnim, {
            toValue: 1.06,
            duration: 900,
            useNativeDriver: true,
          }),
          RNAnimated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [activeSound]);

  const handleClose = () => {
    // Don't stop sound on close!
    onClose();
  };

  // Handle volume changes in real-time
  const handleVolumeChange = async (newVolume: number) => {
    await setVolume(newVolume);
  };

  // Format time remaining as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <RNAnimated.View style={[
          styles.modalContent,
          {
            backgroundColor: isDarkMode ? '#1C1C1E' : theme.card,
            transform: [{ translateY: slideAnim }],
            opacity: fadeAnim,
          }
        ]}>
          {/* Drag Handle */}
          <View style={styles.dragHandle}>
            <View style={[
              styles.dragHandleBar,
              { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)' }
            ]} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={[
              styles.iconCircle,
              { backgroundColor: isDarkMode ? 'rgba(139,92,246,0.15)' : '#F5F3FF' }
            ]}>
              <Volume2 size={20} color="#8B5CF6" strokeWidth={2} />
            </View>
            <Text style={[styles.title, { color: theme.textPrimary }]}>רעש לבן</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <X size={18} color={theme.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Sound Grid */}
          <View style={styles.grid}>
            {sounds.map((sound) => {
              const isActive = activeSound === sound.id;
              const Icon = sound.icon;
              return (
                <RNAnimated.View
                  key={sound.id}
                  style={[
                    { transform: [{ scale: isActive ? pulseAnim : 1 }] }
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.soundCard,
                      {
                        backgroundColor: isActive
                          ? theme.primary || '#6366F1'
                          : isDarkMode
                            ? 'rgba(255,255,255,0.04)'
                            : '#FAFAFA',
                        borderWidth: isActive ? 0 : 1,
                        borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#E5E7EB',
                      },
                    ]}
                    onPress={() => toggleSound(sound.id as SoundId)}
                    activeOpacity={0.85}
                    disabled={isLoading}
                  >
                    {/* Icon */}
                    <View style={[
                      styles.soundIcon,
                      {
                        backgroundColor: isActive
                          ? 'rgba(255,255,255,0.2)'
                          : isDarkMode ? 'rgba(255,255,255,0.06)' : '#fff'
                      }
                    ]}>
                      {isActive ? (
                        <Pause size={20} color="#fff" strokeWidth={2.5} />
                      ) : (
                        <Icon size={20} color={isDarkMode ? theme.textSecondary : sound.gradient[0]} strokeWidth={2} />
                      )}
                    </View>

                    <Text style={[
                      styles.soundLabel,
                      { color: isActive ? '#fff' : theme.textPrimary }
                    ]}>
                      {sound.label}
                    </Text>

                    {isActive && (
                      <View style={styles.playingIndicator}>
                        <View style={styles.playingDot} />
                      </View>
                    )}
                  </TouchableOpacity>
                </RNAnimated.View>
              );
            })}
          </View>

          {/* Volume Control */}
          {activeSound && (
            <View style={[
              styles.volumeContainer,
              { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F9FAFB' }
            ]}>
              <View style={styles.volumeHeader}>
                {volume === 0 ? (
                  <VolumeX size={18} color={theme.textSecondary} />
                ) : volume < 0.5 ? (
                  <Volume1 size={18} color={theme.textSecondary} />
                ) : (
                  <Volume2 size={18} color={theme.textSecondary} />
                )}
                <Text style={[styles.volumeLabel, { color: theme.textSecondary }]}>
                  עוצמת קול: {Math.round(volume * 100)}%
                </Text>
              </View>
              <Slider
                style={styles.slider}
                value={volume}
                onValueChange={handleVolumeChange}
                minimumValue={0}
                maximumValue={1}
                minimumTrackTintColor={theme.primary || '#6366F1'}
                maximumTrackTintColor={isDarkMode ? 'rgba(255,255,255,0.1)' : '#E5E7EB'}
                thumbTintColor={theme.primary || '#6366F1'}
              />
            </View>
          )}

          {/* Sleep Timer */}
          {activeSound && (
            <View style={styles.timerContainer}>
              <View style={styles.timerHeader}>
                <Clock size={18} color={theme.textSecondary} />
                <Text style={[styles.timerTitle, { color: theme.textPrimary }]}>
                  טיימר שינה
                </Text>
              </View>

              {timeRemaining !== null && (
                <View style={[
                  styles.activeTimerBadge,
                  { backgroundColor: isDarkMode ? 'rgba(99,102,241,0.2)' : '#EEF2FF' }
                ]}>
                  <Text style={[styles.timerText, { color: theme.primary || '#6366F1' }]}>
                    ⏰ {formatTime(timeRemaining)}
                  </Text>
                </View>
              )}

              <View style={styles.timerButtons}>
                {[15, 30, 60].map((mins) => (
                  <TouchableOpacity
                    key={mins}
                    style={[
                      styles.timerBtn,
                      {
                        backgroundColor: sleepTimer === mins
                          ? theme.primary || '#6366F1'
                          : isDarkMode ? 'rgba(255,255,255,0.06)' : '#F3F4F6'
                      }
                    ]}
                    onPress={() => startTimer(mins)}
                  >
                    <Text style={[
                      styles.timerBtnText,
                      {
                        color: sleepTimer === mins
                          ? '#fff'
                          : theme.textPrimary
                      }
                    ]}>
                      {mins} דק'
                    </Text>
                  </TouchableOpacity>
                ))}
                {sleepTimer && (
                  <TouchableOpacity
                    style={[
                      styles.timerBtn,
                      { backgroundColor: '#EF4444' }
                    ]}
                    onPress={stopTimer}
                  >
                    <Text style={[styles.timerBtnText, { color: '#fff' }]}>
                      בטל
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Tip */}
          <View style={[
            styles.tipContainer,
            { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#F9FAFB' }
          ]}>
            <Text style={[styles.tip, { color: theme.textSecondary }]}>
              הסאונד ימשיך לנגן גם כשהמסך כבוי 🎵
            </Text>
          </View>
        </RNAnimated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8
  },
  dragHandle: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 8,
  },
  dragHandleBar: {
    width: 32,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 18
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'right',
    marginRight: 10,
    letterSpacing: -0.2,
  },
  closeBtn: {
    padding: 8
  },
  grid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  soundCard: {
    width: 135,
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderRadius: 18,
    alignItems: 'center',
    overflow: 'hidden',
  },
  soundIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  soundLabel: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  playingIndicator: {
    marginTop: 8,
  },
  playingBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginTop: 10,
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  playingDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  playingText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  tipContainer: {
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  tip: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '500',
  },
  // Volume Control Styles
  volumeContainer: {
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
  },
  volumeHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  volumeLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  // Timer Styles
  timerContainer: {
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  timerHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  timerTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  activeTimerBadge: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 12,
  },
  timerText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  timerButtons: {
    flexDirection: 'row-reverse',
    gap: 8,
    justifyContent: 'center',
  },
  timerBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 70,
    alignItems: 'center',
  },
  timerBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});