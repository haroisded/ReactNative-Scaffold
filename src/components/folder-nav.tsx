import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import type { FolderPath } from '../features/products/folders';
import { useAppTheme } from '../lib/theme';
import { spacing } from '../themes';
import { Button } from './button';
import { Icon } from './icon';
import { Text } from './text';

// Folders on Inventory and Stock (src/features/products/folders.ts). In src/components/ because both screens
// browse them.
//
// The open folder is the list route's params, and opening one pushes the same route a level deeper, so
// Android's back button climbs one folder and leaving the destination pops them all (popToTopOnBlur in
// src/app/(app)/systems/[id]/_layout.tsx). Rejected: the path in useState — Back from three folders deep
// would leave the screen.

type ListRoute = '/systems/[id]/inventory' | '/systems/[id]/stock';

/** The open folder, and a push into one of its folders. */
export function useFolderPath(pathname: ListRoute, merchantId: string) {
  const { category, sub, group } = useLocalSearchParams<FolderPath>();
  const path: FolderPath = { category, sub, group };
  const open = (level: keyof FolderPath, id: string) => {
    const params: Record<string, string> & { id: string } = { id: merchantId };
    for (const [key, value] of Object.entries({ ...path, [level]: id })) if (value !== undefined) params[key] = value;
    router.push({ pathname, params });
  };
  return { path, open };
}

/** A folder in the list: folder icon, name, what it holds, chevron. */
export function FolderRow({ name, caption, onOpen }: { name: string; caption: string; onOpen: () => void }) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      onPress={onOpen}
      // Pressable reads no theme, so the press colour is passed every time (instruction_mds/frontend.md §5).
      android_ripple={{ color: colors.ripple }}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${caption}`}
      accessibilityHint="Opens the folder"
      style={[styles.row, { borderBottomColor: colors.surfaceVariant }]}
    >
      <Icon source="folder" size={22} color={colors.onSurfaceMuted} />
      <View style={styles.text}>
        <Text variant="titleMedium" numberOfLines={1}>
          {name}
        </Text>
        <Text variant="bodySmall" style={{ color: colors.onSurfaceMuted }}>
          {caption}
        </Text>
      </View>
      <Icon source="chevron-right" size={20} color={colors.onSurfaceMuted} />
    </Pressable>
  );
}

/**
 * "Inventory › Medicines › Tablets", shown inside a folder. An earlier segment pops back to it: each folder
 * level is one push, so it is that many screens down. Rejected: router.dismissTo — every level is the same
 * route, so it matches the screen already open.
 */
export function FolderBreadcrumb({ root, trail }: { root: string; trail: string[] }) {
  const { colors } = useAppTheme();
  if (trail.length === 0) return null;
  const crumbs = [root, ...trail];

  return (
    <View style={styles.crumbs}>
      {crumbs.map((name, index) => (
        // The trail is positional: the same name can sit at two depths.
        <View key={`${index}:${name}`} style={styles.crumb}>
          {index > 0 ? <Icon source="chevron-right" size={16} color={colors.onSurfaceMuted} /> : null}
          {index === crumbs.length - 1 ? (
            <Text variant="titleSmall" numberOfLines={1}>
              {name}
            </Text>
          ) : (
            <Button mode="text" compact onPress={() => router.dismiss(crumbs.length - 1 - index)}>
              {name}
            </Button>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.ms, borderBottomWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.ms },
  text: { flex: 1, gap: spacing.xs },
  crumbs: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', paddingHorizontal: spacing.sm, paddingBottom: spacing.sm },
  crumb: { flexDirection: 'row', alignItems: 'center' },
});
