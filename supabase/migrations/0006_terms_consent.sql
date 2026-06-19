-- 0006_terms_consent.sql
-- Ajout des colonnes de traçabilité d'acceptation des CGU.
-- Distinct de parental_consent (existant) qui concerne la tutelle des mineurs.

alter table public.profiles
  add column terms_accepted     boolean     not null default false,
  add column terms_accepted_at  timestamptz;
