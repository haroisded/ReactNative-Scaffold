import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { SessionProvider, useSession } from '@/lib/session';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SessionProvider>
      <RootNavigator />
    </SessionProvider>
  );
}

function RootNavigator() {
  const { session, needsMfa, isLoading } = useSession();

  // Splash stays up until we know both the session and its assurance level,
  // otherwise the sign-in screen flashes before a restored session lands.
  if (isLoading) return null;
  SplashScreen.hide();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>

      <Stack.Protected guard={!!session && !!needsMfa}>
        <Stack.Screen name="mfa" />
      </Stack.Protected>

      <Stack.Protected guard={!!session && !needsMfa}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}
