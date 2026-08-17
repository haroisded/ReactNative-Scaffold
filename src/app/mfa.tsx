import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button, Card, ErrorText, Muted, Screen, Title, useColors } from '@/components/ui';
import { signOut } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function MfaScreen() {
  const c = useColors();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data, error: listError }) => {
      if (listError) return setError(listError.message);
      setFactorId(data.totp[0]?.id ?? null);
    });
  }, []);

  async function verify() {
    if (!factorId) return;
    setBusy(true);
    setError(null);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: code.trim(),
      });
      if (verifyError) throw verifyError;
      // Success upgrades the session to aal2 — the root layout guard swaps the route.
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setCode('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: 20 }}>
        <View style={{ gap: 6 }}>
          <Title>Two-factor code</Title>
          <Muted>Enter the 6-digit code from your authenticator app to finish signing in.</Muted>
        </View>

        <Card>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="123456"
            placeholderTextColor={c.muted}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={6}
            style={[styles.input, { color: c.text, borderColor: c.border }]}
          />
          <Button
            title="Verify"
            onPress={verify}
            loading={busy}
            disabled={code.trim().length !== 6 || !factorId}
          />
          <ErrorText>{error}</ErrorText>
        </Card>

        <Button title="Sign out" variant="secondary" onPress={() => void signOut()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 52,
    paddingHorizontal: 16,
    fontSize: 22,
    letterSpacing: 6,
    textAlign: 'center',
  },
});
