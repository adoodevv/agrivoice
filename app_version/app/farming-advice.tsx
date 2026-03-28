import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';

// ── Config ───────────────────────────────────────────────────────────────────
const BACKEND_URL = 'https://c2a1-154-161-121-113.ngrok-free.app';

const COLORS = {
  bg: '#F2EFE9',
  primary: '#1B3D2F',
  card: '#E8E5DF',
  white: '#FFFFFF',
  textSecondary: '#999',
  userBubble: '#1B3D2F',
  aiBubble: '#FFFFFF',
};

// ── Local AI (pattern matching mirrors backend logic) ─────────────────────────
function getLocalAdvice(text: string): string {
  const t = text.toLowerCase();

  if (/(price|cost|market|how much|rate|maize|yam|tomato|cassava|plantain|rice|pepper|groundnut)/.test(t)) {
    return '📊 Current prices (GHS):\n• Maize: 340/bag (Accra) · 320 (Kumasi) · 300 (Tamale)\n• Yam: 320/bag (Accra) · 295 (Kumasi)\n• Tomato: 150/crate · Cassava: 85/bag · Plantain: 55/bunch\n\nFor live updates, check the Market Prices tab.';
  }
  if (/(store|storage|keep|preserve|spoil|warehouse|silo|loss|hermetic)/.test(t)) {
    return '🏚️ Storage Tips:\nStore grains in hermetic bags or metal silos in a cool, dry place. Keep maize moisture below 13% before bagging. Inspect every two weeks for pests and mould.\n\nPoor storage causes up to 30% post-harvest losses — hermetic bags can reduce this to under 2%.';
  }
  if (/(pest|insect|disease|fungus|worm|spray|armyworm|miner|blight|rot)/.test(t)) {
    return '🐛 Pest & Disease Alert:\nCommon threats this season:\n• Fall armyworm on maize — spray early morning\n• Tomato leaf miner — use yellow sticky traps\n• Cassava root rot — ensure good drainage\n\nContact your local extension officer for free scouting support.';
  }
  if (/(fertiliz|fertilis|manure|npk|compost|nutrient)/.test(t)) {
    return '🌱 Fertiliser Advice:\nFor maize: Apply NPK 15-15-15 at planting, top-dress with sulphate of ammonia at 6 weeks.\n\nFor yam/cassava: Compost or well-rotted manure improves yields without over-application risk.\n\nAlways test soil before applying fertiliser.';
  }
  if (/(weather|rain|forecast|dry|flood|season|harmattan|climate)/.test(t)) {
    return '🌦️ Weather Update:\nSouthern Ghana: Partly cloudy, chance of afternoon rain. Good for transplanting.\n\nNorthern Ghana: Dry harmattan conditions. Irrigate if possible.\n\nMajor season planting: April in south, June in north.';
  }
  if (/(plant|planting|sow|harvest|when|season|nursery|germinate)/.test(t)) {
    return '📅 Planting Calendar:\nSouthern Ghana:\n• Major season: April – July\n• Minor season: September – November\n\nNorthern Ghana:\n• Single rainy season: May – October\n\nAlways test your soil before planting new crops.';
  }
  if (/(subsidy|government|pfj|planting for food|free seed|support|input)/.test(t)) {
    return '🏛️ Government Subsidies:\nUnder the Planting for Food and Jobs (PFJ) programme, registered farmers get subsidised fertiliser and improved seeds.\n\nVisit your district agriculture office or call 0800-MOFA to register.';
  }
  if (/(sell|list|buyer|market|advertise|produce)/.test(t)) {
    return '📦 Selling Your Produce:\nUse the "List My Produce" tab to post your crops. Buyers in your area will be notified.\n\nTips for better prices:\n• Grade your produce by quality\n• Sell in bulk where possible\n• Time sales after market peak hours';
  }
  if (/(hello|hi|hey|good morning|good afternoon|help|what can)/.test(t)) {
    return '👋 Hello! I\'m your AgriVoice AI assistant.\n\nI can help you with:\n• Crop market prices\n• Planting & harvest seasons\n• Pest & disease control\n• Fertiliser advice\n• Storage tips\n• Government subsidies\n\nAsk me anything or record your question in your local language!';
  }

  return '🤖 I didn\'t quite catch that. You can ask me about:\n• Market prices for crops\n• Best time to plant or harvest\n• How to control pests or diseases\n• Fertiliser recommendations\n• Storage and post-harvest tips\n• Government farming programmes\n\nOr record your question in Twi, Ga, or Ewe!';
}

