-- SEASTRONG partner questionnaire (v1), Supabase project "SeaStrong" (ref kljyffmicdvdnxgtrmbb)
-- Public visitors can INSERT a response (only with consent) and read AGGREGATES via survey_results().
-- Nobody outside the project dashboard can read individual responses.
create table if not exists public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  survey_version text not null default 'v1',
  organisation text not null,
  organisation_other text,
  country text,
  respondent_name text not null,
  respondent_role text,
  respondent_email text not null,
  responding_for text,
  contacts jsonb not null default '{}'::jsonb,
  answers jsonb not null default '{}'::jsonb,
  social jsonb not null default '{}'::jsonb,
  comments jsonb not null default '{}'::jsonb,
  consent_data boolean not null default false,
  consent_contact boolean not null default false,
  client_meta jsonb not null default '{}'::jsonb,
  constraint consent_required check (consent_data = true),
  constraint json_shapes check (
    jsonb_typeof(contacts) = 'object' and jsonb_typeof(answers) = 'object'
    and jsonb_typeof(social) = 'object' and jsonb_typeof(comments) = 'object'
    and jsonb_typeof(client_meta) = 'object'
  ),
  constraint honeypot_empty check (coalesce(client_meta->>'hp', '') = ''),
  constraint sane_sizes check (
    char_length(organisation) <= 200 and char_length(coalesce(organisation_other,'')) <= 300
    and char_length(respondent_name) <= 200 and char_length(respondent_email) <= 320
    and char_length(coalesce(country,'')) <= 100 and char_length(coalesce(respondent_role,'')) <= 300
    and char_length(coalesce(responding_for,'')) <= 300 and char_length(survey_version) <= 20
    and pg_column_size(contacts) < 20000 and pg_column_size(answers) < 60000
    and pg_column_size(social) < 30000 and pg_column_size(comments) < 60000
    and pg_column_size(client_meta) < 5000
  )
);

comment on table public.survey_responses is 'SEASTRONG partner website and social media questionnaire (v1). Contains personal data: visible to project admins only (Supabase dashboard). Public can insert only; results are exposed only in aggregate via survey_results().';

alter table public.survey_responses enable row level security;

drop policy if exists "public can submit" on public.survey_responses;
create policy "public can submit" on public.survey_responses
  for insert to anon, authenticated
  with check (consent_data = true);

revoke all on public.survey_responses from anon, authenticated;
grant insert on public.survey_responses to anon, authenticated;

create index if not exists survey_responses_created_idx on public.survey_responses (created_at desc);
create index if not exists survey_responses_org_idx on public.survey_responses (organisation, created_at desc);

-- Flood guard: reject if 60+ submissions arrive within 10 minutes; also pins created_at to server time
create or replace function public.survey_flood_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.survey_responses where created_at > now() - interval '10 minutes') >= 60 then
    raise exception 'Too many submissions right now. Please try again in a few minutes.';
  end if;
  new.created_at := now();
  return new;
end;
$$;

revoke all on function public.survey_flood_guard() from public, anon, authenticated;

drop trigger if exists survey_flood_guard on public.survey_responses;
create trigger survey_flood_guard before insert on public.survey_responses
  for each row execute function public.survey_flood_guard();

-- Aggregate-only results for the public results page (no names, emails or free text)
create or replace function public.survey_results()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with r as (
  select * from public.survey_responses
  where survey_version like 'v1%' and coalesce(client_meta->>'test', 'false') <> 'true'
),
kv as (
  select r.id, e.key as q, e.value as v from r, jsonb_each(r.answers) e
),
singles as (
  select q, v #>> '{}' as opt, count(*)::int as n from kv
  where jsonb_typeof(v) in ('string','number','boolean') group by 1, 2
),
multis as (
  select q, x as opt, count(*)::int as n from kv, jsonb_array_elements_text(v) x
  where jsonb_typeof(v) = 'array' group by 1, 2
),
objs as (
  select q, o.key as item, o.value as val from kv, jsonb_each(v) o where jsonb_typeof(v) = 'object'
),
ranks as (
  select q, item, avg((val #>> '{}')::numeric) as avg_rank, count(*)::int as n
  from objs where jsonb_typeof(val) = 'number' group by 1, 2
),
matrix as (
  select q, item, val #>> '{}' as opt, count(*)::int as n
  from objs where jsonb_typeof(val) = 'string' group by 1, 2, 3
),
latest_org as (
  select distinct on (organisation, lower(coalesce(organisation_other, ''))) * from r
  where jsonb_typeof(social->'channels') = 'array' and jsonb_array_length(social->'channels') > 0
  order by organisation, lower(coalesce(organisation_other, '')), created_at desc
),
ch as (
  select coalesce(nullif(c->>'platform',''),'Other') as platform,
         case when (c->>'followers') ~ '^[0-9]{1,10}$' then (c->>'followers')::bigint else 0 end as followers,
         l.organisation || coalesce(l.organisation_other, '') as org_key
  from latest_org l, jsonb_array_elements(l.social->'channels') c
  where jsonb_typeof(c) = 'object'
)
select jsonb_build_object(
  'generated_at', now(),
  'responses', (select count(*) from r),
  'organisations', (select coalesce(jsonb_agg(distinct organisation), '[]'::jsonb) from r where organisation <> 'Other'),
  'other_organisations', (select count(distinct lower(coalesce(organisation_other,''))) from r where organisation = 'Other'),
  'choice_counts', (select coalesce(jsonb_object_agg(q, opts), '{}'::jsonb) from (
      select q, jsonb_object_agg(opt, n) as opts from (select * from singles union all select * from multis) s group by q) t),
  'rankings', (select coalesce(jsonb_object_agg(q, items), '{}'::jsonb) from (
      select q, jsonb_object_agg(item, jsonb_build_object('avg', round(avg_rank, 2), 'n', n)) as items from ranks group by q) t),
  'matrices', (select coalesce(jsonb_object_agg(q, items), '{}'::jsonb) from (
      select q, jsonb_object_agg(item, opts) as items from (
        select q, item, jsonb_object_agg(opt, n) as opts from matrix group by q, item) m group by q) t),
  'social_reach', (select coalesce(jsonb_object_agg(platform, jsonb_build_object('followers', total, 'organisations', orgs)), '{}'::jsonb) from (
      select platform, sum(followers) as total, count(distinct org_key) as orgs from ch group by platform) t),
  'social_total_followers', (select coalesce(sum(followers), 0) from ch),
  'social_organisations', (select count(*) from latest_org)
);
$$;

revoke all on function public.survey_results() from public;
grant execute on function public.survey_results() to anon, authenticated;

-- Admin convenience view for the dashboard (security invoker; anon/authenticated have no access)
create or replace view public.survey_contacts with (security_invoker = true) as
select created_at, organisation, organisation_other, country, respondent_name, respondent_role, respondent_email, responding_for,
       contacts->'website_liaison' as website_liaison,
       contacts->'comms_liaison' as comms_liaison,
       contacts->'social_contact' as social_contact,
       contacts->'approver' as social_approver,
       consent_contact
from public.survey_responses
order by created_at desc;

revoke all on public.survey_contacts from anon, authenticated;
