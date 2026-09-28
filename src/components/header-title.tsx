import type { StyleProp, ViewStyle } from 'react-native';

import { DataTable } from './data-table';
import { Text } from './text';

/** A wide list's column title: the product list, and Stock's receipts and suppliers panes. */
export function HeaderTitle({ label, style }: { label: string; style: StyleProp<ViewStyle> }) {
  return (
    <DataTable.Title style={style}>
      {/* DataTable.Title sets no variant of its own (instruction_mds/visual-language.md §5, Wide list). */}
      <Text variant="labelMedium">{label}</Text>
    </DataTable.Title>
  );
}
