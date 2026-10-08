import { useNavigation } from 'expo-router';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { BackHandler, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '../lib/theme';
import { spacing } from '../themes';
import { Dialog } from './dialog';
import { Portal } from './portal';
import { Text } from './text';

type Props = {
  /**
   * The content of a native formSheet route (src/app/(app)/sheets/). The OS draws the sheet's frame,
   * so this draws only what goes inside it. Otherwise a Dialog over the screen that mounted it.
   */
  inSheet?: boolean;
  onDismiss: () => void;
  /** False while a request is genuinely in flight, so the backdrop and back button cannot close it. */
  dismissable?: boolean;
  kicker?: string;
  /** `error` for a destructive confirm, `accent` otherwise (instruction_mds/frontend.md §2.3). */
  kickerTone?: 'accent' | 'error';
  title: string;
  children?: ReactNode;
  /** Buttons. Laid out in a row in the Dialog and stacked full width in the sheet. */
  actions: ReactNode;
};

/**
 * A confirm — the pair in instruction_mds/frontend.md §4.4, in two presentations:
 *
 * - **wide:** a Paper Dialog with a maximum width, mounted by the screen that opened it.
 * - **inSheet:** the body of a native formSheet route. Narrow confirms open that way.
 *
 * Mounted by its caller only while open, so every field inside starts empty with no reset logic.
 */
export function AdaptiveDialog({
  inSheet,
  onDismiss,
  dismissable = true,
  kicker,
  kickerTone = 'accent',
  title,
  children,
  actions,
}: Props) {
  const { colors } = useAppTheme();
  const kickerColor = kickerTone === 'error' ? colors.error : colors.accent;

  if (inSheet) {
    return (
      <SheetBody dismissable={dismissable} kicker={kicker} kickerColor={kickerColor} title={title} actions={actions}>
        {children}
      </SheetBody>
    );
  }

  return (
    <Portal>
      <Dialog
        visible
        onDismiss={onDismiss}
        dismissable={dismissable}
        dismissableBackButton={dismissable}
        // Dialog has no maximum width of its own (instruction_mds/frontend.md §7).
        style={styles.dialog}
      >
        {kicker ? (
          <Text variant="labelMedium" style={[styles.dialogKicker, { color: kickerColor }]}>
            {kicker}
          </Text>
        ) : null}
        {/* No variant: Dialog.Title picks headlineSmall itself (instruction_mds/frontend.md §3.3). Its own
            top margin is Paper's, not rhythm between siblings; under a kicker it closes up. */}
        <Dialog.Title style={kicker ? styles.titleUnderKicker : undefined}>{title}</Dialog.Title>
        <Dialog.ScrollArea style={styles.scrollArea}>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </Dialog.ScrollArea>
        {/* A plain row, not Dialog.Actions: that clones `compact` onto each child, and the child here is
            the caller's Fragment. */}
        <View style={styles.dialogActions}>{actions}</View>
      </Dialog>
    </Portal>
  );
}

/**
 * While a request is in flight a route should stay put, as `dismissable={false}` keeps a Dialog.
 * `gestureEnabled` stops the iOS swipe and the BackHandler listener stops Android's back button.
 */
function useHoldRoute(dismissable: boolean) {
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: dismissable });
    if (dismissable) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, [navigation, dismissable]);
}

type SheetProps = {
  kicker?: string;
  kickerColor: string;
  title: string;
  children?: ReactNode;
  actions: ReactNode;
};

/**
 * The body of a formSheet route: kicker, title, scrolling body and stacked actions.
 *
 * While a request is in flight the sheet holds still (useHoldRoute). What nothing stops is Android's
 * swipe-down and scrim tap: react-native-screens makes every Android
 * formSheet hideable and draggable (SheetDelegate.kt:190-191) and dismisses it natively. The request
 * then finishes on its own, and TanStack Query drops a `mutate` callback whose component unmounted, so
 * the sheet's `onSuccess` never navigates back from the screen underneath.
 *
 * `Portal.Host` scopes any Portal inside to the sheet: the root host sits behind a native sheet.
 */
function SheetBody({ dismissable, kicker, kickerColor, title, children, actions }: SheetProps & { dismissable: boolean }) {
  const { colors } = useAppTheme();
  // A sheet reaches the bottom edge, so its last button would sit under the gesture bar. The native
  // formSheet does not pad for it.
  const { bottom } = useSafeAreaInsets();
  useHoldRoute(dismissable);

  return (
    <Portal.Host>
      <View style={[styles.routeSheet, { backgroundColor: colors.surface, borderTopColor: colors.primary }]}>
        <View style={styles.sheetHeader}>
          {kicker ? (
            <Text variant="labelMedium" style={{ color: kickerColor }}>
              {kicker}
            </Text>
          ) : null}
          <Text variant="headlineSmall">{title}</Text>
        </View>
        <ScrollView contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
        <View style={[styles.sheetActions, { borderTopColor: colors.outlineVariant, paddingBottom: spacing.md + bottom }]}>
          {actions}
        </View>
      </View>
    </Portal.Host>
  );
}

const styles = StyleSheet.create({
  dialog: { maxWidth: 560, width: '100%', maxHeight: '90%', alignSelf: 'center' },
  dialogKicker: { paddingHorizontal: spacing.lg, paddingTop: spacing.ml },
  titleUnderKicker: { marginTop: spacing.xs },
  // ScrollArea draws its own hairlines; the body pads itself instead. flexShrink: the body gives up
  // height first, so the title and buttons stay in view.
  scrollArea: { paddingHorizontal: 0, borderTopWidth: 0, borderBottomWidth: 0, maxHeight: 460, flexShrink: 1 },
  // Level with Dialog.Title's own 24 inset on the wide Dialog, and with the sheet's header on narrow.
  body: { gap: spacing.ms, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  // Dialog.Actions' own MD3 layout: buttons at the end, inset level with the title.
  dialogActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
  sheetBody: { gap: spacing.ms, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  // The 2px primary rule on the sheet's top edge (instruction_mds/frontend.md §5).
  routeSheet: { borderTopWidth: 2 },
  sheetHeader: { gap: spacing.xs, paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  sheetActions: { gap: spacing.sm, padding: spacing.md, borderTopWidth: 1 },
});
