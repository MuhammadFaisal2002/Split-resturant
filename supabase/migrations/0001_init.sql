-- Split MVP — initial schema
-- Run in Supabase SQL editor (or `supabase db push`).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  phone text,
  raast_id text,
  iban text,
  wallet_number text,
  wallet_type text check (wallet_type in ('jazzcash','easypaisa','sadapay','nayapay','other')),
  notify_email boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- groups
-- ---------------------------------------------------------------------------
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  display_name text not null,
  position int not null default 0
);
create index if not exists group_members_group_idx on public.group_members(group_id);

-- ---------------------------------------------------------------------------
-- splits
-- ---------------------------------------------------------------------------
create table if not exists public.splits (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  total_amount integer not null check (total_amount > 0),
  split_type text not null check (split_type in ('equal','custom')),
  include_self boolean not null default true,
  status text not null default 'open' check (status in ('open','settled','closed')),
  short_code text not null unique,
  split_date date not null default current_date,
  note text,
  created_at timestamptz not null default now(),
  settled_at timestamptz,
  closed_at timestamptz
);
create index if not exists splits_owner_idx on public.splits(owner_user_id, created_at desc);

create table if not exists public.split_shares (
  id uuid primary key default gen_random_uuid(),
  split_id uuid not null references public.splits(id) on delete cascade,
  display_name text not null,
  amount integer not null check (amount >= 0),
  is_owner boolean not null default false,
  position int not null default 0,
  status text not null default 'unpaid'
    check (status in ('unpaid','pending','confirmed','rejected','waived')),
  claimed_token text,
  screenshot_path text,
  note text,
  reject_reason text,
  marked_paid_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists split_shares_split_idx on public.split_shares(split_id, position);

create table if not exists public.reminders_log (
  id uuid primary key default gen_random_uuid(),
  split_id uuid not null references public.splits(id) on delete cascade,
  sent_at timestamptz not null default now(),
  channel text not null default 'whatsapp_manual',
  unpaid_count int
);

-- ---------------------------------------------------------------------------
-- analytics events
-- ---------------------------------------------------------------------------
create table if not exists public.events (
  id bigserial primary key,
  name text not null,
  split_id uuid,
  share_id uuid,
  user_id uuid,
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists events_name_idx on public.events(name, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Organizers use the anon key + their session; RLS scopes them to their rows.
-- Public payer pages go through the server with the service role key and are
-- validated in application code, so no anon policies are needed.
-- ---------------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.groups        enable row level security;
alter table public.group_members enable row level security;
alter table public.splits        enable row level security;
alter table public.split_shares  enable row level security;
alter table public.reminders_log enable row level security;
alter table public.events        enable row level security;

drop policy if exists "profiles: own" on public.profiles;
create policy "profiles: own" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "groups: own" on public.groups;
create policy "groups: own" on public.groups
  for all using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);

drop policy if exists "group_members: via group" on public.group_members;
create policy "group_members: via group" on public.group_members
  for all using (exists (select 1 from public.groups g where g.id = group_id and g.owner_user_id = auth.uid()))
  with check (exists (select 1 from public.groups g where g.id = group_id and g.owner_user_id = auth.uid()));

drop policy if exists "splits: own" on public.splits;
create policy "splits: own" on public.splits
  for all using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);

drop policy if exists "split_shares: via split" on public.split_shares;
create policy "split_shares: via split" on public.split_shares
  for all using (exists (select 1 from public.splits s where s.id = split_id and s.owner_user_id = auth.uid()))
  with check (exists (select 1 from public.splits s where s.id = split_id and s.owner_user_id = auth.uid()));

drop policy if exists "reminders_log: via split" on public.reminders_log;
create policy "reminders_log: via split" on public.reminders_log
  for all using (exists (select 1 from public.splits s where s.id = split_id and s.owner_user_id = auth.uid()))
  with check (exists (select 1 from public.splits s where s.id = split_id and s.owner_user_id = auth.uid()));

-- events: written only by the server (service role). Owners can read their own.
drop policy if exists "events: read own" on public.events;
create policy "events: read own" on public.events
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage bucket for payment screenshots (private; served via signed URLs)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('screenshots', 'screenshots', false, 5242880, array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Auto-settle: when every non-owner share is confirmed or waived, mark the
-- split settled. Rejected / unpaid / pending keep it open.
-- ---------------------------------------------------------------------------
create or replace function public.check_split_settled()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  remaining int;
  s_status text;
begin
  select status into s_status from public.splits where id = new.split_id;
  if s_status <> 'open' then
    return new;
  end if;

  select count(*) into remaining
  from public.split_shares
  where split_id = new.split_id
    and is_owner = false
    and status not in ('confirmed','waived');

  if remaining = 0 then
    update public.splits
      set status = 'settled', settled_at = now()
      where id = new.split_id and status = 'open';
  end if;
  return new;
end;
$$;

drop trigger if exists split_shares_check_settled on public.split_shares;
create trigger split_shares_check_settled
  after update of status on public.split_shares
  for each row execute function public.check_split_settled();
