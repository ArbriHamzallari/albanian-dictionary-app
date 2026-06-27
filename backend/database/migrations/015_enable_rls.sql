-- ============================================================
-- 015) Enable Row Level Security on every public table
-- ============================================================
-- Supabase exposes the `public` schema through its auto-generated REST API
-- (PostgREST) using the `anon` and `authenticated` roles + the publishable
-- anon key. By default those roles were granted SELECT/INSERT/UPDATE/DELETE on
-- our tables, so without RLS anyone holding the (public) anon key could read or
-- modify everything — including users' emails, password hashes, and minors'
-- data — directly via the REST API, bypassing our Express backend.
--
-- This app does NOT use PostgREST: the backend connects as the `postgres` role
-- (which has BYPASSRLS), and the frontend only ever calls our Express API. So we
-- enable RLS with NO policies: that denies the anon/authenticated roles every
-- row (locking the REST surface) while the backend is unaffected.
--
-- Idempotent: ENABLE ROW LEVEL SECURITY is a no-op on tables that already have
-- it. The loop also covers any future public table on the next migrate run.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;
