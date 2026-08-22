import * as AppleAuthentication from 'expo-apple-authentication';
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

export async function signInWithApple(): Promise<SignInResult> {
  // Sign in with Apple is native on iOS only; Android and web go through the browser.
  if (Platform.OS !== 'ios') return browserOAuth('apple');

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!credential.identityToken) throw new Error('Apple returned no identity token.');

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });
    if (error) throw error;

    // Apple hands over the user's name on the very first sign-in and never again.
    const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
      .filter(Boolean)
      .join(' ');
    if (fullName && !data.user?.user_metadata?.full_name) {
      await supabase.auth.updateUser({ data: { full_name: fullName } });
    }
    return 'signed-in';
  } catch (error) {
    if ((error as { code?: string }).code === 'ERR_REQUEST_CANCELED') return 'cancelled';
    throw error;
  }
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

/** PKCE in a system browser, finished by a deep link back into the app. */
async function browserOAuth(provider: 'google' | 'apple'): Promise<SignInResult> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      // On web let supabase-js redirect the page itself; detectSessionInUrl finishes on return.
      skipBrowserRedirect: Platform.OS !== 'web',
    },
  });
  if (error) throw error;
  if (Platform.OS === 'web') return 'signed-in';

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return 'cancelled';

  // Linking.parse, not `new URL` — React Native's URLSearchParams is still incomplete.
  const { code, error_description: errorDescription } = Linking.parse(result.url).queryParams ?? {};
  if (typeof errorDescription === 'string') throw new Error(errorDescription);
  if (typeof code !== 'string') throw new Error('No authorization code in the redirect URL.');

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw exchangeError;
  return 'signed-in';
}
