-- Script FINAL: Tabla de perfiles ligada a auth.users (con trigger automático)
-- Ejecuta esto en Supabase → SQL Editor → New Query → Run
--
-- Si ya tienes una tabla perfiles, primero corre esto para limpiar:
-- DROP TABLE IF EXISTS public.perfiles;
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- DROP FUNCTION IF EXISTS public.handle_new_user;

-- 1. Tabla de perfiles (el id viene del usuario de Supabase Auth)
create table if not exists public.perfiles (
  id uuid references auth.users on delete cascade primary key,
  nombre text not null,
  apellido_paterno text not null,
  apellido_materno text not null default '',
  cargo text not null,
  area text not null,
  rol text not null default 'usuario', -- 'admin', 'encargado', 'usuario'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Habilitar RLS
alter table public.perfiles enable row level security;

-- 3. Políticas: usuarios autenticados pueden leer, insertar, actualizar y eliminar
create policy "Autenticados pueden leer perfiles"
  on public.perfiles for select to authenticated using (true);

create policy "Autenticados pueden insertar perfiles"
  on public.perfiles for insert to authenticated with check (true);

create policy "Autenticados pueden actualizar perfiles"
  on public.perfiles for update to authenticated using (true);

create policy "Autenticados pueden eliminar perfiles"
  on public.perfiles for delete to authenticated using (true);

-- 4. Trigger: al crear un usuario en Auth se inserta su perfil automáticamente
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.perfiles (id, nombre, apellido_paterno, apellido_materno, cargo, area, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', 'Sin Nombre'),
    coalesce(new.raw_user_meta_data->>'apellido_paterno', ''),
    coalesce(new.raw_user_meta_data->>'apellido_materno', ''),
    coalesce(new.raw_user_meta_data->>'cargo', 'Sin Cargo'),
    coalesce(new.raw_user_meta_data->>'area', 'Sin Área'),
    coalesce(new.raw_user_meta_data->>'rol', 'usuario')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Eliminar el trigger anterior si existía antes de crearlo de nuevo
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==========================================
-- MÓDULO DE VEHÍCULOS
-- ==========================================

-- 1. Tabla de vehículos
create table if not exists public.vehiculos (
  id uuid default gen_random_uuid() primary key,
  unidad_responsable text not null, -- mapea con area de perfiles
  marca text not null,
  modelo text not null,
  placas text not null,
  capacidad_tanque numeric,
  cilindraje numeric,
  numero_serie text,
  numero_motor text,
  fotografia text, -- URL de Storage o texto
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Habilitar RLS
alter table public.vehiculos enable row level security;

-- 3. Políticas para vehículos
-- Lectura: Autenticados pueden ver todos los vehículos (el filtro fino "por área" se hará en la app móvil por agilidad inicial, 
-- pero se puede restringir aquí cambiando "using (true)" por "using (unidad_responsable = (select area...))")
create policy "Autenticados pueden leer vehiculos"
  on public.vehiculos for select to authenticated using (true);

-- Inserción: Solo administradores
create policy "Admins pueden insertar vehiculos"
  on public.vehiculos for insert to authenticated 
  with check ((select rol from public.perfiles where id = auth.uid()) = 'admin');

-- Actualización: Solo administradores
create policy "Admins pueden actualizar vehiculos"
  on public.vehiculos for update to authenticated 
  using ((select rol from public.perfiles where id = auth.uid()) = 'admin');

-- Eliminación: Solo administradores
create policy "Admins pueden eliminar vehiculos"
  on public.vehiculos for delete to authenticated 
  using ((select rol from public.perfiles where id = auth.uid()) = 'admin');

-- ==========================================
-- NOTA PARA STORAGE (FOTOGRAFÍAS VEHÍCULOS)
-- ==========================================
-- Asegúrate de ir a Supabase -> Storage -> New Bucket
-- Nombre: vehiculos
-- Activar opción "Public bucket" para poder ver las URLs directamente.
-- Crear política de Storage:
-- "Give public access to any user" para SELECT
-- "Give authenticated access to upload" para INSERT

-- ==========================================
-- MÓDULO DE BITÁCORAS
-- ==========================================

create table if not exists public.bitacoras (
  id uuid default gen_random_uuid() primary key,
  vehiculo_id uuid references public.vehiculos(id) on delete set null,
  usuario_id uuid references public.perfiles(id) on delete set null,
  fecha date not null default current_date,
  km_inicial numeric not null,
  km_final numeric,
  destinos text[] not null default '{}',
  tiene_suministro boolean not null default false,
  suministro_importe numeric,
  suministro_litros numeric,
  suministro_folio text,
  suministro_foto text,
  usuario_adicional text,
  observaciones text,
  estado text not null default 'en_ruta', -- 'en_ruta' | 'finalizado'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.bitacoras enable row level security;

-- Lectura: autenticados pueden leer (filtro por área se hace en la app)
create policy "Autenticados pueden leer bitacoras"
  on public.bitacoras for select to authenticated using (true);

-- Inserción: cualquier autenticado puede registrar
create policy "Autenticados pueden insertar bitacoras"
  on public.bitacoras for insert to authenticated with check (true);

-- Edición: solo admin y encargado
create policy "Admin y encargado pueden actualizar bitacoras"
  on public.bitacoras for update to authenticated
  using ((select rol from public.perfiles where id = auth.uid()) in ('admin', 'encargado'));

-- Eliminación: solo admin y encargado
create policy "Admin y encargado pueden eliminar bitacoras"
  on public.bitacoras for delete to authenticated
  using ((select rol from public.perfiles where id = auth.uid()) in ('admin', 'encargado'));

