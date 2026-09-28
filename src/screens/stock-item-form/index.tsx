import { zodResolver } from '@hookform/resolvers/zod';
import { router, useNavigation } from 'expo-router';
import { StackActions, usePreventRemove } from 'expo-router/react-navigation';
import type { NavigationAction } from 'expo-router/react-navigation';
import { useEffect, useState } from 'react';
import { useController, useForm, useFormState, useWatch } from 'react-hook-form';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdaptiveDialog } from '../../components/adaptive-dialog';
import { Button } from '../../components/button';
import { CategoryPicker } from '../../components/category-picker';
import { ControlledSelect, ControlledSwitch, ControlledText, Field, FieldGrid, SectionHeading } from '../../components/form-fields';
import { HelperText } from '../../components/helper-text';
import { PageHeader } from '../../components/page-header';
import { SegmentedButtons } from '../../components/segmented-buttons';
import { Text } from '../../components/text';
import { useCategoriesQuery } from '../../features/categories/queries';
import { useProductGroupsQuery } from '../../features/product-groups/queries';
import { saveFailure, useSaveStockItemMutation } from '../../features/products/queries';
import type { ProductDetail } from '../../features/products/queries';
import { generateSku } from '../../features/products/schema';
import {
  SELL_BY_LABEL,
  STOCK_ROLE_LABEL,
  emptyStockItem,
  fromStockItem,
  stockItemSchema,
  stockRole,
  stockSellBy,
} from '../../features/products/stock-item';
import type { StockItemValues } from '../../features/products/stock-item';
import { stockFailure } from '../../features/stock-receipts/queries';
import { useShellWide } from '../../lib/columns';
import { failureMessage } from '../../lib/errors';
import { useAppTheme } from '../../lib/theme';
import { useUnsavedGuard } from '../../lib/unsaved-guard';
import { spacing } from '../../themes';

type Props = { merchantId: string; product: ProductDetail | null };

/** What a blocked exit was about to do: a removal from the stack, or a rail switch. */
type Leave = { kind: 'remove'; action: NavigationAction } | { kind: 'rail'; proceed: () => void };

// Keyed by the exception save_stock_item or guard_stock_item raises; stockFailure() hands back any
// snake_case message.
const FAILURE_COPY = new Map([
  ['stock_item_units_locked', 'Units per pack and serial numbers can change only while nothing is on hand.'],
  ['product_not_found', 'This item was archived or deleted elsewhere. Go back and open it again.'],
]);

const ROLE_BUTTONS = stockRole.options.map((value) => ({ value, label: STOCK_ROLE_LABEL[value] }));
const SELL_BY_BUTTONS = stockSellBy.options.map((value) => ({ value, label: SELL_BY_LABEL[value] }));

/**
 * An Inventory item (design.md §1, the Inventory.html create modal): what it is, how it is counted, and
 * when to warn. Saved through save_stock_item, which also keeps the register drafts the Sell by choice
 * wants — so a sellable item shows up in the register as a draft that needs its price.
 *
 * One scroll of five sections, not the product form's stepper: every field here fits on one phone
 * screen or two, and a stepper would hide the Base Unit fields that Pack Info depends on.
 */
