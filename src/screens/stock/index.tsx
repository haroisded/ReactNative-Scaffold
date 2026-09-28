import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '../../components/button';
import { PageHeader } from '../../components/page-header';
import { SegmentedButtons } from '../../components/segmented-buttons';
import { useShellWide } from '../../lib/columns';
import { spacing } from '../../themes';
import { ReceiptsPane } from './receipts-pane';
import { SuppliersPane } from './suppliers-pane';

type Props = {
  merchantId: string;
  merchantName: string;
  currency: string;
};

type Pane = 'receipts' | 'suppliers';

/**
 * Stock: what came in, and who it came from (.claude/inventory-stock/design.md §6). One screen with a
 * Receipts | Suppliers switch rather than two drawer entries, because a supplier exists here to be
 * named on a receipt.
 */
export function Stock({ merchantId, merchantName, currency }: Props) {
  const [pane, setPane] = useState<Pane>('receipts');
  // Held here so the header's "Add supplier" and the pane's empty state open the same dialog.
  const [creatingSupplier, setCreatingSupplier] = useState(false);

  const wide = useShellWide();

  const addSupplier = () => {
    // Narrow, an inline-create dialog is a formSheet route (instruction_mds/visual-language.md §5).
    if (wide) setCreatingSupplier(true);
    else router.push({ pathname: '/sheets/supplier', params: { merchantId } });
  };

  return (
    <View style={styles.fill}>
      <PageHeader
        kicker={merchantName}
        title="Stock"
        meta={pane === 'receipts' ? 'Deliveries received, newest first' : 'Who you buy from'}
        actions={
          pane === 'receipts' ? (
            <Button
              mode="contained"
              icon="add"
              onPress={() => router.push({ pathname: '/systems/[id]/stock/receipts/new', params: { id: merchantId } })}
            >
              New receipt
            </Button>
          ) : (
            <Button mode="contained" icon="add" onPress={addSupplier}>
              Add supplier
            </Button>
          )
        }
      />
      <View style={styles.switch}>
        <SegmentedButtons
          density="small"
          value={pane}
          onValueChange={(value) => setPane(value === 'suppliers' ? 'suppliers' : 'receipts')}
          buttons={[
            { value: 'receipts', label: 'Receipts' },
            { value: 'suppliers', label: 'Suppliers' },
          ]}
        />
      </View>
      {pane === 'receipts' ? (
        <ReceiptsPane merchantId={merchantId} currency={currency} />
      ) : (
        <SuppliersPane
          merchantId={merchantId}
          creating={creatingSupplier}
          onCreate={addSupplier}
          onCreateDone={() => setCreatingSupplier(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  switch: { paddingHorizontal: spacing.md, paddingVertical: spacing.ms },
});
