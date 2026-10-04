import { Stack } from 'expo-router';
import { useWindowDimensions } from 'react-native';

import { ShellWideContext, WIDE_MIN } from '../../lib/columns';
import { useAppTheme } from '../../lib/theme';
import { radius } from '../../themes';

// The systems list is always the bottom of this stack. Without an anchor, a deep link straight into
// /systems/<id> builds the stack with that screen alone: back has nowhere to go, and
// "Back to your systems" would push a second list instead of returning to the first. Read by
// expo-router at getRoutesCore.js:655.
export const unstable_settings = { anchor: '(tabs)' };

// Every narrow confirm and picker, as a native sheet (instruction_mds/frontend.md §5).
// Declared here, as leaf routes of this stack, because an Android formSheet cannot host a nested
// stack (react-native-screens types.d.ts:470) — and one set then serves Home, Profile and every stack
// under the shell. The route files are in ./sheets/.
//
// This list must name every file in ./sheets/, and nothing else. Both halves fail silently: a name
// with no file is ignored, and a file with no name here still routes — as an ordinary full-screen
// push with no sheet presentation and no contentStyle, which is how delete-product shipped as a
// top-aligned white screen (a tester's report, 2026-09-19 — commit 5076055).
const SHEETS = [
  'sheets/add-from-inventory',
  'sheets/delete-account',
  'sheets/delete-category',
  'sheets/delete-product',
  'sheets/delete-supplier',
  'sheets/delete-tax-class',
  'sheets/list-filters',
  'sheets/remove-system',
  'sheets/void-receipt',
  'sheets/void-sale',
];

// The small forms and Profile: full pages on a phone, a Dialog over the screen they were opened from on
// a tablet (instruction_mds/frontend.md §4.4). Wide they are transparentModals, so that screen stays
// mounted and shows under the backdrop; the Dialog itself is drawn by AdaptiveDialog `asPage`.
// stock-movement is not here: its form stays a full page at every width.
const DIALOG_ROUTES = ['profile', 'forms/category', 'forms/supplier', 'forms/tax-class'];

// The root layout declares <Stack.Screen name="(app)" />, and that group needs its own layout to
// render into. This is the seam where further signed-in routes get added without touching the guard.
//
// Children, and the split matters:
// - `(tabs)` owns the merchant-level bottom navigation — the systems list and the Account tab.
// - `systems/[id]` sits outside it, so opening a system PUSHES over the tab bar rather than becoming
//   a fifth tab. It is the merchant shell: a header plus a rail or drawer of its own.
// - `profile` is Profile opened from a system's header, or from Home's on a tablet. It is pushed over
//   them so back returns to where it was opened; the Account tab cannot do that from a system (see
//   profile.tsx).
// - `create-system` is the create wizard, pushed full screen over Home at every width.
// - `forms/*` are the create/edit forms (category, supplier, tax class, stock movement).
// - `profile` and three of the forms are DIALOG_ROUTES above; `sheets/*` are the native sheets above.
export default function AppLayout() {
  const { colors } = useAppTheme();
  // The one wide/narrow decision (instruction_mds/frontend.md §4.1). The window, not a container:
  // synchronous, so no zero-width first frame, and it follows rotation and split-screen. Read here
  // rather than in the shell because forms/ and sheets/ sit beside the shell, not under it.
  const wide = useWindowDimensions().width >= WIDE_MIN;

  return (
    <ShellWideContext value={wide}>
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="systems/[id]" />
      <Stack.Screen name="create-system" />
      <Stack.Screen name="forms/stock-movement" />
      {DIALOG_ROUTES.map((name) => (
        <Stack.Screen
          key={name}
          name={name}
          options={
            wide ? { presentation: 'transparentModal', animation: 'fade', contentStyle: { backgroundColor: 'transparent' } } : undefined
          }
        />
      ))}
      {SHEETS.map((name) => (
        <Stack.Screen
          key={name}
          name={name}
          options={{
            presentation: 'formSheet',
            // Sized to the dialog inside it; Android allows one detent in this mode
            // (BottomSheetBehaviorExt.kt:89).
            sheetAllowedDetents: 'fitToContents',
            // The OS draws the sheet's frame, so its corners are passed from the theme like any
            // other native view (instruction_mds/frontend.md rule 7).
            sheetCornerRadius: radius.xl,
            contentStyle: { backgroundColor: colors.surface },
          }}
        />
      ))}
    </Stack>
    </ShellWideContext>
  );
}
