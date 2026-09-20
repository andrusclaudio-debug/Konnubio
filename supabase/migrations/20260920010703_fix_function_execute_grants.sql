/*
# Fix EXECUTE grants on SECURITY DEFINER functions

## Overview
The previous migration revoked EXECUTE from anon and granted to authenticated,
but the security posture shows anon still has execute access. This migration
re-applies the revokes and grants to ensure anon cannot call privileged functions.

## Security Changes
- REVOKE EXECUTE on all 5 SECURITY DEFINER functions FROM anon
- GRANT EXECUTE on all 5 functions TO authenticated
- This ensures only authenticated users (with a valid session) can call
  create_team_member, set_member_role, delete_reservation, delete_daily_note, delete_feed_post
*/

REVOKE EXECUTE ON FUNCTION create_team_member FROM anon;
GRANT EXECUTE ON FUNCTION create_team_member TO authenticated;

REVOKE EXECUTE ON FUNCTION set_member_role FROM anon;
GRANT EXECUTE ON FUNCTION set_member_role TO authenticated;

REVOKE EXECUTE ON FUNCTION delete_reservation FROM anon;
GRANT EXECUTE ON FUNCTION delete_reservation TO authenticated;

REVOKE EXECUTE ON FUNCTION delete_daily_note FROM anon;
GRANT EXECUTE ON FUNCTION delete_daily_note TO authenticated;

REVOKE EXECUTE ON FUNCTION delete_feed_post FROM anon;
GRANT EXECUTE ON FUNCTION delete_feed_post TO authenticated;
