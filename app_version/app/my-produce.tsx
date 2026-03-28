import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

const COLORS = {
  bg: '#F2EFE9',
  primary: '#1B3D2F',
  card: '#E8E5DF',
  white: '#FFFFFF',
  textSecondary: '#999',
  active: '#27AE60',
  pending: '#F39C12',
  sold: '#888',
};

type Status = 'active' | 'pending' | 'sold';

type Listing = {
  id: string;
  crop: string;
  emoji: string;
  qty: number;
  unit: string;
  pricePerUnit: number;
  status: Status;
  location: string;
  date: string;
  buyer?: string;
};

const INITIAL_LISTINGS: Listing[] = [
  {
    id: '1',
    crop: 'Maize',
    emoji: '🌽',
    qty: 5,
    unit: 'bags',
    pricePerUnit: 340,
    status: 'active',
    location: 'Kumasi',
    date: '2 days ago',
  },
  {
    id: '2',
    crop: 'Cassava',
    emoji: '🌿',
    qty: 10,
    unit: 'bags',
    pricePerUnit: 75,
    status: 'pending',
    location: 'Accra',
    date: '5 days ago',
    buyer: 'Kwame Asante',
  },
  {
    id: '3',
    crop: 'Plantain',
    emoji: '🍌',
    qty: 8,
    unit: 'bunches',
    pricePerUnit: 45,
    status: 'sold',
    location: 'Tamale',
    date: '1 week ago',
    buyer: 'Ama Owusu',
  },
  {
    id: '4',
    crop: 'Yam',
    emoji: '🍠',
    qty: 3,
    unit: 'bags',
    pricePerUnit: 295,
    status: 'active',
    location: 'Kumasi',
    date: '3 days ago',
  },
];

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string; icon: keyof typeof MaterialIcons.glyphMap }> = {
  active:  { label: 'Active',  color: COLORS.active,  bg: '#E8F5E9', icon: 'check-circle' },
  pending: { label: 'Pending', color: COLORS.pending, bg: '#FEF9E7', icon: 'schedule' },
  sold:    { label: 'Sold',    color: COLORS.sold,    bg: '#F5F5F5', icon: 'done-all' },
};

const CROPS_LIST = [
  { name: 'Maize', emoji: '🌽', unit: 'bags' },
  { name: 'Yam', emoji: '🍠', unit: 'bags' },
  { name: 'Tomato', emoji: '🍅', unit: 'crates' },
  { name: 'Cassava', emoji: '🌿', unit: 'bags' },
  { name: 'Plantain', emoji: '🍌', unit: 'bunches' },
  { name: 'Rice', emoji: '🍚', unit: 'bags' },
  { name: 'Pepper', emoji: '🌶️', unit: 'bags' },
  { name: 'Groundnut', emoji: '🥜', unit: 'bags' },
];

