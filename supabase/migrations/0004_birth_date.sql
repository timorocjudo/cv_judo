-- 0004_birth_date.sql
-- Ajoute birth_date à profiles pour permettre le calcul de la catégorie d'âge.
-- Run in the Supabase SQL Editor after 0003_storage.sql.

alter table public.profiles add column birth_date date;

-- Mise à jour manuelle pour Timothé François :
-- UPDATE public.profiles SET birth_date = '2010-04-02' WHERE slug = 'timothe-francois';
