import { useState } from 'react';
import { StyleSheet } from 'react-native';
import {
  Appbar,
  Button,
  Card,
  Dialog,
  HelperText,
  Portal,
  Surface,
  Text,
  useTheme,
} from 'react-native-paper';

import { deleteAccount, signOut } from '../../lib/auth';
import { useSession } from '../../Store/StoreUser';

export default function Account() {
  const session = useSession();
  // MD3's `error` role, read from whichever of themes.js's two palettes the root layout put in
  // context. A destructive action is the one place a color has to be picked by hand, and this is
  // how it gets picked without hardcoding one.
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // The root guard only renders this branch with a session; the check is what narrows the
  // three-state value for TypeScript, and it covers the frame between sign-out and the flip.
  if (!session) return null;

  const user = session.user;

  // Both actions end the session, so both unmount this screen on success and only ever surface an
  // error on failure. One wrapper rather than two copies of the same try/finally.
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Surface style={styles.screen}>
      <Appbar.Header>
        <Appbar.Content title="Account" />
      </Appbar.Header>

      <Surface style={styles.body} elevation={0}>
        <Card>
          {/* Facebook withholds the email when the account has no confirmed address, so this
              falls through to the user id rather than rendering blank. */}
          <Card.Title
            title={user.user_metadata.full_name ?? user.email ?? user.id}
            subtitle={user.email ?? user.id}
          />
        </Card>

        <Text variant="labelMedium">Signed in with {user.app_metadata.provider ?? 'unknown'}</Text>

        <Button
          icon="logout"
          mode="contained"
          onPress={() => run(signOut)}
          loading={busy}
          disabled={busy}
        >
          Sign out
        </Button>

        {/* Deleting an account has to be reachable in-app — App Store Guideline 5.1.1(v) — and it
            cannot be undone, so it asks first and is styled apart from the primary action. */}
        <Button
          icon="account-remove"
          mode="text"
          textColor={colors.error}
          onPress={() => setConfirmingDelete(true)}
          disabled={busy}
        >
          Delete account
        </Button>

        <HelperText type="error" visible={error !== null}>
          {error}
        </HelperText>
      </Surface>

      <Portal>
        <Dialog visible={confirmingDelete} onDismiss={() => setConfirmingDelete(false)}>
          <Dialog.Title>Delete account?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              This permanently deletes your account and everything stored against it. It cannot be
              undone.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmingDelete(false)}>Cancel</Button>
            <Button
              textColor={colors.error}
              onPress={() => {
                setConfirmingDelete(false);
                void run(deleteAccount);
              }}
            >
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Surface>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { flex: 1, gap: 12, padding: 24 },
});
