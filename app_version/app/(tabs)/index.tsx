import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  Animated,
  ActivityIndicator,
  Alert,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StatusBar } from 'expo-status-bar';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { router } from 'expo-router';

// ── Backend config ───────────────────────────────────────────────────────────
// Change this to your machine's local IP when the FastAPI server is running.
// Example: 'http://192.168.1.42:8000'
const BACKEND_URL = 'https://c2a1-154-161-121-113.ngrok-free.app';

// ── Theme ────────────────────────────────────────────────────────────────────
const COLORS = {
  bg: '#F2EFE9',
  primary: '#1B3D2F',
  primaryLight: '#2A5C42',
  card: '#E8E5DF',
  cardDark: '#1B3D2F',
  textPrimary: '#1B3D2F',
  textSecondary: '#999999',
  white: '#FFFFFF',
  micRing: '#DDD9D1',
  micRingInner: '#C9C5BD',
};

// ── Types ────────────────────────────────────────────────────────────────────
type AppState = 'idle' | 'recording' | 'processing' | 'result' | 'error';

type VoiceResult = {
  transcribedText: string;
  responseText: string;
  responseAudioBase64: string | null;
  language: string;
};

const LANG_DISPLAY: Record<string, string> = {
  tw: 'TWI', gaa: 'GA', ee: 'EWE', dag: 'DAGBANI', yo: 'YORUBA', ha: 'HAUSA', ki: 'KIKUYU',
};

const LANGUAGES = [
  { code: 'tw',  label: 'TWI'     },
  { code: 'gaa', label: 'GA'      },
  { code: 'ee',  label: 'EWE'     },
  { code: 'dag', label: 'DAGBANI' },
  { code: 'yo',  label: 'YORUBA'  },
  { code: 'ha',  label: 'HAUSA'   },
  { code: 'ki',  label: 'KIKUYU'  },
];

// ── Ping animation ───────────────────────────────────────────────────────────
function usePingAnimation(active: boolean) {
  const anims = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    if (!active) {
      anims.forEach((a) => a.setValue(0));
      return;
    }
    const loops = anims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 700),
          Animated.timing(anim, { toValue: 1, duration: 2100, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [active]);

  return anims;
}

// ── Action card (dashboard) ──────────────────────────────────────────────────
type ActionCardProps = {
  icon: keyof typeof MaterialIcons.glyphMap;
  tag: string;
  title: string;
  dark?: boolean;
  onPress?: () => void;
};

function ActionCard({ icon, tag, title, dark = false, onPress }: ActionCardProps) {
  return (
    <TouchableOpacity style={[styles.card, dark && styles.cardDark]} activeOpacity={0.82} onPress={onPress}>
      <View style={styles.cardTop}>
        <View style={[styles.iconBox, dark && styles.iconBoxDark]}>
          <MaterialIcons name={icon} size={20} color={dark ? COLORS.white : COLORS.primary} />
        </View>
        <Text style={[styles.cardTag, dark && styles.cardTagDark]}>{tag}</Text>
      </View>
      <View style={styles.cardBottom}>
        <Text style={[styles.cardTitle, dark && styles.cardTitleDark]}>{title}</Text>
        <MaterialIcons name="arrow-forward" size={22} color={dark ? COLORS.white : COLORS.primary} />
      </View>
    </TouchableOpacity>
  );
}

