-- 0002_palmares_columns.sql
-- Ajoute les colonnes manquantes à la table palmares.
-- Run in the Supabase SQL Editor after 0001_init.sql.

alter table public.palmares add column level text;
alter table public.palmares add column medal text;
alter table public.palmares add column city  text;
