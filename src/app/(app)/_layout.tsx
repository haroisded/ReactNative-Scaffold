import { Stack } from 'expo-router';

// The root layout declares <Stack.Screen name="(app)" />, and that group needs its own layout to
// render into. This is the seam where further signed-in routes get added without touching the guard.
export default function AppLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
