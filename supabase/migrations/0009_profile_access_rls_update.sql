-- supabase/migrations/0009_profile_access_rls_update.sql
-- Défense en profondeur : policies owner sur profile_access
-- + helper function pour la recherche par email (utilisée par la route API)

-- ─── 1. Owner peut lire toutes les lignes de ses profils ──────────────────────

CREATE POLICY "pa_owner_select_profile"
  ON public.profile_access FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profile_access pa2
      WHERE pa2.profile_id = profile_access.profile_id
        AND pa2.account_id = auth.uid()
        AND pa2.role = 'owner'
    )
  );

-- ─── 2. Owner peut insérer des lignes non-owner pour ses profils ──────────────

CREATE POLICY "pa_owner_insert_for_profile"
  ON public.profile_access FOR INSERT TO authenticated
  WITH CHECK (
    role != 'owner'
    AND EXISTS (
      SELECT 1 FROM public.profile_access pa2
      WHERE pa2.profile_id = profile_access.profile_id
        AND pa2.account_id = auth.uid()
        AND pa2.role = 'owner'
    )
  );

-- ─── 3. Owner peut supprimer les lignes non-owner de ses profils ──────────────

CREATE POLICY "pa_owner_delete_others"
  ON public.profile_access FOR DELETE TO authenticated
  USING (
    role != 'owner'
    AND EXISTS (
      SELECT 1 FROM public.profile_access pa2
      WHERE pa2.profile_id = profile_access.profile_id
        AND pa2.account_id = auth.uid()
        AND pa2.role = 'owner'
    )
  );

-- ─── 4. Helper : résolution email → account_id (SECURITY DEFINER) ────────────

CREATE OR REPLACE FUNCTION public.get_account_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1;
$$;
