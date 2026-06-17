-- 0003_storage.sql
-- Crée le bucket "media" (lecture publique) et la policy d'écriture.
-- Run in the Supabase SQL Editor after 0002_palmares_columns.sql.

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

-- Chaque utilisateur authentifié peut gérer uniquement son propre dossier {uid}/
create policy "users_manage_own_folder"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
