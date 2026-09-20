/*
# Add Role-Based Access Control to Team Management

## Overview
This migration adds an admin/member role system to the restaurant team app.
The first team member becomes admin automatically. Admins can manage all data
(reservations, notes, feed) and promote other members. Regular members can only
view bookings and use the shared feed (read + post + delete own posts).

## Changes to Existing Tables

### team_members
- Added `role` column (text, NOT NULL, default 'member') — either 'admin' or 'member'
- Added `phone` column (text, nullable) — used to auto-assign the first matching member as admin
- Added unique index on `phone` so one phone maps to one member

## New Functions (all SECURITY DEFINER, SET search_path = public)

### create_team_member(p_name text, p_phone text)
Creates a new team member with role 'member' and the given phone.
If no team members exist yet, the new member is created as admin (first-user-is-admin).
If a member with the same phone already exists, returns that existing member instead
(so re-joining on a new device restores the same identity).
Revoke EXECUTE from anon; grant to authenticated only.

### set_member_role(p_member_id uuid, p_role text)
Admin-only: changes a member's role to 'admin' or 'member'.
Cannot remove the last admin (prevents lockout).
Revoke EXECUTE from anon; grant to authenticated only.

### delete_reservation(p_reservation_id uuid)
Admin-only: deletes a reservation.
Revoke EXECUTE from anon; grant to authenticated only.

### delete_daily_note(p_note_id uuid)
Admin-only: deletes a daily note.
Revoke EXECUTE from anon; grant to authenticated only.

### delete_feed_post(p_post_id uuid)
Admin or post owner can delete a feed post.
Revoke EXECUTE from anon; grant to authenticated only.

## Security Changes
- Revoke all direct INSERT/UPDATE/DELETE on reservations, daily_notes, feed_posts, team_members from anon and authenticated.
- Grant only SELECT on all tables to anon and authenticated (read access for all).
- Grant INSERT on feed_posts to authenticated (members can post to the feed).
- All mutations now go through SECURITY DEFINER functions that enforce authorization server-side.
- The role column on team_members is never client-writable — only set_member_role can change it.

## Important Notes
1. The frontend calls create_team_member RPC instead of direct insert on team_members.
2. The frontend calls the delete_* RPCs instead of direct delete on tables.
3. The frontend calls set_member_role RPC to promote/demote members.
4. SELECT remains open to anon + authenticated so the app can read all shared data.
5. feed_posts INSERT remains open so members can post without an RPC.
*/

-- Add role and phone columns to team_members
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member';
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS phone text;

-- Unique index on phone so one phone = one member
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_phone ON team_members(phone) WHERE phone IS NOT NULL;

-- ============================================================
-- SECURITY DEFINER FUNCTIONS
-- ============================================================

-- Create a team member (or return existing one by phone)
CREATE OR REPLACE FUNCTION create_team_member(p_name text, p_phone text)
RETURNS team_members
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_existing team_members;
  v_count integer;
  v_result team_members;
BEGIN
  -- If phone provided, check for existing member
  IF p_phone IS NOT NULL AND p_phone != '' THEN
    SELECT * INTO v_existing FROM team_members WHERE phone = p_phone LIMIT 1;
    IF v_existing IS NOT NULL THEN
      -- Optionally update name if provided and different
      IF p_name IS NOT NULL AND p_name != '' AND p_name != v_existing.name THEN
        UPDATE team_members SET name = p_name WHERE id = v_existing.id;
        SELECT * INTO v_result FROM team_members WHERE id = v_existing.id;
        RETURN v_result;
      END IF;
      RETURN v_existing;
    END IF;
  END IF;

  -- Check if any members exist; first member becomes admin
  SELECT count(*) INTO v_count FROM team_members;
  IF v_count = 0 THEN
    INSERT INTO team_members (name, phone, role)
    VALUES (p_name, NULLIF(p_phone, ''), 'admin')
    RETURNING * INTO v_result;
  ELSE
    INSERT INTO team_members (name, phone, role)
    VALUES (p_name, NULLIF(p_phone, ''), 'member')
    RETURNING * INTO v_result;
  END IF;

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION create_team_member FROM anon;
GRANT EXECUTE ON FUNCTION create_team_member TO authenticated;

