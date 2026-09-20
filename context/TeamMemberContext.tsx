import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import type { TeamMember } from '@/lib/types';

type TeamMemberContextValue = {
  member: TeamMember | null;
  loading: boolean;
  signIn: (name: string, phone: string) => Promise<void>;
  updateName: (name: string) => Promise<void>;
};

const TeamMemberContext = createContext<TeamMemberContextValue | undefined>(undefined);

const STORAGE_KEY = 'restaurant_team_member_id';

async function getStorage(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  return AsyncStorage.getItem(key);
}

async function setStorage(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
    return;
  }
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  await AsyncStorage.setItem(key, value);
}

export function TeamMemberProvider({ children }: { children: ReactNode }) {
  const [member, setMember] = useState<TeamMember | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const storedId = await getStorage(STORAGE_KEY);
        if (storedId) {
          const { data } = await supabase
            .from('team_members')
            .select('*')
            .eq('id', storedId)
            .maybeSingle();
          if (data) {
            setMember(data as TeamMember);
          }
        }
      } catch {
        // ignore — user will sign in
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = async (name: string, phone: string) => {
    const { data, error } = await supabase.rpc('create_team_member', {
      p_name: name,
      p_phone: phone,
    });
    if (error) throw error;
    const newMember = data as TeamMember;
    await setStorage(STORAGE_KEY, newMember.id);
    setMember(newMember);
  };

  const updateName = async (name: string) => {
    if (!member) return;
    const { data, error } = await supabase
      .from('team_members')
      .update({ name })
      .eq('id', member.id)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (data) setMember(data as TeamMember);
  };

  return (
    <TeamMemberContext.Provider value={{ member, loading, signIn, updateName }}>
      {children}
    </TeamMemberContext.Provider>
  );
}

export function useTeamMember() {
  const ctx = useContext(TeamMemberContext);
  if (!ctx) throw new Error('useTeamMember must be used within TeamMemberProvider');
  return ctx;
}
