import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Plus, Calendar, ChevronLeft, ChevronRight, Trash2, Users, ClipboardList } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import type { DailyNoteWithMember, ReservationWithMember } from '@/lib/types';
import { useTeamMember } from '@/context/TeamMemberContext';
import { formatDateISO, getDayLabel, formatRelativeTime } from '@/lib/time';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Avatar } from '@/components/Avatar';

export default function NotesScreen() {
  const { member } = useTeamMember();
  const [notes, setNotes] = useState<DailyNoteWithMember[]>([]);
  const [reservations, setReservations] = useState<ReservationWithMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);

  const dateKey = formatDateISO(selectedDate);

  const loadData = useCallback(async () => {
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const [notesRes, reservationsRes] = await Promise.all([
      supabase
        .from('daily_notes')
        .select('*, team_members(name, color)')
        .eq('note_date', dateKey)
        .order('created_at', { ascending: false }),
      supabase
        .from('reservations')
        .select('*, team_members(name, color)')
        .gte('reservation_time', startOfDay.toISOString())
        .lte('reservation_time', endOfDay.toISOString()),
    ]);

    if (notesRes.error) {
      console.error('Error loading notes:', notesRes.error.message);
    } else {
      setNotes(notesRes.data as DailyNoteWithMember[]);
    }

    if (reservationsRes.error) {
      console.error('Error loading reservations:', reservationsRes.error.message);
    } else {
      setReservations(reservationsRes.data as ReservationWithMember[]);
    }

    setLoading(false);
    setRefreshing(false);
  }, [selectedDate, dateKey]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const changeDay = (delta: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + delta);
    setSelectedDate(newDate);
  };

  const totalCovers = reservations.reduce((sum, r) => sum + r.party_size, 0);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('daily_notes').insert({
      note: newNote.trim(),
      note_date: dateKey,
      created_by: member?.id ?? null,
    });
    setSaving(false);
    if (error) {
      console.error('Error saving note:', error.message);
      return;
    }
    setNewNote('');
    loadData();
  };

  const handleDeleteNote = async (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    await supabase.rpc('delete_daily_note', { p_note_id: id });
  };

  const renderNote = ({ item }: { item: DailyNoteWithMember }) => (
    <View style={styles.noteCard}>
      <View style={styles.noteHeader}>
        <View style={styles.noteAuthorRow}>
          {item.team_members ? (
            <Avatar name={item.team_members.name} color={item.team_members.color} size={28} />
          ) : (
            <View style={styles.anonymousAvatar}>
              <ClipboardList size={14} color="#94A3B8" strokeWidth={2} />
            </View>
          )}
          <View>
            <Text style={styles.noteAuthor}>{item.team_members?.name ?? 'Unknown'}</Text>
            <Text style={styles.noteTime}>{formatRelativeTime(item.created_at)}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => handleDeleteNote(item.id)} style={styles.deleteBtn}>
          <Trash2 size={16} color="#EF4444" strokeWidth={2} />
        </TouchableOpacity>
      </View>
      <Text style={styles.noteText}>{item.note}</Text>
    </View>
  );

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Daily Notes" subtitle={getDayLabel(selectedDate)} />

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

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <View style={[styles.summaryIcon, { backgroundColor: '#EFF6FF' }]}>
            <ClipboardList size={20} color="#3B82F6" strokeWidth={2} />
          </View>
          <View>
            <Text style={styles.summaryValue}>{reservations.length}</Text>
            <Text style={styles.summaryLabel}>Total Bookings</Text>
          </View>
        </View>
        <View style={styles.summaryCard}>
          <View style={[styles.summaryIcon, { backgroundColor: '#F0FDF4' }]}>
            <Users size={20} color="#10B981" strokeWidth={2} />
          </View>
          <View>
            <Text style={styles.summaryValue}>{totalCovers}</Text>
            <Text style={styles.summaryLabel}>Total Covers</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          renderItem={renderNote}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <ClipboardList size={48} color="#CBD5E1" strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>No notes for this day</Text>
              <Text style={styles.emptySubtitle}>Write a note below to log daily operations</Text>
            </View>
          }
        />
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'web' ? undefined : 'padding'}
        keyboardVerticalOffset={80}
      >
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={newNote}
            onChangeText={setNewNote}
            placeholder="Add a daily note..."
            placeholderTextColor="#94A3B8"
            multiline
            maxLength={500}
            editable={!saving}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!newNote.trim() || saving) && styles.sendBtnDisabled]}
            onPress={handleAddNote}
            disabled={!newNote.trim() || saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Plus size={22} color="#FFFFFF" strokeWidth={2.5} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
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
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  summaryCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
  },
  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#0F172A',
  },
  summaryLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  noteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  noteAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  flex: 1,
  },
  anonymousAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noteAuthor: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#0F172A',
  },
  noteTime: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 1,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noteText: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: '#334155',
    lineHeight: 22,
  marginTop: 4,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
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
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    maxHeight: 100,
    minHeight: 46,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
});
