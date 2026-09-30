import { Stack } from 'expo-router';

import { useAppTheme } from '../../../../../lib/theme';

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
