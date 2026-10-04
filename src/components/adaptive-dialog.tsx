import { useNavigation } from 'expo-router';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { BackHandler, KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '../lib/theme';
import { spacing } from '../themes';
import { Dialog } from './dialog';
import { Modal } from './modal';
import { Portal } from './portal';
import { Text } from './text';

type Props = {
  /** The shell's width decision (useShellWide), never measured here. Ignored when `inSheet` or `asPage`. */
  wide?: boolean;
  /**
   * The content of a native formSheet route (src/app/(app)/sheets/). The OS draws the sheet's frame,
   * so this draws only what goes inside it.
   */
  inSheet?: boolean;
  /**
   * The content of a form route (src/app/(app)/forms/, Profile). Narrow, a full page; wide, a Dialog
   * over the screen it was opened from, the route being a transparentModal (src/app/(app)/_layout.tsx,
   * instruction_mds/frontend.md §4.4).
   */
  asPage?: boolean;
  onDismiss: () => void;
  /** False while a request is genuinely in flight, so the backdrop and back button cannot close it. */
  dismissable?: boolean;
  kicker?: string;
  /** `error` for a destructive confirm, `accent` otherwise (instruction_mds/frontend.md §2.3). */
  kickerTone?: 'accent' | 'error';
  title: string;
  children?: ReactNode;
  /** Buttons. Laid out in a row when wide and stacked full width when narrow. */
  actions: ReactNode;
};

/**
 * A confirm, picker or small form — the pairs in instruction_mds/frontend.md §4.4, in five presentations:
 *
 * - **wide:** a Paper Dialog with a maximum width, mounted by the screen that opened it.
 * - **asPage, wide:** the same Dialog as the whole of a transparentModal route: the small create/edit
 *   forms (category, supplier, tax class) and Profile on a tablet.
 * - **asPage, narrow:** the body of a full-page route. Those forms on a phone, and stock movement at
 *   every width.
 * - **inSheet:** the body of a native formSheet route. Narrow confirms open that way.
 * - **narrow, not in a sheet:** a Paper Modal on the bottom edge. Kept for the two exceptions that
 *   cannot be a route: the unsaved-changes prompt, which holds a navigation action the form blocked,
 *   and the iOS date/time picker.
 *
 * Mounted by its caller only while open, so every field inside starts empty with no reset logic.
 */
export function AdaptiveDialog({
  wide,
  inSheet,
  asPage,
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

  if (inSheet || (asPage && !wide)) {
    return (
      <SheetBody page={!!asPage} dismissable={dismissable} kicker={kicker} kickerColor={kickerColor} title={title} actions={actions}>
        {children}
      </SheetBody>
    );
  }

  const dialog = (
    <WideDialog onDismiss={onDismiss} dismissable={dismissable} kicker={kicker} kickerColor={kickerColor} title={title} actions={actions}>
      {children}
    </WideDialog>
  );

  if (asPage) return <PageDialog dismissable={dismissable}>{dialog}</PageDialog>;
  if (wide) return dialog;

  return (
    <Portal>
      <Modal
        visible
        onDismiss={onDismiss}
        dismissable={dismissable}
        dismissableBackButton={dismissable}
        // Paper's Modal centres its content (Modal.js wrapper: justifyContent 'center'); a sheet sits on
        // the bottom edge instead.
        style={styles.sheetWrapper}
        contentContainerStyle={[styles.modalSheet, { backgroundColor: colors.surface, borderTopColor: colors.primary }]}
      >
        <SheetContent kicker={kicker} kickerColor={kickerColor} title={title} actions={actions}>
          {children}
        </SheetContent>
      </Modal>
    </Portal>
  );
}

type WideDialogProps = SheetProps & { onDismiss: () => void; dismissable: boolean };

function WideDialog({ onDismiss, dismissable, kicker, kickerColor, title, children, actions }: WideDialogProps) {
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
 * A wide form route: a transparentModal whose whole content is the Dialog, so the screen it was opened
 * from shows under the backdrop.
 *
 * `Portal.Host` keeps the Dialog, and any Menu or confirm inside it, in this route: on iOS a modal is a
 * view controller of its own, above the root host. KeyboardAvoidingView shrinks the host as the keyboard
 * rises and the Dialog's maxHeight keeps its buttons above it — the Android build is edge-to-edge
 * (android/gradle.properties), so the window does not resize for the keyboard.
 */
function PageDialog({ dismissable, children }: { dismissable: boolean; children: ReactNode }) {
  useHoldRoute(dismissable);

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.page}>
      <Portal.Host>{children}</Portal.Host>
    </KeyboardAvoidingView>
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

/** Kicker, title, scrolling body and stacked actions — the inside of both narrow presentations. */
function SheetContent({ kicker, kickerColor, title, children, actions }: SheetProps) {
  const { colors } = useAppTheme();
  // A sheet reaches the bottom edge, so its last button would sit under the gesture bar. Neither
  // Paper's Modal nor the native formSheet pads for it.
  const { bottom } = useSafeAreaInsets();

  return (
    <>
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
    </>
  );
}

/**
 * The body of a formSheet or full-page route. Its own component because it needs hooks the other
 * presentations do not. A page fills the screen under the status bar, its content held to the dialog's
 * width: on a tablet only stock movement opens as a page.
 *
 * While a request is in flight the sheet holds still (useHoldRoute). What nothing stops is Android's
 * swipe-down and scrim tap: react-native-screens makes every Android
 * formSheet hideable and draggable (SheetDelegate.kt:190-191) and dismisses it natively. The request
 * then finishes on its own, and TanStack Query drops a `mutate` callback whose component unmounted, so
 * the sheet's `onSuccess` never navigates back from the screen underneath.
 *
 * `Portal.Host` scopes any Portal inside to the sheet: the root host sits behind a native sheet.
 */
function SheetBody({ page, dismissable, ...content }: SheetProps & { page: boolean; dismissable: boolean }) {
  const { colors } = useAppTheme();
  const { top } = useSafeAreaInsets();
  useHoldRoute(dismissable);

  return (
    <Portal.Host>
      {page ? (
        <View style={[styles.page, { backgroundColor: colors.surface, paddingTop: top }]}>
          <View style={styles.pageColumn}>
            <SheetContent {...content} />
          </View>
        </View>
      ) : (
        <View style={[styles.routeSheet, { backgroundColor: colors.surface, borderTopColor: colors.primary }]}>
          <SheetContent {...content} />
        </View>
      )}
    </Portal.Host>
  );
}

const styles = StyleSheet.create({
  // maxHeight: over a form route the rising keyboard shrinks the space the Dialog is centred in.
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
  sheetWrapper: { justifyContent: 'flex-end' },
  // The 2px primary rule on the sheet's top edge (instruction_mds/frontend.md §5).
  modalSheet: { borderTopWidth: 2, maxHeight: '90%' },
  routeSheet: { borderTopWidth: 2 },
  page: { flex: 1 },
  // Left-aligned measure, not a centred column (instruction_mds/frontend.md rule 18, §9).
  pageColumn: { flex: 1, width: '100%', maxWidth: 560 },
  sheetHeader: { gap: spacing.xs, paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  sheetActions: { gap: spacing.sm, padding: spacing.md, borderTopWidth: 1 },
});
