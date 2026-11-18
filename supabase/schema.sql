-- SOGNI Familieplanlegger: database
-- Lim inn hele denne teksten i Supabase: SQL Editor -> New query -> Run.
-- Den kan kjøres flere ganger uten å ødelegge noe.

create extension if not exists pgcrypto;

-- Familier ------------------------------------------------------------------
create table if not exists public.families (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 60),
  code        text not null unique,
  owner_user  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- Personer i familien. user_id er tom for barn uten egen innlogging.
create table if not exists public.members (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.families(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete set null,
  name        text not null check (char_length(name) between 1 and 40),
  color       text not null,
  created_at  timestamptz not null default now(),
  unique (family_id, user_id)
);
create index if not exists members_user_idx on public.members(user_id);

-- Alt familien skriver inn: avtaler, gjøremål, handleliste, middager.
-- Private rader har private = true og owner_user = den som eier dem.
create table if not exists public.items (
  family_id   uuid not null references public.families(id) on delete cascade,
  id          text not null check (char_length(id) <= 64),
  type        text not null check (type in ('event','todo','shop','dinner')),
  private     boolean not null default false,
  owner_user  uuid references auth.users(id) on delete cascade,
  data        jsonb not null,
  updated_at  timestamptz not null default now(),
  primary key (family_id, id),
  check (not private or owner_user is not null)
);

-- Familiens egne oppskrifter
create table if not exists public.recipes (
  family_id   uuid not null references public.families(id) on delete cascade,
  id          text not null check (char_length(id) <= 64),
  data        jsonb not null,
  primary key (family_id, id)
);

-- Varsler: hvem gjorde hva
create table if not exists public.activity (
  id          bigint generated always as identity primary key,
  family_id   uuid not null references public.families(id) on delete cascade,
  by_member   uuid references public.members(id) on delete set null,
  text        text not null check (char_length(text) <= 200),
  at          bigint not null
);
create index if not exists activity_family_at_idx on public.activity(family_id, at desc);

-- Hjelpefunksjoner -------------------------------------------------------
create or replace function public.is_member(f uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where family_id = f and user_id = auth.uid())
$$;

create or replace function public.is_owner(f uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from families where id = f and owner_user = auth.uid())
$$;

-- Sperrer (Row Level Security) -------------------------------------------
alter table public.families enable row level security;
alter table public.members  enable row level security;
alter table public.items    enable row level security;
alter table public.recipes  enable row level security;
alter table public.activity enable row level security;

drop policy if exists fam_read   on public.families;
drop policy if exists fam_update on public.families;
create policy fam_read   on public.families for select using (public.is_member(id));
create policy fam_update on public.families for update using (public.is_owner(id)) with check (public.is_owner(id));

drop policy if exists mem_read   on public.members;
drop policy if exists mem_add    on public.members;
drop policy if exists mem_update on public.members;
drop policy if exists mem_delete on public.members;
create policy mem_read   on public.members for select using (public.is_member(family_id));
-- Familien kan legge til personer uten egen innlogging (f.eks. barn).
create policy mem_add    on public.members for insert with check (public.is_member(family_id) and user_id is null
  and (select count(*) from public.members m where m.family_id = members.family_id) < 10);
create policy mem_update on public.members for update using (public.is_member(family_id)) with check (public.is_member(family_id));
-- Eieren kan fjerne personer, og alle kan melde seg selv ut.
create policy mem_delete on public.members for delete using (public.is_owner(family_id) or user_id = auth.uid());

drop policy if exists items_read  on public.items;
drop policy if exists items_write on public.items;
drop policy if exists items_edit  on public.items;
drop policy if exists items_del   on public.items;
create policy items_read  on public.items for select
  using (public.is_member(family_id) and (not private or owner_user = auth.uid()));
create policy items_write on public.items for insert
  with check (public.is_member(family_id) and (not private or owner_user = auth.uid()));
create policy items_edit  on public.items for update
  using (public.is_member(family_id) and (not private or owner_user = auth.uid()))
  with check (public.is_member(family_id) and (not private or owner_user = auth.uid()));
create policy items_del   on public.items for delete
  using (public.is_member(family_id) and (not private or owner_user = auth.uid()));

drop policy if exists rec_all on public.recipes;
create policy rec_all on public.recipes for all
  using (public.is_member(family_id)) with check (public.is_member(family_id));

drop policy if exists act_read on public.activity;
drop policy if exists act_add  on public.activity;
create policy act_read on public.activity for select using (public.is_member(family_id));
create policy act_add  on public.activity for insert with check (public.is_member(family_id));

-- Lage og bli med i familie ---------------------------------------------
create or replace function public.create_family(fname text, myname text)
returns json language plpgsql security definer set search_path = public as $$
declare f uuid; m uuid; c text; tries int := 0;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  loop
    c := upper(substr(translate(encode(gen_random_bytes(8), 'base64'), '+/=01OIl', ''), 1, 6));
    exit when char_length(c) = 6 and not exists (select 1 from families where code = c);
    tries := tries + 1; if tries > 20 then raise exception 'code_failed'; end if;
  end loop;
  insert into families(name, code, owner_user) values (trim(fname), c, auth.uid()) returning id into f;
  insert into members(family_id, user_id, name, color) values (f, auth.uid(), trim(myname), '#c4877f') returning id into m;
  return json_build_object('family_id', f, 'member_id', m, 'code', c);
end $$;

create or replace function public.join_family(fcode text, myname text)
returns json language plpgsql security definer set search_path = public as $$
declare f uuid; m uuid; n int;
  colors text[] := array['#c4877f','#7d8fa3','#c9a46a','#8a9a7b','#a8879b','#6f8f8a','#b5856a','#9c8775','#c4877f','#7d8fa3'];
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  select id into f from families where code = upper(trim(fcode));
  if f is null then raise exception 'family_not_found'; end if;
  select id into m from members where family_id = f and user_id = auth.uid();
  if m is not null then return json_build_object('family_id', f, 'member_id', m); end if;
  select count(*) into n from members where family_id = f;
  if n >= 10 then raise exception 'family_full'; end if;
  insert into members(family_id, user_id, name, color) values (f, auth.uid(), trim(myname), colors[n + 1]) returning id into m;
  return json_build_object('family_id', f, 'member_id', m);
end $$;

grant execute on function public.create_family(text, text) to authenticated;
grant execute on function public.join_family(text, text) to authenticated;

-- Sanntid: endringer vises med en gang hos alle i familien ----------------
do $$ begin
  begin alter publication supabase_realtime add table public.items;    exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.recipes;  exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.activity; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.members;  exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.families; exception when duplicate_object then null; end;
end $$;
