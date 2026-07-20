-- ============================================================
-- CineVault — Esquema de base de datos para Supabase
-- Reemplaza las entidades de Base44 (MediaItem y FriendConnection)
-- Seguridad por usuario (RLS): cada usuario solo ve sus propios datos.
-- ============================================================

-- ---------- Tabla principal: media_items (obras) ----------
create table if not exists public.media_items (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_by    text default (auth.jwt() ->> 'email'),
  title         text not null,
  title_alt     text,
  year          numeric,
  rating        numeric,
  category      text,
  director      text,
  genre1        text,
  genre2        text,
  status        text,
  comments      text,
  highlight1    text,
  highlight2    text,
  highlight3    text,
  favorite_quote text,
  watched_at    text,
  country       text,
  synopsis      text,
  poster_url    text,
  tmdb_id       text,
  overrated     boolean,
  underrated    boolean,
  created_date  timestamptz not null default now(),
  updated_date  timestamptz not null default now()
);

create index if not exists media_items_user_idx    on public.media_items (user_id);
create index if not exists media_items_created_idx on public.media_items (created_date desc);
create index if not exists media_items_rating_idx  on public.media_items (rating desc);

-- ---------- Tabla: friend_connections (función Social) ----------
create table if not exists public.friend_connections (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  owner_email   text,
  owner_name    text,
  invite_code   text,
  friend_email  text,
  friend_name   text,
  status        text default 'pending',
  created_date  timestamptz not null default now(),
  updated_date  timestamptz not null default now()
);

create index if not exists friend_conn_user_idx   on public.friend_connections (user_id);
create index if not exists friend_conn_owner_idx  on public.friend_connections (owner_email);
create index if not exists friend_conn_friend_idx on public.friend_connections (friend_email);

-- ---------- Trigger: actualizar updated_date automáticamente ----------
create or replace function public.set_updated_date()
returns trigger language plpgsql as $$
begin
  new.updated_date = now();
  return new;
end;
$$;

drop trigger if exists trg_media_items_updated on public.media_items;
create trigger trg_media_items_updated before update on public.media_items
  for each row execute function public.set_updated_date();

drop trigger if exists trg_friend_conn_updated on public.friend_connections;
create trigger trg_friend_conn_updated before update on public.friend_connections
  for each row execute function public.set_updated_date();

-- ---------- Seguridad a nivel de fila (RLS) ----------
alter table public.media_items       enable row level security;
alter table public.friend_connections enable row level security;

-- media_items: cada usuario gestiona SOLO sus obras...
drop policy if exists media_items_owner on public.media_items;
create policy media_items_owner on public.media_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ...y además puede LEER las obras de un amigo con el que esté "connected" (función Social).
drop policy if exists media_items_friend_read on public.media_items;
create policy media_items_friend_read on public.media_items
  for select using (
    created_by in (
      select case when fc.owner_email = (auth.jwt() ->> 'email') then fc.friend_email
                  else fc.owner_email end
      from public.friend_connections fc
      where fc.status = 'connected'
        and (fc.owner_email = (auth.jwt() ->> 'email') or fc.friend_email = (auth.jwt() ->> 'email'))
    )
  );

-- friend_connections: visible/gestionable por el dueño de la fila y por el amigo invitado.
drop policy if exists friend_conn_rw on public.friend_connections;
create policy friend_conn_rw on public.friend_connections
  for all using (
    auth.uid() = user_id
    or owner_email  = (auth.jwt() ->> 'email')
    or friend_email = (auth.jwt() ->> 'email')
  ) with check (
    auth.uid() = user_id
    or owner_email  = (auth.jwt() ->> 'email')
    or friend_email = (auth.jwt() ->> 'email')
  );
