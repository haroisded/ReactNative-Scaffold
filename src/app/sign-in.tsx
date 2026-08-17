import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';

import { Body, Button, Card, ErrorText, Muted, Screen, Title } from '@/components/ui';
import { signInWithApple, signInWithGoogle } from '@/lib/auth';

export default function SignInScreen() {
  const [busy, setBusy] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(Platform.OS !== 'ios');

  useEffect(() => {
    // Native Sign in with Apple needs iOS 13+; elsewhere we fall back to the browser flow.
    if (Platform.OS === 'ios') AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  function run(provider: 'google' | 'apple') {
    return async () => {
      setError(null);
      setBusy(provider);
      try {
        await (provider === 'google' ? signInWithGoogle() : signInWithApple());
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
          {appleAvailable ? (
            <Button
              title="Continue with Apple"
              variant="secondary"
              onPress={run('apple')}
              loading={busy === 'apple'}
              disabled={busy !== null}
            />
          ) : (
            <Muted>Sign in with Apple is unavailable on this device.</Muted>
          )}
          <ErrorText>{error}</ErrorText>
        </Card>

        <Body style={{ opacity: 0.7 }}>
          {Platform.OS === 'web'
            ? 'On web both providers use the redirect flow, so you can debug the whole session lifecycle in the browser.'
            : 'Google uses the native sheet. Apple is native on iOS and falls back to the system browser on Android.'}
        </Body>
      </View>
    </Screen>
  );
}
