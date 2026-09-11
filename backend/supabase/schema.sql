-- Schema Supabase do ObraMaster (modelo consolidado da PR 36, sem Prisma).
-- Como aplicar: Supabase Dashboard > SQL Editor > cole este arquivo > Run.
-- Tabelas: empresas + usuarios (multiempresa, UUID, email único).

create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'tipo_usuario') then
    create type public.tipo_usuario as enum ('CLIENTE', 'COLABORADOR', 'ADMIN');
  end if;
end
$$;

create table if not exists public.empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  criado_em timestamptz not null default now()
);

create table if not exists public.usuarios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on update cascade on delete restrict,
  nome text not null,
  email text not null unique,
  senha_hash text not null,
  tipo public.tipo_usuario not null,
  criado_em timestamptz not null default now()
);

create index if not exists usuarios_empresa_id_idx on public.usuarios (empresa_id);
