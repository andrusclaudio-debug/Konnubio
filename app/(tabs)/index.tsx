import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Linking,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  TextInput,
} from 'react-native';
import { Plus, Phone, Calendar, ChevronLeft, ChevronRight, Users, Clock, Trash2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import type { ReservationWithMember } from '@/lib/types';
import { useTeamMember } from '@/context/TeamMemberContext';
import { formatDateISO, formatTimeLabel, getDayLabel } from '@/lib/time';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Avatar } from '@/components/Avatar';

export default function ScheduleScreen() {
  const { member } = useTeamMember();
  const isAdmin = member?.role === 'admin';
  const [reservations, setReservations] = useState<ReservationWithMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);

  const dateKey = formatDateISO(selectedDate);

  const loadReservations = useCallback(async () => {
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('reservations')
      .select('*, team_members(name, color)')
      .gte('reservation_time', startOfDay.toISOString())
      .lte('reservation_time', endOfDay.toISOString())
      .order('reservation_time', { ascending: true });

    if (error) {
      console.error('Error loading reservations:', error.message);
    } else {
      setReservations(data as ReservationWithMember[]);
    }
    setLoading(false);
    setRefreshing(false);
  }, [selectedDate]);

  useEffect(() => {
    setLoading(true);
    loadReservations();
  }, [loadReservations]);

  const onRefresh = () => {
    setRefreshing(true);
    loadReservations();
  };

  const changeDay = (delta: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + delta);
    setSelectedDate(newDate);
  };

  const totalCovers = reservations.reduce((sum, r) => sum + r.party_size, 0);

  const handleCall = (phone: string) => {
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanPhone}`);
  };

  const handleDelete = async (id: string) => {
    setReservations((prev) => prev.filter((r) => r.id !== id));
    await supabase.rpc('delete_reservation', { p_reservation_id: id });
  };

  const renderItem = ({ item }: { item: ReservationWithMember }) => {
    const time = new Date(item.reservation_time);
    return (
      <View style={styles.card}>
        <View style={styles.timeColumn}>
          <Text style={styles.timeText}>{formatTimeLabel(time)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoColumn}>
          <Text style={styles.guestName}>{item.name}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Users size={12} color="#3B82F6" strokeWidth={2} />
              <Text style={styles.badgeText}>{item.party_size} {item.party_size === 1 ? 'guest' : 'guests'}</Text>
            </View>
            <Text style={styles.phoneText}>{item.phone}</Text>
          </View>
          {item.team_members && (
            <View style={styles.addedByRow}>
              <Avatar name={item.team_members.name} color={item.team_members.color} size={18} />
              <Text style={styles.addedByText}>Added by {item.team_members.name}</Text>
            </View>
          )}
        </View>
        <View style={styles.actionColumn}>
          <TouchableOpacity
            style={styles.callButton}
            onPress={() => handleCall(item.phone)}
            activeOpacity={0.7}
          >
            <Phone size={18} color="#3B82F6" strokeWidth={2} />
          </TouchableOpacity>
          {isAdmin && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDelete(item.id)}
              activeOpacity={0.7}
            >
              <Trash2 size={16} color="#EF4444" strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Reservations" subtitle={getDayLabel(selectedDate)} />

      <View style={styles.dateNav}>
        <TouchableOpacity onPress={() => changeDay(-1)} style={styles.navButton} activeOpacity={0.6}>
          <ChevronLeft size={22} color="#3B82F6" strokeWidth={2} />
        </TouchableOpacity>
        <View style={styles.dateCenter}>
          <Calendar size={16} color="#64748B" strokeWidth={2} />
          <Text style={styles.dateText}>
            {selectedDate.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </View>
        <TouchableOpacity onPress={() => changeDay(1)} style={styles.navButton} activeOpacity={0.6}>
          <ChevronRight size={22} color="#3B82F6" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{reservations.length}</Text>
          <Text style={styles.statLabel}>Bookings</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalCovers}</Text>
          <Text style={styles.statLabel}>Covers</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <FlatList
          data={reservations}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Calendar size={48} color="#CBD5E1" strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>No reservations yet</Text>
              <Text style={styles.emptySubtitle}>{isAdmin ? `Tap the + button to add one for ${getDayLabel(selectedDate)}` : 'Check back later for new bookings'}</Text>
            </View>
          }
        />
      )}

      {isAdmin && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowAddModal(true)}
          activeOpacity={0.85}
        >
          <Plus size={26} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>
      )}

      <AddReservationModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        selectedDate={selectedDate}
        memberId={member?.id ?? null}
        onAdded={loadReservations}
      />
    </View>
  );
}

function AddReservationModal({
  visible,
  onClose,
  selectedDate,
  memberId,
  onAdded,
}: {
  visible: boolean;
  onClose: () => void;
  selectedDate: Date;
  memberId: string | null;
  onAdded: () => void;
}) {
  const [name, setName] = useState('');
  const [partySize, setPartySize] = useState('2');
  const [phone, setPhone] = useState('');
  const [hour, setHour] = useState('18');
  const [minute, setMinute] = useState('00');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName('');
    setPartySize('2');
    setPhone('');
    setHour('18');
    setMinute('00');
    setError(null);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Please enter the guest name');
      return;
    }
    if (!phone.trim()) {
      setError('Please enter a phone number');
      return;
    }
    const party = parseInt(partySize, 10);
    if (isNaN(party) || party < 1) {
      setError('Number of people must be at least 1');
      return;
    }
    const hr = parseInt(hour, 10);
    const min = parseInt(minute, 10);
    if (isNaN(hr) || hr < 0 || hr > 23 || isNaN(min) || min < 0 || min > 59) {
      setError('Please enter a valid time');
      return;
    }

    setSaving(true);
    setError(null);

    const reservationDate = new Date(selectedDate);
    reservationDate.setHours(hr, min, 0, 0);

    const { error: insertError } = await supabase.from('reservations').insert({
      name: name.trim(),
      party_size: party,
      phone: phone.trim(),
      reservation_time: reservationDate.toISOString(),
      created_by: memberId,
    });

    setSaving(false);
    if (insertError) {
      setError('Could not save reservation. Please try again.');
      return;
    }
    reset();
    onClose();
    onAdded();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Reservation</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.inputLabel}>Guest Name</Text>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="e.g. John Smith"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.inputLabel}>Number of People</Text>
            <View style={styles.stepperRow}>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => setPartySize(String(Math.max(1, parseInt(partySize || '1', 10) - 1)))}
              >
                <Text style={styles.stepperBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{partySize}</Text>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => setPartySize(String(Math.min(50, parseInt(partySize || '1', 10) + 1)))}
              >
                <Text style={styles.stepperBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.textInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="e.g. (555) 123-4567"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>Time</Text>
            <View style={styles.timeRow}>
              <View style={styles.timeInputWrap}>
                <Text style={styles.timeLabel}>Hour</Text>
                <TextInput
                  style={styles.timeInput}
                  value={hour}
                  onChangeText={setHour}
                  placeholder="18"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
              <Text style={styles.timeColon}>:</Text>
              <View style={styles.timeInputWrap}>
                <Text style={styles.timeLabel}>Minute</Text>
                <TextInput
                  style={styles.timeInput}
                  value={minute}
                  onChangeText={setMinute}
                  placeholder="00"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Add Reservation</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  navButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
  },
  dateCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#0F172A',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
  },
  statValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    color: '#0F172A',
  },
  statLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
  },
  timeColumn: {
    width: 72,
    justifyContent: 'center',
  },
  timeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: '#0F172A',
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 12,
  },
  infoColumn: {
    flex: 1,
    gap: 6,
  },
  guestName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 17,
    color: '#0F172A',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#3B82F6',
  },
  phoneText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#64748B',
  },
  addedByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  addedByText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#94A3B8',
  },
  actionColumn: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 12,
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 17,
    color: '#475569',
    marginTop: 16,
  },
  emptySubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'web' ? 24 : 40,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 22,
    color: '#0F172A',
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    fontFamily: 'Inter-Medium',
    fontSize: 15,
    color: '#64748B',
  },
  inputLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#475569',
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperBtnText: {
    fontFamily: 'Inter-Bold',
    fontSize: 22,
    color: '#3B82F6',
  },
  stepperValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    color: '#0F172A',
    minWidth: 50,
    textAlign: 'center',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  timeInputWrap: {
    flex: 1,
  },
  timeLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 6,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    textAlign: 'center',
  },
  timeColon: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#94A3B8',
    paddingBottom: 14,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  errorText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#EF4444',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
