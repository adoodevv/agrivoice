import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StatusBar } from 'expo-status-bar';

const COLORS = {
  bg: '#F2EFE9',
  primary: '#1B3D2F',
  card: '#E8E5DF',
  cardWhite: '#FFFFFF',
  textPrimary: '#1B3D2F',
  textSecondary: '#999999',
  white: '#FFFFFF',
  footerBg: '#1B3D2F',
};

// ── Section wrapper ──────────────────────────────────────────────────────────
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

// ── Toggle notification row ──────────────────────────────────────────────────
function NotifRow({
  icon,
  label,
  sub,
  value,
  onChange,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  sub: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.notifRow}>
      <View style={styles.notifIcon}>
        <MaterialIcons name={icon} size={20} color={COLORS.primary} />
      </View>
      <View style={styles.notifText}>
        <Text style={styles.notifLabel}>{label}</Text>
        <Text style={styles.notifSub}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#D5D0C8', true: COLORS.primary }}
        thumbColor={COLORS.white}
        ios_backgroundColor="#D5D0C8"
      />
    </View>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const [voice, setVoice] = useState<'Amma' | 'Kwame'>('Amma');
  const [speed, setSpeed] = useState<'Slow' | 'Normal' | 'Fast'>('Normal');
  const [language, setLanguage] = useState('English');
  const [marketAlerts, setMarketAlerts] = useState(true);
  const [weatherWarnings, setWeatherWarnings] = useState(true);

  const languages = ['English', 'Twi', 'Ga', 'Ewe'];
  const speeds: Array<'Slow' | 'Normal' | 'Fast'> = ['Slow', 'Normal', 'Fast'];
  const speedLabel = { Slow: '0.8x', Normal: '1.0x', Fast: '1.5x' };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <MaterialIcons name="mic" size={18} color={COLORS.primary} />
            <Text style={styles.brandName}>AGRIVOICE</Text>
          </View>
        </View>

        {/* ── Profile card ── */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <MaterialIcons name="person" size={34} color={COLORS.white} />
          </View>
          <View style={styles.profileText}>
            <Text style={styles.profileName}>Kofi Mensah</Text>
            <View style={styles.locationRow}>
              <MaterialIcons name="location-on" size={13} color={COLORS.textSecondary} />
              <Text style={styles.profileLocation}>Kumasi, Ashanti Region</Text>
            </View>
          </View>
        </View>

        {/* ── Voice Preferences ── */}
        <Section label="VOICE PREFERENCES">
          <View style={styles.card}>
            {/* Narrator Voice */}
            <View style={styles.voiceRow}>
              <View style={styles.voiceLabelCol}>
                <Text style={styles.voiceTitle}>Narrator Voice</Text>
                <Text style={styles.voiceSub}>Choose your preferred assistant</Text>
              </View>
              <View style={styles.voicePill}>
                {(['Amma', 'Kwame'] as const).map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[styles.pillOption, voice === v && styles.pillOptionActive]}
                    onPress={() => setVoice(v)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.pillText, voice === v && styles.pillTextActive]}>
                      {v}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.divider} />

            {/* Playback Speed */}
            <View style={styles.speedSection}>
              <View style={styles.speedHeader}>
                <Text style={styles.voiceTitle}>Playback Speed</Text>
                <View style={styles.speedBadge}>
                  <Text style={styles.speedBadgeText}>{speedLabel[speed]}</Text>
                </View>
              </View>
              {/* Large tap targets — farmer-friendly */}
              <View style={styles.speedButtons}>
                {speeds.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.speedBtn, speed === s && styles.speedBtnActive]}
                    onPress={() => setSpeed(s)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.speedBtnText, speed === s && styles.speedBtnTextActive]}>
                      {s}
                    </Text>
                    <Text style={[styles.speedBtnSub, speed === s && styles.speedBtnSubActive]}>
                      {speedLabel[s]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Section>

        {/* ── Language ── */}
        <Section label="LANGUAGE">
          <View style={styles.langGrid}>
            {languages.map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[styles.langBtn, language === lang && styles.langBtnActive]}
                onPress={() => setLanguage(lang)}
                activeOpacity={0.8}
              >
                <Text style={[styles.langText, language === lang && styles.langTextActive]}>
                  {lang}
                </Text>
                {language === lang && (
                  <MaterialIcons name="check-circle" size={18} color={COLORS.white} style={styles.langCheck} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        {/* ── Notifications ── */}
        <Section label="NOTIFICATIONS">
          <View style={styles.card}>
            <NotifRow
              icon="trending-up"
              label="Market Price Alerts"
              sub="Instant updates on crop values"
              value={marketAlerts}
              onChange={setMarketAlerts}
            />
            <View style={styles.divider} />
            <NotifRow
              icon="cloud"
              label="Weather Warnings"
              sub="Localized storm & rainfall alerts"
              value={weatherWarnings}
              onChange={setWeatherWarnings}
            />
          </View>
        </Section>

        {/* ── Save Button ── */}
        <View style={styles.saveSection}>
          <TouchableOpacity style={styles.saveBtn} activeOpacity={0.85}>
            <Text style={styles.saveBtnText}>Save All Changes</Text>
          </TouchableOpacity>
          <Text style={styles.syncText}>LAST SYNCED: 2 MINS AGO</Text>
        </View>

        {/* ── Footer Banner ── */}
        <View style={styles.footerBanner}>
          <Text style={styles.footerText}>
            BUILT FOR CURSOR × GHANANLP HACKATHON — MOVING GHANA FORWARD
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingTop: Platform.OS === 'android' ? 32 : 0,
  },
  scrollContent: { paddingBottom: 0 },

  // ── Header
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandName: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 1.5,
  },

  // ── Profile
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 6,
    gap: 16,
    paddingVertical: 4,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: { flex: 1 },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 3,
  },
  profileLocation: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  // ── Section
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 2,
    marginBottom: 10,
    paddingLeft: 2,
  },

  // ── White card container
  card: {
    backgroundColor: COLORS.cardWhite,
    borderRadius: 18,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: '#EBEBEB',
    marginHorizontal: 16,
  },

  // ── Voice row
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  voiceLabelCol: { flex: 1 },
  voiceTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
  voiceSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Pill selector (Amma / Kwame)
  voicePill: {
    flexDirection: 'row',
    backgroundColor: '#EBEBEB',
    borderRadius: 24,
    padding: 3,
  },
  pillOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 22,
  },
  pillOptionActive: {
    backgroundColor: COLORS.primary,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  pillTextActive: {
    color: COLORS.white,
  },

  // ── Speed section
  speedSection: { padding: 16 },
  speedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  speedBadge: {
    backgroundColor: '#E3EDE8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  speedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  // Large tappable speed buttons — easy for farmers
  speedButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  speedBtn: {
    flex: 1,
    backgroundColor: '#F2EFE9',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 2,
  },
  speedBtnActive: {
    backgroundColor: COLORS.primary,
  },
  speedBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  speedBtnTextActive: { color: COLORS.white },
  speedBtnSub: {
    fontSize: 11,
    color: '#AAAAAA',
  },
  speedBtnSubActive: { color: 'rgba(255,255,255,0.7)' },

  // ── Language grid — 2×2, large touch targets
  langGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  langBtn: {
    width: '47.5%',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  langBtnActive: {
    backgroundColor: COLORS.primary,
  },
  langText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  langTextActive: { color: COLORS.white },
  langCheck: { marginLeft: 4 },

  // ── Notification rows
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  notifIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F2EFE9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifText: { flex: 1 },
  notifLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
  notifSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // ── Save
  saveSection: {
    paddingHorizontal: 20,
    marginTop: 28,
    alignItems: 'center',
    gap: 10,
  },
  saveBtn: {
    width: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 40,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  saveBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.3,
  },
  syncText: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 1.5,
  },

  // ── Footer banner
  footerBanner: {
    backgroundColor: COLORS.footerBg,
    marginTop: 28,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 1.2,
    textAlign: 'center',
    lineHeight: 16,
    fontWeight: '600',
  },
});
