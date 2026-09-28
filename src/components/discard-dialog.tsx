import { StyleSheet } from 'react-native';

import { useAppTheme } from '../lib/theme';
import type { LeaveGuardState } from '../lib/unsaved-guard';
import { AdaptiveDialog } from './adaptive-dialog';
import { Button } from './button';
import { Text } from './text';

type Props = {
  guard: LeaveGuardState;
  wide: boolean;
  kicker?: string;
  title?: string;
  message: string;
};

/** The unsaved-changes confirm the product form, the stock item form and the receipt wizard share (useLeaveGuard). */
export function DiscardDialog({ guard, wide, kicker = 'Unsaved changes', title = 'Discard your changes?', message }: Props) {
  const { colors } = useAppTheme();
  if (!guard.blocked) return null;

  return (
    <AdaptiveDialog
      wide={wide}
      onDismiss={guard.keepEditing}
      kicker={kicker}
      kickerTone="error"
      title={title}
      actions={
        <>
          <Button mode="outlined" onPress={guard.keepEditing} contentStyle={styles.action}>
            Keep editing
          </Button>
          <Button
            mode="contained"
            buttonColor={colors.error}
            textColor={colors.onError}
            contentStyle={styles.action}
            onPress={guard.discard}
          >
            Discard
          </Button>
        </>
      }
    >
      <Text variant="bodyMedium">{message}</Text>
    </AdaptiveDialog>
  );
}

const styles = StyleSheet.create({
  action: { justifyContent: 'flex-start' },
});
