import { router } from 'expo-router';
import { useReducer, useState } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { PageHeader } from '../../components/page-header';
import { SegmentedButtons } from '../../components/segmented-buttons';
import { Snackbar } from '../../components/snackbar';
import { Text } from '../../components/text';
import { cartReducer, cartTotals } from '../../features/sales/cart';
import type { CartAction } from '../../features/sales/cart';
import { newClientKey, saleFailure, useRecordSaleMutation } from '../../features/sales/queries';
import type { RecordedSale } from '../../features/sales/queries';
import { ITEM_PANE, useShellWide } from '../../lib/columns';
import { failureMessage, mutationNotice } from '../../lib/errors';
import { formatMoney } from '../../lib/money';
import { useAppTheme } from '../../lib/theme';
import { radius, spacing } from '../../themes';
import { CartPane } from './cart-pane';
import { ItemsPane } from './items-pane';

type Props = { merchantId: string; merchantName: string; currency: string };

/**
 * The Register (instruction_mds/frontend.md §4.4): the items pane beside the cart when wide, an Items | Cart
 * switch when narrow. Cash only; prices include tax. One record_sale call writes the sale, its lines and
 * every stock draw (20260930110000_sales.sql), so the cart, the payment and the idempotency key live
 * here — above the panes — where switching tabs on a phone cannot drop a sale that is in flight.
 */
export function Register({ merchantId, merchantName, currency }: Props) {
  const { colors } = useAppTheme();
  const wide = useShellWide();
  const checkout = useCheckout(merchantId);

  const items = <ItemsPane merchantId={merchantId} currency={currency} onAdd={(line) => checkout.edit({ type: 'add', line })} />;
  const cart = <CartPane currency={currency} {...checkout.cartProps} />;

  return (
    <View style={styles.fill}>
      <PageHeader kicker={merchantName} title="Register" meta="Cash · prices include tax" />
      {wide ? (
        <View style={styles.split}>
          <View style={[styles.itemPane, { borderRightColor: colors.outlineVariant }]}>{items}</View>
          <View style={styles.fill}>{cart}</View>
        </View>
      ) : (
        <NarrowPanes items={items} cart={cart} count={checkout.cartProps.totals.count} />
      )}
      <SaleSnackbar sale={checkout.recorded} onDismiss={checkout.dismissRecorded} merchantId={merchantId} currency={currency} />
    </View>
  );
}

/** The cart, the cash typed, and the one record_sale call they end in. */
function useCheckout(merchantId: string) {
  const [lines, dispatch] = useReducer(cartReducer, []);
  const [tendered, setTendered] = useState('');
  const [tried, setTried] = useState(false);
  // One per sale: a retry after a lost response returns the sale already made instead of a second one.
  const [clientKey, setClientKey] = useState(newClientKey);
  const [recorded, setRecorded] = useState<RecordedSale | null>(null);
  const record = useRecordSaleMutation({ merchantId });

  const totals = cartTotals(lines);
  const cash = tendered.trim() === '' ? NaN : Number(tendered);
  const tenderError = Number.isFinite(cash) && cash >= totals.total ? null : 'Enter at least the total.';

  const complete = () => {
    setTried(true);
    if (tenderError || lines.length === 0) return;
    const onSuccess = (sale: RecordedSale) => {
      dispatch({ type: 'clear' });
      setTendered('');
      setTried(false);
      setClientKey(newClientKey());
      setRecorded(sale);
    };
    record.mutate({ clientKey, tendered: cash, lines }, { onSuccess });
  };

  // The cart is fixed while a sale is in flight; any other change clears the last refusal.
  const edit = (action: CartAction) => {
    if (record.isPending) return;
    record.reset();
    dispatch(action);
  };

  return {
    edit,
    recorded,
    dismissRecorded: () => setRecorded(null),
    cartProps: {
      lines,
      totals,
      onSetQty: (productId: string, qty: number) => edit({ type: 'set', productId, qty }),
      onClear: () => edit({ type: 'clear' }),
      tendered,
      onTendered: setTendered,
      tenderError: tried ? tenderError : null,
      changeDue: tenderError === null ? Math.round((cash - totals.total) * 100) / 100 : null,
      notice: mutationNotice(record, refusalText(saleFailure(record.error))),
      pending: record.isPending,
      onComplete: complete,
    },
  };
}

/** Narrow: Items | Cart across the top, one pane at a time. */
function NarrowPanes({ items, cart, count }: { items: ReactNode; cart: ReactNode; count: number }) {
  const [pane, setPane] = useState<'items' | 'cart'>('items');

  return (
    <>
      <View style={styles.switch}>
        <SegmentedButtons
          density="small"
          value={pane}
          onValueChange={(value) => setPane(value === 'cart' ? 'cart' : 'items')}
          buttons={[
            { value: 'items', label: 'Items' },
            // The count rides in the icon slot, as an accent badge (instruction_mds/frontend.md §2.3).
            { value: 'cart', label: 'Cart', icon: count > 0 ? () => <CountBadge count={count} /> : undefined },
          ]}
        />
      </View>
      {pane === 'items' ? items : cart}
    </>
  );
}

type SnackbarProps = { sale: RecordedSale | null; onDismiss: () => void; merchantId: string; currency: string };

/** "SL-00012 saved · change ₱20.00", and the way to its receipt. */
function SaleSnackbar({ sale, onDismiss, merchantId, currency }: SnackbarProps) {
  if (!sale) return null;
  // withAnchor: Receipts is another destination, so its list goes under the receipt (products/_layout.tsx).
  const view = () =>
    router.push({ pathname: '/systems/[id]/receipts/[saleId]', params: { id: merchantId, saleId: sale.id } }, { withAnchor: true });

  return (
    <Snackbar visible onDismiss={onDismiss} duration={6000} action={{ label: 'View receipt', onPress: view }}>
      {`${sale.code} saved · change ${formatMoney(sale.change_due, currency)}`}
    </Snackbar>
  );
}

function CountBadge({ count }: { count: number }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.badge, { backgroundColor: colors.accent }]}>
      <Text variant="labelMedium" style={{ color: colors.onAccent }}>
        {count}
      </Text>
    </View>
  );
}

function refusalText(failure: ReturnType<typeof saleFailure>) {
  switch (failure?.name) {
    case 'insufficient_stock':
      return `Not enough ${failure.subject ?? 'stock'} left for this sale. Lower the quantity, or receive more stock first.`;
    case 'sale_product_unavailable':
      return `${failure.subject ?? 'A product in the cart'} can no longer be sold. Remove it from the cart.`;
    case 'tendered_short':
      return 'The cash received is less than the total.';
    default:
      return failureMessage("Couldn't complete the sale. Try again.");
  }
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  split: { flex: 1, flexDirection: 'row', paddingTop: spacing.ms },
  itemPane: { width: ITEM_PANE, borderRightWidth: 1 },
  switch: { paddingHorizontal: spacing.md, paddingVertical: spacing.ms },
  badge: { borderRadius: radius.sm, borderCurve: 'continuous', paddingHorizontal: spacing.xs },
});
