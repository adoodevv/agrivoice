import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

const BACKEND_URL = 'https://c2a1-154-161-121-113.ngrok-free.app';

const COLORS = {
  bg: '#F2EFE9',
  primary: '#1B3D2F',
  card: '#E8E5DF',
  white: '#FFFFFF',
  textSecondary: '#999',
  up: '#27AE60',
  down: '#C0392B',
  stable: '#888',
};

type City = 'All' | 'Accra' | 'Kumasi' | 'Tamale';

type Crop = {
  name: string;
  emoji: string;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  change: string;
  prices: Record<'Accra' | 'Kumasi' | 'Tamale', number>;
  category: string;
};

const CROPS: Crop[] = [
  {
    name: 'Maize',
    emoji: '🌽',
    unit: 'bag',
    trend: 'up',
    change: '+5%',
    category: 'Grains',
    prices: { Accra: 340, Kumasi: 320, Tamale: 300 },
  },
  {
    name: 'Yam',
    emoji: '🍠',
    unit: 'bag',
    trend: 'down',
    change: '-3%',
    category: 'Tubers',
    prices: { Accra: 320, Kumasi: 295, Tamale: 270 },
  },
  {
    name: 'Tomato',
    emoji: '🍅',
    unit: 'crate',
    trend: 'up',
    change: '+8%',
    category: 'Vegetables',
    prices: { Accra: 150, Kumasi: 138, Tamale: 125 },
  },
  {
    name: 'Cassava',
    emoji: '🌿',
    unit: 'bag',
    trend: 'stable',
    change: '0%',
    category: 'Tubers',
    prices: { Accra: 85, Kumasi: 75, Tamale: 65 },
  },
  {
    name: 'Plantain',
    emoji: '🍌',
    unit: 'bunch',
    trend: 'up',
    change: '+12%',
    category: 'Fruits',
    prices: { Accra: 55, Kumasi: 45, Tamale: 40 },
  },
  {
    name: 'Pepper',
    emoji: '🌶️',
    unit: 'bag',
    trend: 'down',
    change: '-6%',
    category: 'Vegetables',
    prices: { Accra: 210, Kumasi: 195, Tamale: 175 },
  },
  {
    name: 'Groundnut',
    emoji: '🥜',
    unit: 'bag',
    trend: 'stable',
    change: '+1%',
    category: 'Legumes',
    prices: { Accra: 420, Kumasi: 400, Tamale: 380 },
  },
  {
    name: 'Rice',
    emoji: '🍚',
    unit: 'bag',
    trend: 'up',
    change: '+4%',
    category: 'Grains',
    prices: { Accra: 580, Kumasi: 560, Tamale: 540 },
  },
];

const CITIES: City[] = ['All', 'Accra', 'Kumasi', 'Tamale'];

const TREND_ICON: Record<Crop['trend'], keyof typeof MaterialIcons.glyphMap> = {
  up: 'trending-up',
  down: 'trending-down',
  stable: 'trending-flat',
};

function CropCard({ crop, city }: { crop: Crop; city: City }) {
  const trendColor =
    crop.trend === 'up' ? COLORS.up : crop.trend === 'down' ? COLORS.down : COLORS.stable;

  const showCities: Array<'Accra' | 'Kumasi' | 'Tamale'> =
    city === 'All' ? ['Accra', 'Kumasi', 'Tamale'] : [city];

  return (
    <View style={styles.cropCard}>
      <View style={styles.cropHeader}>
        <View style={styles.cropLeft}>
          <Text style={styles.cropEmoji}>{crop.emoji}</Text>
          <View>
            <Text style={styles.cropName}>{crop.name}</Text>
            <Text style={styles.cropCategory}>{crop.category}</Text>
          </View>
        </View>
        <View style={styles.cropTrend}>
          <MaterialIcons name={TREND_ICON[crop.trend]} size={16} color={trendColor} />
          <Text style={[styles.cropChange, { color: trendColor }]}>{crop.change}</Text>
        </View>
      </View>

      <View style={styles.priceRow}>
        {showCities.map((c) => (
          <View key={c} style={[styles.priceCell, city !== 'All' && styles.priceCellSingle]}>
            <Text style={styles.cityName}>{c}</Text>
            <Text style={styles.priceValue}>GHS {crop.prices[c]}</Text>
            <Text style={styles.priceUnit}>per {crop.unit}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function MarketPricesScreen() {
  const [selectedCity, setSelectedCity] = useState<City>('All');
  const [crops, setCrops] = useState<Crop[]>(CROPS);
  const [lastUpdated, setLastUpdated] = useState('Today, 8:00 AM');
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/market/prices`)
      .then((r) => r.json())
      .then((data) => {
        const prices = data.prices as Record<string, Record<string, { price: number; unit: string }>>;
        setCrops((prev) =>
          prev.map((crop) => {
            const key = crop.name.toLowerCase();
            if (prices[key]) {
              return {
                ...crop,
                prices: {
                  Accra:  prices[key].accra?.price  ?? crop.prices.Accra,
                  Kumasi: prices[key].kumasi?.price ?? crop.prices.Kumasi,
                  Tamale: prices[key].tamale?.price ?? crop.prices.Tamale,
                },
              };
            }
            return crop;
          })
        );
        const now = new Date();
        setLastUpdated(
          now.toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' }) + ' (live)'
        );
        setIsLive(true);
      })
      .catch(() => {});
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Market Prices</Text>
          {isLive && (
            <View style={styles.liveTag}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          )}
        </View>
        <MaterialIcons name="trending-up" size={24} color={COLORS.primary} />
      </View>

      {/* City filter */}
      <View style={styles.cityFilter}>
        {CITIES.map((city) => (
          <TouchableOpacity
            key={city}
            style={[styles.cityPill, selectedCity === city && styles.cityPillActive]}
            onPress={() => setSelectedCity(city)}
            activeOpacity={0.8}
          >
            <Text style={[styles.cityPillText, selectedCity === city && styles.cityPillTextActive]}>
              {city}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Last updated */}
      <Text style={styles.lastUpdated}>Updated: {lastUpdated} · Prices in GHS</Text>

      {/* Crop list */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {crops.map((crop) => (
          <CropCard key={crop.name} crop={crop} city={selectedCity} />
        ))}
        <Text style={styles.disclaimer}>
          Prices are indicative. Actual market prices may vary by seller and quality.
        </Text>
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.up,
  },
  liveText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.up,
    letterSpacing: 1,
  },

  // City filter
  cityFilter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 8,
  },
  cityPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    alignItems: 'center',
  },
  cityPillActive: {
    backgroundColor: COLORS.primary,
  },
  cityPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  cityPillTextActive: {
    color: COLORS.white,
  },

  lastUpdated: {
    fontSize: 10,
    color: COLORS.textSecondary,
    paddingHorizontal: 24,
    marginBottom: 12,
    letterSpacing: 0.3,
  },

  // List
  list: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 12,
  },

  // Crop card
  cropCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 16,
  },
  cropHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cropLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cropEmoji: {
    fontSize: 32,
  },
  cropName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  cropCategory: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  cropTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cropChange: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Price cells
  priceRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priceCell: {
    flex: 1,
    backgroundColor: '#F2EFE9',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  priceCellSingle: {
    paddingVertical: 16,
  },
  cityName: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  priceUnit: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  disclaimer: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 16,
    marginTop: 4,
  },
});
