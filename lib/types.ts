export type TeamRole = 'admin' | 'member';

export type TeamMember = {
  id: string;
  name: string;
  color: string;
  role: TeamRole;
  phone: string | null;
  created_at: string;
};

export type Reservation = {
  id: string;
  name: string;
  party_size: number;
  phone: string;
  reservation_time: string;
  created_by: string | null;
  created_at: string;
};

export type DailyNote = {
  id: string;
  note: string;
  note_date: string;
  created_by: string | null;
  created_at: string;
};

export type FeedPost = {
  id: string;
  content: string;
  created_by: string | null;
  created_at: string;
};

export type ReservationWithMember = Reservation & {
  team_members: Pick<TeamMember, 'name' | 'color'> | null;
};

export type DailyNoteWithMember = DailyNote & {
  team_members: Pick<TeamMember, 'name' | 'color'> | null;
};

export type FeedPostWithMember = FeedPost & {
  team_members: Pick<TeamMember, 'name' | 'color'> | null;
};
