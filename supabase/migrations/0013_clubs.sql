-- 0013_clubs.sql
-- Normalise profiles.club (texte libre) → club_id (FK vers clubs)

-- ─── Helper: slugify_club ────────────────────────────────────────────────────
-- Reproduit la logique de lib/slugify.ts normalizeText + slug generation

CREATE OR REPLACE FUNCTION slugify_club(input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  result text;
BEGIN
  result := lower(trim(input));
  result := translate(result,
    'àâäáãåèêëéìîïíòôöóùûüúýÿçñ',
    'aaaaaaeeeeiiiioooouuuuyycn'
  );
  result := regexp_replace(result, '[^a-z0-9]+', '-', 'g');
  result := trim(both '-' from result);
  RETURN result;
END;
$$;

-- ─── Table clubs ─────────────────────────────────────────────────────────────

CREATE TABLE public.clubs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text        NOT NULL,
  slug            text        UNIQUE NOT NULL,
  city            text,
  department      text,
  department_name text,
  region          text,
  verified        boolean     NOT NULL DEFAULT false,
  created_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX clubs_name_idx       ON public.clubs (lower(name));
CREATE INDEX clubs_slug_idx       ON public.clubs (slug);
CREATE INDEX clubs_department_idx ON public.clubs (department);

CREATE TRIGGER clubs_updated_at
  BEFORE UPDATE ON public.clubs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─── RLS sur clubs ───────────────────────────────────────────────────────────

ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_clubs"
  ON public.clubs FOR SELECT TO anon
  USING (true);

CREATE POLICY "authenticated_read_clubs"
  ON public.clubs FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "authenticated_insert_clubs"
  ON public.clubs FOR INSERT TO authenticated
  WITH CHECK (true);

-- ─── Colonne club_id sur profiles ────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN club_id uuid REFERENCES public.clubs(id) ON DELETE SET NULL;

-- ─── Migration des données existantes ────────────────────────────────────────
-- Phase 1 : un club par valeur unique (insensible casse + espaces)
INSERT INTO public.clubs (name, slug)
SELECT DISTINCT ON (lower(trim(club)))
  trim(club) AS name,
  slugify_club(trim(club)) AS slug
FROM public.profiles
WHERE club IS NOT NULL AND trim(club) <> ''
ORDER BY lower(trim(club)), trim(club);

-- Phase 2 : rattachement — chaque profil pointe vers son club
UPDATE public.profiles p
SET club_id = c.id
FROM public.clubs c
WHERE p.club IS NOT NULL
  AND lower(trim(p.club)) = lower(trim(c.name));
