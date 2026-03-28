import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Platform,
  FlatList,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StatusBar } from 'expo-status-bar';

const COLORS = {
  bg: '#F2EFE9',
  primary: '#1B3D2F',
  card: '#E8E5DF',
  textPrimary: '#1B3D2F',
  textSecondary: '#999999',
  white: '#FFFFFF',
};

type HistoryItem = {
  id: string;
  query: string;
  type: 'market' | 'produce' | 'advice';
  time: string;
};

const ICON_MAP: Record<HistoryItem['type'], keyof typeof MaterialIcons.glyphMap> = {
  market: 'trending-up',
  produce: 'inbox',
  advice: 'psychology',
};

const TAG_MAP: Record<HistoryItem['type'], string> = {
  market: 'MARKET PRICES',
  produce: 'MY PRODUCE',
  advice: 'FARMING ADVICE',
};

// Placeholder sample data — replace with real data from your backend
const SAMPLE: HistoryItem[] = [
  { id: '1', query: 'What is the price of maize today?', type: 'market', time: '2 hrs ago' },
  { id: '2', query: 'List my tomatoes for sale', type: 'produce', time: 'Yesterday' },
  { id: '3', query: 'How do I prevent cassava root rot?', type: 'advice', time: 'Yesterday' },
  { id: '4', query: 'Current yam prices in Kumasi', type: 'market', time: '2 days ago' },
];

function HistoryCard({ item }: { item: HistoryItem }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={styles.iconBox}>
          <MaterialIcons name={ICON_MAP[item.type]} size={18} color={COLORS.primary} />
        </View>
        <View style={styles.cardText}>
          <Text style={styles.cardTag}>{TAG_MAP[item.type]}</Text>
          <Text style={styles.cardQuery} numberOfLines={2}>{item.query}</Text>
        </View>
      </View>
      <Text style={styles.cardTime}>{item.time}</Text>
    </View>
  );
}

export default function HistoryScreen() {
  if (SAMPLE.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <Text style={styles.title}>History</Text>
        </View>
        <View style={styles.empty}>
          <MaterialIcons name="history" size={56} color="#D0CBC3" />
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptySub}>Your voice queries will appear here</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <Text style={styles.subtitle}>{SAMPLE.length} conversations</Text>
      </View>
      <FlatList
        data={SAMPLE}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <HistoryCard item={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingTop: Platform.OS === 'android' ? 32 : 0,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 10,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(27,61,47,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardText: {
    flex: 1,
    gap: 4,
  },
  cardTag: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1.2,
  },
  cardQuery: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    lineHeight: 20,
  },
  cardTime: {
    fontSize: 11,
    color: COLORS.textSecondary,
    flexShrink: 0,
    marginLeft: 8,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingBottom: 60,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#555',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});
