# Architecture

How this scaffold is laid out and how the session actually flows through it. Setup and dashboard
configuration live in [README.md](./README.md).

**Contents**

- [File map](#file-map)
- [The client — `src/lib/supabase.ts`](#the-client--srclibsupabasets)
- [The session store — `src/Store/StoreUser.ts`](#the-session-store--srcstorestoreuserts)
- [The route guard — `src/app/_layout.tsx`](#the-route-guard--srcapp_layouttsx)
- [Sign-in paths — `src/lib/auth.ts`](#sign-in-paths--srclibauthts)
- [How a cancel reaches the app](#how-a-cancel-reaches-the-app)
- [Frontend rules](#frontend-rules)

---

## File map

```
src/lib/supabase.ts        client: AsyncStorage, PKCE, debug, AppState auto-refresh
src/lib/auth.ts            signInWithGoogle / signInWithFacebook / signOut, platform branches
src/Store/StoreUser.ts     the session handler — one onAuthStateChange subscription
src/themes.js              MD3 light/dark palettes; the only colors in the project
src/app/_layout.tsx        PaperProvider + the two-state route guard
src/app/sign-in.tsx        provider buttons
src/app/(app)/_layout.tsx  layout for the signed-in group
src/app/(app)/index.tsx    signed-in screen: account card, sign out
app.config.ts              derives the Google iOS URL scheme from .env
patches/                   patch-package diffs, applied by the postinstall hook
.oxlintrc.json             oxlint config: rule list + the local plugin it loads
tools/oxlint/anti-slop/    that plugin — TypeScript rules, not shipped in the app bundle
PROMPT.MD                  the frontend rules this UI is built under
```

---

## The client — `src/lib/supabase.ts`

One client for every platform:

```ts
export const supabase = createClient(url, publishableKey, {
  auth: {
    storage: AsyncStorage,   // localStorage under the hood on web
    flowType: 'pkce',        // default is 'implicit' — this is what returns ?code=
    debug: __DEV__,          // the only instrument that reaches inside detectSessionInUrl
  },
});
```

Three options, and every one of them does work.

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
bundle is on the device either way. Supabase RLS is the real boundary.

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

## Frontend rules

1. No custom components — React Native Paper only.
2. No hardcoded or inline colors — everything comes from `src/themes.js`.
3. Extract a component only when a second screen needs it.

Paper's icons are wired to `@expo/vector-icons` through `PaperProvider`'s `settings` prop in
`src/app/_layout.tsx`. Paper's own default goes through `react-native-vector-icons`, whose font
files nothing here loads, so icons would render as blank boxes. `react-native-vector-icons` stays
in `package.json` because Paper imports it internally regardless of the override.
