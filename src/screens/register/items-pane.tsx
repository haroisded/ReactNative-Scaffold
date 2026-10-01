import { FlashList } from '@shopify/flash-list';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { QueryState } from '../../components/query-state';
import { Text } from '../../components/text';
import { TextInput } from '../../components/text-input';
import { faceStock, useDrawableStockQuery, useRegisterProductsQuery } from '../../features/sales/queries';
import type { RegisterProduct } from '../../features/sales/queries';
import type { CartLine } from '../../features/sales/cart';
import { TILE_MIN, useColumns } from '../../lib/columns';
import { formatMoney } from '../../lib/money';
import { useAppTheme } from '../../lib/theme';
import { radius, spacing } from '../../themes';

type Props = {
  merchantId: string;
  currency: string;
  onAdd: (line: Omit<CartLine, 'qty'>) => void;
};

/**
 * What can be sold, as tiles: the Products screen's published rows (useRegisterProductsQuery). A tap adds
 * one. The search box takes a name, a SKU or a barcode — and a keyboard-wedge scanner types into it, so
 * Enter on an exact SKU or barcode adds that product and clears the box.
 */
export function ItemsPane({ merchantId, currency, onAdd }: Props) {
  const { colors } = useAppTheme();
  const { columns, onLayout } = useColumns(TILE_MIN);
  const products = useRegisterProductsQuery({ merchantId });
  const drawable = useDrawableStockQuery({ merchantId }).data;
  const [search, setSearch] = useState('');

  // A product with no price is refused by record_sale, so it is never offered.
  const sellable = (products.data ?? []).filter((product) => product.selling_price !== null);
  const term = search.trim().toLowerCase();
  const shown = term
    ? sellable.filter((product) => [product.name, product.sku, product.barcode].some((value) => value?.toLowerCase().includes(term)))
    : sellable;

  const add = (product: RegisterProduct) =>
    onAdd({ productId: product.id, name: product.name, price: product.selling_price ?? 0, taxRate: product.tax_class?.rate ?? 0 });

  const addExact = () => {
    const exact = sellable.find((product) => product.barcode === search.trim() || product.sku === search.trim());
    if (!exact) return;
    add(exact);
    setSearch('');
  };

  return (
    <View style={styles.fill}>
      <View style={styles.search}>
        <TextInput
          mode="outlined"
          dense
          label="Search name, SKU or barcode"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={addExact}
          left={<TextInput.Icon icon="search" />}
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>
      <View style={styles.fill} onLayout={onLayout}>
        <FlashList
          data={shown}
          keyExtractor={(item) => item.id}
          numColumns={columns}
          // instruction_mds/layout.md rule 9.
          key={columns}
          contentContainerStyle={styles.grid}
          ListEmptyComponent={
            <View style={styles.state}>
              <QueryState
                query={products}
                offline="You're offline. Products will load when you reconnect."
                failure="Couldn't load products. Try again."
              >
                <Text variant="bodyMedium">
                  {term ? 'Nothing matches that search.' : 'No products to sell. Publish one in Assets.'}
                </Text>
              </QueryState>
            </View>
          }
          renderItem={({ item }) => {
            const left = faceStock(item, drawable);
            const out = left === 0;
            return (
              <View style={styles.cell}>
                <Pressable
                  onPress={() => add(item)}
                  disabled={out}
                  android_ripple={{ color: colors.ripple }}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${item.name}`}
                  accessibilityState={{ disabled: out }}
                  style={[styles.tile, { borderColor: colors.outlineVariant, backgroundColor: colors.surface }, out && styles.faded]}
                >
                  <Text variant="titleMedium" numberOfLines={2} maxFontSizeMultiplier={1.3}>
                    {item.name}
                  </Text>
                  <Text variant="bodyMedium" maxFontSizeMultiplier={1.3}>
                    {formatMoney(item.selling_price, currency)}
                  </Text>
                  {left === null ? null : (
                    <Text variant="bodySmall" maxFontSizeMultiplier={1.3} style={{ color: out ? colors.error : colors.onSurfaceMuted }}>
                      {out ? 'Out of stock' : `${left} left`}
                    </Text>
                  )}
                </Pressable>
              </View>
            );
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  search: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  grid: { paddingHorizontal: spacing.ms, paddingBottom: spacing.md },
  cell: { flex: 1, padding: spacing.xs },
  tile: { flex: 1, gap: spacing.xs, padding: spacing.ms, borderWidth: 1, borderRadius: radius.md, borderCurve: 'continuous', overflow: 'hidden' },
  faded: { opacity: 0.5 },
  state: { gap: spacing.ms, alignItems: 'flex-start', padding: spacing.xs },
});
