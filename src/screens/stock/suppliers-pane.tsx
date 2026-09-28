import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ActivityIndicator } from '../../components/activity-indicator';
import { Button } from '../../components/button';
import { DataTable } from '../../components/data-table';
import { DeleteSupplierDialog } from '../../components/delete-supplier-dialog';
import { HeaderTitle } from '../../components/header-title';
import { HelperText } from '../../components/helper-text';
import { IconButton } from '../../components/icon-button';
import { SupplierDialog } from '../../components/supplier-dialog';
import { Switch } from '../../components/switch';
import { Text } from '../../components/text';
import { useSetSupplierActiveMutation, useSuppliersQuery } from '../../features/suppliers/queries';
import type { Supplier } from '../../features/suppliers/queries';
import { useShellWide } from '../../lib/columns';
import { failureMessage } from '../../lib/errors';
import { useAppTheme } from '../../lib/theme';
import { spacing } from '../../themes';

type Props = {
  merchantId: string;
  /** The header's "Add supplier" on a wide shell; narrow opens the sheet route instead. */
  creating: boolean;
  onCreate: () => void;
  onCreateDone: () => void;
};

export function SuppliersPane({ merchantId, creating, onCreate, onCreateDone }: Props) {
  const { colors } = useAppTheme();
  const wide = useShellWide();
  const suppliers = useSuppliersQuery({ merchantId });
  const setActive = useSetSupplierActiveMutation();
  const rows = suppliers.data ?? [];
  // The supplier a wide dialog is open on, held here and not in a row: FlashList recycles its cells.
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState<Supplier | null>(null);

  // Narrow, edit and delete are formSheet routes (instruction_mds/visual-language.md §5).
  const edit = (supplier: Supplier) =>
    wide ? setEditing(supplier) : router.push({ pathname: '/sheets/supplier', params: { merchantId, supplierId: supplier.id } });
  const remove = (supplier: Supplier) =>
    wide
      ? setDeleting(supplier)
      : router.push({ pathname: '/sheets/delete-supplier', params: { merchantId, supplierId: supplier.id } });
  const toggle = (supplier: Supplier) => setActive.mutate({ id: supplier.id, active: !supplier.active });

  const notice = setActive.isPaused
    ? { type: 'info' as const, text: 'Waiting for a connection. This finishes on its own when you reconnect.' }
    : setActive.isError
      ? { type: 'error' as const, text: failureMessage("Couldn't update this supplier. Try again.") }
      : null;

  const empty = (
    <View style={styles.state}>
      {suppliers.isPaused && !suppliers.data ? (
        <Text variant="bodyMedium">You&apos;re offline. Suppliers will load when you reconnect.</Text>
      ) : suppliers.isPending ? (
        <ActivityIndicator />
      ) : suppliers.isError ? (
        <>
          <Text variant="bodyMedium">{failureMessage("Couldn't load suppliers. Try again.")}</Text>
          <Button onPress={() => suppliers.refetch()}>Try again</Button>
        </>
      ) : (
        <>
          <Text variant="bodyMedium">No suppliers yet. Add who you buy from to name them on a receipt.</Text>
          <Button mode="contained" icon="add" onPress={onCreate}>
            Add supplier
          </Button>
        </>
      )}
    </View>
  );

  return (
    <View style={styles.fill}>
      {notice ? (
        <HelperText type={notice.type} style={styles.notice}>
          {notice.text}
        </HelperText>
      ) : null}

      {wide ? (
        <DataTable style={styles.fill}>
          <DataTable.Header style={{ borderBottomColor: colors.outlineVariant }}>
            <HeaderTitle label="Code" style={styles.codeCell} />
            <HeaderTitle label="Supplier" style={styles.nameCell} />
            <HeaderTitle label="Payment terms" style={styles.termsCell} />
            <HeaderTitle label="Lead time" style={styles.leadCell} />
            <HeaderTitle label="Active" style={styles.activeCell} />
            <View style={styles.actionsCell} />
          </DataTable.Header>
          <FlashList
            data={rows}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={empty}
            renderItem={({ item }) => (
              <TableRow item={item} onEdit={() => edit(item)} onDelete={() => remove(item)} onToggle={() => toggle(item)} />
            )}
          />
        </DataTable>
      ) : (
        <FlashList
          data={rows}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={empty}
          renderItem={({ item }) => (
            <CardRow item={item} onEdit={() => edit(item)} onDelete={() => remove(item)} onToggle={() => toggle(item)} />
          )}
        />
      )}

      {creating ? <SupplierDialog merchantId={merchantId} onDismiss={onCreateDone} /> : null}
      {editing ? <SupplierDialog merchantId={merchantId} supplier={editing} onDismiss={() => setEditing(null)} /> : null}
      {deleting ? <DeleteSupplierDialog supplier={deleting} onDismiss={() => setDeleting(null)} /> : null}
    </View>
  );
}

