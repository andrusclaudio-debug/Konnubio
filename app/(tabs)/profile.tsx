import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import { User, Check, MessageSquare, Calendar, ClipboardList, Shield, Crown, Users, Phone } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useTeamMember } from '@/context/TeamMemberContext';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Avatar } from '@/components/Avatar';
import type { TeamMember } from '@/lib/types';

export default function ProfileScreen() {
  const { member, loading, signIn, updateName } = useTeamMember();
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [editName, setEditName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Profile" />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </View>
    );
  }

  const handleSignIn = async () => {
    if (!nameInput.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!phoneInput.trim()) {
      setError('Please enter your phone number');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await signIn(nameInput.trim(), phoneInput.trim());
      setNameInput('');
      setPhoneInput('');
    } catch {
      setError('Could not set up your profile. Please try again.');
    }
    setSaving(false);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await updateName(editName.trim());
      setIsEditing(false);
    } catch {
      setError('Could not update your name. Please try again.');
    }
    setSaving(false);
  };

  if (!member) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Welcome" subtitle="Tell us who you are to get started" />
        <ScrollView contentContainerStyle={styles.signInContent}>
          <View style={styles.signInCard}>
            <View style={styles.signInIconWrap}>
              <User size={40} color="#3B82F6" strokeWidth={2} />
            </View>
            <Text style={styles.signInTitle}>Join the Team</Text>
            <Text style={styles.signInSubtitle}>
              Enter your name and phone to join. The first person to sign in becomes the admin.
            </Text>
            <Text style={styles.inputLabel}>Your Name</Text>
            <TextInput
              style={styles.signInInput}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="e.g. Marco Rossi"
              placeholderTextColor="#94A3B8"
              autoCapitalize="words"
              autoCorrect={false}
            />
            <Text style={styles.inputLabel}>Your Phone</Text>
            <TextInput
              style={styles.signInInput}
              value={phoneInput}
              onChangeText={setPhoneInput}
              placeholder="e.g. +39 333 1234567"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
              autoCorrect={false}
            />
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
            <TouchableOpacity
              style={[styles.signInBtn, saving && styles.signInBtnDisabled]}
              onPress={handleSignIn}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.signInBtnText}>Get Started</Text>
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.credit}>Designed by Adyra.co</Text>
        </ScrollView>
      </View>
    );
  }

  const isAdmin = member.role === 'admin';

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Profile" />
      <ScrollView contentContainerStyle={styles.profileContent}>
        <View style={styles.profileCard}>
          <Avatar name={member.name} color={member.color} size={72} />
          <View style={styles.roleBadgeRow}>
            <View style={[styles.roleBadge, isAdmin ? styles.adminBadge : styles.memberBadge]}>
              {isAdmin ? (
                <Crown size={13} color="#FFFFFF" strokeWidth={2} />
              ) : (
                <User size={13} color="#FFFFFF" strokeWidth={2} />
              )}
              <Text style={styles.roleBadgeText}>{isAdmin ? 'Admin' : 'Member'}</Text>
            </View>
          </View>
          {isEditing ? (
            <View style={styles.editRow}>
              <TextInput
                style={styles.editInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Your name"
                placeholderTextColor="#94A3B8"
                autoCapitalize="words"
                autoFocus
              />
              <TouchableOpacity
                style={[styles.saveEditBtn, saving && styles.saveEditBtnDisabled]}
                onPress={handleSaveEdit}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Check size={20} color="#FFFFFF" strokeWidth={2} />
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.nameRow}>
              <Text style={styles.profileName}>{member.name}</Text>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => {
                  setEditName(member.name);
                  setIsEditing(true);
                }}
              >
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>
          )}
          {member.phone && (
            <View style={styles.phoneRow}>
              <Phone size={14} color="#94A3B8" strokeWidth={2} />
              <Text style={styles.phoneText}>{member.phone}</Text>
            </View>
          )}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </View>

        {isAdmin && <TeamManagementSection />}

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>
            {isAdmin ? 'What you can do' : 'Your access'}
          </Text>
          <View style={styles.infoItem}>
            <View style={[styles.infoIcon, { backgroundColor: '#EFF6FF' }]}>
              <Calendar size={20} color="#3B82F6" strokeWidth={2} />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>Reservations</Text>
              <Text style={styles.infoDesc}>
                {isAdmin
                  ? 'Add bookings, call customers, and manage the schedule'
                  : 'View the daily schedule and call customers'}
              </Text>
            </View>
          </View>
          {isAdmin && (
            <View style={styles.infoItem}>
              <View style={[styles.infoIcon, { backgroundColor: '#F0FDF4' }]}>
                <ClipboardList size={20} color="#10B981" strokeWidth={2} />
              </View>
              <View style={styles.infoText}>
                <Text style={styles.infoTitle}>Daily Notes</Text>
                <Text style={styles.infoDesc}>Log operations and see daily summaries</Text>
              </View>
            </View>
          )}
          <View style={styles.infoItem}>
            <View style={[styles.infoIcon, { backgroundColor: '#FEF3C7' }]}>
              <MessageSquare size={20} color="#F59E0B" strokeWidth={2} />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>Team Feed</Text>
              <Text style={styles.infoDesc}>Post and read team announcements</Text>
            </View>
          </View>
        </View>

        <Text style={styles.credit}>Designed by Adyra.co</Text>
      </ScrollView>
    </View>
  );
}

