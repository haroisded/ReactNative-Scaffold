# Session Handler Quickstart — Expo SDK 57 + React Native + Supabase

A current replacement for Supabase's React Native auth quickstart. That guide still installs
`react-native-url-polyfill` and `@rneui/themed`, shows email/password only, and predates
expo-router's `Stack.Protected` guards, the publishable/secret API key migration, and
asymmetric JWTs.

This one ships:

- **Expo SDK 57** (React Native 0.86, React 19.2, expo-router v7, New Architecture)
- **Google and Apple social login** — native sheets on device, browser OAuth on web
- **TOTP MFA (opt-in)** with an `aal2` route guard
- **Session handling** in one context: restore, auto-refresh, sign-out, MFA level
- **Runs on web** (`npm run web`), so the whole session lifecycle is debuggable in a browser

| Package | Version |
| --- | --- |
| `expo` | ~57.0.13 |
| `react-native` | 0.86.2 |
| `@supabase/supabase-js` | ^2.112.3 |
| `@react-native-async-storage/async-storage` | 2.2.0 |
| `@react-native-google-signin/google-signin` | ^16.1.4 |
| `expo-apple-authentication` | ~57.0.1 |

> **Expo Go will not work.** The Google and Apple sign-in modules are native code, so device
> testing needs a development build (`npm run ios` / `npm run android`). The web target
> (`npm run web`) needs nothing extra and is the fastest way to iterate on session logic.

## File map

```
src/lib/supabase.ts        client: AsyncStorage, PKCE, AppState auto-refresh
src/lib/session.tsx        SessionProvider — session + MFA level, the "session handler"
src/lib/aal.ts             the aal1/aal2 gate rule (unit-tested)
src/lib/auth.ts            signInWithGoogle / signInWithApple / signOut, platform branches
src/app/_layout.tsx        three-state route guard
src/app/sign-in.tsx        provider buttons
src/app/mfa.tsx            code screen, shown only when the session is aal1 but needs aal2
src/app/(app)/index.tsx    signed-in screen: claims, MFA enrollment, sign out
src/components/            MFA enrollment card + small UI kit
app.config.ts              derives the Google iOS URL scheme from .env
```

## 1. Setup

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local` as you complete the steps below, then restart the dev server — Expo only
reads env vars at startup.

## 2. Supabase project

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

The first is this app's scheme (set in `app.json`), used by the Apple-on-Android browser flow.
The second is the Expo web dev server.

**Authentication → Multi-Factor Auth** — enable TOTP.

## 3. Google sign-in

In the [Google Cloud console](https://console.cloud.google.com/apis/credentials), create OAuth
2.0 client IDs:

| Client type | Where it goes |
| --- | --- |
| **Web** | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, **and** Supabase → Auth → Providers → Google (Client ID + secret) |
| **iOS** | `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` — also derives the app's iOS URL scheme in `app.config.ts` |
| **Android** | needs your package name `com.example.quickrnsupabase` and the signing-certificate SHA-1 |

Android has no separate ID in `.env`: the native module sends an ID token that Google issues
against the **web** client ID, which is what Supabase verifies.

In Supabase's Google provider, add the iOS and Android client IDs to **Authorized Client IDs**
so `signInWithIdToken` accepts tokens minted by the native SDKs.

## 4. Apple sign-in

In the [Apple developer portal](https://developer.apple.com/account/resources/identifiers/list):

1. Enable **Sign in with Apple** on the App ID for `com.example.quickrnsupabase`.
2. Create a **Services ID** (for the web/Android browser flow) with return URL
   `https://YOUR-PROJECT.supabase.co/auth/v1/callback`.
3. Create a **Sign in with Apple key** (`.p8`) and note the Team ID and Key ID.

In Supabase → Auth → Providers → Apple, paste the Services ID, Team ID, Key ID and key, and add
your **bundle identifier** (`com.example.quickrnsupabase`) to the **Client IDs** list — the
native iOS token is issued to the bundle ID, not the Services ID.

Change the bundle ID / package name in `app.config.ts` before shipping anything real.

## 5. Run it

```bash
npm run web       # browser — full session + MFA flow, both providers via redirect OAuth
npm run ios       # development build (macOS + Xcode), native Apple and Google sheets
npm run android   # development build, native Google; Apple falls back to the browser
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
method inside it can deadlock on the auth lock, so the assurance-level lookup runs in its own
effect keyed on the session.

**`src/app/_layout.tsx`** — three mutually exclusive route states:

```tsx
<Stack.Protected guard={!session}><Stack.Screen name="sign-in" /></Stack.Protected>
<Stack.Protected guard={!!session && !!needsMfa}><Stack.Screen name="mfa" /></Stack.Protected>
<Stack.Protected guard={!!session && !needsMfa}><Stack.Screen name="(app)" /></Stack.Protected>
```

No `router.replace` calls anywhere in the app: sign-in, MFA verification and sign-out all just
change the session, and the guards move the user. The layout renders `null` while the session
and its assurance level are unknown, so the splash screen covers the restore and the sign-in
screen never flashes.

**MFA gate** (`src/lib/aal.ts`) — `nextLevel === 'aal2' && currentLevel !== 'aal2'`. `nextLevel`
reaches `aal2` only when a verified factor exists; `currentLevel` reaches it only after a code
is verified on this session.

**Sign-in paths** (`src/lib/auth.ts`):

| Platform | Google | Apple |
| --- | --- | --- |
| iOS | native sheet → `signInWithIdToken` | native sheet → `signInWithIdToken` |
| Android | native sheet → `signInWithIdToken` | system browser → `exchangeCodeForSession` |
| Web | redirect OAuth → `detectSessionInUrl` | redirect OAuth → `detectSessionInUrl` |

The browser path uses `WebBrowser.openAuthSessionAsync` and parses the returned deep link with
`Linking.parse` — not `new URL`, whose `URLSearchParams` is still incomplete in React Native.
Apple returns the user's full name only on the very first sign-in, so it is written to user
metadata right there or it is lost forever.

## Verify

```bash
npm test        # the aal1/aal2 gate rule
npm run typecheck
```

End-to-end, on web:

1. `npm run web` → sign in with Google → lands on the signed-in screen showing verified JWT
   claims (`sub`, `aal`, expiry) read via `getClaims()`.
2. Reload the page — the session is restored from storage, no sign-in screen flash.
3. Enroll an authenticator app, sign out, sign back in → the router stops at the code screen;
   a wrong code shows an error, the right one lands on the signed-in screen with `aal: aal2`.
4. On a dev build: background the app past the token expiry, foreground it, and watch the
   expiry on the signed-in screen move — that is `startAutoRefresh` doing its job.
