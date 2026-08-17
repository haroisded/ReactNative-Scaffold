import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!url || !publishableKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_KEY. ' +
      'Copy .env.example to .env.local, fill it in, then restart the dev server.'
  );
}

export const supabase = createClient(url, publishableKey, {
  auth: {
    // AsyncStorage works on web too — it falls back to localStorage there.
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    // Only the web build ever gets redirected back with `?code=` in the address bar.
    // On native the browser-OAuth path calls exchangeCodeForSession() by hand (see lib/auth.ts).
    detectSessionInUrl: Platform.OS === 'web',
    flowType: 'pkce',
  },
});

// Refreshing while the app is backgrounded is pointless and burns refresh tokens.
// The web build has no AppState equivalent — the browser tab handles it.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
