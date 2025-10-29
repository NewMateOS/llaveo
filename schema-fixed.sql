-- Types
create type user_role as enum ('admin','agent','viewer');

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'viewer',
  full_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Properties (sin geography por ahora)
create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  price numeric(12,2) not null,
  city text not null,
  address text,
  rooms int,
  baths int,
  area_m2 int,
  status text check (status in ('venta','alquiler')) not null default 'venta',
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.property_images (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  url text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

create table if not exists public.favorites (
  user_id uuid references public.profiles(id) on delete cascade,
  property_id uuid references public.properties(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, property_id)
);

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  message text,
  created_at timestamptz default now()
);

-- Triggers
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;
drop trigger if exists trg_properties_updated on public.properties;
create trigger trg_properties_updated before update on public.properties
for each row execute function set_updated_at();

-- RLS
alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.property_images enable row level security;
alter table public.favorites enable row level security;
alter table public.inquiries enable row level security;

-- Policies
create policy "perfil propio"
on public.profiles for select using (auth.uid() = id);

create policy "admin lee perfiles"
on public.profiles for select using (
  exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

create policy "admin edita perfiles"
on public.profiles for all using (
  exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Public read active properties
create policy "public read active"
on public.properties for select using (is_active = true);

-- Agent own
create policy "agent read own"
on public.properties for select using (created_by = auth.uid());

create policy "agent create"
on public.properties for insert with check (created_by = auth.uid());

create policy "agent update own"
on public.properties for update using (created_by = auth.uid());

create policy "agent delete own"
on public.properties for delete using (created_by = auth.uid());

-- Admin all
create policy "admin all"
on public.properties for all using (
  exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Images
create policy "read images public"
on public.property_images for select using (true);

create policy "write images agent own"
on public.property_images for all using (
  exists(
    select 1 from public.properties pr
    where pr.id = property_id
      and (pr.created_by = auth.uid()
        or exists(select 1 from public.profiles p where p.id = auth.uid() and p.role='admin'))
  )
);

-- Favorites
create policy "user manages own favorites"
on public.favorites for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Inquiries
create policy "public can insert inquiry"
on public.inquiries for insert with check (true);

create policy "admin read inquiries"
on public.inquiries for select using (
  exists(select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','agent'))
);
