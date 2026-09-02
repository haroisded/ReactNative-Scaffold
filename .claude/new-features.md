# New features

Ported from [`Simonstorms/expo-app-template`](https://github.com/Simonstorms/expo-app-template)
after reviewing it as a comparison scaffold. Two things there were better than what this project
had: session storage that is not plaintext, and a database layer whose Row Level Security and
`security definer` functions are hardened rather than merely present.

Everything below follows the rules in `CLAUDE.md` — verified against `node_modules` rather than
against published docs, and one deliberate departure from the source is recorded with its reason.

---

## Contents

1. [`src/lib/secure-storage.ts` — the session leaves plaintext](#1-srclibsecure-storagets--the-session-leaves-plaintext)
2. [What was *not* ported, and why](#2-what-was-not-ported-and-why)
3. [`supabase/optional/rls_auto_enable.sql` — written, parked, opt-in](#3-supabaseoptionalrls_auto_enablesql--written-parked-opt-in)
4. [`supabase/migrations/…_profiles.sql` — the profile row and the two functions](#4-supabasemigrations_profilessql--the-profile-row-and-the-two-functions)
5. [`deleteAccount()` and the Account screen](#5-deleteaccount-and-the-account-screen)
6. [Files touched](#6-files-touched)
7. [What you have to do before this runs](#7-what-you-have-to-do-before-this-runs)
8. [Known gaps](#8-known-gaps)

---

## 1. `src/lib/secure-storage.ts` — the session leaves plaintext

**Purpose.** Move the Supabase session out of AsyncStorage and into the iOS Keychain and the
Android Keystore.

AsyncStorage is not encrypted. On Android it is a row in an ordinary SQLite database; on iOS it is
an ordinary file in the app container. Anything with filesystem access on a rooted or jailbroken
device, and any unencrypted device backup, can read the refresh token straight out of it — and a
refresh token is enough to mint fresh access tokens until somebody revokes it. `expo-secure-store`
puts the same string behind platform key storage instead.

The adapter is three methods, because that is all `SupportedStorage` is
(`auth-js/lib/types.d.ts:1556`): `getItem`, `setItem`, `removeItem`, each allowed to return a
promise. It is intentionally left unannotated — the type lives in `@supabase/auth-js`, a transitive
dependency this project does not declare, and `createClient` checks the shape structurally at the
call site anyway.

Two decisions inside it are worth knowing about:

**Web falls back to AsyncStorage.** `expo-secure-store` has no web implementation at all:
`build/ExpoSecureStore.web.js` is literally `export default {}`, and `SecureStore.js` calls the
native method with no availability guard, so every call on web is a `TypeError`. AsyncStorage on
web is `localStorage`, which is where `supabase-js` would have put the session by default anyway.

**`keychainAccessible: AFTER_FIRST_UNLOCK` rather than the default.** The default is
`WHEN_UNLOCKED` (`SecureStore.d.ts:72`), under which any read while the device is locked fails
outright. `supabase.ts` already stops auto-refresh whenever the app leaves the foreground, so that
read should never be attempted — this deletes the failure mode instead of depending on that
ordering holding forever. The item still never leaves the device: `expo-secure-store` never sets
`kSecAttrSynchronizable`, so iCloud Keychain does not carry it.

One thing that needed checking before this could work at all: SecureStore keys are validated
against `/^[\w.-]+$/` (`SecureStore.js:152`), so a key containing `/` throws. Every key `auth-js`
writes is the storage key plus a suffix — `-user`, `-code-verifier`, `-flows-code-verifier`, and
`-flow-<32 hex>-code-verifier` (`helpers.js:268`) — and all of them pass. `auth-js` does put a `/`
into the recovery verifier, but into the *value* (`helpers.js:392`), where nothing validates it.

---

## 2. What was *not* ported, and why

The source file chunks the session across numbered keys, keeps a generation counter so a reader
never mixes old and new pieces, and serialises writes per key through a promise queue. All of that
exists to stay under a 2048-byte SecureStore limit.

**That limit no longer exists in `expo-secure-store@57.0.3`.**

- `setItemAsync` (`build/SecureStore.js`) validates only that the value is a string. There is no
  size check and no size warning left in the JS layer.
- On Android the write path is `AESEncryptor` — a symmetric key in the Keystore — into
  SharedPreferences (`SecureStoreModule.kt`, `setItemImpl`). Nothing measures the value.
- The 2048-byte ceiling belonged to `HybridAESEncryptor`, which wraps an AES key with an RSA key
  because Android API 22 and below cannot store symmetric keys. Its own header comment
  (`HybridAESEncryptor.kt:37`) says the write paths are gone and only the read paths remain, for
  devices that still hold hybrid-encrypted values. SDK 57's minimum is well above API 22.
- iOS was never the constrained side: Keychain generic passwords hold multi-kilobyte values
  routinely, and `SecureStoreModule.swift` sets no limit.

So the chunking now buys nothing and costs something — a partial write leaves a value split across
keys that disagree, which is the exact hazard the generation counter and the queue were then added
to contain. Removing the first removes the need for the other two. A comment in
`secure-storage.ts` records this so nobody re-adds it from a tutorial.

---

## 3. `supabase/optional/rls_auto_enable.sql` — written, parked, opt-in

**Purpose.** A DDL event trigger that turns on Row Level Security for every table created in
`public`, so shipping a table without it is not possible rather than merely discouraged.

**It is not installed, and nothing runs it.** The Supabase CLI only reads
`supabase/migrations/`, so a file under `supabase/optional/` is inert. Turning it on means moving
it into `migrations/` under a version prefix and pushing.

### Why it is not a migration

The reasoning is worth recording, because the obvious argument against installing it is the wrong
one.

**The weak argument** is that auto-enabling RLS breaks complicated schemas. Mostly it does not.
RLS enabled with zero policies is *deny-all*: `anon` and `authenticated` see nothing, the table
owner and `service_role` still see everything. So the failure mode is a query returning an empty
result — loud, immediate, and one `create policy` away from fixed. Against that, the failure mode
of *not* having it is a silent world-readable table. That trade favours keeping it.

**The argument that actually decided it** is discoverability. An event trigger is invisible and
global. `\d your_table` does not mention it. The migration that created that table does not mention
it. Nothing leads a reader from an empty result set back to the trigger. This repo exists to be
cloned and extended by people who have not read its docs — the bar `CLAUDE.md` sets — and every
other mechanism in it explains itself at the point of use. This one cannot.

Secondary: it needs superuser to install, so on a hosted project it may quietly not be there at
all, and a safety net that may or may not exist is a poor one.

### What covers the same mistake instead

The dashboard's **Security Advisor** (Advisors → Security) already reports `rls_disabled_in_public`
— the same mistake, caught by detection rather than enforcement, with nothing installed in the
database. Worth checking before any release.

`supabase db lint` is **not** this. That command type-checks plpgsql and nothing else; its
`--level warning|error` flags are about schema/typing errors, not policies.

Net effect of the decision: enforcement traded away, detection kept. For a scaffold that is the
right side of the trade. When the schema stops moving, or as soon as more than one person writes
migrations, move the file into `migrations/`.

### The hardening inside it, which is why it was kept rather than deleted

Three pieces, and what each one stops. The same reasoning applies to any `security definer`
function, including the two that *are* live in the profiles migration.

`private` schema — PostgREST publishes only `public` (and `graphql_public`), so a function in
`private` has no `/rest/v1/rpc/` URL to attack in the first place.

`set search_path = ''` — an unqualified name inside a `security definer` function resolves against
the **caller's** `search_path`, not the definer's. Without the pin, any authenticated user can
create their own `format` function or their own table in a schema they control, point the path at
it, and have it executed with the function owner's privileges. Pinning the path to empty means
every reference in the body must be schema-qualified, which is why it reads
`pg_catalog.format(...)` and `pg_catalog.pg_event_trigger_ddl_commands()`. Builtins still resolve
because `pg_catalog` is searched implicitly even when it is not on the path.

`revoke execute … from public, anon, authenticated, service_role` — and all four are named
deliberately. Supabase ships default privileges that grant `EXECUTE` on new functions to `anon`,
`authenticated` and `service_role` **directly**, not through `PUBLIC`, so revoking from `PUBLIC`
alone would leave three live grants behind. This is the one place the source template's approach
needed extending.

**One deliberate softening.** `CREATE EVENT TRIGGER` requires superuser. The local
`supabase start` stack has it; a hosted project's migration role may not. So the creation sits in a
`DO` block that catches `insufficient_privilege` and raises a warning instead of failing — which
is the second reason it is parked rather than shipped. If you do enable it and see that warning,
nothing is broken; you simply do not have the safety net.

The loop body also swallows its own errors into a `raise warning`. That is on purpose too: an event
trigger that raises aborts the `CREATE TABLE` that fired it, and a table that resists RLS is worth
a warning, not a migration that cannot run.

---

## 4. `supabase/migrations/…_profiles.sql` — the profile row and the two functions

**Purpose.** The smallest table that every app eventually needs, plus the two `security definer`
functions that make it work — and the demonstration of how those should be locked down.

### The table

`id uuid primary key references auth.users (id) on delete cascade`, `display_name`, `avatar_url`,
`created_at`. That is all.

RLS is enabled on it explicitly, in the file, three lines under the table. With the event trigger
parked, **that line is the only thing turning RLS on — every table you add from here needs its
own.** This is the case the Security Advisor exists to catch.

**There is no `email` column, on purpose.** `auth.users.email` is the source of truth and the client
already holds it as `session.user.email`. A copy here goes stale the moment somebody changes their
address, and keeping it in step needs a second trigger nobody remembers to write. The source
template has this column and this bug.

**There is no `updated_at` column either.** Nothing in the scaffold updates a profile yet, and a
timestamp column with no trigger maintaining it is a lie. Add both together when profile editing
arrives.

### The policies

Every policy is scoped `to authenticated`, so it is never evaluated for `anon` at all. Every
`auth.uid()` is wrapped as `(select auth.uid())`: unwrapped it is called once per row scanned;
wrapped, the planner runs it once as an InitPlan and reuses the result. On a table this size the
difference is invisible, but the habit is the point.

`profiles_update_own` carries both `using` and `with check`. `using` decides which rows may be
updated; `with check` decides what they may be updated *to*. Without the second, a user could hand
their row to somebody else by rewriting its `id`.

There is no delete policy, so no client can delete a profile directly. The row goes when the
account does, through the cascade.

**The table is not `force row level security`**, which is otherwise the stricter setting worth
reaching for. Forcing it subjects the table owner to the policies too, and `handle_new_user` inserts
as the owner during signup — a moment when there is no JWT, so `auth.uid()` is null and
`profiles_insert_own` would reject the very row that signup exists to create.

### `private.handle_new_user()`

Creates the profile row on signup, reading `full_name` and `avatar_url` out of
`new.raw_user_meta_data`, which is where both Google and Facebook land them. `nullif(…, '')` keeps
an empty string from masquerading as a set name.

It is `security definer` for two reasons: the insert has to bypass RLS (see above), and the caller
is GoTrue, not the user.

**Revoking `EXECUTE` does not stop the trigger.** Postgres checks `EXECUTE` on a trigger function
when the trigger is *created*, not each time it fires. So the trigger keeps working while the
function stays uncallable by hand — which is the whole trick, and worth knowing before you assume
the revoke is a mistake.

### `public.delete_current_user()`

Self-service account deletion. Deletes from `auth.users`, which cascades to `public.profiles`.

This one is in `public` because it is *meant* to be reachable — it is the app's own API, and
PostgREST publishes only `public`. Which is exactly why its grants are not optional:

```sql
revoke execute on function public.delete_current_user() from public, anon, authenticated, service_role;
grant  execute on function public.delete_current_user() to authenticated;
```

Without the revoke, `create function` in a Supabase project leaves this callable at
`POST /rest/v1/rpc/delete_current_user` by anyone holding the anon key — which ships inside the app
binary. Running as `postgres`. Unauthenticated.

The body is `delete from auth.users where id = (select auth.uid())`, so the only row it can ever
touch is the caller's own. For an unauthenticated caller `auth.uid()` is null and `id = null`
matches nothing, so even if the grant were wrong the failure mode is deleting zero rows. Two
independent reasons it is safe, which is the standard to hold `security definer` to.

---

## 5. `deleteAccount()` and the Account screen

**Purpose.** Give `delete_current_user` a caller, so the migration is live code rather than SQL
nobody runs — and satisfy App Store Guideline 5.1.1(v), which requires any app that can create an
account to let the user delete it from inside the app.

`deleteAccount()` in `src/lib/auth.ts` calls the RPC and then reuses the existing `signOut()`.
There is no server-side session left to revoke at that point, so `signOut()` is there only to clear
local storage and emit the `SIGNED_OUT` event the root layout's guard is watching for.

The delete has to happen in Postgres because no client-side key may write to `auth.users`: the
publishable key is in the app bundle, and the service role key must never be.

On the screen it is a text button in the MD3 `error` role behind a confirmation dialog, since it
cannot be undone. The color is read through Paper's `useTheme()` so it follows whichever of
`themes.js`'s two palettes is active — no hardcoded color, per the UI rules in `CLAUDE.md`.

The two actions now share one `run()` wrapper instead of two copies of the same
`try`/`catch`/`finally`; both end the session, so both unmount the screen on success and only ever
surface an error on failure.

---

## 6. Files touched

| File | Change |
|---|---|
| `src/lib/secure-storage.ts` | new — SecureStore-backed storage adapter |
| `src/lib/supabase.ts` | `storage: AsyncStorage` → `storage: secureStorage` |
| `src/lib/auth.ts` | new `deleteAccount()` |
| `src/app/(app)/index.tsx` | delete-account button, confirmation dialog, shared `run()` wrapper |
| `supabase/config.toml` | new — minimal, so the CLI recognises the directory |
| `supabase/migrations/20260902000002_profiles.sql` | new — the only migration that runs |
| `supabase/optional/rls_auto_enable.sql` | new — opt-in, outside `migrations/`, so inert |
| `app.json` | added the `expo-secure-store` plugin |
| `package.json` | added `expo-secure-store@~57.0.3` |
| `.gitignore` | ignore `supabase/.temp/` and `supabase/.branches/` |

`npm run typecheck` and `npm run lint` both pass.

---

## 7. What you have to do before this runs

**The migration has never been executed.** It is reviewed SQL, not tested SQL. Run it against a
branch or a throwaway project first:

```bash
supabase link --project-ref <ref>
supabase db push
```

Every statement in it is re-runnable — `create schema if not exists`, `create table if not exists`,
`drop policy if exists` before each `create policy`, `create or replace function`,
`drop trigger if exists` — so pasting it into the dashboard's SQL Editor instead is safe, and a
later `db push` re-applying it is a no-op.

**A note on `supabase db push` failing before it reaches any migration.** If it stops at
`Initialising login role...` with `permission denied to alter role … ADMIN option on role
"cli_login_postgres"`, that is the CLI's credential bootstrap, not this SQL. Postgres 16 requires
`ADMIN OPTION` on a role to alter it, and `CREATEROLE` alone no longer suffices. Try
`drop role if exists cli_login_postgres;` in the SQL Editor and push again; failing that, use
`--db-url` with the connection string from Dashboard → Connect, or paste the file in directly per
the paragraph above.

**The storage swap signs everyone out once.** The old session is in AsyncStorage and the client now
reads SecureStore, so the first launch after this change finds nothing and lands on the sign-in
screen. That is correct and it happens once. No migration path is included because nothing has
shipped from this scaffold yet; if that changes, read the old key from AsyncStorage once, write it
through, and delete it.

**SecureStore needs a native rebuild.** It is a native module, so Expo Go and any existing dev
client will not have it. `npx expo run:ios` / `npx expo run:android`, or a new EAS build.

---

## 8. Known gaps

**Nothing enforces RLS on tables you add.** By design — see
[§3](#3-supabaseoptionalrls_auto_enablesql--written-parked-opt-in). Each new table needs its own
`alter table … enable row level security`, and the Security Advisor is what catches the ones that
do not have it. Consider putting that check in whatever release routine this scaffold grows.

**Nothing reads `public.profiles` yet.** The table, its policies and its trigger are in place, but
the app still renders `session.user.user_metadata`. Wiring a profile query is the natural next step
and deliberately not part of this change.

**No generated `Database` types.** `createClient` is still ungenerified, so `supabase.from()` and
`supabase.rpc()` are untyped. Generating them needs the CLI against a live project:
`supabase gen types typescript --linked > src/types/database.ts`, then
`createClient<Database>(...)`.

**iOS Keychain entries survive an app uninstall.** Reinstalling can therefore resurrect the old
session. A stale refresh token simply fails to refresh and the user signs in again, so this is
noted rather than handled.

**SecureStore reads are slower than AsyncStorage reads** — each one is a keystore decrypt. It is a
handful of reads per app start, which has not been measured but is not expected to be visible.
