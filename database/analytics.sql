-- Run once in your own Supabase project's SQL Editor.
-- These tables and the RPC are server-only: browser keys cannot access them.
begin;
create table if not exists public.luma_visitors(id text primary key, first_seen timestamptz not null, last_seen timestamptz not null);
create table if not exists public.luma_sessions(id text primary key, visitor text not null, last_seen timestamptz not null, active boolean not null);
create index if not exists luma_sessions_presence on public.luma_sessions(active,last_seen);
create table if not exists public.luma_daily(day date primary key, views bigint not null default 0);
create table if not exists public.luma_visitor_days(day date, visitor text, primary key(day,visitor));
create table if not exists public.luma_bot_users(id text primary key, first_seen timestamptz not null, last_seen timestamptz not null);
alter table public.luma_visitors enable row level security;
alter table public.luma_sessions enable row level security;
alter table public.luma_daily enable row level security;
alter table public.luma_visitor_days enable row level security;
alter table public.luma_bot_users enable row level security;
revoke all on public.luma_visitors,public.luma_sessions,public.luma_daily,public.luma_visitor_days,public.luma_bot_users from public,anon,authenticated;

create or replace function public.luma_analytics(p_action text,p_visitor text default '',p_session text default '')
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 t timestamptz := now();
 d date := (now() at time zone 'Asia/Tashkent')::date;
 inserted bigint := 0;
begin
 if p_action='summary' then
  return jsonb_build_object(
   'site',jsonb_build_object(
    'visits',(select coalesce(sum(views),0) from public.luma_daily),
    'visitors',(select count(*) from public.luma_visitors),
    'todayVisits',(select coalesce(sum(views),0) from public.luma_daily where day=d),
    'todayVisitors',(select count(*) from public.luma_visitor_days where day=d),
    'online',(select count(distinct visitor) from public.luma_sessions where active and last_seen>t-interval '90 seconds')),
   'bot',jsonb_build_object(
    'users',(select count(*) from public.luma_bot_users),
    'today',(select count(*) from public.luma_bot_users where last_seen>=(d::timestamp at time zone 'Asia/Tashkent')),
    'recent',(select count(*) from public.luma_bot_users where last_seen>t-interval '24 hours')));
 elsif p_action='bot' then
  if p_visitor !~ '^[0-9]+$' then raise exception 'Invalid bot user'; end if;
  insert into public.luma_bot_users values(p_visitor,t,t) on conflict(id) do update set last_seen=excluded.last_seen;
 elsif p_action in ('view','heartbeat','leave') then
  if p_visitor !~ '^[a-f0-9]{32}$' or p_session !~ '^[a-f0-9]{32}$' then raise exception 'Invalid visitor'; end if;
  if p_action='view' then
   insert into public.luma_visitors values(p_visitor,t,t) on conflict(id) do update set last_seen=excluded.last_seen;
   insert into public.luma_sessions values(p_session,p_visitor,t,true) on conflict(id) do nothing;
   get diagnostics inserted = row_count;
   if inserted>0 then
    insert into public.luma_daily values(d,1) on conflict(day) do update set views=public.luma_daily.views+1;
   end if;
   insert into public.luma_visitor_days values(d,p_visitor) on conflict do nothing;
  end if;
  update public.luma_sessions set last_seen=t,active=(p_action<>'leave') where id=p_session and visitor=p_visitor;
  return jsonb_build_object('registered',exists(select 1 from public.luma_sessions where id=p_session and visitor=p_visitor));
 else raise exception 'Invalid action';
 end if;
 return jsonb_build_object('ok',true);
end;
$$;
revoke all on function public.luma_analytics(text,text,text) from public,anon,authenticated;
grant execute on function public.luma_analytics(text,text,text) to service_role;
commit;