function TeamManagementSection() {
  const { member } = useTeamMember();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMembers = useCallback(async () => {
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading members:', error.message);
    } else {
      setMembers(data as TeamMember[]);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const onRefresh = () => {
    setRefreshing(true);
    loadMembers();
  };

  const handleToggleRole = (target: TeamMember) => {
    const newRole = target.role === 'admin' ? 'member' : 'admin';
    Alert.alert(
      newRole === 'admin' ? 'Promote to Admin' : 'Demote to Member',
      newRole === 'admin'
        ? `Give ${target.name} full admin access? They will be able to manage reservations, notes, and team roles.`
        : `Remove admin access from ${target.name}? They will only be able to view bookings and use the feed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: newRole === 'admin' ? 'default' : 'destructive',
          onPress: async () => {
            const { error } = await supabase.rpc('set_member_role', {
              p_member_id: target.id,
              p_role: newRole,
            });
            if (error) {
              Alert.alert('Error', 'Could not update role. ' + (error.message || ''));
            } else {
              loadMembers();
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: TeamMember }) => {
    const isSelf = item.id === member?.id;
    const isOnlyAdmin = item.role === 'admin' && members.filter((m) => m.role === 'admin').length <= 1;

    return (
      <View style={styles.memberRow}>
        <Avatar name={item.name} color={item.color} size={40} />
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>
            {item.name} {isSelf && <Text style={styles.selfLabel}>(you)</Text>}
          </Text>
          <View style={[styles.roleTag, item.role === 'admin' ? styles.adminTag : styles.memberTag]}>
            {item.role === 'admin' ? (
              <Crown size={10} color="#FFFFFF" strokeWidth={2} />
            ) : (
              <User size={10} color="#FFFFFF" strokeWidth={2} />
            )}
            <Text style={styles.roleTagText}>{item.role === 'admin' ? 'Admin' : 'Member'}</Text>
          </View>
        </View>
        {!isSelf && !isOnlyAdmin && (
          <TouchableOpacity
            style={item.role === 'admin' ? styles.demoteBtn : styles.promoteBtn}
            onPress={() => handleToggleRole(item)}
          >
            <Text style={item.role === 'admin' ? styles.demoteBtnText : styles.promoteBtnText}>
              {item.role === 'admin' ? 'Make Member' : 'Make Admin'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.teamSection}>
        <View style={styles.teamHeader}>
          <Shield size={18} color="#3B82F6" strokeWidth={2} />
          <Text style={styles.teamTitle}>Team Management</Text>
        </View>
        <ActivityIndicator size="small" color="#3B82F6" style={{ marginTop: 16 }} />
      </View>
    );
  }

  return (
    <View style={styles.teamSection}>
      <View style={styles.teamHeader}>
        <Shield size={18} color="#3B82F6" strokeWidth={2} />
        <Text style={styles.teamTitle}>Team Management</Text>
      </View>
      <Text style={styles.teamSubtitle}>
        Promote team members to admin so they can manage reservations and notes, or demote them to member for view-only access.
      </Text>
      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        scrollEnabled={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInContent: {
    padding: 24,
    flexGrow: 1,
    justifyContent: 'center',
  },
  signInCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
  },
  signInIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  signInTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#0F172A',
    marginBottom: 8,
  },
  signInSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  inputLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: '#475569',
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  signInInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    marginBottom: 16,
  },
  signInBtn: {
    width: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  signInBtnDisabled: {
    opacity: 0.6,
  },
  signInBtnText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  profileContent: {
    padding: 20,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
    marginBottom: 24,
  },
  roleBadgeRow: {
    marginTop: 12,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  adminBadge: {
    backgroundColor: '#3B82F6',
  },
  memberBadge: {
    backgroundColor: '#94A3B8',
  },
  roleBadgeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  profileName: {
    fontFamily: 'Inter-Bold',
    fontSize: 22,
    color: '#0F172A',
    marginTop: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
  },
  editBtnText: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: '#3B82F6',
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    minWidth: 180,
  },
  saveEditBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveEditBtnDisabled: {
    opacity: 0.6,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  phoneText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#94A3B8',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
    width: '100%',
  },
  errorText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
  },
  teamSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  teamTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#0F172A',
  },
  teamSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: '#0F172A',
  },
  selfLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#94A3B8',
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  adminTag: {
    backgroundColor: '#3B82F6',
  },
  memberTag: {
    backgroundColor: '#94A3B8',
  },
  roleTagText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  promoteBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  promoteBtnText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#3B82F6',
  },
  demoteBtn: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  demoteBtnText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#EF4444',
  },
  infoSection: {
    gap: 12,
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#475569',
    marginBottom: 4,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
  },
  infoIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
  },
  infoTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: '#0F172A',
  },
  infoDesc: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  credit: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 24,
    letterSpacing: 0.5,
  },
});
