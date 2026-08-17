import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Extends app.json so the Google iOS URL scheme comes from the same .env value the
 * runtime uses — one place to change, no reversed client ID pasted into two files.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

  // Google's iOS URL scheme is the client ID with its dot-separated parts reversed:
  // 1234-abc.apps.googleusercontent.com -> com.googleusercontent.apps.1234-abc
  const iosUrlScheme = iosClientId
    ? `com.googleusercontent.apps.${iosClientId.replace('.apps.googleusercontent.com', '')}`
    : 'com.googleusercontent.apps.PLACEHOLDER';

  return {
    ...config,
    name: config.name ?? 'Quick-RN-Supabase',
    slug: config.slug ?? 'Quick-RN-Supabase',
    ios: {
      ...config.ios,
      bundleIdentifier: 'com.example.quickrnsupabase',
      usesAppleSignIn: true,
    },
    android: {
      ...config.android,
      package: 'com.example.quickrnsupabase',
    },
    plugins: [
      ...(config.plugins ?? []),
      'expo-apple-authentication',
      ['@react-native-google-signin/google-signin', { iosUrlScheme }],
    ],
  };
};
