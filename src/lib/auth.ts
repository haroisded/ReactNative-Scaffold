import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { supabase } from './supabase';

/**
 * Native: quickrnsupabase://  — must be allow-listed in Supabase as `quickrnsupabase://**`
 * Web:    http://localhost:8081/ (or wherever the web build is served)
 */
export const redirectTo = Linking.createURL('/');

/** Thrown by nothing — a cancelled sign-in resolves quietly so the UI can ignore it. */
export type SignInResult = 'signed-in' | 'cancelled';

export async function signInWithGoogle(): Promise<SignInResult> {
  // The Google native module has no web build, so the browser flow covers web.
  if (Platform.OS === 'web') return browserOAuth('google');

  const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } = await googleModule();

  try {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return 'cancelled';

    const idToken = response.data.idToken;
    if (!idToken) throw new Error('Google returned no ID token — check your client IDs.');

    const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
    if (error) throw error;
    return 'signed-in';
  } catch (error) {
    if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) return 'cancelled';
    throw error;
  }
}

/** Facebook has no native module here: Supabase hosts the whole handshake in the browser. */
export function signInWithFacebook(): Promise<SignInResult> {
  return browserOAuth('facebook');
}

export async function signOut() {
  // Supabase alone leaves the native Google session cached, so the next sign-in silently
  // reuses the last account instead of showing the account picker.
  if (Platform.OS !== 'web') {
    const { GoogleSignin } = await googleModule();
    await GoogleSignin.signOut().catch(() => {}); // never signed in with Google: nothing to clear
  }

  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** The Google native module, configured — configure() must run before any other call. */
function googleModule() {
  return import('@react-native-google-signin/google-signin').then((mod) => {
    mod.GoogleSignin.configure({
      // Android verifies the ID token against the *web* client ID, iOS against its own.
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    });
    return mod;
  });
}

/** A repeated query param arrives as an array; only the first copy is the value. */
function oneValue(param: Linking.QueryParams[string]): string | undefined {
  return Array.isArray(param) ? param[0] : param;
}

/** PKCE in a system browser, finished by a deep link back into the app. */
async function browserOAuth(provider: 'google' | 'facebook'): Promise<SignInResult> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      // Facebook's own cookie survives Cancel, so the next attempt re-offers the same account.
      // auth_type=reauthenticate forces its login screen, where another account can be entered.
      queryParams: provider === 'facebook' ? { auth_type: 'reauthenticate' } : undefined,
      // On web let supabase-js redirect the page itself; detectSessionInUrl finishes on return.
      skipBrowserRedirect: Platform.OS !== 'web',
    },
  });
  if (error) throw error;
  if (Platform.OS === 'web') return 'signed-in';

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
    // iOS only: no shared browser cookies, so each attempt starts logged out of the provider.
    preferEphemeralSession: true,
  });
  if (result.type !== 'success') return 'cancelled';

  // Linking.parse, not `new URL` — React Native's URLSearchParams is still incomplete.
  const params = Linking.parse(result.url).queryParams ?? {};
  const errorDescription = oneValue(params.error_description);
  const code = oneValue(params.code);
  if (errorDescription) throw new Error(errorDescription);
  if (!code) throw new Error('No authorization code in the redirect URL.');

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw exchangeError;
  return 'signed-in';
}