// ── Types ─────────────────────────────────────────────────────────────────────
type Message = {
  id: string;
  role: 'user' | 'ai';
  text: string;
  isVoice?: boolean;
  timestamp: string;
};

const GREETING: Message = {
  id: '0',
  role: 'ai',
  text: '👋 Hello! I\'m your AgriVoice AI assistant.\n\nAsk me anything about crops, prices, planting seasons, pests, or fertilisers — in English or your local language.\n\nYou can type your question or tap the mic to speak in Twi, Ga, or Ewe!',
  timestamp: 'Now',
};

// ── Ping animation for recording ─────────────────────────────────────────────
function usePing(active: boolean) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active) { scale.setValue(1); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.18, duration: 600, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1,    duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active]);

  return scale;
}

// ── Bubble ────────────────────────────────────────────────────────────────────
function Bubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  return (
    <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
      {!isUser && (
        <View style={styles.aiAvatar}>
          <Text style={styles.aiAvatarText}>AI</Text>
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
        {msg.isVoice && (
          <View style={styles.voiceIndicator}>
            <MaterialIcons name="mic" size={12} color={isUser ? 'rgba(255,255,255,0.7)' : COLORS.textSecondary} />
            <Text style={[styles.voiceLabel, isUser && styles.voiceLabelUser]}>Voice message</Text>
          </View>
        )}
        <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>{msg.text}</Text>
        <Text style={[styles.bubbleTime, isUser && styles.bubbleTimeUser]}>{msg.timestamp}</Text>
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function FarmingAdviceScreen() {
  const [messages, setMessages]   = useState<Message[]>([GREETING]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping]   = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const listRef      = useRef<FlatList>(null);
  const micScale     = usePing(isRecording);

  const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const addMessage = useCallback((msg: Omit<Message, 'id'>) => {
    const full: Message = { ...msg, id: Date.now().toString() + Math.random() };
    setMessages((prev) => [...prev, full]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    return full;
  }, []);

  const simulateAIReply = useCallback((userText: string) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      addMessage({ role: 'ai', text: getLocalAdvice(userText), timestamp: now() });
    }, 900 + Math.random() * 600);
  }, [addMessage]);

  // ── Text send ──────────────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    addMessage({ role: 'user', text, timestamp: now() });
    simulateAIReply(text);
  }, [inputText, addMessage, simulateAIReply]);

  // ── Voice recording ────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert('Microphone permission needed', 'Allow microphone access to record your question.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      recordingRef.current = rec;
      setIsRecording(true);
    } catch {
      Alert.alert('Could not start recording. Please try again.');
    }
  }, []);

  const stopRecording = useCallback(async () => {
    const rec = recordingRef.current;
    if (!rec) return;
    setIsRecording(false);
    setIsProcessing(true);

    try {
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      recordingRef.current = null;
      if (!uri) throw new Error('No audio URI');

      // Show user's voice message immediately
      addMessage({ role: 'user', text: '🎙 Voice message sent', isVoice: true, timestamp: now() });

      // Send to backend
      const formData = new FormData();
      formData.append('audio', { uri, type: 'audio/mp4', name: 'voice.m4a' } as any);

      const response = await fetch(`${BACKEND_URL}/api/voice/process`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error(`Server error ${response.status}`);

      const data = await response.json();
      const transcribed = data.transcribed_text as string;
      const reply       = data.response_text as string;
      const audioB64    = data.response_audio_base64 as string | null;

      // Show what they said
      if (transcribed) {
        addMessage({ role: 'user', text: `"${transcribed}"`, timestamp: now() });
      }

      setIsProcessing(false);
      addMessage({ role: 'ai', text: reply, timestamp: now() });

      // Play audio if available, otherwise TTS
      if (audioB64) {
        try {
          const { sound } = await Audio.Sound.createAsync(
            { uri: `data:audio/wav;base64,${audioB64}` },
            { shouldPlay: true }
          );
          sound.setOnPlaybackStatusUpdate((s) => {
            if (s.isLoaded && s.didJustFinish) sound.unloadAsync();
          });
        } catch {
          Speech.speak(reply, { language: 'en', rate: 0.85 });
        }
      } else {
        Speech.speak(reply, { language: 'en', rate: 0.85 });
      }
    } catch {
      setIsProcessing(false);
      // Fallback to local response
      addMessage({ role: 'ai', text: '⚠️ Could not reach the server. Here\'s what I know:\n\n' + getLocalAdvice('help'), timestamp: now() });
    }
  }, [addMessage]);

  const handleMicPress = useCallback(() => {
    if (isRecording) stopRecording();
    else startRecording();
  }, [isRecording, startRecording, stopRecording]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.aiHeaderAvatar}>
            <Text style={styles.aiHeaderAvatarText}>AI</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>Farming Advice</Text>
            <Text style={styles.headerSub}>AgriVoice Expert AI</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.clearBtn}
          onPress={() => {
            Alert.alert('Clear chat', 'Start a new conversation?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Clear', onPress: () => setMessages([GREETING]) },
            ]);
          }}
        >
          <MaterialIcons name="refresh" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <Bubble msg={item} />}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={
            isTyping || isProcessing ? (
              <View style={styles.typingRow}>
                <View style={styles.aiAvatar}>
                  <Text style={styles.aiAvatarText}>AI</Text>
                </View>
                <View style={styles.typingBubble}>
                  <ActivityIndicator size="small" color={COLORS.textSecondary} />
                  <Text style={styles.typingText}>
                    {isProcessing ? 'Processing voice…' : 'Thinking…'}
                  </Text>
                </View>
              </View>
            ) : null
          }
        />

        {/* Input bar */}
        <View style={styles.inputBar}>
          {/* Mic button */}
          <Animated.View style={{ transform: [{ scale: micScale }] }}>
            <TouchableOpacity
              style={[styles.micBtn, isRecording && styles.micBtnActive]}
              onPress={handleMicPress}
              disabled={isProcessing}
              activeOpacity={0.85}
            >
              <MaterialIcons
                name={isRecording ? 'stop' : 'mic'}
                size={22}
                color={COLORS.white}
              />
            </TouchableOpacity>
          </Animated.View>

          {/* Text input */}
          <TextInput
            style={styles.textInput}
            placeholder={isRecording ? 'Recording…' : 'Ask a question in English…'}
            placeholderTextColor={COLORS.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            editable={!isRecording && !isProcessing}
            multiline
          />

          {/* Send button */}
          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || isRecording || isProcessing}
            activeOpacity={0.85}
          >
            <MaterialIcons name="send" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {isRecording && (
          <View style={styles.recordingBanner}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>Recording… Tap mic to stop and send</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingTop: Platform.OS === 'android' ? 32 : 0,
  },
  flex: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  aiHeaderAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiHeaderAvatarText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
  headerSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  clearBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Messages
  messageList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 12,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    maxWidth: '92%',
  },
  bubbleRowUser: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginBottom: 2,
  },
  aiAvatarText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.white,
  },
  bubble: {
    borderRadius: 18,
    padding: 12,
    maxWidth: '100%',
  },
  bubbleAI: {
    backgroundColor: COLORS.aiBubble,
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: COLORS.userBubble,
    borderBottomRightRadius: 4,
  },
  voiceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  voiceLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  voiceLabelUser: { color: 'rgba(255,255,255,0.65)' },
  bubbleText: {
    fontSize: 14,
    color: COLORS.primary,
    lineHeight: 21,
  },
  bubbleTextUser: { color: COLORS.white },
  bubbleTime: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  bubbleTimeUser: { color: 'rgba(255,255,255,0.55)' },

  // Typing indicator
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  typingText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: '#EBEBEB',
  },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  micBtnActive: {
    backgroundColor: '#C0392B',
  },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 14,
    color: COLORS.primary,
    maxHeight: 100,
    fontWeight: '500',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sendBtnDisabled: {
    backgroundColor: '#C5C0B8',
  },

  // Recording banner
  recordingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    paddingVertical: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C0392B',
  },
  recordingText: {
    fontSize: 12,
    color: '#C0392B',
    fontWeight: '600',
  },
});
