-- ============================================================
-- FIX PROFILE RLS POLICIES
-- ============================================================
-- Run this in Supabase SQL Editor to fix the infinite recursion
-- issue with profile delete operations.
--
-- Problem: The original RLS policy queries profiles to check admin,
-- which triggers the same policy, causing infinite recursion.
--
-- Solution: Use a SECURITY DEFINER function that bypasses RLS.
-- ============================================================

-- Step 1: Create the SECURITY DEFINER function to get current user's role
-- This function runs as the database owner, bypassing RLS checks
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

-- Step 2: Drop old policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can delete profiles" ON public.profiles;

-- Step 3: Create new policies using the SECURITY DEFINER function

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

-- Admins can read all profiles
CREATE POLICY "Admin can read all profiles"
  ON public.profiles FOR SELECT
  USING (public.get_my_role() = 'admin');

-- Admins can insert new profiles (for creating staff)
CREATE POLICY "Admin can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.get_my_role() = 'admin');

-- Admins can update any profile
CREATE POLICY "Admin can update profiles"
  ON public.profiles FOR UPDATE
  USING (public.get_my_role() = 'admin');

-- Admins can delete profiles (except their own to prevent lockout)
CREATE POLICY "Admin can delete profiles"
  ON public.profiles FOR DELETE
  USING (public.get_my_role() = 'admin' AND id != auth.uid());

-- Users can update their own profile (name, phone, etc.)
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- ============================================================
-- VERIFICATION: Run this to confirm policies are in place
-- ============================================================
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'profiles';

-- ============================================================
-- Expected output: You should see 5-6 policies on profiles table
-- ============================================================