export function StockItemForm({ merchantId, product }: Props) {
  const { colors } = useAppTheme();
  const wide = useShellWide();
  const navigation = useNavigation();
  const save = useSaveStockItemMutation({ merchantId });
  const groups = useProductGroupsQuery({ merchantId });
  const categories = useCategoriesQuery({ merchantId, scope: 'inventory' });

  const form = useForm<StockItemValues>({
    resolver: zodResolver(stockItemSchema),
    defaultValues: product ? fromStockItem(product) : emptyStockItem,
    mode: 'onTouched',
  });
  const { control, setValue } = form;
  const { isDirty } = useFormState({ control });
  const [isVariant, newGroup, stockRoleValue, packUnit, baseUnit] = useWatch({
    control,
    name: ['isVariant', 'newGroup', 'stockRole', 'packUnit', 'baseUnit'],
  });
  const category = useController({ control, name: 'categoryId' });
  const subcategory = useController({ control, name: 'subcategoryId' });
  const role = useController({ control, name: 'stockRole' });
  const sellBy = useController({ control, name: 'sellBy' });

  // guard_stock_item refuses these with stock on hand; the form says so before the save does.
  const locked = (product?.qty_on_hand ?? 0) > 0;

  // The unsaved-changes guard, as in the product form (src/screens/product-form/index.tsx).
  const [blocked, setBlocked] = useState<Leave | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [leaving, setLeaving] = useState<Leave | null>(null);
  const guarded = isDirty && savedId === null && leaving === null;
  usePreventRemove(guarded, ({ data }) => setBlocked({ kind: 'remove', action: data.action }));

  const leaveGuard = useUnsavedGuard();
  useEffect(() => {
    if (!guarded) return;
    leaveGuard.current = (proceed) => setBlocked({ kind: 'rail', proceed });
    return () => {
      leaveGuard.current = null;
    };
  }, [guarded, leaveGuard]);

  // After the render in which savedId switched the guard off, so the guard does not catch its own exit.
  const editing = product !== null;
  useEffect(() => {
    if (savedId === null) return;
    if (editing) router.back();
    else router.replace({ pathname: '/systems/[id]/inventory/[productId]', params: { id: merchantId, productId: savedId } });
  }, [savedId, editing, merchantId]);

  useEffect(() => {
    if (leaving?.kind !== 'rail') return;
    navigation.dispatch(StackActions.popToTop());
    leaving.proceed();
  }, [leaving, navigation]);

  const [invalid, setInvalid] = useState(false);
  const submit = () => {
    void form.handleSubmit(
      (values) => {
        setInvalid(false);
        save.mutate({ values, product }, { onSuccess: (id) => setSavedId(id) });
      },
      () => setInvalid(true)
    )();
  };

  const failure = stockFailure(save.error);
  const notice = save.isPaused
    ? { type: 'info' as const, text: 'Waiting for a connection. The item saves on its own when you reconnect.' }
    : save.isError
      ? {
          type: 'error' as const,
          text:
            saveFailure(save.error) === 'sku'
              ? 'Another product already uses this SKU. Change it, or auto-generate a new one.'
              : ((failure && FAILURE_COPY.get(failure)) ?? failureMessage("Couldn't save this item. Try again.")),
        }
      : invalid
        ? { type: 'error' as const, text: 'Some fields need attention before this can be saved.' }
        : null;
  const saving = save.isPending && !save.isPaused;

  const pack = packUnit || 'pack';
  const base = baseUnit || 'unit';
  const categoryName = categories.data?.find((row) => row.id === category.field.value)?.name ?? '';
  const groupOptions = (groups.data ?? []).map((row) => ({ value: row.id, label: row.name }));

  const actions = (
    <>
      {wide ? (
        <Button mode="text" onPress={() => router.back()} disabled={saving}>
          Cancel
        </Button>
      ) : null}
      <Button mode="contained" icon="check" onPress={submit} loading={saving} disabled={saving}>
        {editing ? 'Save changes' : 'Save item'}
      </Button>
      {wide ? null : (
        <Button mode="text" onPress={() => router.back()} disabled={saving}>
          Cancel
        </Button>
      )}
    </>
  );

  const noticeText = notice ? (
    <HelperText type={notice.type} padding="none">
      {notice.text}
    </HelperText>
  ) : null;

  return (
    <View style={styles.fill}>
      <PageHeader
        kicker={editing ? 'Edit item' : 'New item'}
        title={product ? product.name : 'Add an inventory item'}
        meta="Stock"
        onBack={() => router.back()}
        actions={wide ? actions : undefined}
      />

      <ScrollView style={styles.fill} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {wide ? noticeText : null}

        <SectionHeading title="Variant setup" hint="Optional" />
        <FieldGrid>
          <ControlledSwitch
            control={control}
            name="isVariant"
            label="Variant"
            span="full"
            on="This is a variant of another item"
            off="A standalone item"
          />
          {isVariant ? (
            <>
              {newGroup ? (
                <ControlledText
                  control={control}
                  name="newGroupName"
                  label="New group name"
                  required
                  maxLength={120}
                  placeholder="e.g. Cotton T-shirt"
                  action={{ label: 'Pick existing', onPress: () => setValue('newGroup', false) }}
                />
              ) : (
                <ControlledSelect
                  control={control}
                  name="groupId"
                  label="Variant of"
                  required
                  options={groupOptions}
                  placeholder={groups.isPending ? 'Loading…' : 'Choose a group'}
                  createLabel="New group"
                  onCreate={() => setValue('newGroup', true, { shouldDirty: true })}
                />
              )}
              <ControlledText
                control={control}
                name="attributes"
                label="Variant attributes"
                hint="Comma-separated"
                placeholder="Red, L"
                maxLength={200}
              />
            </>
          ) : null}
        </FieldGrid>

        <SectionHeading title="Pack info" hint="What it is and how it is used" />
        <FieldGrid>
          <ControlledText
            control={control}
            name="name"
            label="Pack name"
            required
            span="full"
            maxLength={120}
            placeholder="e.g. Coffee beans 1kg"
          />
          <ControlledText
            control={control}
            name="sku"
            label="SKU"
            maxLength={64}
            placeholder="Blank makes one"
            action={{
              label: 'Auto-generate',
              onPress: () => setValue('sku', generateSku('stock', categoryName), { shouldDirty: true, shouldValidate: true }),
            }}
          />
          <ControlledText control={control} name="barcode" label="Barcode" maxLength={64} />
          <Field label="Pack type" required span="full" error={role.fieldState.error?.message}>
            <SegmentedButtons
              value={role.field.value}
              onValueChange={(value) => role.field.onChange(stockRole.parse(value))}
              buttons={ROLE_BUTTONS}
            />
          </Field>
          {stockRoleValue === 'component' ? null : (
            <Field label="Sell by" required span="full" hint="Makes the register drafts" error={sellBy.fieldState.error?.message}>
              <SegmentedButtons
                value={sellBy.field.value}
                onValueChange={(value) => sellBy.field.onChange(stockSellBy.parse(value))}
                buttons={SELL_BY_BUTTONS}
              />
            </Field>
          )}
          <Field label="Category">
            <CategoryPicker
              merchantId={merchantId}
              scope="inventory"
              parentId={null}
              value={category.field.value}
              onChange={(id) => {
                category.field.onChange(id);
                // A subcategory belongs to one category; switching category drops it.
                setValue('subcategoryId', '', { shouldDirty: true });
              }}
              accessibilityLabel="Category"
              clearable
            />
          </Field>
          <Field label="Subcategory">
            {category.field.value ? (
              <CategoryPicker
                merchantId={merchantId}
                scope="inventory"
                parentId={category.field.value}
                value={subcategory.field.value}
                onChange={subcategory.field.onChange}
                accessibilityLabel="Subcategory"
                clearable
              />
            ) : (
              <Text variant="bodySmall" style={{ color: colors.onSurfaceMuted }}>
                Choose a category first.
              </Text>
            )}
          </Field>
        </FieldGrid>

        <SectionHeading title="Base unit" hint="How one pack is counted" />
        <FieldGrid>
          <ControlledText control={control} name="packUnit" label="Pack unit" placeholder="box" maxLength={20} />
          <ControlledText control={control} name="baseUnit" label="Base unit" placeholder="pcs" maxLength={20} />
          <ControlledText
            control={control}
            name="unitsPerPack"
            label={`${base} per ${pack}`}
            required
            keyboardType="decimal-pad"
            disabled={locked}
            hint={locked ? 'Locked while stock is on hand' : undefined}
          />
          <ControlledSwitch
            control={control}
            name="serialTracked"
            label="Serial numbers"
            on={`Each ${pack} has a serial`}
            off="No serials"
            disabled={locked}
          />
        </FieldGrid>

        <SectionHeading title="Stock settings" hint="When to warn" />
        <FieldGrid>
          <ControlledText
            control={control}
            name="storageLocation"
            label="Storage location"
            maxLength={120}
            placeholder="Back room, shelf 2"
          />
          <ControlledText control={control} name="reorderAt" label="Reorder at" keyboardType="decimal-pad" suffix={base} />
          <ControlledText
            control={control}
            name="expiryAlertDays"
            label="Expiry alert"
            hint="Days before a lot expires"
            keyboardType="number-pad"
            suffix="days"
          />
        </FieldGrid>

        <SectionHeading title="Extra" hint="Optional" />
        <FieldGrid>
          <ControlledText control={control} name="description" label="Description" span="full" multiline maxLength={2000} />
          <ControlledText control={control} name="notes" label="Internal notes" span="full" multiline maxLength={2000} />
        </FieldGrid>
      </ScrollView>

      {wide ? null : (
        // SafeAreaView: the Android build is edge-to-edge, as in the product form.
        <SafeAreaView
          edges={['bottom']}
          style={[styles.footer, { borderTopColor: colors.outlineVariant, backgroundColor: colors.surface }]}
        >
          {noticeText}
          {actions}
        </SafeAreaView>
      )}

      {blocked ? (
        <AdaptiveDialog
          wide={wide}
          onDismiss={() => setBlocked(null)}
          kicker="Unsaved changes"
          kickerTone="error"
          title="Discard your changes?"
          actions={
            <>
              <Button mode="outlined" onPress={() => setBlocked(null)} contentStyle={styles.dialogAction}>
                Keep editing
              </Button>
              <Button
                mode="contained"
                buttonColor={colors.error}
                textColor={colors.onError}
                contentStyle={styles.dialogAction}
                onPress={() => {
                  const leave = blocked;
                  setBlocked(null);
                  if (leave.kind === 'remove') navigation.dispatch(leave.action);
                  else setLeaving(leave);
                }}
              >
                Discard
              </Button>
            </>
          }
        >
          <Text variant="bodyMedium">{editing ? 'Your edits to this item have not been saved.' : 'This item has not been saved.'}</Text>
        </AdaptiveDialog>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { gap: spacing.md, padding: spacing.md, paddingBottom: spacing.xl },
  footer: { gap: spacing.sm, padding: spacing.ms, borderTopWidth: 1 },
  dialogAction: { justifyContent: 'flex-start' },
});
