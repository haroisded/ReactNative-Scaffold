import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Notice } from '../lib/errors';
import { useAppTheme } from '../lib/theme';
import { spacing } from '../themes';
import { HelperText } from './helper-text';

/**
 * A narrow form's bottom bar: the save or offline notice above the buttons. Shared by the product form,
 * the stock item form and the receipt wizard.
 *
 * SafeAreaView, not View: the Android build is edge-to-edge (android/gradle.properties), so a bar pinned
 * to the bottom draws behind the system navigation bar. `additive` adds the inset to the bar's own
 * padding.
 */
export function FormFooter({ notice, children }: { notice: Notice | null; children: ReactNode }) {
  const { colors } = useAppTheme();
  return (
    <SafeAreaView edges={['bottom']} style={[styles.footer, { borderTopColor: colors.outlineVariant, backgroundColor: colors.surface }]}>
      <FormNoticeText notice={notice} />
      {children}
    </SafeAreaView>
  );
}

export function FormNoticeText({ notice }: { notice: Notice | null }) {
  return notice ? (
    <HelperText type={notice.type} padding="none">
      {notice.text}
    </HelperText>
  ) : null;
}

const styles = StyleSheet.create({
  footer: { gap: spacing.sm, padding: spacing.ms, borderTopWidth: 1 },
});
