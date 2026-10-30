-- Atualização da base pela aba "Fontes de Dados" (download e envio de complementos em Excel).
-- Rode este arquivo uma vez no SQL Editor do Supabase, depois de supabase/schema.sql.
-- Em seguida rode scripts/build-dashboard-cube.py para preencher public.cadunico_familias.

-- 1) Fecha o acesso anônimo à base e aos arquivos.
-- A chave anon/publishable vai para o navegador; com as policies antigas, qualquer pessoa
-- com ela conseguia ler excel_rows e baixar as planilhas (com dados pessoais) do bucket.
-- O painel lê tudo pelo servidor com a chave secreta, então nada depende dessas policies.
drop policy if exists "Leitura publica de dados agregados importados" on public.excel_rows;
drop policy if exists "Leitura publica dos arquivos Excel do observatorio" on storage.objects;

-- 2) Contribuição de cada família para o cubo (dashboard_cube_v4).
-- Permite substituir uma família: subtrai a contribuição antiga e soma a nova.
create table if not exists public.cadunico_familias (
  codigo_familiar text primary key,
  cell_key text not null,
  latest_update text,
  stats jsonb not null,
  carga_id uuid,
  atualizado_em timestamptz not null default now()
);

create index if not exists cadunico_familias_cell_key_idx
  on public.cadunico_familias (cell_key);

alter table public.cadunico_familias enable row level security;
-- Sem policies: somente a service role (servidor) lê e escreve.

-- 3) Histórico de complementos enviados.
create table if not exists public.cadunico_cargas (
  id uuid primary key default gen_random_uuid(),
  arquivo text not null,
  caminho text not null,
  usuario_email text not null,
  linhas integer not null default 0,
  familias_novas integer not null default 0,
  familias_substituidas integer not null default 0,
  status text not null default 'processando'
    check (status in ('processando', 'concluida', 'erro')),
  erro text,
  criado_em timestamptz not null default now(),
  concluido_em timestamptz
);

alter table public.cadunico_cargas enable row level security;
-- Sem policies: somente a service role (servidor) lê e escreve.

-- 4) Lê células do cubo pela chave (evita montar filtros com aspas e vírgulas na URL).
create or replace function public.obter_celulas_cubo(p_keys text[])
returns table (cell_key text, data jsonb)
language sql
stable
set search_path = public
as $$
  select sheet_name, data
  from public.excel_rows
  where source_file = 'dashboard_cube_v4' and sheet_name = any (p_keys);
$$;

-- 5) Grava famílias e células do cubo numa única transação.
-- p_familias: [{codigo_familiar, cell_key, latest_update, stats, carga_id}]
-- p_celulas:  [{cell_key, data}] — data nulo remove a célula (ficou sem famílias).
create or replace function public.aplicar_carga_cadunico(p_familias jsonb, p_celulas jsonb)
returns void
language plpgsql
set search_path = public
as $$
declare
  celula record;
begin
  insert into public.cadunico_familias (codigo_familiar, cell_key, latest_update, stats, carga_id, atualizado_em)
  select f.codigo_familiar, f.cell_key, f.latest_update, f.stats, f.carga_id, now()
  from jsonb_to_recordset(p_familias)
    as f (codigo_familiar text, cell_key text, latest_update text, stats jsonb, carga_id uuid)
  on conflict (codigo_familiar) do update set
    cell_key = excluded.cell_key,
    latest_update = excluded.latest_update,
    stats = excluded.stats,
    carga_id = excluded.carga_id,
    atualizado_em = now();

  for celula in
    select * from jsonb_to_recordset(p_celulas) as c (cell_key text, data jsonb)
  loop
    if celula.data is null then
      delete from public.excel_rows
      where source_file = 'dashboard_cube_v4' and sheet_name = celula.cell_key;
    else
      insert into public.excel_rows (source_file, sheet_name, row_number, data)
      values (
        'dashboard_cube_v4',
        celula.cell_key,
        1,
        celula.data || jsonb_build_object(
          'latestUpdate',
          (select max(latest_update) from public.cadunico_familias where cell_key = celula.cell_key)
        )
      )
      on conflict (source_file, sheet_name, row_number) do update set
        data = excluded.data,
        imported_at = now();
    end if;
  end loop;
end;
$$;

revoke all on function public.obter_celulas_cubo(text[]) from public, anon, authenticated;
revoke all on function public.aplicar_carga_cadunico(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.obter_celulas_cubo(text[]) to service_role;
grant execute on function public.aplicar_carga_cadunico(jsonb, jsonb) to service_role;
