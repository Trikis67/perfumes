-- Base de datos del catálogo en Supabase.
-- Se ejecuta UNA vez en Supabase → SQL Editor. Se puede volver a ejecutar sin romper nada.
--
-- Reglas de seguridad (Row Level Security):
--   · Cualquiera puede VER el catálogo (perfumes visibles, marcas, familias y el próximo lanzamiento).
--   · Cualquiera puede DEJAR su correo en "Avísame", pero nadie de afuera puede leer la lista.
--   · Solo las cuentas que estén en la tabla "admins" pueden cambiar algo o subir fotos.

/* ---------- Tablas ---------- */
create table if not exists public.products (
  id text primary key check (id ~ '^[a-z0-9-]{1,60}$'),
  data jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) < 20000),
  sort integer not null default 0,
  visible boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Ajustes del sitio: 'upcoming' (próximo lanzamiento), 'families', 'brands' y 'showcase' (Destacados).
create table if not exists public.settings (
  key text primary key check (key in ('upcoming', 'families', 'brands', 'showcase')),
  value jsonb not null check (octet_length(value::text) < 50000)
);

create table if not exists public.subscribers (
  email text not null check (length(email) <= 254 and email ~* '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$'),
  launch_id text not null check (length(launch_id) <= 80),
  created_at timestamptz not null default now(),
  notified_at timestamptz,
  primary key (email, launch_id)
);

-- Quién puede usar el panel. Las cuentas se crean en Authentication → Users y se agregan aquí.
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

/* ---------- Seguridad ---------- */
alter table public.products enable row level security;
alter table public.settings enable row level security;
alter table public.subscribers enable row level security;
alter table public.admins enable row level security;

drop policy if exists "catalogo publico" on public.products;
create policy "catalogo publico" on public.products for select using (visible or public.is_admin());
drop policy if exists "admins editan productos" on public.products;
create policy "admins editan productos" on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "ajustes publicos" on public.settings;
create policy "ajustes publicos" on public.settings for select using (true);
drop policy if exists "admins editan ajustes" on public.settings;
create policy "admins editan ajustes" on public.settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- "Avísame": solo se puede anotar al lanzamiento actual, y sin marcar como avisado.
drop policy if exists "cualquiera se anota" on public.subscribers;
create policy "cualquiera se anota" on public.subscribers for insert to anon, authenticated
  with check (
    notified_at is null
    and launch_id = (select value ->> 'id' from public.settings where key = 'upcoming')
  );
drop policy if exists "admins ven avisos" on public.subscribers;
create policy "admins ven avisos" on public.subscribers for select to authenticated using (public.is_admin());
drop policy if exists "admins editan avisos" on public.subscribers;
create policy "admins editan avisos" on public.subscribers for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins borran avisos" on public.subscribers;
create policy "admins borran avisos" on public.subscribers for delete to authenticated using (public.is_admin());

drop policy if exists "admins se ven" on public.admins;
create policy "admins se ven" on public.admins for select to authenticated using (public.is_admin());

-- Permisos de tabla: el público solo lee el catálogo y se anota en avisos.
revoke all on public.products, public.settings, public.subscribers, public.admins from anon;
grant select on public.products, public.settings to anon;
grant insert on public.subscribers to anon;
grant select, insert, update, delete on public.products, public.settings, public.subscribers to authenticated;
grant select on public.admins to authenticated;

/* ---------- Fotos ---------- */
-- Carpeta pública "fotos": todos las ven; solo los admins suben, cambian o borran.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png'];

-- Los admins necesitan "ver" los archivos para poder borrarlos o reemplazarlos.
drop policy if exists "admins ven fotos" on storage.objects;
create policy "admins ven fotos" on storage.objects for select to authenticated using (bucket_id = 'fotos' and public.is_admin());
drop policy if exists "admins suben fotos" on storage.objects;
create policy "admins suben fotos" on storage.objects for insert to authenticated with check (bucket_id = 'fotos' and public.is_admin());
drop policy if exists "admins cambian fotos" on storage.objects;
create policy "admins cambian fotos" on storage.objects for update to authenticated using (bucket_id = 'fotos' and public.is_admin());
drop policy if exists "admins borran fotos" on storage.objects;
create policy "admins borran fotos" on storage.objects for delete to authenticated using (bucket_id = 'fotos' and public.is_admin());
