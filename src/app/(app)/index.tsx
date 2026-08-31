import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Appbar, Button, Card, HelperText, Surface, Text } from 'react-native-paper';

import { signOut } from '../../lib/auth';
import { useSession } from '../../Store/StoreUser';

export default function Account() {
  const session = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The root guard only renders this branch with a session; the check is what narrows the
  // three-state value for TypeScript, and it covers the frame between sign-out and the flip.
  if (!session) return null;

  const user = session.user;

  const onSignOut = async () => {
    setBusy(true);
    setError(null);
    try {
      await signOut();
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

        <Button icon="logout" mode="contained" onPress={onSignOut} loading={busy} disabled={busy}>
          Sign out
        </Button>

        <HelperText type="error" visible={error !== null}>
          {error}
        </HelperText>
      </Surface>
    </Surface>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { flex: 1, gap: 12, padding: 24 },
});
