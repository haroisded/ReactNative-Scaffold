import { useController, useWatch } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';
import { StyleSheet } from 'react-native';

import {
  ControlledDate,
  ControlledSegmented,
  ControlledSwitch,
  ControlledText,
  Field,
  FieldGrid,
  GroupHeading,
} from '../../components/form-fields';
import { MenuSelect } from '../../components/menu-select';
import { Text } from '../../components/text';
import { VariantFields } from '../../components/variant-fields';
import type { StockItemOption } from '../../features/products/queries';
import { generateSku } from '../../features/products/schema';
import { SELL_BY_LABEL, STOCK_ROLE_LABEL } from '../../features/products/stock-item';
import { emptyPackLine, generatedCode, lineForItem, linePacks, lineUnitCost, unitsPerPack } from '../../features/stock-receipts/schema';
import type { ReceiptValues } from '../../features/stock-receipts/schema';
import { currencySymbol, formatMoney } from '../../lib/money';
import { useAppTheme } from '../../lib/theme';
import { radius, spacing } from '../../themes';

// The Pack and Base Unit fields (.claude/inventory-stock/Stock_Receiving.html steps 5 and 6), bound to
// a receipt-shaped form's `line`. The wizard's single product and the Add Product/Variant editor both use
// them: the editor is its own form of the same shape, so one set of fields serves both.

const ROLE_OPTIONS = Object.entries(STOCK_ROLE_LABEL).map(([value, label]) => ({ value, label }));
const SELL_BY_OPTIONS = Object.entries(SELL_BY_LABEL).map(([value, label]) => ({ value, label }));

type Form = UseFormReturn<ReceiptValues>;

type PackFieldsProps = {
  merchantId: string;
  form: Form;
  items: StockItemOption[];
  currency: string;
  /** The Case tier's pack count and cost, which the single product expects instead of its own. */
  fromCase: { packs: number; costPerPack: number } | null;
  /** The receipt's date, for generated lot and serial numbers. */
  receivedOn: string;
};

/** Pack step: which product, its identifiers, how it sells, and what arrived at what cost. */
export function PackFields({ merchantId, form, items, currency, fromCase, receivedOn }: PackFieldsProps) {
  const { control } = form;
  // SAFETY: defaultValues sets every field of the line and nothing unregisters one, so the watched object
  // is whole; useWatch types it DeepPartial only because it cannot know that.
  const line = useWatch({ control, name: 'line' }) as ReceiptValues['line'];
  const existing = line.restock;
  const money = currencySymbol(currency);
  const packs = line.packs === '' ? (fromCase ? fromCase.packs : Number(line.packsExpected || 0)) : Number(line.packs);
  const costPerPack = fromCase ? fromCase.costPerPack : Number(line.costPerPack || 0);

  return (
    <>
      <ProductDetails merchantId={merchantId} form={form} items={items} receivedOn={receivedOn} packs={packs} />

      <GroupHeading title="Receiving details" />
      <FieldGrid>
        <ControlledText
          control={control}
          name="line.packsExpected"
          label="Pack quantity"
          hint="Packs this delivery should hold"
          required={!fromCase}
          disabled={fromCase !== null}
          placeholder={fromCase ? `From Case tier: ${fromCase.packs}` : undefined}
          keyboardType="number-pad"
        />
        <ControlledText
          control={control}
          name="line.packs"
          label="Received packs"
          hint="Packs that arrived; blank means all of them"
          keyboardType="number-pad"
        />
        <ControlledText
          control={control}
          name="line.costPerPack"
          label="Cost per pack"
          required={!fromCase}
          disabled={fromCase !== null}
          placeholder={fromCase ? `From Case tier: ${formatMoney(fromCase.costPerPack, currency)}` : undefined}
          keyboardType="decimal-pad"
          prefix={money}
        />
        <ControlledText
          control={control}
          name="line.reorderAt"
          label="Re-order at"
          hint="In base units"
          disabled={existing}
          keyboardType="decimal-pad"
        />
        {existing ? null : (
          <ControlledSwitch control={control} name="line.hasExpiry" label="Expiry" on="Has an expiration date" off="Does not expire" />
        )}
        {line.hasExpiry ? <ControlledDate control={control} name="line.expiresOn" label="Expiration date" required /> : null}
        <ReadOnly label="Total packs cost" value={packs > 0 ? formatMoney(packs * costPerPack, currency) : '—'} />
      </FieldGrid>
    </>
  );
}

type ProductDetailsProps = Pick<PackFieldsProps, 'merchantId' | 'form' | 'items' | 'receivedOn'> & { packs: number };

