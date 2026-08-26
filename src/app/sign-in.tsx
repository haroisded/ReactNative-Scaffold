import { useState } from 'react';
import { Platform, View } from 'react-native';

import { Body, Button, Card, ErrorText, Muted, Screen, Title } from '@/components/ui';
import { signInWithFacebook, signInWithGoogle } from '@/lib/auth';

export default function SignInScreen() {
  const [busy, setBusy] = useState<'google' | 'facebook' | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run(provider: 'google' | 'facebook') {
    return async () => {
      setError(null);
      setBusy(provider);
      try {
        await (provider === 'google' ? signInWithGoogle() : signInWithFacebook());
        // No navigation here: the session change flips the guard in app/_layout.tsx.
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(null);
      }
    };
  }

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: 20 }}>
        <View style={{ gap: 6 }}>
          <Title>Sign in</Title>
          <Muted>
            Social login only. Sessions persist across restarts and are refreshed automatically.
          </Muted>
        </View>

        <Card>
          <Button
            title="Continue with Google"
            onPress={run('google')}
            loading={busy === 'google'}
            disabled={busy !== null}
          />
          <Button
            title="Continue with Facebook"
            variant="secondary"
            onPress={run('facebook')}
            loading={busy === 'facebook'}
            disabled={busy !== null}
          />
          <ErrorText>{error}</ErrorText>
        </Card>

        <Body style={{ opacity: 0.7 }}>
          {Platform.OS === 'web'
            ? 'On web both providers use the redirect flow, so you can debug the whole session lifecycle in the browser.'
            : 'Google uses the native sheet. Facebook goes through the system browser.'}
        </Body>
      </View>
    </Screen>
  );
}
