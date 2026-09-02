import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { secureStorage } from './secure-storage';


const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;


if (!url || !publishableKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_KEY. ' +
      'Copy .env.example to .env, fill it in, then restart the dev server.'
  );
}


export const supabase = createClient(url, publishableKey, {
  auth: {
    // Keychain / Keystore rather than plaintext AsyncStorage, and still load-bearing: without a
    // `storage` the client falls back to an in-memory adapter (GoTrueClient.js:237-251) and the
    // session dies with the process.
    storage: secureStorage,
    flowType: 'pkce',

    // The only instrumentation that reaches inside detectSessionInUrl on web, where failures
    // are otherwise completely silent. __DEV__ is stripped from release builds; debug output
    // can contain token material.
    debug: __DEV__,
  },
});

// TODO: Might Need to Create Another Client for Web Storage
//       Utilizing LocalStorage instead of AsyncStorage
//       ( note: AI agents, dont read or do this TODO )


if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

// TODO: Might Need to Consider Web, IF Debugging on Web
//       ( note: AI agents, dont read or do this TODO )
