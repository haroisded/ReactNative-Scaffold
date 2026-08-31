import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { PaperProvider } from 'react-native-paper';

import { useIsSessionLoading, useSession } from '../Store/StoreUser';
import { DarkTheme, LightTheme } from '../themes';


// Module scope, not awaited, and deliberately so: called from inside a component or hook it can
// run after the splash has already auto-hidden, which is too late to prevent anything.
SplashScreen.preventAutoHideAsync();


export default function RootLayout() {
  const session = useSession();
  const isLoading = useIsSessionLoading();
  // app.json sets userInterfaceStyle: "automatic", so this follows the OS setting.
  const theme = useColorScheme() === 'dark' ? DarkTheme : LightTheme;

  // hide() is a native side effect, so it cannot live in the render body: app.json sets
  // experiments.reactCompiler, which assumes render is pure and may re-order or re-run it.
  // The hook sits above the early return so hook order stays stable across both branches.
  useEffect(() => {
    if (!isLoading) SplashScreen.hide();
  }, [isLoading]);

  // While the session is `undefined`, `!session` is true — without this the sign-in screen would
  // be the active route during the storage read and flash for an already-signed-in user. The
  // splash is still up, so rendering nothing here is invisible.
  if (isLoading) return null;

  // The two guards are mutually exclusive, so exactly one block is ever active and the stack is
  // never left with no matching route. Nothing in this app calls router.push or router.replace:
  // sign-in and sign-out change the session, and the router moves the user. Changing a guard from
  // true to false also drops that screen's history entries, which is why sign-out cannot be undone
  // with a back gesture.
  //
  // This is UX, not security. expo-router evaluates guards on the client only; Supabase RLS is the
  // real boundary, which is also why shipping the publishable key is safe.
  return (
    // Every screen is built from React Native Paper, so the whole tree needs its theme in context.
    <PaperProvider
      theme={theme}
      // Paper's built-in icon renders through react-native-vector-icons, whose font files nothing
      // here ever loads, so every icon would come out a blank box. @expo/vector-icons wraps the
      // same Material Community set and loads its font itself through expo-font. Paper's
      // `direction` is its own RTL flag, dropped here: the Expo component has no such prop and
      // would forward it to a Text. The object literal is new each render; reactCompiler memoizes.
      settings={{
        icon: ({ name, color, size, allowFontScaling, testID }) => (
          <MaterialCommunityIcons
            name={name}
            color={color}
            size={size}
            allowFontScaling={allowFontScaling}
            testID={testID}
          />
        ),
      }}
    >
      {/* contentStyle carries the theme background to the navigator's own screen container,
          which otherwise paints react-navigation's default and flashes white in dark mode. */}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Protected guard={!session}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
      </Stack>
    </PaperProvider>
  );
}
