@AGENTS.md

# Project guide — Expo SDK 57 + Supabase auth scaffold

**Contents**

1. [What this is](#1-what-this-is)
2. [How to work on this](#2-how-to-work-on-this)
3. [The UI](#3-the-ui)
4. [Verified findings for `@supabase/supabase-js@2.112.3`](#4-verified-findings-for-supabasesupabase-js21123)
5. [Cookie isolation in the auth browser](#5-cookie-isolation-in-the-auth-browser)
6. [Prior research in `.claude/info-updates/`](#6-prior-research-in-claudeinfo-updates)

---

## 1. What this is

A **scaffold**: the starting point for a React Native + Expo **SDK 57** app with Supabase
Authentication, Session handling, Deep Linking and OAuth already wired up. Clone it, fill in `.env`,
build on top.

It got here by being rebuilt rather than patched. Supabase's published React Native + Expo guidance
is out of date for SDK 57 and for `@supabase/supabase-js@2.112.3`, and a lot of the OAuth behavior
that actually decides whether sign-in works is not documented anywhere. So `src/lib/` was deleted
deliberately and written back one file at a time, each step explained — which is why the write-ups
in `.claude/` read as a reference guide and are worth keeping alongside the code.

### The order the files explain each other in

```
supabase.ts → auth.ts → Store/StoreUser.ts → src/app/_layout.tsx → the two screens
```

Same order to read them in, same order to change them in.

### The bar for anything added

Being a scaffold sets the bar: it has to survive being cloned by someone who has not read this file.
Prefer a comment naming the mechanism over a clever line, and keep every claim traceable to
`node_modules` per the rules below.

---

## 2. How to work on this

### Verify against `node_modules`, not against the docs

The published Supabase pages render client-side and are behind the installed version. Read these
instead:

```
node_modules/@supabase/auth-js/dist/module/GoTrueClient.js
node_modules/@supabase/auth-js/dist/module/lib/helpers.js
node_modules/@supabase/auth-js/dist/module/lib/types.d.ts
node_modules/@supabase/supabase-js/dist/index.d.cts
```

Every claim written into the guide should be traceable to a line in one of those.

### Pin Expo docs to `v57.0.0`

Use `https://docs.expo.dev/versions/v57.0.0/`. `versions/latest` drifts to SDK 58 and stops
describing this project.

### Keep the write-ups

Each step's written explanation is saved as `.claude/response-vN.md`.

---

## 3. The UI

`src/components/` and `src/styles/` were deleted, and nothing replaced them — there is no local UI
kit and there should not be one.

### Rules

1. No custom components — React Native Paper only.
2. No hardcoded or inline colors — everything from `src/themes.js` (MD3 light/dark, the file that
   survived `src/styles/`).
3. Extract a component only when other screens needs it.

### Paper, its patch, and icons

- `react-native-paper` and its `patches/react-native-paper+5.15.3.patch` are back in the tree, so the
  `postinstall` / `patch-package` hook is live again.
- Paper's icons are pointed at `@expo/vector-icons` through `PaperProvider`'s `settings` prop;
  Paper's own default goes through `react-native-vector-icons`, whose fonts nothing loads, so icons
  would otherwise be blank boxes.
- `react-native-vector-icons` stays in `package.json` because Paper imports it internally either way.

---

## 4. Verified findings for `@supabase/supabase-js@2.112.3`

These correct the older material in `.claude/info-updates/`
(see [§6](#6-prior-research-in-claudeinfo-updates)) and every current tutorial.

### 4.1 Client options to leave off

**Do not set `lock: processLock`.**
It is `@deprecated` in 2.112.3 and the legacy lock path is removed in v3. The client now
single-flights refreshes itself and lets the GoTrue server resolve cross-tab races. Setting it opts
into the legacy path.

**Do not set `detectSessionInUrl: Platform.OS === 'web'`.**
The library gates it on `isBrowser() = typeof window !== 'undefined' && typeof document !== 'undefined'`
(`helpers.js:24`, used at `GoTrueClient.js:389`). React Native has no `document`, so it is already
inert on native; `react-native-web` has both, so it is already on for web. The default is correct on
all three platforms.

**Do not set `skipBrowserRedirect`.**
Same shape as `detectSessionInUrl`: the redirect is gated `if (isBrowser() && !options.skipBrowserRedirect)`
at `GoTrueClient.js:4047`, so it is already unreachable on native, and on web `Platform.OS !== 'web'`
evaluates to `false` — identical to omitting it.

**`persistSession` and `autoRefreshToken` are already the defaults.**
Setting them configures nothing.

**No `react-native-url-polyfill`.**
Every `new URL(...)` in `auth-js` reads `window.location.href` behind an `isBrowser()` guard, so
native never reaches one.

### 4.2 What is load-bearing

**`flowType` still defaults to `'implicit'`.**
`flowType: 'pkce'` is load-bearing — it is what makes Supabase return `?code=` instead of a
`#fragment`.

**`storage: AsyncStorage` is load-bearing.**
Without it, `GoTrueClient.js:237-251` falls back to an in-memory adapter and the session does not
survive an app restart.

**The `AppState` start/stop auto-refresh listener is still correct and still required** on native —
the library's doc comment still states that refresh runs *continuously* in the background on
non-browser platforms.

### 4.3 PKCE and code exchange

**`signInWithOAuth` writes the PKCE code verifier to storage as an undocumented side effect.**
This is why a returning `?code=` with no verifier is silently treated as *not a callback*:
`_isPKCECallback()` requires both `params.code` and stored verifier content — no exchange, no error,
no log.

**`exchangeCodeForSession` now fails locally on a missing verifier**, throwing
`AuthPKCECodeVerifierMissingError` (`GoTrueClient.js:1611`). It no longer sends an empty verifier for
the server to reject — this supersedes `RSP-PKCE-Flow-Links.md` section 2.

**Pass `exchangeCodeForSession(code, { flowId })`.**
`signInWithOAuth` returns `data.flowId` (`types.d.ts:232-258`); it selects the verifier that flow
stored instead of the most recent one, so a concurrent flow cannot burn the single-use code against
the wrong verifier. Distinct from `appendPkceFlowIdToRedirects`, which is still off.

### 4.4 The Google native module

**It has a web build** (`lib/module/signIn/GoogleSignin.web.js`) whose methods only warn or throw, so
a static import is safe on all three platforms — no dynamic `import()` needed. In 16.1.4 a cancel is
a response type (`SignInResponse = success | cancelled`), not a thrown error, so the
`statusCodes.SIGN_IN_CANCELLED` catch is dead code.

### 4.5 Cancel in the browser flow

**A user cancel in the browser flow arrives as a *successful redirect*, not as a dismiss.**

- The provider redirects back through Supabase to `redirectTo` carrying `error=access_denied`
  (OAuth 2.0; Facebook adds `error_reason=user_denied` and an `error_description` of literally
  `Permissions error`).
- So the prefix matches, `openAuthSessionAsync` resolves `type: 'success'`, and reading
  `error_description` turns a Cancel into an on-screen error. `browserOAuth` checks
  `error === 'access_denied'` before the generic provider-error throw.
- The dismiss path (`result.type !== 'success'`) is a *different* cancel — Android reports a genuine
  user cancel that way too, which is why both exist and neither is redundant.

### 4.6 New in 2.112.3, both left off deliberately

- `experimental.appendPkceFlowIdToRedirects` — appends `sb_flow_id` to `redirectTo`; breaks
  exact-match redirect allow-list entries.
- `detectSessionInUrl` accepting a `(url, params) => boolean` function.

---

## 5. Cookie isolation in the auth browser

Researched, recorded so it is not re-walked. The recurring request is "clear the provider's cookies
after sign-in / cancel / sign-out, so the browser behaves as a throwaway authenticator." Verified
against `expo-web-browser` 57.0.2.

### iOS — already solved and already on

`preferEphemeralSession: true` (`auth.ts:92`) is exactly that concept —
`WebBrowser.types.d.ts:100-109`, *"the browser doesn't share cookies or other browsing data between
the authentication session and the user's normal browser session"*, `@platform ios`,
`@default false`. Its own caveat: *"Whether the request is honored depends on the user's default web
browser."*

### Android — not possible, and not an API gap

The full `WebBrowserOpenOptions` surface is `browserPackage`, `secondaryToolbarColor`, `showTitle`,
`enableDefaultShareMenuItem`, `showInRecents`, `createTask`, `useProxyActivity` — nothing
cookie-related, and no clear-cookies call exists in the module. `openAuthSessionAsync` opens a Chrome
Custom Tab, which runs in Chrome's process against Chrome's cookie jar; the app never owns it.
Third-party cookie managers clear the app's own WebView store, which the Custom Tab does not use.

### Web — out of reach

The cookies are on the provider's origin.

### The portable substitute is already in place

`queryParams: { auth_type: 'reauthenticate' }` for Facebook (`auth.ts:84`). It does not clear the
cookie; it forces the login screen anyway. `_getUrlForProvider` (`GoTrueClient.js:4787-4790`)
confirms the client appends it to Supabase's `/authorize` URL.

> **Unverified:** whether GoTrue forwards it to Facebook is server-side and not in `node_modules`.
> Check by reading the Facebook URL in the auth browser for `auth_type`.

### Rejected: logging the user out of Facebook after success

`facebook.com/logout.php` ends their Facebook session in their everyday browser and needs a `next`
URL under an app domain this project does not have (`web.output: "single"`).
`DELETE /{user-id}/permissions` de-authorizes the app instead, but needs `session.provider_token`
(`types.d.ts:276`), which Supabase returns only on the initial sign-in response and never persists —
and it re-prompts for permissions every sign-in, which is more friction than the "Continue as X" it
removes.

---

## 6. Prior research in `.claude/info-updates/`

### What is in there

Thirteen files from an earlier review of the deleted implementation:

- `MAIN.MD` — 14-topic study guide
- `Bugs-Fixes.md`
- eleven `RSP-*.md` deep dives
- plus `supabase-ts-setup.md`, which is step 1's write-up and belongs with the responses, not with
  the prior research

Still valuable for the **dashboard** side — the three-URL split, Site URL fallback, Meta Development
mode, Google consent-screen Testing mode — and for the corrections to Supabase's and Expo's own
reference pages.

### Two cautions when reading them

1. They describe files that **no longer exist**, with line numbers that no longer apply.
2. `RSP-Supabase-Client-Init.md` section 3 recommends `lock: processLock`. That recommendation is
   **superseded** — see [§4](#4-verified-findings-for-supabasesupabase-js21123).

### The original open bug

Unresolved, and never a code defect: OAuth redirect failures traced to dashboard configuration,
ranked —

1. Supabase **Site URL** still at the default `http://localhost:3000`
2. Meta app in Development mode
3. Google consent screen in Testing
4. missing Authorized Client IDs on the Supabase Google provider