// ── Home Screen ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const [appState, setAppState] = useState<AppState>('idle');
  const [result, setResult]     = useState<VoiceResult | null>(null);
  const [isSpeaking, setIsSpeaking]   = useState(false);
  const [language, setLanguage] = useState('tw');
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef     = useRef<Audio.Sound | null>(null);

  const isRecording   = appState === 'recording';
  const isProcessing  = appState === 'processing';
  const pingAnims     = usePingAnimation(isRecording);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
      Speech.stop();
    };
  }, []);

  // ── Recording ─────────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert(
          'Microphone permission needed',
          'Please allow microphone access so AgriVoice can hear you.',
        );
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      recordingRef.current = rec;
      setAppState('recording');
    } catch {
      Alert.alert('Could not start recording', 'Please try again.');
    }
  }, []);

  const stopAndProcess = useCallback(async () => {
    const rec = recordingRef.current;
    if (!rec) return;
    setAppState('processing');

    try {
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      recordingRef.current = null;
      if (!uri) throw new Error('No audio URI');

      const formData = new FormData();
      formData.append('audio', {
        uri,
        type: 'audio/mp4',
        name: 'voice.m4a',
      } as any);
      formData.append('language', language);
      const response = await fetch(`${BACKEND_URL}/api/voice/process`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.detail ?? `Server error ${response.status}`);
      }

      const data = await response.json();
      setResult({
        transcribedText:      data.transcribed_text,
        responseText:         data.response_text,
        responseAudioBase64:  data.response_audio_base64 ?? null,
        language:             data.language,
      });
      setAppState('result');
    } catch (err: any) {
      Alert.alert(
        'Could not process your voice',
        err?.message ?? 'Check that the server is running and try again.',
      );
      setAppState('idle');
    }
  }, [language]);

  const handleMicPress = useCallback(() => {
    if (appState === 'idle')      startRecording();
    else if (appState === 'recording') stopAndProcess();
  }, [appState, startRecording, stopAndProcess]);

  // ── Playback ───────────────────────────────────────────────────────────────
  const playEnglish = useCallback(async () => {
    if (!result || isSpeaking) return;

    setIsSpeaking(true);

    if (result.responseAudioBase64) {
      try {
        if (soundRef.current) {
          await soundRef.current.unloadAsync();
          soundRef.current = null;
        }
        const { sound } = await Audio.Sound.createAsync(
          { uri: `data:audio/wav;base64,${result.responseAudioBase64}` },
          { shouldPlay: true }
        );
        soundRef.current = sound;
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsSpeaking(false);
          }
        });
        return;
      } catch {
        // fall through to expo-speech if audio fails
      }
    }

    Speech.speak(result.responseText, {
      language: 'en',
      rate: 0.85,
      pitch: 1.0,
      onDone:  () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }, [result, isSpeaking]);

  const stopSpeaking = useCallback(async () => {
    Speech.stop();
    await soundRef.current?.stopAsync();
    setIsSpeaking(false);
  }, []);

  const reset = useCallback(() => {
    stopSpeaking();
    setResult(null);
    setAppState('idle');
  }, [stopSpeaking]);

  // ── Mic button icon / colour ───────────────────────────────────────────────
  const micIcon: keyof typeof MaterialIcons.glyphMap =
    isRecording ? 'stop' : isProcessing ? 'hourglass-empty' : 'mic';

  const micBtnStyle = [
    styles.micButton,
    isRecording  && styles.micButtonRecording,
    isProcessing && styles.micButtonProcessing,
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brandName}>AGRIVOICE</Text>
            <Text style={styles.brandTagline}>SPEAK. SELL. GROW.</Text>
          </View>
          <MaterialIcons name="mic" size={26} color={COLORS.primary} />
        </View>

        {/* ── Language selector ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.langPicker}
        >
          {LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[styles.langPill, language === lang.code && styles.langPillActive]}
              onPress={() => setLanguage(lang.code)}
              disabled={isRecording || isProcessing}
              activeOpacity={0.8}
            >
              <Text style={[styles.langPillText, language === lang.code && styles.langPillTextActive]}>
                {lang.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Mic button ── */}
        <View style={styles.micWrapper}>
          <View style={styles.micRingOuter}>
            <View style={styles.micRingInner}>
              {/* Ping rings — only animate when recording */}
              {pingAnims.map((anim, i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.pingRing,
                    {
                      transform: [{
                        scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] }),
                      }],
                      opacity: anim.interpolate({
                        inputRange: [0, 0.2, 1],
                        outputRange: [0.55, 0.35, 0],
                      }),
                    },
                  ]}
                />
              ))}

              <TouchableOpacity
                style={micBtnStyle}
                activeOpacity={0.88}
                onPress={handleMicPress}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator color={COLORS.white} size="large" />
                ) : (
                  <MaterialIcons name={micIcon} size={46} color={COLORS.white} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Status text ── */}
        <Text style={styles.tapText}>
          {appState === 'idle'       && 'Tap to start speaking…'}
          {appState === 'recording'  && 'Listening… Tap to stop'}
          {appState === 'processing' && 'Translating your voice…'}
          {appState === 'result'     && 'Here is the response'}
        </Text>
        <Text style={styles.tapSub}>
          {appState === 'idle'
            ? 'Tell us what you need in your local language'
            : appState === 'recording'
            ? 'Speak clearly in your language'
            : appState === 'processing'
            ? 'Please wait a moment'
            : 'Tap Play to hear the English response'}
        </Text>

        {/* ── Result panel ── */}
        {appState === 'result' && result ? (
          <View style={styles.resultContainer}>
            {/* Language badge */}
            <View style={styles.langBadge}>
              <Text style={styles.langBadgeText}>
                🇬🇭  {LANG_DISPLAY[result.language] ?? result.language.toUpperCase()}
              </Text>
            </View>

            {/* What they said */}
            <View style={styles.resultCard}>
              <Text style={styles.resultSectionLabel}>WHAT YOU SAID</Text>
              <Text style={styles.resultOriginalText}>{result.transcribedText}</Text>
            </View>

            {/* English response */}
            <View style={[styles.resultCard, styles.resultCardDark]}>
              <View style={styles.resultCardDarkHeader}>
                <Text style={styles.resultSectionLabelLight}>AGRIVOICE SAYS</Text>
                <View style={styles.englishBadge}>
                  <Text style={styles.englishBadgeText}>EN</Text>
                </View>
              </View>
              <Text style={styles.resultResponseText}>{result.responseText}</Text>
            </View>

            {/* Action buttons */}
            <View style={styles.resultActions}>
              <TouchableOpacity
                style={[styles.playBtn, isSpeaking && styles.playBtnActive]}
                onPress={isSpeaking ? stopSpeaking : playEnglish}
                activeOpacity={0.85}
              >
                <MaterialIcons
                  name={isSpeaking ? 'stop' : 'volume-up'}
                  size={22}
                  color={COLORS.white}
                />
                <Text style={styles.playBtnText}>
                  {isSpeaking ? 'Stop' : 'Play English'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.retryBtn}
                onPress={reset}
                activeOpacity={0.85}
              >
                <MaterialIcons name="mic" size={20} color={COLORS.primary} />
                <Text style={styles.retryBtnText}>Speak Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : appState !== 'processing' && appState !== 'recording' ? (
          /* ── Dashboard action cards (idle only) ── */
          <View style={styles.cards}>
            <ActionCard
              icon="trending-up"
              tag="LIVE UPDATES"
              title="Check Market Prices"
              onPress={() => router.push('/market-prices')}
            />
            <ActionCard
              icon="inbox"
              tag="DIRECT SELL"
              title="List My Produce"
              onPress={() => router.push('/my-produce')}
            />
            <ActionCard
              icon="psychology"
              tag="EXPERT AI"
              title="Get Farming Advice"
              dark
              onPress={() => router.push('/farming-advice')}
            />
          </View>
        ) : null}

        {/* ── Footer ── */}
        <Text style={styles.footer}>
          BUILT FOR CURSOR × GHANANLP HACKATHON — MOVING GHANA FORWARD
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingTop: Platform.OS === 'android' ? 32 : 0,
  },
  scroll: { flex: 1 },
  container: { paddingBottom: 40 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 4,
  },
  brandName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 1.5,
  },
  brandTagline: {
    fontSize: 10,
    color: COLORS.textSecondary,
    letterSpacing: 2,
    marginTop: 3,
    fontWeight: '500',
  },

  // Mic
  micWrapper: {
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 20,
  },
  micRingOuter: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: COLORS.micRing,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  micRingInner: {
    width: 148,
    height: 148,
    borderRadius: 74,
    backgroundColor: COLORS.micRingInner,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  pingRing: {
    position: 'absolute',
    width: 118,
    height: 118,
    borderRadius: 59,
    backgroundColor: COLORS.primary,
  },
  micButton: {
    width: 118,
    height: 118,
    borderRadius: 59,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },
  micButtonRecording: {
    backgroundColor: '#C0392B',
  },
  micButtonProcessing: {
    backgroundColor: '#555',
  },

  // Status text
  tapText: {
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  tapSub: {
    textAlign: 'center',
    fontSize: 13,
    color: COLORS.textSecondary,
    paddingHorizontal: 44,
    lineHeight: 20,
    marginBottom: 24,
  },

  // Dashboard cards
  cards: {
    paddingHorizontal: 20,
    gap: 12,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 18,
  },
  cardDark: {
    backgroundColor: COLORS.cardDark,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(27,61,47,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxDark: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  cardTag: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1.5,
  },
  cardTagDark: {
    color: 'rgba(255,255,255,0.55)',
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    flex: 1,
    lineHeight: 26,
  },
  cardTitleDark: {
    color: COLORS.white,
  },

  // Result panel
  resultContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  langBadge: {
    alignSelf: 'center',
    backgroundColor: '#E3EDE8',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
    marginBottom: 4,
  },
  langBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  resultCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 18,
    gap: 10,
  },
  resultCardDark: {
    backgroundColor: COLORS.primary,
  },
  resultCardDarkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultSectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1.5,
  },
  resultSectionLabelLight: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.5,
  },
  englishBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  englishBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
  },
  resultOriginalText: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.primary,
    lineHeight: 26,
  },
  resultResponseText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.white,
    lineHeight: 26,
    marginTop: 6,
  },

  // Result actions
  resultActions: {
    gap: 10,
    marginTop: 4,
  },
  playBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  playBtnActive: {
    backgroundColor: '#C0392B',
  },
  playBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  retryBtn: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 8,
  },
  retryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // Language picker
  langPicker: {
    paddingHorizontal: 20,
    gap: 8,
    paddingVertical: 8,
  },
  langPill: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  langPillActive: {
    backgroundColor: COLORS.primary,
  },
  langPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1,
  },
  langPillTextActive: {
    color: COLORS.white,
  },

  // Footer
  footer: {
    textAlign: 'center',
    fontSize: 9,
    color: COLORS.textSecondary,
    letterSpacing: 1.2,
    paddingHorizontal: 24,
    marginTop: 32,
    lineHeight: 16,
    fontWeight: '500',
  },
});
