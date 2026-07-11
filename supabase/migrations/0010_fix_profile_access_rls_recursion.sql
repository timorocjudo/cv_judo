-- supabase/migrations/0010_fix_profile_access_rls_recursion.sql
-- Fix: les policies pa_owner_* de profile_access se référençaient elles-mêmes
-- (SELECT FROM profile_access dans une policy ON profile_access), ce qui causait
-- une erreur "infinite recursion detected in policy" pour tous les utilisateurs
-- connectés, rendant toutes les pages de profil inaccessibles.
--
-- Solution : une fonction SECURITY DEFINER qui vérifie le rôle owner en bypassant
-- RLS sur profile_access, ce qui brise la récursion.

-- ─── 1. Fonction helper sans récursion ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.current_user_is_profile_owner(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profile_access
    WHERE profile_id = p_profile_id
      AND account_id = auth.uid()
      AND role = 'owner'
  );
$$;

-- ─── 2. Recréer pa_owner_select_profile sans auto-référence ──────────────────

DROP POLICY IF EXISTS "pa_owner_select_profile" ON public.profile_access;

CREATE POLICY "pa_owner_select_profile"
  ON public.profile_access FOR SELECT TO authenticated
  USING (current_user_is_profile_owner(profile_id));

-- ─── 3. Recréer pa_owner_insert_for_profile sans auto-référence ──────────────

DROP POLICY IF EXISTS "pa_owner_insert_for_profile" ON public.profile_access;

CREATE POLICY "pa_owner_insert_for_profile"
  ON public.profile_access FOR INSERT TO authenticated
  WITH CHECK (
    role != 'owner'
    AND current_user_is_profile_owner(profile_id)
  );

-- ─── 4. Recréer pa_owner_delete_others sans auto-référence ───────────────────

DROP POLICY IF EXISTS "pa_owner_delete_others" ON public.profile_access;

CREATE POLICY "pa_owner_delete_others"
  ON public.profile_access FOR DELETE TO authenticated
  USING (
    role != 'owner'
    AND current_user_is_profile_owner(profile_id)
  );
