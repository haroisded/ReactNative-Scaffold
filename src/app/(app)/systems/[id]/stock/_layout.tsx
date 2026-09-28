import { Stack } from 'expo-router';

import { useAppTheme } from '../../../../../lib/theme';

// Stock is one drawer destination holding three screens — the Receipts | Suppliers list, the receipt
// wizard and a receipt's detail — so it is a Stack inside the shell, like Inventory.
export default function StockLayout() {
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
