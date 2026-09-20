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
import { Plus, MessageSquare, Trash2, Send } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import type { FeedPostWithMember } from '@/lib/types';
import { useTeamMember } from '@/context/TeamMemberContext';
import { formatRelativeTime } from '@/lib/time';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Avatar } from '@/components/Avatar';

export default function FeedScreen() {
  const { member } = useTeamMember();
  const isAdmin = member?.role === 'admin';
  const [posts, setPosts] = useState<FeedPostWithMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newPost, setNewPost] = useState('');
  const [saving, setSaving] = useState(false);

  const loadPosts = useCallback(async () => {
    const { data, error } = await supabase
      .from('feed_posts')
      .select('*, team_members(name, color)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error loading feed:', error.message);
    } else {
      setPosts(data as FeedPostWithMember[]);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPosts();
  };

  const handlePost = async () => {
    if (!newPost.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('feed_posts').insert({
      content: newPost.trim(),
      created_by: member?.id ?? null,
    });
    setSaving(false);
    if (error) {
      console.error('Error posting:', error.message);
      return;
    }
    setNewPost('');
    loadPosts();
  };

  const handleDelete = async (id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
    await supabase.rpc('delete_feed_post', { p_post_id: id });
  };

  const renderPost = ({ item }: { item: FeedPostWithMember }) => (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={styles.authorRow}>
          {item.team_members ? (
            <Avatar name={item.team_members.name} color={item.team_members.color} size={36} />
          ) : (
            <View style={styles.anonymousAvatar}>
              <MessageSquare size={16} color="#94A3B8" strokeWidth={2} />
            </View>
          )}
          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>{item.team_members?.name ?? 'Unknown'}</Text>
            <Text style={styles.postTime}>{formatRelativeTime(item.created_at)}</Text>
          </View>
        </View>
        {(isAdmin || item.created_by === member?.id) && (
        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
          <Trash2 size={16} color="#EF4444" strokeWidth={2} />
        </TouchableOpacity>
        )}
      </View>
      <Text style={styles.postContent}>{item.content}</Text>
    </View>
  );

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Team Feed" subtitle="Shared updates for the whole team" />

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderPost}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MessageSquare size={48} color="#CBD5E1" strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>No posts yet</Text>
              <Text style={styles.emptySubtitle}>Share an announcement with the team below</Text>
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
            value={newPost}
            onChangeText={setNewPost}
            placeholder="Post an announcement..."
            placeholderTextColor="#94A3B8"
            multiline
            maxLength={1000}
            editable={!saving}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!newPost.trim() || saving) && styles.sendBtnDisabled]}
            onPress={handlePost}
            disabled={!newPost.trim() || saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Send size={20} color="#FFFFFF" strokeWidth={2} />
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
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    paddingTop: 8,
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  anonymousAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: '#0F172A',
  },
  postTime: {
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
  postContent: {
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
