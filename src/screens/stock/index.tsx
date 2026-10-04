import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '../../components/button';
import { useFolderPath } from '../../components/folder-nav';
import { PageHeader } from '../../components/page-header';
import { SegmentedButtons } from '../../components/segmented-buttons';
import { fontScaled, PANE_SWITCH, useShellWide } from '../../lib/columns';
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
 * Stock: what came in, and who it came from (.claude/inventory-stock/Stock_Receiving.html). One screen with a
 * Receipts | Suppliers switch rather than two drawer entries, because a supplier exists here to be
 * named on a receipt.
 */
export function Stock({ merchantId, merchantName, currency }: Props) {
  const [pane, setPane] = useState<Pane>('receipts');
  const wide = useShellWide();
  // Inside a Receipts folder, the header's arrow climbs one level (the folders are ReceiptsPane's).
  const folderBack = useFolderPath('/systems/[id]/stock', merchantId).back;
  // The header's "Add supplier" and the pane's empty state open the same form.
  const addSupplier = () => router.push({ pathname: '/forms/supplier', params: { merchantId } });

  const paneSwitch = (
    <SegmentedButtons
      density="small"
      style={wide ? { width: fontScaled(PANE_SWITCH) } : undefined}
      value={pane}
      onValueChange={(value) => setPane(value === 'suppliers' ? 'suppliers' : 'receipts')}
      buttons={[
        { value: 'receipts', label: 'Receipts' },
        { value: 'suppliers', label: 'Suppliers' },
      ]}
    />
  );

  return (
    <View style={styles.fill}>
      <PageHeader
        kicker={merchantName}
        title="Stock"
        onBack={pane === 'receipts' ? folderBack : undefined}
        meta={pane === 'receipts' ? 'Receipts per item — received vs remaining, drill to case and pack' : 'Who you buy from'}
        actions={
          <>
            {pane === 'receipts' ? (
              <Button
                mode="contained"
                icon="add"
                onPress={() => router.push({ pathname: '/systems/[id]/stock/receipts/new', params: { id: merchantId } })}
              >
                Stock receipt
              </Button>
            ) : (
              <Button mode="contained" icon="add" onPress={addSupplier}>
                Add supplier
              </Button>
            )}
            {/* Wide, the switch sits at the end of the title row beside the add button, rather than on a
                row of its own across the pane. Narrow, it keeps a full-width row under the header. */}
            {wide ? paneSwitch : null}
          </>
        }
      />
      {wide ? null : <View style={styles.switch}>{paneSwitch}</View>}
      {pane === 'receipts' ? (
        <ReceiptsPane merchantId={merchantId} currency={currency} />
      ) : (
        <SuppliersPane merchantId={merchantId} onCreate={addSupplier} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  switch: { paddingHorizontal: spacing.md, paddingVertical: spacing.ms },
});
