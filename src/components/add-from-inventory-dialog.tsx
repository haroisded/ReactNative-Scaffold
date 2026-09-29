import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { useInventoryAddablesQuery, useEnsureRegisterFacesMutation } from '../features/products/queries';
import type { InventoryAddable } from '../features/products/queries';
import { RESOURCE_ROUTE } from '../features/products/resources';
import { useShellWide } from '../lib/columns';
import { failureMessage, mutationNotice } from '../lib/errors';
import { useAppTheme } from '../lib/theme';
import { radius, spacing } from '../themes';
import { AdaptiveDialog } from './adaptive-dialog';
import { Button } from './button';
import { HelperText } from './helper-text';
import { QueryState } from './query-state';
import { Text } from './text';

type Props = {
  merchantId: string;
  /** Rendered as the body of the narrow formSheet route (src/app/(app)/sheets/add-from-inventory.tsx). */
  inSheet?: boolean;
  onDismiss: () => void;
};

/**
 * Products → Add from Inventory: the fallback to the automatic drafts. Lists the Sellable and Both
 * Inventory items missing a Products draft for a unit they sell by — one someone deleted, say — and
 * picking one makes the missing drafts and opens the first for pricing.
 */
export function AddFromInventoryDialog({ merchantId, inSheet, onDismiss }: Props) {
  const { colors } = useAppTheme();
  const wide = useShellWide();
  const addables = useInventoryAddablesQuery({ merchantId });
  const ensure = useEnsureRegisterFacesMutation();
  const inFlight = ensure.isPending && !ensure.isPaused;
  const notice = mutationNotice(ensure, failureMessage("Couldn't add this item. Try again."));

  const pick = (item: InventoryAddable) =>
    ensure.mutate(
      { itemId: item.id },
      {
        onSuccess: (faces) => {
          onDismiss();
          const first = faces.find((face) => face.status === 'draft') ?? faces[0];
          if (first) router.push({ pathname: RESOURCE_ROUTE.products.edit, params: { id: merchantId, productId: first.id } });
        },
      }
    );

  return (
    <AdaptiveDialog
      wide={wide}
      inSheet={inSheet}
      onDismiss={onDismiss}
      dismissable={!inFlight}
      kicker="Products"
      title="Add from Inventory"
      actions={
        <Button mode="outlined" onPress={onDismiss} disabled={inFlight}>
          Cancel
        </Button>
      }
    >
      {addables.data ? (
        addables.data.length === 0 ? (
          <Text variant="bodyMedium" style={{ color: colors.onSurfaceMuted }}>
            Every Sellable and Both item in Inventory is already on this screen. Mark an item Sellable or Both in Inventory to add it.
          </Text>
        ) : (
          <View style={[styles.list, { borderColor: colors.outlineVariant }]}>
            {addables.data.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => pick(item)}
                disabled={inFlight}
                // Pressable reads no theme, so the press colour is passed every time (instruction_mds/visual-language.md §4).
                android_ripple={{ color: colors.ripple }}
                accessibilityRole="button"
                accessibilityLabel={`Add ${item.name}`}
                style={[styles.row, { borderBottomColor: colors.surfaceVariant }]}
              >
                <Text variant="titleMedium" numberOfLines={2}>
                  {item.name}
                </Text>
                <Text variant="bodySmall" style={{ color: colors.onSurfaceMuted }}>
                  {[item.sku, `sells by ${item.missing.map((unit) => (unit === 'pack' ? (item.pack_unit_name ?? 'pack') : (item.base_unit_name ?? 'unit'))).join(' and ')}`]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </Pressable>
            ))}
          </View>
        )
      ) : (
        <QueryState query={addables} offline="You're offline. Items will load when you reconnect." failure="Couldn't load Inventory. Try again." />
      )}
      <HelperText type={notice?.type ?? 'error'} visible={notice !== null} padding="none">
        {notice?.text}
      </HelperText>
    </AdaptiveDialog>
  );
}

const styles = StyleSheet.create({
  list: { borderWidth: 1, borderRadius: radius.md, borderCurve: 'continuous', overflow: 'hidden' },
  row: { gap: spacing.xs, borderBottomWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.ms },
});
