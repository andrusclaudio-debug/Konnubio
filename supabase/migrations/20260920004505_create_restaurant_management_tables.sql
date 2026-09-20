/*
# Create Restaurant Team Management Tables

## Overview
This migration creates the core tables for a restaurant team management and bookings app.
The app has no sign-in screen — all team members share the same data. This is a
single-tenant, no-auth schema: policies use `TO anon, authenticated` so the
anon-key frontend client can read and write.

## New Tables

### 1. team_members
- `id` (uuid, primary key) — unique identifier for each team member
- `name` (text, not null) — display name of the team member
- `color` (text, not null, default '#3B82F6') — avatar color for visual identification
- `created_at` (timestamptz, default now()) — when the member was created

### 2. reservations
- `id` (uuid, primary key) — unique identifier
- `name` (text, not null) — customer name for the reservation
- `party_size` (integer, not null) — number of people / covers
- `phone` (text, not null) — customer phone number for contact
- `reservation_time` (timestamptz, not null) — date and time of the reservation
- `created_by` (uuid, references team_members, nullable) — which team member added it
- `created_at` (timestamptz, default now()) — when the reservation was logged
- Index on `reservation_time` for efficient daily schedule queries

### 3. daily_notes
- `id` (uuid, primary key) — unique identifier
- `note` (text, not null) — the operational note content
- `note_date` (date, not null) — which day this note belongs to
- `created_by` (uuid, references team_members, nullable) — which team member wrote it
- `created_at` (timestamptz, default now()) — when the note was posted
- Index on `note_date` for efficient daily queries

### 4. feed_posts
- `id` (uuid, primary key) — unique identifier
- `content` (text, not null) — the announcement / update text
- `created_by` (uuid, references team_members, nullable) — which team member posted it
- `created_at` (timestamptz, default now()) — when the post was made
- Index on `created_at` for chronological ordering

## Security
- RLS enabled on ALL tables.
- All policies use `TO anon, authenticated` because there is no sign-in screen.
- All data is intentionally shared among team members — `USING (true)` / `WITH CHECK (true)` is correct here.

## Important Notes
1. The app stores the team member's UUID in AsyncStorage on the device to identify them across sessions.
2. `created_by` columns are nullable so inserts work even before a team member is established.
3. All tables allow full CRUD from the anon key because the entire team shares all data.
*/

-- Team members table
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3B82F6',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_team_members" ON team_members;
CREATE POLICY "anon_select_team_members" ON team_members FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_team_members" ON team_members;
CREATE POLICY "anon_insert_team_members" ON team_members FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_team_members" ON team_members;
CREATE POLICY "anon_update_team_members" ON team_members FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_team_members" ON team_members;
CREATE POLICY "anon_delete_team_members" ON team_members FOR DELETE
  TO anon, authenticated USING (true);

-- Reservations table
CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  party_size integer NOT NULL,
  phone text NOT NULL,
  reservation_time timestamptz NOT NULL,
  created_by uuid REFERENCES team_members(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_reservations" ON reservations;
CREATE POLICY "anon_select_reservations" ON reservations FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_reservations" ON reservations;
CREATE POLICY "anon_insert_reservations" ON reservations FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_reservations" ON reservations;
CREATE POLICY "anon_update_reservations" ON reservations FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_reservations" ON reservations;
CREATE POLICY "anon_delete_reservations" ON reservations FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_reservations_time ON reservations(reservation_time);

-- Daily notes table
CREATE TABLE IF NOT EXISTS daily_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note text NOT NULL,
  note_date date NOT NULL,
  created_by uuid REFERENCES team_members(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE daily_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_daily_notes" ON daily_notes;
CREATE POLICY "anon_select_daily_notes" ON daily_notes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_daily_notes" ON daily_notes;
CREATE POLICY "anon_insert_daily_notes" ON daily_notes FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_daily_notes" ON daily_notes;
CREATE POLICY "anon_update_daily_notes" ON daily_notes FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_daily_notes" ON daily_notes;
CREATE POLICY "anon_delete_daily_notes" ON daily_notes FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_daily_notes_date ON daily_notes(note_date);

-- Feed posts table
CREATE TABLE IF NOT EXISTS feed_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  created_by uuid REFERENCES team_members(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_feed_posts" ON feed_posts;
CREATE POLICY "anon_select_feed_posts" ON feed_posts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_feed_posts" ON feed_posts;
CREATE POLICY "anon_insert_feed_posts" ON feed_posts FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_feed_posts" ON feed_posts;
CREATE POLICY "anon_update_feed_posts" ON feed_posts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_feed_posts" ON feed_posts;
CREATE POLICY "anon_delete_feed_posts" ON feed_posts FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_feed_posts_created_at ON feed_posts(created_at);