-- Set member role (admin only)
CREATE OR REPLACE FUNCTION set_member_role(p_member_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_target_role text;
  v_admin_count integer;
BEGIN
  -- Check caller is admin
  SELECT role INTO v_caller_role FROM team_members WHERE id = auth.uid() LIMIT 1;
  IF v_caller_role IS NULL OR v_caller_role != 'admin' THEN
    RAISE EXCEPTION 'Not authorized: admin role required';
  END IF;

  -- Validate role value
  IF p_role NOT IN ('admin', 'member') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  -- Get target's current role
  SELECT role INTO v_target_role FROM team_members WHERE id = p_member_id LIMIT 1;
  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  -- Prevent removing the last admin
  IF v_target_role = 'admin' AND p_role = 'member' THEN
    SELECT count(*) INTO v_admin_count FROM team_members WHERE role = 'admin';
    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'Cannot remove the last admin';
    END IF;
  END IF;

  UPDATE team_members SET role = p_role WHERE id = p_member_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION set_member_role FROM anon;
GRANT EXECUTE ON FUNCTION set_member_role TO authenticated;

-- Delete reservation (admin only)
CREATE OR REPLACE FUNCTION delete_reservation(p_reservation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM team_members WHERE id = auth.uid() LIMIT 1;
  IF v_caller_role IS NULL OR v_caller_role != 'admin' THEN
    RAISE EXCEPTION 'Not authorized: admin role required';
  END IF;

  DELETE FROM reservations WHERE id = p_reservation_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION delete_reservation FROM anon;
GRANT EXECUTE ON FUNCTION delete_reservation TO authenticated;

-- Delete daily note (admin only)
CREATE OR REPLACE FUNCTION delete_daily_note(p_note_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM team_members WHERE id = auth.uid() LIMIT 1;
  IF v_caller_role IS NULL OR v_caller_role != 'admin' THEN
    RAISE EXCEPTION 'Not authorized: admin role required';
  END IF;

  DELETE FROM daily_notes WHERE id = p_note_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION delete_daily_note FROM anon;
GRANT EXECUTE ON FUNCTION delete_daily_note TO authenticated;

-- Delete feed post (admin or post owner)
CREATE OR REPLACE FUNCTION delete_feed_post(p_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_post_owner uuid;
BEGIN
  SELECT role INTO v_caller_role FROM team_members WHERE id = auth.uid() LIMIT 1;
  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Admin can delete any post
  IF v_caller_role = 'admin' THEN
    DELETE FROM feed_posts WHERE id = p_post_id;
    RETURN;
  END IF;

  -- Member can only delete their own posts
  SELECT created_by INTO v_post_owner FROM feed_posts WHERE id = p_post_id LIMIT 1;
  IF v_post_owner = auth.uid() THEN
    DELETE FROM feed_posts WHERE id = p_post_id;
  ELSE
    RAISE EXCEPTION 'Not authorized: can only delete your own posts';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION delete_feed_post FROM anon;
GRANT EXECUTE ON FUNCTION delete_feed_post TO authenticated;

-- ============================================================
-- REVOKES: Remove direct write access from anon and authenticated
-- All mutations now go through SECURITY DEFINER functions
-- ============================================================

-- team_members: revoke all writes (create_team_member RPC handles insert, set_member_role handles role)
REVOKE INSERT, UPDATE, DELETE ON team_members FROM anon, authenticated;

-- reservations: revoke insert, update, delete (delete_reservation RPC handles delete)
-- NOTE: We keep INSERT on reservations for authenticated so admins can add bookings directly
REVOKE UPDATE, DELETE ON reservations FROM anon, authenticated;
REVOKE INSERT ON reservations FROM anon;
-- Keep INSERT on reservations for authenticated (admin adds bookings)
-- But we need to ensure only admins can insert. We'll enforce via policy.

-- daily_notes: revoke insert, update, delete (delete_daily_note RPC handles delete)
-- Keep INSERT for authenticated (admin adds notes directly)
REVOKE UPDATE, DELETE ON daily_notes FROM anon, authenticated;
REVOKE INSERT ON daily_notes FROM anon;

-- feed_posts: keep INSERT for authenticated (all members can post), revoke update
REVOKE UPDATE ON feed_posts FROM anon, authenticated;
-- DELETE goes through delete_feed_post RPC
REVOKE DELETE ON feed_posts FROM anon, authenticated;

-- ============================================================
-- POLICY UPDATES: Tighten write policies
-- ============================================================

-- Reservations: only admins can insert
DROP POLICY IF EXISTS "anon_insert_reservations" ON reservations;
DROP POLICY IF EXISTS "anon_update_reservations" ON reservations;
DROP POLICY IF EXISTS "anon_delete_reservations" ON reservations;

CREATE POLICY "authenticated_insert_reservations" ON reservations FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM team_members WHERE id = auth.uid() AND role = 'admin')
  );

-- Daily notes: only admins can insert
DROP POLICY IF EXISTS "anon_insert_daily_notes" ON daily_notes;
DROP POLICY IF EXISTS "anon_update_daily_notes" ON daily_notes;
DROP POLICY IF EXISTS "anon_delete_daily_notes" ON daily_notes;

CREATE POLICY "authenticated_insert_daily_notes" ON daily_notes FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM team_members WHERE id = auth.uid() AND role = 'admin')
  );

-- Feed posts: any authenticated member can insert, keep existing select
DROP POLICY IF EXISTS "anon_insert_feed_posts" ON feed_posts;
DROP POLICY IF EXISTS "anon_update_feed_posts" ON feed_posts;
DROP POLICY IF EXISTS "anon_delete_feed_posts" ON feed_posts;

CREATE POLICY "authenticated_insert_feed_posts" ON feed_posts FOR INSERT
  TO authenticated WITH CHECK (true);

-- Team members: keep select for all, remove write policies
DROP POLICY IF EXISTS "anon_insert_team_members" ON team_members;
DROP POLICY IF EXISTS "anon_update_team_members" ON team_members;
DROP POLICY IF EXISTS "anon_delete_team_members" ON team_members;

-- Keep SELECT policies on all tables (already exist)
-- Reservations select: keep existing anon_select_reservations (USING true)
-- Daily notes select: keep existing anon_select_daily_notes (USING true)
-- Feed posts select: keep existing anon_select_feed_posts (USING true)
-- Team members select: keep existing anon_select_team_members (USING true)
