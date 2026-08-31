# React Native + Expo SDK 57 + Supabase — Auth Scaffold

A starting point for an app that needs Supabase auth on day one: clone it, fill in `.env`, build
your screens on top. Authentication, session handling, deep linking and OAuth are already wired
together and explained inline.

It doubles as a current replacement for Supabase's React Native auth quickstart, which still
installs `react-native-url-polyfill` and `@rneui/themed`, shows email/password only, and predates
expo-router's `Stack.Protected` guards, the publishable/secret API key migration, and asymmetric
JWTs.

**Contents**

- [What ships](#what-ships)
- [Versions](#versions)
- [File map](#file-map)
- [1. Setup](#1-setup)
- [2. Patched dependencies](#2-patched-dependencies)
- [3. Supabase project](#3-supabase-project)
- [4. Google sign-in](#4-google-sign-in)
- [5. Facebook sign-in](#5-facebook-sign-in)
- [6. Run it](#6-run-it)
- [How the session handling works](#how-the-session-handling-works)
- [Frontend rules](#frontend-rules)
- [Verify](#verify)

---

## What ships

- **Expo SDK 57** — React Native 0.86, React 19.2, expo-router v7, New Architecture
- **Google and Facebook social login** — native Google sheet on device, browser OAuth for Facebook
  and on web
- **Session handling** in one zustand store — restore, auto-refresh, sign-out
- **React Native Paper** for the whole UI, themed from `src/themes.js`
- **Patched dependency** via `patch-package`, applied automatically on install
- **Lint** — oxlint with a local `anti-slop` plugin in `tools/oxlint/`, wired up in `.oxlintrc.json`
- **Runs on web** (`npm run web`), so the whole session lifecycle is debuggable in a browser

## Versions

| Package | Version |
| --- | --- |
| `expo` | ~57.0.14 |
| `expo-router` | ~57.0.16 |
| `react-native` | 0.86.2 |
| `@supabase/supabase-js` | ^2.112.3 |
| `@react-native-async-storage/async-storage` | 2.2.0 |
| `@react-native-google-signin/google-signin` | ^16.1.4 |
| `zustand` | ^5.0.15 |
| `react-native-paper` | ^5.15.3 |
| `@expo/vector-icons` | ^15.0.2 |

> **Expo Go will not work.** The Google sign-in module is native code, and a custom `scheme` has
> no effect in Expo Go at all, so device testing needs a development build (`npm run ios` /
> `npm run android`). The web target (`npm run web`) needs nothing extra and is the fastest way
> to iterate on session logic.

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

## 1. Setup

```bash
npm install
cp .env.example .env
```

Fill in `.env` as you complete the steps below, then restart the dev server — Expo only
reads env vars at startup.

---

## 2. Patched dependencies

`patches/react-native-paper+5.15.3.patch` fixes `Surface`: its flex check ignored `flexGrow`, so
a Surface styled with `flexGrow` alone never got `flex: 1` and collapsed.

```js
// before
flex: flattenedStyles.height || !container && flattenedStyles.flex ? 1 : undefined,
// after
flex: flattenedStyles.height || !container && (flattenedStyles.flex || flattenedStyles.flexGrow) ? 1 : undefined,
```

Both builds carry the change: `lib/module/components/Surface.js` (line 102) and
`lib/commonjs/components/Surface.js` (line 110).

`npm install` applies every patch through the `postinstall` hook, so a fresh clone needs nothing
manual. To change or add one: edit the files under `node_modules/<package>/`, regenerate, and
commit the result.

```bash
npx patch-package react-native-paper   # writes patches/react-native-paper+5.15.3.patch
```

---

## 3. Supabase project

### API keys

**Project Settings → API Keys** — copy the **publishable** key (`sb_publishable_…`) into
`EXPO_PUBLIC_SUPABASE_KEY`, and the project URL into `EXPO_PUBLIC_SUPABASE_URL`.

The legacy `anon` key still works but is being retired at the end of 2026; the publishable key
is the replacement and is safe to ship in a client bundle because RLS still gates every query.
Never put the secret key (`sb_secret_…`) in an `EXPO_PUBLIC_` variable — it bypasses RLS.

### Redirect URLs

**Authentication → URL Configuration → Redirect URLs** — add both:

```
quickrnsupabase://**
http://localhost:8081/**
```

The first is this app's scheme (set in `app.json`), used by the Facebook browser flow to hand the
session back to the app. The second is the Expo web dev server.

### Site URL

**Authentication → URL Configuration → Site URL** — set it to `http://localhost:8081`.

> **Do not skip this one.** It defaults to `http://localhost:3000`, and when Supabase cannot match a
> `redirect_to` against the allow-list above it **silently falls back to Site URL** rather than
> erroring. On web that lands the browser on a different origin, which means a different
> `localStorage`, which means the PKCE code verifier written at the start of the flow is invisible
> on return. `auth-js` then treats the incoming `?code=` as *not a callback* at all — no exchange,
> no error, no log. A wrong Site URL is the single most likely cause of a sign-in that appears to
> do nothing.

---

## 4. Google sign-in

### Client IDs

In the [Google Cloud console](https://console.cloud.google.com/apis/credentials), create OAuth
2.0 client IDs:

| Client type | Where it goes |
| --- | --- |
| **Web** | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, **and** Supabase → Auth → Providers → Google (Client ID + secret) |
| **iOS** | `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` — also derives the app's iOS URL scheme in `app.config.ts` |
| **Android** | needs your package name `com.merchant.quickrnsupabase` and the signing-certificate SHA-1 |

Android has no separate ID in `.env`: the native module sends an ID token that Google issues
against the **web** client ID, which is what Supabase verifies.

### Authorized Client IDs

In Supabase's Google provider, add the iOS and Android client IDs to **Authorized Client IDs**
so `signInWithIdToken` accepts tokens minted by the native SDKs. Some projects show a single
**Client ID** field instead — there, comma-separate them with the web client ID first. Either
shape, the requirement is the same: every client ID that can mint a token must be registered, or
Supabase rejects a token the native SDK produced correctly.

### Consent screen

**Take the consent screen out of Testing.** While it is in Testing, only explicitly listed test
users can sign in; everyone else is refused on Google's own page inside the auth browser, so the
redirect never fires and it looks exactly like a broken redirect.

---

## 5. Facebook sign-in

### Meta app setup

Create an app on [Meta for Developers](https://developers.facebook.com/apps) with the
**Authenticate and request data from users with Facebook Login** use case, put
`https://YOUR-PROJECT.supabase.co/auth/v1/callback` in its **Valid OAuth Redirect URIs**, confirm
`public_profile` and `email` are **Ready for testing**, then paste the App ID and App secret into
Supabase → Auth → Providers → Facebook.

Nothing goes in `.env` — the client never touches the App ID, Supabase hosts the handshake.
Facebook never sees this app's scheme either; it only ever redirects to Supabase, and Supabase
redirects on to `quickrnsupabase://`.

### Development mode

While the Meta app is in **Development mode**, only accounts with an App Role can sign in.
Facebook renders "App not setup" *inside* the auth browser, so the redirect never happens — the
same silent shape as Google's Testing-mode consent screen.

### On "Continue as \<name\>" showing up when you wanted the account picker

Facebook's own cookie outlives your app's sign-out, so the next attempt re-offers the same account.
Two things already address it, and a third is not possible:

- `queryParams: { auth_type: 'reauthenticate' }` (`auth.ts:84`) forces Facebook's login screen
  rather than clearing anything. This is the only portable lever.
- `preferEphemeralSession: true` (`auth.ts:92`) makes the auth browser a throwaway session with no
  shared cookies — **iOS only**, and honored at the browser's discretion.
- Clearing the cookies on Android is not possible. The Custom Tab runs in Chrome's process against
  Chrome's cookie jar; nothing in your app can reach it. Signing the user out of Facebook after a
  successful login would end their Facebook session in their everyday browser, which is worse than
  the problem.

---

## 6. Run it

```bash
npm run web       # browser — full session flow, both providers via redirect OAuth
npm run ios       # development build (macOS + Xcode), native Google sheet
npm run android   # development build, native Google sheet
```

`npm run ios` / `npm run android` compile a dev build with `expo run:*`. For a device build
without local native tooling, use `eas build --profile development`.

---

## How the session handling works

### `src/lib/supabase.ts` — one client for every platform

```ts
export const supabase = createClient(url, publishableKey, {
  auth: {
    storage: AsyncStorage,   // localStorage under the hood on web
    flowType: 'pkce',        // default is 'implicit' — this is what returns ?code=
    debug: __DEV__,          // the only instrument that reaches inside detectSessionInUrl
  },
});
```

Three options, and every one of them does work. What is deliberately *not* here matters as much,
because current tutorials all add it:

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

On native, an `AppState` listener starts and stops the refresh timer. That is not redundant with
`autoRefreshToken` — on non-browser platforms the library's refresh loop otherwise runs
*continuously in the background*.

### `src/Store/StoreUser.ts` — the source of truth

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

### `src/app/_layout.tsx` — the route guard

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

### Sign-in paths (`src/lib/auth.ts`)

| Platform | Google | Facebook |
| --- | --- | --- |
| iOS / Android | native sheet → `signInWithIdToken` | system browser → `exchangeCodeForSession` |
| Web | redirect OAuth → `detectSessionInUrl` | redirect OAuth → `detectSessionInUrl` |

The native Google column never opens a browser, never uses `redirectTo`, and never touches PKCE —
so if Google sign-in fails *on a device*, no redirect configuration can be the cause.

The browser path uses `WebBrowser.openAuthSessionAsync`, which watches for `redirectTo` as a
prefix and closes the browser the moment a navigation matches, then parses the returned deep link
with `Linking.parse`.

### A cancel reaches the app two different ways, and both are handled

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

---

## Verify

```bash
npm run typecheck
npm run lint    # oxlint + the anti-slop rules
```

End-to-end, on web:

1. `npm run web` → sign in with Google → lands on the account screen with no explicit navigation
   call anywhere in the app.
2. Reload the page — the session is restored from storage, no sign-in screen flash.
3. Sign out, then sign in with Facebook → same screen, "Signed in with facebook" on the card.

On a dev build, before debugging any redirect:

```bash
npx uri-scheme open quickrnsupabase:// --android    # or --ios
```

This opens the app through its scheme with **no OAuth involved**. If the app opens, native
registration is fine and the problem is Supabase-side; if nothing happens, the deep link itself
is broken and no dashboard change will help.
