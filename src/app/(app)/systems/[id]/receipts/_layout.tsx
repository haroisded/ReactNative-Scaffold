import { Stack } from 'expo-router';

import { useAppTheme } from '../../../../../lib/theme';

// The sales list stays under a receipt the Register's "View receipt" opens — see products/_layout.tsx.
export const unstable_settings = { anchor: 'index' };

// Receipts is one drawer destination holding two screens — the sales list and a sale's receipt — so it
// is a Stack inside the shell, like Stock.
export default function ReceiptsLayout() {
  const { colors } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // A nested Stack does not inherit the shell's sceneStyle — see inventory/_layout.tsx.
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
