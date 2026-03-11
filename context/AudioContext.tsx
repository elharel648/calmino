import { logger } from '../utils/logger';
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { liveActivityService } from '../services/liveActivityService';

// Safe import — requires full native rebuild after first install
let VolumeManager: any = null;
try {
    VolumeManager = require('react-native-volume-manager').VolumeManager;
} catch (e) { /* native module not linked yet — rebuild needed */ }

// Sound file imports
const soundFiles = {
    lullaby1: require('../assets/sounds/lullaby.mp3'),
    lullaby2: require('../assets/sounds/gentle.mp3'),
    lullaby3: require('../assets/sounds/birds.mp3'),
    lullaby4: require('../assets/sounds/rain.wav'),
};

// Mapping from AudioContext soundId → Live Activity soundId + Hebrew name
const SOUND_LIVE_ACTIVITY: Record<string, { id: string; name: string }> = {
    lullaby1: { id: 'lullaby', name: 'שיר ערש' },
    lullaby2: { id: 'gentle', name: 'מוזיקה עדינה' },
    lullaby3: { id: 'birds', name: 'ציפורים' },
    lullaby4: { id: 'rain', name: 'גשם' },
};

export type SoundId = keyof typeof soundFiles;

interface AudioContextType {
    activeSound: SoundId | null;
    volume: number;
    isLoading: boolean;
    sleepTimer: number | null;
    timeRemaining: number | null;
    playSound: (id: SoundId) => Promise<void>;
    stopSound: () => Promise<void>;
    setVolume: (volume: number) => Promise<void>;
    toggleSound: (id: SoundId) => Promise<void>;
    startTimer: (minutes: number) => void;
    stopTimer: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const useAudio = () => {
    const context = useContext(AudioContext);
    if (!context) {
        throw new Error('useAudio must be used within an AudioProvider');
    }
    return context;
};

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [activeSound, setActiveSound] = useState<SoundId | null>(null);
    const [volume, setVolumeState] = useState(0.7);
    const [isLoading, setIsLoading] = useState(false);
    const [sleepTimer, setSleepTimer] = useState<number | null>(null);
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const soundRef = useRef<Audio.Sound | null>(null);
    const isMountedRef = useRef(true);

    // Setup audio mode for background playback + read initial device volume
    useEffect(() => {
        const setupAudio = async () => {
            try {
                await Audio.setAudioModeAsync({
                    startsAudioSession: true,
                    playsInSilentModeIOS: true,
                    staysActiveInBackground: true,
                    shouldDuckAndroid: true,
                    playThroughEarpieceAndroid: false,
                } as any);
            } catch (error) {
                logger.log('Error setting up audio mode:', error);
            }

            // Read current device volume and use it as initial value
            if (VolumeManager) {
                try {
                    const result = await VolumeManager.getVolume();
                    const deviceVol = typeof result === 'number' ? result : (result as any).volume ?? 0.7;
                    if (isMountedRef.current) setVolumeState(deviceVol);
                } catch (e) {
                    logger.log('Could not read device volume:', e);
                }
            }
        };
        setupAudio();

        // Listen for hardware volume button changes
        let sub: { remove: () => void } | null = null;
        if (VolumeManager) {
            sub = VolumeManager.addVolumeListener((result: any) => {
                const v = typeof result === 'number' ? result : (result as any).volume ?? 0;
                if (isMountedRef.current) {
                    setVolumeState(v);
                    if (soundRef.current) {
                        soundRef.current.setVolumeAsync(v).catch(() => {});
                    }
                }
            });
        }

        // Cleanup on unmount
        return () => {
            isMountedRef.current = false;
            sub?.remove();
            if (soundRef.current) {
                soundRef.current.unloadAsync();
            }
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, []);

    const stopSound = async () => {
        try {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            setSleepTimer(null);
            setTimeRemaining(null);

            if (soundRef.current) {
                try {
                    await soundRef.current.stopAsync();
                    await soundRef.current.unloadAsync();
                } catch (e) {
                    logger.log('Error unloading sound:', e);
                }
                soundRef.current = null;
            }
            setActiveSound(null);
            if (Platform.OS === 'ios') {
                liveActivityService.stopWhiteNoise().catch(() => {});
            }
        } catch (error) {
            logger.log('Error stopping sound:', error);
        }
    };

    const playSound = async (id: SoundId) => {
        try {
            setIsLoading(true);

            // Stop current sound if playing (but keep timer if we want? No, usually switching sound resets or keeps timer. Let's keep timer running effectively)
            // Actually, standard behavior: if I switch sound, timer persists? Or resets?
            // Let's assume timer persists if already running.

            if (soundRef.current) {
                await soundRef.current.stopAsync();
                await soundRef.current.unloadAsync();
                soundRef.current = null;
            }

            const { sound } = await Audio.Sound.createAsync(
                soundFiles[id],
                {
                    isLooping: true,
                    volume: volume,
                    shouldPlay: true,
                }
            );

            // Guard against unmount during async load
            if (!isMountedRef.current) {
                sound.unloadAsync().catch(() => {});
                return;
            }

            soundRef.current = sound;
            setActiveSound(id);

            if (Platform.OS === 'ios') {
                const laInfo = SOUND_LIVE_ACTIVITY[id];
                if (laInfo) {
                    liveActivityService.startWhiteNoise(laInfo.id, laInfo.name).catch(() => {});
                }
            }

        } catch (error) {
            logger.log('Error playing sound:', error);
            setActiveSound(null);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleSound = async (id: SoundId) => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        if (activeSound === id) {
            await stopSound();
        } else {
            await playSound(id);
        }
    };

    const setVolume = async (newVolume: number) => {
        setVolumeState(newVolume);
        // Set both the sound volume and device system volume
        if (VolumeManager) {
            try {
                await VolumeManager.setVolume(newVolume);
            } catch (e) {
                logger.log('Could not set device volume:', e);
            }
        }
        if (soundRef.current) {
            try {
                await soundRef.current.setVolumeAsync(newVolume);
            } catch (error) {
                logger.log('Error changing volume:', error);
            }
        }
    };

    const startTimer = (minutes: number) => {
        setSleepTimer(minutes);
        setTimeRemaining(minutes * 60);

        if (timerRef.current) {
            clearInterval(timerRef.current);
        }

        timerRef.current = setInterval(() => {
            setTimeRemaining((prev) => {
                if (prev === null || prev <= 1) {
                    // Timer finished
                    stopSound(); // This clears timer ref and stops sound
                    return null;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const stopTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        setSleepTimer(null);
        setTimeRemaining(null);
    };

    return (
        <AudioContext.Provider value={{
            activeSound,
            volume,
            isLoading,
            sleepTimer,
            timeRemaining,
            playSound,
            stopSound,
            setVolume,
            toggleSound,
            startTimer,
            stopTimer
        }}>
            {children}
        </AudioContext.Provider>
    );
};
