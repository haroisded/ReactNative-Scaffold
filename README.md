# Session Handler Quickstart — Expo SDK 57 + React Native + Supabase

A current replacement for Supabase's React Native auth quickstart. That guide still installs
`react-native-url-polyfill` and `@rneui/themed`, shows email/password only, and predates
expo-router's `Stack.Protected` guards, the publishable/secret API key migration, and
asymmetric JWTs.

This one ships:

- **Expo SDK 57** (React Native 0.86, React 19.2, expo-router v7, New Architecture)
- **Google and Facebook social login** — native Google sheet on device, browser OAuth for
  Facebook and on web
- **Session handling** in one context: restore, auto-refresh, sign-out
- **Patched dependency** via `patch-package`, applied automatically on install
- **Lint** — oxlint with a local `anti-slop` plugin in `tools/oxlint/`, wired up in `.oxlintrc.json`
- **Runs on web** (`npm run web`), so the whole session lifecycle is debuggable in a browser

| Package | Version |
| --- | --- |
| `expo` | ~57.0.14 |
| `react-native` | 0.86.2 |
| `@supabase/supabase-js` | ^2.112.3 |
| `@react-native-async-storage/async-storage` | 2.2.0 |
| `@react-native-google-signin/google-signin` | ^16.1.4 |
| `react-native-paper` | ^5.15.3 |

> **Expo Go will not work.** The Google sign-in module is native code, so device testing needs a
> development build (`npm run ios` / `npm run android`). The web target (`npm run web`) needs
> nothing extra and is the fastest way to iterate on session logic.

## File map

```
src/lib/supabase.ts        client: AsyncStorage, PKCE, AppState auto-refresh
src/lib/session.tsx        SessionProvider — the "session handler"
src/lib/auth.ts            signInWithGoogle / signInWithFacebook / signOut, platform branches
src/app/_layout.tsx        two-state route guard
src/app/sign-in.tsx        provider buttons
src/app/(app)/index.tsx    signed-in screen: claims, sign out
src/components/            small UI kit
app.config.ts              derives the Google iOS URL scheme from .env
patches/                   patch-package diffs, applied by the postinstall hook
guide.md                   Facebook Login setup, start to finish
.oxlintrc.json             oxlint config: rule list + the local plugin it loads
tools/oxlint/anti-slop/    that plugin — TypeScript rules, not shipped in the app bundle
```

## 1. Setup

```bash
npm install
cp .env.example .env
```

Fill in `.env` as you complete the steps below, then restart the dev server — Expo only
reads env vars at startup.

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

## 3. Supabase project

**Project Settings → API Keys** — copy the **publishable** key (`sb_publishable_…`) into
`EXPO_PUBLIC_SUPABASE_KEY`, and the project URL into `EXPO_PUBLIC_SUPABASE_URL`.
The legacy `anon` key still works but is being retired at the end of 2026; the publishable key
is the replacement and is safe to ship in a client bundle because RLS still gates every query.
Never put the secret key (`sb_secret_…`) in an `EXPO_PUBLIC_` variable — it bypasses RLS.

**Authentication → URL Configuration → Redirect URLs** — add both:

```
quickrnsupabase://**
http://localhost:8081/**
```

The first is this app's scheme (set in `app.json`), used by the Facebook browser flow to hand the
session back to the app. The second is the Expo web dev server.

## 4. Google sign-in

In the [Google Cloud console](https://console.cloud.google.com/apis/credentials), create OAuth
2.0 client IDs:

| Client type | Where it goes |
| --- | --- |
| **Web** | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, **and** Supabase → Auth → Providers → Google (Client ID + secret) |
| **iOS** | `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` — also derives the app's iOS URL scheme in `app.config.ts` |
| **Android** | needs your package name `com.merchant.quickrnsupabase` and the signing-certificate SHA-1 |

Android has no separate ID in `.env`: the native module sends an ID token that Google issues
against the **web** client ID, which is what Supabase verifies.

In Supabase's Google provider, add the iOS and Android client IDs to **Authorized Client IDs**
so `signInWithIdToken` accepts tokens minted by the native SDKs.

## 5. Facebook sign-in

See **[guide.md](./guide.md)** for the full walkthrough. The short version: create an app on
[Meta for Developers](https://developers.facebook.com/apps) with the **Authenticate and request
data from users with Facebook Login** use case, put
`https://YOUR-PROJECT.supabase.co/auth/v1/callback` in its **Valid OAuth Redirect URIs**, confirm
`public_profile` and `email` are **Ready for testing**, then paste the App ID and App secret into
Supabase → Auth → Providers → Facebook.

Nothing goes in `.env` — the client never touches the App ID, Supabase hosts the handshake. While
the Meta app is in development mode, only accounts with an App Role can sign in.

## 6. Run it

```bash
npm run web       # browser — full session flow, both providers via redirect OAuth
npm run ios       # development build (macOS + Xcode), native Google sheet
npm run android   # development build, native Google sheet
```

`npm run ios` / `npm run android` compile a dev build with `expo run:*`. For a device build
without local native tooling, use `eas build --profile development`.

## How the session handling works

**`src/lib/supabase.ts`** — one client for every platform:

```ts
export const supabase = createClient(url, publishableKey, {
  auth: {
    storage: AsyncStorage,                       // localStorage under the hood on web
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: Platform.OS === 'web',   // only the web build gets ?code= in the URL
    flowType: 'pkce',
  },
});
```

`react-native-url-polyfill` is gone — supabase-js v2 no longer needs it on RN 0.86. On native,
an `AppState` listener starts and stops the refresh timer so a backgrounded app is not burning
refresh tokens.

**`src/lib/session.tsx`** — a single `onAuthStateChange` subscription is the source of truth.
It fires immediately with `INITIAL_SESSION` (restored from storage), so no separate
`getSession()` call is needed. The listener callback stays synchronous: awaiting another auth
method inside it can deadlock on the auth lock.

**`src/app/_layout.tsx`** — two mutually exclusive route states:

```tsx
<Stack.Protected guard={!session}><Stack.Screen name="sign-in" /></Stack.Protected>
<Stack.Protected guard={!!session}><Stack.Screen name="(app)" /></Stack.Protected>
```

No `router.replace` calls anywhere in the app: sign-in and sign-out just change the session, and
the guards move the user. The layout renders `null` while the session is unknown, so the splash
screen covers the restore and the sign-in screen never flashes.

**Sign-in paths** (`src/lib/auth.ts`):

| Platform | Google | Facebook |
| --- | --- | --- |
| iOS / Android | native sheet → `signInWithIdToken` | system browser → `exchangeCodeForSession` |
| Web | redirect OAuth → `detectSessionInUrl` | redirect OAuth → `detectSessionInUrl` |

The browser path uses `WebBrowser.openAuthSessionAsync` and parses the returned deep link with
`Linking.parse` — not `new URL`, whose `URLSearchParams` is still incomplete in React Native.

## Verify

```bash
npm run typecheck
npm run lint    # oxlint + the anti-slop rules
```

End-to-end, on web:

1. `npm run web` → sign in with Google → lands on the signed-in screen showing verified JWT
   claims (`sub`, expiry) read via `getClaims()`.
2. Reload the page — the session is restored from storage, no sign-in screen flash.
3. Sign out, then sign in with Facebook → same screen, `Provider: facebook` on the account card.
4. On a dev build: background the app past the token expiry, foreground it, and watch the
   expiry on the signed-in screen move — that is `startAutoRefresh` doing its job.
