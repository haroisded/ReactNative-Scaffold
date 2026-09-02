# Architecture

How this scaffold is laid out and how the session actually flows through it. Setup and dashboard
configuration live in [README.md](./README.md).

**Contents**

- [File map](#file-map)
- [The client — `src/lib/supabase.ts`](#the-client--srclibsupabasets)
- [Session storage — `src/lib/secure-storage.ts`](#session-storage--srclibsecure-storagets)
- [The session store — `src/Store/StoreUser.ts`](#the-session-store--srcstorestoreuserts)
- [The route guard — `src/app/_layout.tsx`](#the-route-guard--srcapp_layouttsx)
- [Sign-in paths — `src/lib/auth.ts`](#sign-in-paths--srclibauthts)
- [How a cancel reaches the app](#how-a-cancel-reaches-the-app)
- [The database — `supabase/`](#the-database--supabase)
- [Frontend rules](#frontend-rules)

---

## File map

```
src/lib/supabase.ts        client: secure storage, PKCE, debug, AppState auto-refresh
src/lib/secure-storage.ts  storage adapter: Keychain / Keystore native, AsyncStorage web
src/lib/auth.ts            signInWithGoogle / signInWithFacebook / signOut / deleteAccount
src/Store/StoreUser.ts     the session handler — one onAuthStateChange subscription
src/themes.js              MD3 light/dark palettes; the only colors in the project
src/app/_layout.tsx        PaperProvider + the two-state route guard
src/app/sign-in.tsx        provider buttons
src/app/(app)/_layout.tsx  layout for the signed-in group
src/app/(app)/index.tsx    signed-in screen: account card, sign out, delete account
app.config.ts              derives the Google iOS URL scheme from .env
supabase/migrations/       profiles table, its policies, the signup trigger, delete_current_user
supabase/optional/         SQL nothing runs — each file's header says what it is and when to use it
patches/                   patch-package diffs, applied by the postinstall hook
.oxlintrc.json             oxlint config: rule list + the local plugin it loads
tools/oxlint/anti-slop/    that plugin — TypeScript rules, not shipped in the app bundle
```

---

## The client — `src/lib/supabase.ts`

One client for every platform:

```ts
export const supabase = createClient(url, publishableKey, {
  auth: {
    storage: secureStorage,  // Keychain / Keystore on native, localStorage on web
    flowType: 'pkce',        // default is 'implicit' — this is what returns ?code=
    debug: __DEV__,          // the only instrument that reaches inside detectSessionInUrl
  },
});
```

Three options, and every one of them does work. `storage` is load-bearing twice over: without it
the client falls back to an in-memory adapter and the session dies with the process, and what it
points at decides whether the refresh token sits in plaintext.

### What is deliberately not here

It matters as much, because current tutorials all add it:

- **No `persistSession` / `autoRefreshToken`.** Both are already the defaults.
- **No `detectSessionInUrl`.** The library gates it on `isBrowser()`, which is
  `typeof window !== 'undefined' && typeof document !== 'undefined'`. React Native has no
  `document`, so it is already inert on native; `react-native-web` has both, so it is already on
  for web. The default is correct on all three platforms.
- **No `lock: processLock`.** It is `@deprecated` in 2.112.3 and the legacy lock path is removed
  in v3. The client single-flights refreshes itself now and lets the GoTrue server resolve
  cross-tab races; setting it opts back into the old path.
- **No `react-native-url-polyfill`.** Every `new URL(...)` in `auth-js` reads
  `window.location.href` behind an `isBrowser()` guard, so native never reaches one.

### The `AppState` listener

On native, an `AppState` listener starts and stops the refresh timer. That is not redundant with
`autoRefreshToken` — on non-browser platforms the library's refresh loop otherwise runs
*continuously in the background*.

---

## Session storage — `src/lib/secure-storage.ts`

Three methods — `getItem`, `setItem`, `removeItem` — which is the whole of `SupportedStorage`.
Native calls `expo-secure-store`; web calls AsyncStorage, which is `localStorage`.

**Why not AsyncStorage on native.** It is not encrypted: an ordinary SQLite row on Android, an
ordinary file in the app container on iOS. Filesystem access on a rooted or jailbroken device, or
an unencrypted device backup, yields the refresh token — and that alone mints access tokens until
someone revokes it. SecureStore puts the same string behind the iOS Keychain and the Android
Keystore.

**Why web is different.** `expo-secure-store` has no web implementation at all —
`ExpoSecureStore.web.js` is `export default {}`, and `SecureStore.js` calls the native method with
no availability guard, so every call there is a `TypeError`.

**`keychainAccessible: AFTER_FIRST_UNLOCK`**, not the `WHEN_UNLOCKED` default, under which any read
while the device is locked fails outright. The `AppState` listener above already stops refreshing
in the background, so this deletes a failure mode rather than depending on that ordering holding.
The item still never leaves the device: `expo-secure-store` never sets `kSecAttrSynchronizable`, so
iCloud Keychain does not carry it.

**No chunking**, which other scaffolds add to stay under a 2048-byte limit. That limit belonged to
the RSA hybrid encryptor, kept only as a read path for Android API 22 and below — beneath SDK 57's
floor. The live write path is AES into SharedPreferences, and `setItemAsync` checks only that the
value is a string. Splitting a session across keys now buys nothing and adds a torn-write window.

Keys need no escaping either: SecureStore validates them against `/^[\w.-]+$/`, and every key
`auth-js` writes is the storage key plus a suffix — `-user`, `-code-verifier`,
`-flows-code-verifier`, `-flow-<32 hex>-code-verifier`.

---

## The session store — `src/Store/StoreUser.ts`

A single `onAuthStateChange` subscription, subscribed at module scope, is the source of truth. It
fires with `INITIAL_SESSION` (restored from storage) shortly after subscribing, so no separate
`getSession()` call is needed — a second source could disagree with the first.

The session has **three** states, not two:

| State | Meaning |
| --- | --- |
| `undefined` | until the first event arrives |
| `null` | once resolved and signed out |
| `Session` | once signed in |

`isLoading` is derived (`session === undefined`), never stored, so the two cannot desync.

---

## The route guard — `src/app/_layout.tsx`

`PaperProvider` over two mutually exclusive route states:

```tsx
<Stack.Protected guard={!session}><Stack.Screen name="sign-in" /></Stack.Protected>
<Stack.Protected guard={!!session}><Stack.Screen name="(app)" /></Stack.Protected>
```

No `router.replace` calls anywhere in the app: sign-in and sign-out just change the session, and
the guards move the user. The layout renders `null` while the session is unknown, so the splash
screen covers the restore and the sign-in screen never flashes.

The guard is **UX, not security** — expo-router evaluates it client-side only, and the signed-in
bundle is on the device either way. Supabase RLS is the real boundary, which is what the policies
under [The database](#the-database--supabase) are for.

---

## Sign-in paths — `src/lib/auth.ts`

| Platform | Google | Facebook |
| --- | --- | --- |
| iOS / Android | native sheet → `signInWithIdToken` | system browser → `exchangeCodeForSession` |
| Web | redirect OAuth → `detectSessionInUrl` | redirect OAuth → `detectSessionInUrl` |

The native Google column never opens a browser, never uses `redirectTo`, and never touches PKCE —
so if Google sign-in fails *on a device*, no redirect configuration can be the cause.

The browser path uses `WebBrowser.openAuthSessionAsync`, which watches for `redirectTo` as a
prefix and closes the browser the moment a navigation matches, then parses the returned deep link
with `Linking.parse`.

`signOut` uses `scope: 'local'`. The default `'global'` ends the session on every device the user
is signed in on, and it is a server call, so it throws when offline — stranding someone signed in.
It also clears the native Google session, which Supabase leaves cached; without that the next
sign-in silently reuses the last account instead of showing the picker.

`deleteAccount` calls the `delete_current_user` RPC and then `signOut`. The deletion has to happen
in Postgres because no client-side key may write to `auth.users` — see
[The database](#the-database--supabase).

---

## How a cancel reaches the app

It arrives two different ways, and both are handled.

- **Cancel *inside* the provider's dialog** is a normal redirect back through Supabase carrying
  `error=access_denied` — the prefix matches, so the browser closes and reports success. Reading
  `error_description` there would put Facebook's literal "Permissions error" on screen for someone
  who just changed their mind, so `browserOAuth` checks for `access_denied` first and resolves
  `'cancelled'` quietly.
- **Dismissing the browser *itself*** is the other path, and it is not redundant: on Android a
  genuine user cancel arrives that way too, which is also why it only logs a warning rather than
  throwing — a Supabase allow-list miss is indistinguishable from a dismiss at that point.

---

## The database — `supabase/`

One migration. It creates `public.profiles` — `id` referencing `auth.users` with
`on delete cascade`, `display_name`, `avatar_url`, `created_at` — plus its policies, a trigger that
fills the row on signup, and the function behind the **Delete account** button.

There is no `email` column. `auth.users.email` is the source of truth and the client already holds
it as `session.user.email`; a copy would go stale on the first address change and need a second
trigger to keep in step.

### The policies

Scoped `to authenticated`, so they are never evaluated for `anon` at all. Every `auth.uid()` is
wrapped as `(select auth.uid())` — unwrapped it runs once per row scanned, wrapped the planner runs
it once as an InitPlan. `profiles_update_own` carries both `using` and `with check`: `using`
decides which rows may be updated, `with check` what they may be updated *to*, and without the
second a user could hand their row to somebody else by rewriting its `id`.

No delete policy — the row goes when the account does, through the cascade.

The table is deliberately **not** `force row level security`. Forcing it subjects the table owner
to the policies too, and the signup trigger inserts as the owner at a moment when there is no JWT,
so `auth.uid()` is null and `profiles_insert_own` would reject the row signup exists to create.

### The two `security definer` functions

`private.handle_new_user()` creates the profile row on signup, reading `full_name` and `avatar_url`
out of `raw_user_meta_data` where both providers land them. `public.delete_current_user()` deletes
the caller's own `auth.users` row, which cascades.

`security definer` means the body runs with the *owner's* privileges, not the caller's — a
deliberate privilege escalation, which is why all three of these are mandatory every time:

| | Stops |
| --- | --- |
| `private` schema, or `revoke execute` | The function being called over PostgREST at `/rest/v1/rpc/<name>` by anyone holding the publishable key |
| `set search_path = ''` + a fully-qualified body | The caller pointing an unqualified name at their own object and having it run as the owner |
| A `(select auth.uid())` check inside the body | The function doing anything for a caller beyond their own rows |

The revokes name `public, anon, authenticated, service_role` individually rather than just `PUBLIC`
because Supabase ships default privileges that grant `EXECUTE` on new functions in `public` to the
last three **directly**. Revoking from `PUBLIC` alone leaves three live grants behind.

Revoking `EXECUTE` does not break the signup trigger: Postgres checks that privilege when a trigger
is *created*, not each time it fires.

### RLS is per-table, and manual

`alter table … enable row level security` is set explicitly for `profiles`, and **nothing sets it
for tables added later**. A new table in `public` is served over HTTP by PostgREST the moment it
exists. The dashboard's Security Advisor reports the ones missing it under `rls_disabled_in_public`.

`supabase/optional/rls_auto_enable.sql` is a DDL event trigger that would enforce it globally. It
sits outside `migrations/`, so the CLI never runs it — an event trigger is invisible to whoever
inherits the schema, and it needs superuser to install. Its header covers how and when to enable it.

---

## Frontend rules

1. No custom components — React Native Paper only.
2. No hardcoded or inline colors — everything comes from `src/themes.js`. Where a color has to be
   picked by hand, read it from Paper's `useTheme()` so it follows whichever palette is active. The
   **Delete account** button is the one place this happens, using the MD3 `error` role.
3. Extract a component only when a second screen needs it.

Paper's icons are wired to `@expo/vector-icons` through `PaperProvider`'s `settings` prop in
`src/app/_layout.tsx`. Paper's own default goes through `react-native-vector-icons`, whose font
files nothing here loads, so icons would render as blank boxes. `react-native-vector-icons` stays
in `package.json` because Paper imports it internally regardless of the override.
