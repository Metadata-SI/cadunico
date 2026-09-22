create extension if not exists pgcrypto;

create table if not exists public.excel_rows (
  id uuid primary key default gen_random_uuid(),
  source_file text not null,
  sheet_name text not null,
  row_number integer not null,
  data jsonb not null,
  imported_at timestamptz not null default now(),
  unique (source_file, sheet_name, row_number)
);

create index if not exists excel_rows_source_sheet_idx
  on public.excel_rows (source_file, sheet_name);

alter table public.excel_rows enable row level security;

create policy "Leitura publica de dados agregados importados"
  on public.excel_rows
  for select
  to anon, authenticated
  using (true);

insert into storage.buckets (id, name, public)
values ('excel-fontes', 'excel-fontes', false)
on conflict (id) do nothing;

create policy "Leitura publica dos arquivos Excel do observatorio"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'excel-fontes');

-- Tabela de usuarios do painel (espelha auth.users para consulta/gestao pela aba Usuarios).
-- Papel e status continuam controlados via Auth (app_metadata.role e banned_until);
-- esta tabela e mantida em sincronia automaticamente pelos triggers abaixo.
create table if not exists public.usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role text not null default 'usuario' check (role in ('admin', 'usuario')),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  last_sign_in_at timestamptz
);

alter table public.usuarios enable row level security;
-- Sem policies para anon/authenticated: somente a service role (usada pelo servidor
-- em src/routes/api/admin-users.ts) le e escreve nesta tabela.

create or replace function public.sync_usuario_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuarios (id, email, role, ativo, created_at, last_sign_in_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_app_meta_data ->> 'role', 'usuario'),
    (new.banned_until is null or new.banned_until <= now()),
    new.created_at,
    new.last_sign_in_at
  )
  on conflict (id) do update set
    email = excluded.email,
    role = excluded.role,
    ativo = excluded.ativo,
    last_sign_in_at = excluded.last_sign_in_at;
  return new;
end;
$$;

drop trigger if exists on_auth_user_sync_insert on auth.users;
create trigger on_auth_user_sync_insert
  after insert on auth.users
  for each row execute function public.sync_usuario_from_auth();

drop trigger if exists on_auth_user_sync_update on auth.users;
create trigger on_auth_user_sync_update
  after update on auth.users
  for each row execute function public.sync_usuario_from_auth();

-- Backfill de contas criadas antes desta migracao existir.
insert into public.usuarios (id, email, role, ativo, created_at, last_sign_in_at)
select
  id,
  email,
  coalesce(raw_app_meta_data ->> 'role', 'usuario'),
  (banned_until is null or banned_until <= now()),
  created_at,
  last_sign_in_at
from auth.users
on conflict (id) do update set
  email = excluded.email,
  role = excluded.role,
  ativo = excluded.ativo,
  last_sign_in_at = excluded.last_sign_in_at;
