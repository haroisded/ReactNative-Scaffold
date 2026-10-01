import { Stack } from 'expo-router';

import { useAppTheme } from '../../../../../lib/theme';

// The list is always the bottom of this stack. A push from another destination (Inventory's
// "Selling as" row) otherwise builds the stack with the detail alone, so Back has no list to pop to
// and falls through to the drawer. The pushing side passes `withAnchor: true` for this to apply
// (getNavigationAction.js:60-80). Every destination stack in the shell carries the same anchor.
export const unstable_settings = { anchor: 'index' };

// Products is one drawer destination holding five screens — list, detail, create, edit and Setup —
// so it is a Stack inside the shell. The shell's header stays above all of them; each screen draws
// its own page header, so the Stack draws none.
export default function ProductsLayout() {
  const { colors } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // A nested Stack does not inherit the shell's sceneStyle: without this its screens sit on
        // React Navigation's default grey instead of the theme's background (the root Stack in
        // src/app/_layout.tsx sets the same option for the same reason).
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