/** New item or restock, then the item's identifiers and how it sells; a restock's come from the item and lock. */
function ProductDetails({ merchantId, form, items, receivedOn, packs }: ProductDetailsProps) {
  const { control, setValue, getValues } = form;
  const existing = useWatch({ control, name: 'line.restock' });

  const pickItem = (id: string) => {
    const item = items.find((row) => row.id === id);
    if (item) setValue('line', lineForItem(getValues('line'), item), { shouldDirty: true, shouldValidate: true });
  };
  // Either way the line starts over: a new item's typed details are not the restocked item's, nor the reverse.
  const setRestock = (restock: boolean) => {
    const current = getValues('line');
    setValue('line', { ...emptyPackLine, restock, lotCode: current.lotCode, serials: current.serials }, { shouldDirty: true });
  };
  const fill = (path: 'line.sku' | 'line.lotCode' | 'line.serials', value: string) =>
    setValue(path, value, { shouldDirty: true, shouldValidate: true });
  const serials = () =>
    Array.from({ length: Math.max(packs, 1) }, (_, index) => `SN-${(receivedOn || '').replace(/-/g, '')}-${String(index + 1).padStart(2, '0')}`).join(', ');

  return (
    <>
      <GroupHeading title="Product details" />
      <FieldGrid>
        <ControlledSwitch
          control={control}
          name="line.restock"
          label="Restock item"
          span="full"
          on="Restock an existing item"
          off="New item"
          onChange={setRestock}
        />
        {existing ? <ItemSelect form={form} items={items} onPick={pickItem} /> : null}
        <ControlledText control={control} name="line.name" label="Pack name" required disabled={existing} maxLength={120} />
        <ControlledText
          control={control}
          name="line.sku"
          label="SKU"
          required
          disabled={existing}
          maxLength={64}
          action={existing ? undefined : { label: 'Auto-generate', onPress: () => fill('line.sku', generateSku('stock', '')) }}
        />
        <ControlledSegmented control={control} name="line.stockRole" label="Pack type" required disabled={existing} options={ROLE_OPTIONS} />
        <ControlledText
          control={control}
          name="line.serials"
          label="Serial numbers"
          hint="Manufacturer's, comma-separated"
          maxLength={4000}
          action={{ label: 'Auto-generate', onPress: () => fill('line.serials', serials()) }}
        />
        <ControlledText
          control={control}
          name="line.lotCode"
          label="Lot / batch number"
          placeholder="Leave blank for none"
          maxLength={64}
          action={{ label: 'Auto-generate', onPress: () => fill('line.lotCode', generatedCode('LOT', receivedOn)) }}
        />
        <ControlledText control={control} name="line.location" label="Storage location" maxLength={120} />
        <ControlledSegmented control={control} name="line.sellBy" label="Sell by" span="full" required disabled={existing} options={SELL_BY_OPTIONS} />
        {existing ? null : (
          <VariantFields
            merchantId={merchantId}
            control={control}
            names={{
              isVariant: 'line.isVariant',
              newGroup: 'line.newGroup',
              groupId: 'line.groupId',
              newGroupName: 'line.newGroupName',
              attributes: 'line.attributes',
            }}
          />
        )}
      </FieldGrid>
    </>
  );
}

/** The item a restock fills from; picking one copies its details into the line (lineForItem). */
function ItemSelect({ form, items, onPick }: { form: Form; items: StockItemOption[]; onPick: (id: string) => void }) {
  const { field, fieldState } = useController({ control: form.control, name: 'line.productId' });
  const options = items.map((row) => ({ value: row.id, label: row.sku ? `${row.name} · ${row.sku}` : row.name }));
  return (
    <Field label="Item" span="full" required hint="Its details come from it" error={fieldState.error?.message}>
      <MenuSelect
        value={field.value}
        options={options}
        onChange={onPick}
        placeholder="Choose an item"
        accessibilityLabel="Item to restock"
        error={!!fieldState.error}
      />
    </Field>
  );
}

type BaseUnitFieldsProps = {
  form: Form;
  currency: string;
  /** The receipt's tiers, so the Case tier's pack count and cost reach the single product. Null in the list editor. */
  receipt: Pick<ReceiptValues, 'caseTier' | 'multi'> | null;
};

/** Base Unit step: what is inside a pack, and what one of them cost. Only when something sells by the base unit. */
export function BaseUnitFields({ form, currency, receipt }: BaseUnitFieldsProps) {
  const { control } = form;
  // SAFETY: as in PackFields.
  const line = useWatch({ control, name: 'line' }) as ReceiptValues['line'];
  const existing = line.restock;
  const unit = line.baseUnit || 'unit';
  const units = linePacks(line, receipt) * unitsPerPack(line);
  // What a blank Cost per unit saves as, shown as its placeholder.
  const derived = lineUnitCost({ ...line, unitCost: '' }, receipt);

  return (
    <>
      <GroupHeading title="Base unit details" />
      <FieldGrid>
        <ControlledText control={control} name="line.baseUnit" label="Base unit type" placeholder="e.g. tablet" disabled={existing} maxLength={20} />
        <ControlledText
          control={control}
          name="line.unitsPerPack"
          label="Base units qty"
          hint={`${unit} in one pack`}
          required
          disabled={existing}
          keyboardType="decimal-pad"
        />
        <ControlledText
          control={control}
          name="line.unitsPerPackReceived"
          label="Base units qty received"
          hint={`${unit} counted in one pack, for the record`}
          keyboardType="decimal-pad"
        />
        <ControlledText
          control={control}
          name="line.unitCost"
          label={`Cost per ${unit}`}
          hint="Blank uses the pack cost ÷ base units qty"
          placeholder={derived > 0 ? formatMoney(derived, currency) : undefined}
          keyboardType="decimal-pad"
          prefix={currencySymbol(currency)}
        />
        <ReadOnly label={`Total ${unit} from packs`} value={units > 0 ? String(units) : '—'} />
      </FieldGrid>
    </>
  );
}

/** A computed value laid out as a field (the mockup's "(auto)" boxes). */
export function ReadOnly({ label, value }: { label: string; value: string }) {
  const { colors } = useAppTheme();
  return (
    <Field label={label}>
      <Text variant="bodyMedium" style={[styles.readOnly, { backgroundColor: colors.surfaceMuted, borderColor: colors.outlineVariant }]}>
        {value}
      </Text>
    </Field>
  );
}

const styles = StyleSheet.create({
  readOnly: { borderWidth: 1, borderRadius: radius.sm, borderCurve: 'continuous', paddingHorizontal: spacing.ms, paddingVertical: spacing.sm },
});