type RowProps = { item: Supplier; onEdit: () => void; onDelete: () => void; onToggle: () => void };

const leadLabel = (days: number | null) => (days === null ? '—' : `${days} ${days === 1 ? 'day' : 'days'}`);

function TableRow({ item, onEdit, onDelete, onToggle }: RowProps) {
  const { colors } = useAppTheme();
  const muted = { color: colors.onSurfaceMuted };

  return (
    <DataTable.Row onPress={onEdit} style={[styles.tableRow, { borderBottomColor: colors.surfaceVariant }]}>
      <View style={styles.codeCell}>
        <Text variant="labelLarge" numberOfLines={1} maxFontSizeMultiplier={1.3}>
          {item.code}
        </Text>
      </View>
      <View style={styles.nameCell}>
        <Text variant="titleMedium" numberOfLines={1} maxFontSizeMultiplier={1.3}>
          {item.name}
        </Text>
        <Text variant="bodySmall" numberOfLines={1} maxFontSizeMultiplier={1.3} style={muted}>
          {[item.contact_person, item.type?.name].filter(Boolean).join(' · ') || 'No contact'}
        </Text>
      </View>
      <View style={styles.termsCell}>
        <Text variant="bodyMedium" numberOfLines={1} maxFontSizeMultiplier={1.3}>
          {item.payment_terms ?? '—'}
        </Text>
      </View>
      <View style={styles.leadCell}>
        <Text variant="bodyMedium" numberOfLines={1} maxFontSizeMultiplier={1.3}>
          {leadLabel(item.lead_time_days)}
        </Text>
      </View>
      <View style={styles.activeCell}>
        <Switch value={item.active} onValueChange={onToggle} color={colors.accent} accessibilityLabel={`${item.name} active`} />
      </View>
      <View style={[styles.actionsCell, styles.actions]}>
        <IconButton icon="edit" size={18} onPress={onEdit} accessibilityLabel={`Edit ${item.name}`} />
        <IconButton icon="delete" size={18} iconColor={colors.error} onPress={onDelete} accessibilityLabel={`Delete ${item.name}`} />
      </View>
    </DataTable.Row>
  );
}

function CardRow({ item, onEdit, onDelete, onToggle }: RowProps) {
  const { colors } = useAppTheme();
  const muted = { color: colors.onSurfaceMuted };

  return (
    <Pressable
      onPress={onEdit}
      onLongPress={onDelete}
      // Pressable reads no theme, so the press colour is passed every time (instruction_mds/visual-language.md §5).
      android_ripple={{ color: colors.ripple }}
      accessibilityRole="button"
      accessibilityLabel={item.name}
      accessibilityHint="Opens the supplier. Long press to delete."
      style={[styles.cardRow, { borderBottomColor: colors.surfaceVariant }]}
    >
      <View style={styles.cardText}>
        <Text variant="titleMedium" numberOfLines={1} maxFontSizeMultiplier={1.3} style={!item.active && muted}>
          {item.name}
        </Text>
        <Text variant="bodySmall" numberOfLines={1} maxFontSizeMultiplier={1.3} style={muted}>
          {[item.code, item.contact_person].filter(Boolean).join(' · ')}
        </Text>
        <Text variant="bodySmall" numberOfLines={1} maxFontSizeMultiplier={1.3} style={muted}>
          {[item.payment_terms, item.lead_time_days === null ? null : `${leadLabel(item.lead_time_days)} lead`]
            .filter(Boolean)
            .join(' · ') || 'No terms set'}
        </Text>
      </View>
      <Switch value={item.active} onValueChange={onToggle} color={colors.accent} accessibilityLabel={`${item.name} active`} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  notice: { paddingHorizontal: spacing.md },
  state: { gap: spacing.ms, alignItems: 'flex-start', padding: spacing.md },
  tableRow: { borderBottomWidth: 1, minHeight: 60 },
  codeCell: { flex: 1, justifyContent: 'center', paddingRight: spacing.ms },
  nameCell: { flex: 3, justifyContent: 'center', paddingRight: spacing.ms },
  termsCell: { flex: 1.5, justifyContent: 'center', paddingRight: spacing.ms },
  leadCell: { flex: 1, justifyContent: 'center' },
  activeCell: { flex: 0.8, justifyContent: 'center' },
  // Two 18dp IconButtons: edit, delete.
  actionsCell: { width: 88 },
  actions: { flexDirection: 'row', alignItems: 'center' },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.ms,
    borderBottomWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.ms,
  },
  cardText: { flex: 1, gap: spacing.xs },
});
