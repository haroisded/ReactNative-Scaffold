-- OPT-IN. Nothing runs this.
--
-- The Supabase CLI only reads `supabase/migrations/`, so this file is inert where it sits. To turn
-- it on, move it into that directory under a version prefix — `supabase migration new
-- rls_auto_enable` creates an empty file with a valid name to paste into — then `supabase db push`.
--
--
-- What it does
--
-- Installs a DDL event trigger that runs `alter table ... enable row level security` on every table
-- created in `public` from then on. Forgetting that on one table is the most common way a Supabase
-- project leaks data: PostgREST publishes the table over HTTP the moment it exists, the anon key
-- ships inside the app bundle where anyone can read it out, and with no policy in force every row
-- is world-readable.
--
--
-- Why it is not a migration in this scaffold
--
-- Not because it breaks things. RLS with no policies is deny-all, so the failure mode is a query
-- returning nothing — loud, and one `create policy` away from fixed. The reason is that an event
-- trigger is invisible: `\d your_table` does not mention it, the migration that created that table
-- does not mention it, and nothing leads a reader from the empty result back to this file. This
-- repo exists to be cloned and extended by people who have not read its docs, and every other
-- mechanism in it explains itself at the point of use. This one cannot.
--
-- It also needs superuser to install (see the DO block at the bottom), so on a hosted project it
-- may quietly not be there at all — and a safety net that may or may not exist is a poor one.
--
--
-- What covers the same mistake meanwhile
--
-- The dashboard's Security Advisor (Advisors -> Security) already reports `rls_disabled_in_public`
-- for exactly this. Detection rather than enforcement, with nothing installed in the database.
-- `supabase db lint` is NOT this — that command only type-checks plpgsql.
--
--
-- When turning it on is worth it
--
-- Once the schema stops moving and there are more tables than review reliably catches, or as soon
-- as more than one person writes migrations.

create schema if not exists private;

-- The function lives in `private`, not `public`. PostgREST only publishes `public` (and
-- `graphql_public`), so nothing in here has a /rest/v1/rpc/ URL at all. The revoke below is a
-- second lock on the same door.
create or replace function private.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
-- Pinned, and the body fully qualified because of it. An unqualified name inside a security
-- definer function resolves against the *caller's* search_path, so a caller who creates their own
-- `format` or their own table and points the path at it gets that object executed with this
-- function's owner privileges. Empty is safe for the calls below: pg_catalog is searched
-- implicitly even when it is not on the path.
set search_path = ''
as $$
declare
  cmd record;
begin
  for cmd in
    select *
    from pg_catalog.pg_event_trigger_ddl_commands()
    where object_type in ('table', 'partitioned table')
      and schema_name = 'public'
  loop
    begin
      -- object_identity arrives already schema-qualified and quoted, so %s is right here and %I
      -- would quote it a second time.
      execute pg_catalog.format('alter table %s enable row level security', cmd.object_identity);
    exception
      -- An event trigger that raises aborts the CREATE TABLE that fired it. A table that resists
      -- RLS is worth a warning, not a migration that cannot run.
      when others then
        raise warning 'rls_auto_enable: could not enable RLS on %', cmd.object_identity;
    end;
  end loop;
end;
$$;

-- Not redundant with the schema choice. Supabase ships default privileges that grant EXECUTE on
-- new functions to anon, authenticated and service_role *directly* — not through PUBLIC — so
-- revoking from PUBLIC alone would leave three live grants behind.
revoke execute on function private.rls_auto_enable() from public, anon, authenticated, service_role;

-- CREATE EVENT TRIGGER requires superuser. The local `supabase start` stack has it; a hosted
-- project's migration role may not, and that must not take the whole migration down — every table
-- below still enables RLS explicitly, so this is defence in depth, not the only defence.
do $$
begin
  execute 'drop event trigger if exists ensure_rls';
  execute 'create event trigger ensure_rls on ddl_command_end
             when tag in (''CREATE TABLE'', ''CREATE TABLE AS'', ''SELECT INTO'')
             execute function private.rls_auto_enable()';
exception
  when insufficient_privilege then
    raise warning
      'ensure_rls not installed: creating an event trigger needs superuser. Every table still sets RLS explicitly.';
end;
$$;