function ListingCard({ listing, onDelete }: { listing: Listing; onDelete: (id: string) => void }) {
  const status = STATUS_CONFIG[listing.status];
  const totalValue = listing.qty * listing.pricePerUnit;

  return (
    <View style={styles.listingCard}>
      <View style={styles.listingHeader}>
        <View style={styles.listingLeft}>
          <Text style={styles.listingEmoji}>{listing.emoji}</Text>
          <View>
            <Text style={styles.listingCrop}>{listing.crop}</Text>
            <View style={styles.listingMeta}>
              <MaterialIcons name="location-on" size={11} color={COLORS.textSecondary} />
              <Text style={styles.listingMetaText}>{listing.location} · {listing.date}</Text>
            </View>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <MaterialIcons name={status.icon} size={12} color={status.color} />
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      <View style={styles.listingDetails}>
        <View style={styles.detailCell}>
          <Text style={styles.detailLabel}>QUANTITY</Text>
          <Text style={styles.detailValue}>{listing.qty} {listing.unit}</Text>
        </View>
        <View style={styles.detailDivider} />
        <View style={styles.detailCell}>
          <Text style={styles.detailLabel}>PRICE / UNIT</Text>
          <Text style={styles.detailValue}>GHS {listing.pricePerUnit}</Text>
        </View>
        <View style={styles.detailDivider} />
        <View style={styles.detailCell}>
          <Text style={styles.detailLabel}>TOTAL VALUE</Text>
          <Text style={[styles.detailValue, styles.totalValue]}>GHS {totalValue}</Text>
        </View>
      </View>

      {listing.buyer && (
        <View style={styles.buyerRow}>
          <MaterialIcons name="person" size={14} color={COLORS.primary} />
          <Text style={styles.buyerText}>
            {listing.status === 'sold' ? 'Bought by' : 'Interested:'} {listing.buyer}
          </Text>
        </View>
      )}

      {listing.status !== 'sold' && (
        <View style={styles.listingActions}>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => Alert.alert('Remove listing', 'Remove this listing?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Remove', style: 'destructive', onPress: () => onDelete(listing.id) },
            ])}
          >
            <MaterialIcons name="delete-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.deleteBtnText}>Remove</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.markSoldBtn}
            onPress={() => Alert.alert('Mark as sold', 'Mark this listing as sold?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Mark Sold', onPress: () => {} },
            ])}
          >
            <Text style={styles.markSoldText}>Mark as Sold</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function MyProduceScreen() {
  const [listings, setListings] = useState<Listing[]>(INITIAL_LISTINGS);
  const [showModal, setShowModal] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState(CROPS_LIST[0]);
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');

  const active  = listings.filter(l => l.status === 'active').length;
  const pending = listings.filter(l => l.status === 'pending').length;
  const sold    = listings.filter(l => l.status === 'sold').length;

  const removeListing = (id: string) => {
    setListings((prev) => prev.filter((l) => l.id !== id));
  };

  const postListing = () => {
    if (!qty || !price || !location) {
      Alert.alert('Missing info', 'Please fill in all fields.');
      return;
    }
    const newListing: Listing = {
      id: Date.now().toString(),
      crop: selectedCrop.name,
      emoji: selectedCrop.emoji,
      qty: parseInt(qty),
      unit: selectedCrop.unit,
      pricePerUnit: parseInt(price),
      status: 'active',
      location,
      date: 'Just now',
    };
    setListings((prev) => [newListing, ...prev]);
    setShowModal(false);
    setQty('');
    setPrice('');
    setLocation('');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Produce</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <MaterialIcons name="add" size={22} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: COLORS.active }]}>{active}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: COLORS.pending }]}>{pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: COLORS.sold }]}>{sold}</Text>
          <Text style={styles.statLabel}>Sold</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: COLORS.primary }]}>{listings.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      {/* Listings */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {listings.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📦</Text>
            <Text style={styles.emptyTitle}>No listings yet</Text>
            <Text style={styles.emptySub}>Tap + to post your first produce listing</Text>
          </View>
        ) : (
          listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} onDelete={removeListing} />
          ))
        )}
      </ScrollView>

      {/* Post Listing button */}
      <View style={styles.fabContainer}>
        <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)} activeOpacity={0.85}>
          <MaterialIcons name="add" size={22} color={COLORS.white} />
          <Text style={styles.fabText}>Post New Listing</Text>
        </TouchableOpacity>
      </View>

      {/* New listing modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Post a Listing</Text>

            {/* Crop selector */}
            <Text style={styles.inputLabel}>CROP</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cropScroll}>
              {CROPS_LIST.map((crop) => (
                <TouchableOpacity
                  key={crop.name}
                  style={[styles.cropChip, selectedCrop.name === crop.name && styles.cropChipActive]}
                  onPress={() => setSelectedCrop(crop)}
                >
                  <Text style={styles.cropChipEmoji}>{crop.emoji}</Text>
                  <Text style={[styles.cropChipText, selectedCrop.name === crop.name && styles.cropChipTextActive]}>
                    {crop.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>QUANTITY ({selectedCrop.unit})</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 5"
              keyboardType="numeric"
              value={qty}
              onChangeText={setQty}
              placeholderTextColor={COLORS.textSecondary}
            />

            <Text style={styles.inputLabel}>PRICE PER {selectedCrop.unit.toUpperCase().slice(0, -1)} (GHS)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 340"
              keyboardType="numeric"
              value={price}
              onChangeText={setPrice}
              placeholderTextColor={COLORS.textSecondary}
            />

            <Text style={styles.inputLabel}>LOCATION</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Kumasi"
              value={location}
              onChangeText={setLocation}
              placeholderTextColor={COLORS.textSecondary}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.postBtn} onPress={postListing}>
                <Text style={styles.postBtnText}>Post Listing</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Stats
  statsBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 10, color: COLORS.textSecondary, marginTop: 2, fontWeight: '600' },
  statDivider: { width: 1, height: 30, backgroundColor: '#EBEBEB' },

  // List
  list: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 12,
  },

  // Empty
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#555', marginTop: 8 },
  emptySub: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },

  // Listing card
  listingCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 16,
  },
  listingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  listingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  listingEmoji: { fontSize: 32 },
  listingCrop: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  listingMeta: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
  listingMetaText: { fontSize: 11, color: COLORS.textSecondary },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  statusText: { fontSize: 11, fontWeight: '700' },

  listingDetails: {
    flexDirection: 'row',
    backgroundColor: '#F2EFE9',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  detailCell: { flex: 1, alignItems: 'center' },
  detailLabel: { fontSize: 9, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 0.5 },
  detailValue: { fontSize: 14, fontWeight: '700', color: COLORS.primary, marginTop: 3 },
  totalValue: { color: COLORS.active },
  detailDivider: { width: 1, height: 28, backgroundColor: '#D5D0C8' },

  buyerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  buyerText: { fontSize: 12, color: COLORS.primary, fontWeight: '500' },

  listingActions: {
    flexDirection: 'row',
    gap: 8,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  deleteBtnText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  markSoldBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  markSoldText: { fontSize: 13, color: COLORS.white, fontWeight: '700' },

  // FAB
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
  },
  fab: {
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: { fontSize: 16, fontWeight: '700', color: COLORS.white },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#DDD',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1.2,
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: '#F2EFE9',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '500',
  },

  cropScroll: { marginBottom: 4 },
  cropChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F2EFE9',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  cropChipActive: { backgroundColor: COLORS.primary },
  cropChipEmoji: { fontSize: 18 },
  cropChipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  cropChipTextActive: { color: COLORS.white },

  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#F2EFE9',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
  postBtn: {
    flex: 2,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  postBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.white },
});
