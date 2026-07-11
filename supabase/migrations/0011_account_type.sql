-- supabase/migrations/0011_account_type.sql

-- ─── 1. Table accounts ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.accounts (
  id            uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  account_type  text        NOT NULL
                            CHECK (account_type IN ('manager', 'parent_judoka', 'judoka'))
                            DEFAULT 'judoka',
  max_profiles  int         NOT NULL DEFAULT 1,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ─── 2. RLS sur accounts ──────────────────────────────────────────────────────

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accounts_select_own" ON public.accounts
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "accounts_insert_own" ON public.accounts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "accounts_update_own" ON public.accounts
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ─── 3. Policy RESTRICTIVE sur profiles INSERT (enforce max_profiles) ─────────
-- RESTRICTIVE = AND'd avec toutes les autres policies ; ne peut pas être contournée
-- par une autre policy permissive. Le service role (admin) bypass RLS entièrement.

CREATE POLICY "profiles_insert_max_profiles" ON public.profiles
  AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.accounts
      WHERE id = auth.uid()
        AND (
          max_profiles = -1
          OR max_profiles > (
            SELECT COUNT(*) FROM public.profile_access
            WHERE account_id = auth.uid() AND role = 'owner'
          )
        )
    )
  );

-- ─── 4. Backfill : créer des lignes accounts pour les utilisateurs existants ──

INSERT INTO public.accounts (id, account_type, max_profiles, created_at)
SELECT
  pa.account_id                                                       AS id,
  CASE WHEN cnt.owned > 1 THEN 'parent_judoka' ELSE 'judoka' END     AS account_type,
  CASE WHEN cnt.owned > 1 THEN -1              ELSE 1         END     AS max_profiles,
  now()                                                               AS created_at
FROM (
  SELECT DISTINCT account_id FROM public.profile_access WHERE role = 'owner'
) pa
JOIN (
  SELECT account_id, COUNT(*) AS owned
  FROM   public.profile_access
  WHERE  role = 'owner'
  GROUP BY account_id
) cnt ON cnt.account_id = pa.account_id
ON CONFLICT (id) DO NOTHING;
