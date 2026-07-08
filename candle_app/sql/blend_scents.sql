-- ===================================================
-- Migrazione: tabella ponte blend_scents
-- Permette di associare a un blend PIÙ essenze per ogni nota
-- (es. più note di testa), superando il limite delle colonne
-- singole head_scent_id / heart_scent_id / base_scent_id.
--
-- Da eseguire una volta nel SQL Editor di Supabase.
-- ===================================================

create extension if not exists "pgcrypto";

create table if not exists public.blend_scents (
  id         uuid primary key default gen_random_uuid(),
  blend_id   uuid not null references public.blends(id) on delete cascade,
  scent_id   uuid not null references public.inventory(id) on delete cascade,
  note_type  text not null check (note_type in ('head', 'heart', 'base')),
  created_at timestamptz not null default now()
);

create index if not exists idx_blend_scents_blend on public.blend_scents(blend_id);
create unique index if not exists uq_blend_scents on public.blend_scents(blend_id, scent_id, note_type);

-- Row Level Security: l'utente può gestire solo le associazioni
-- dei propri blend (blends.user_id = auth.uid()).
alter table public.blend_scents enable row level security;

drop policy if exists "blend_scents_select_own" on public.blend_scents;
create policy "blend_scents_select_own" on public.blend_scents
  for select using (
    exists (select 1 from public.blends b where b.id = blend_id and b.user_id = auth.uid())
  );

drop policy if exists "blend_scents_insert_own" on public.blend_scents;
create policy "blend_scents_insert_own" on public.blend_scents
  for insert with check (
    exists (select 1 from public.blends b where b.id = blend_id and b.user_id = auth.uid())
  );

drop policy if exists "blend_scents_delete_own" on public.blend_scents;
create policy "blend_scents_delete_own" on public.blend_scents
  for delete using (
    exists (select 1 from public.blends b where b.id = blend_id and b.user_id = auth.uid())
  );

-- ===================================================
-- (Opzionale) Backfill dai dati esistenti: copia le
-- essenze già salvate nelle colonne singole dentro
-- la nuova tabella, evitando duplicati.
-- ===================================================
insert into public.blend_scents (blend_id, scent_id, note_type)
select b.id, b.head_scent_id, 'head' from public.blends b where b.head_scent_id is not null
union all
select b.id, b.heart_scent_id, 'heart' from public.blends b where b.heart_scent_id is not null
union all
select b.id, b.base_scent_id, 'base' from public.blends b where b.base_scent_id is not null
on conflict (blend_id, scent_id, note_type) do nothing;
