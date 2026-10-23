-- SEASTRONG questionnaire: email alert on every new response (via a Google Apps Script web app)
-- The trigger sends a small JSON message with a running tally; it never blocks or fails a submission.
create extension if not exists pg_net with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.notify_config (
  id int primary key default 1 check (id = 1),
  webhook_url text not null,
  token text not null,
  enabled boolean not null default true
);
revoke all on private.notify_config from public, anon, authenticated;

insert into private.notify_config (id, webhook_url, token)
values (1, '__WEBHOOK_URL__', '__SHARED_TOKEN__')
on conflict (id) do update set webhook_url = excluded.webhook_url, token = excluded.token, enabled = true;

create or replace function public.survey_notify()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  cfg record;
  partners text[] := array['UBRE','ZMT','UNIVE','EPHE','ENU','IHE','ULANC','SZN','UAL','HRHP','TIDE','TAL','USP','SIF','SPGA'];
  tally jsonb;
  resp jsonb;
begin
  select * into cfg from private.notify_config where id = 1 and enabled;
  if not found then
    return new;
  end if;

  with r as (
    select organisation, organisation_other
    from public.survey_responses
    where coalesce(client_meta->>'test', 'false') <> 'true'
  )
  select jsonb_build_object(
    'responses', (select count(*) from r),
    'partners_responded', (select count(distinct organisation) from r where organisation = any(partners)),
    'partners_total', array_length(partners, 1),
    'other_responses', (select count(*) from r where not (organisation = any(partners))),
    'by_org', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb) from (
                 select case when organisation = 'Other' then coalesce(nullif(organisation_other, ''), 'Other') else organisation end as k,
                        count(*) as n
                 from r group by 1) s),
    'missing', (select coalesce(jsonb_agg(p order by ord), '[]'::jsonb)
                from unnest(partners) with ordinality as u(p, ord)
                where not exists (select 1 from r where r.organisation = u.p))
  ) into tally;

  resp := jsonb_build_object(
    'org', new.organisation,
    'org_other', new.organisation_other,
    'name', new.respondent_name,
    'role', new.respondent_role,
    'responding_for', new.responding_for,
    'test', coalesce(new.client_meta->>'test', 'false') = 'true',
    'duration_s', new.client_meta->>'duration_s',
    'answered', (select count(*) from jsonb_object_keys(new.answers)),
    'channels', case when jsonb_typeof(new.social->'channels') = 'array' then jsonb_array_length(new.social->'channels') else 0 end,
    'consent_contact', new.consent_contact,
    'created_at', new.created_at
  );

  perform net.http_post(
    url := cfg.webhook_url,
    body := jsonb_build_object('token', cfg.token, 'response', resp, 'tally', tally),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 15000
  );
  return new;
exception when others then
  return new;  -- a notification problem must never stop a submission
end;
$$;

revoke all on function public.survey_notify() from public, anon, authenticated;

drop trigger if exists survey_notify on public.survey_responses;
create trigger survey_notify after insert on public.survey_responses
  for each row execute function public.survey_notify();
