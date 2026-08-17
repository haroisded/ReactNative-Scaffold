import type { Factor } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';

import { Body, Button, Card, ErrorText, Mono, Muted, useColors } from '@/components/ui';
import { supabase } from '@/lib/supabase';

type PendingFactor = { id: string; secret: string; uri: string };

/**
 * Opt-in TOTP enrollment. A verified factor makes every later sign-in require a code,
 * which is what pushes the router through app/mfa.tsx.
 */
export function MfaEnroll() {
  const c = useColors();
  const [factors, setFactors] = useState<Factor[]>([]);
  const [pending, setPending] = useState<PendingFactor | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data, error: listError } = await supabase.auth.mfa.listFactors();
    if (listError) return setError(listError.message);
    setFactors(data.totp);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function guard(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const startEnroll = () =>
    guard(async () => {
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `Authenticator ${new Date().toISOString().slice(0, 10)}`,
      });
      if (enrollError) throw enrollError;
      setPending({ id: data.id, secret: data.totp.secret, uri: data.totp.uri });
    });

  const confirmEnroll = () =>
    guard(async () => {
      if (!pending) return;
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId: pending.id,
        code: code.trim(),
      });
      if (verifyError) throw verifyError;
      setPending(null);
      setCode('');
      await refresh();
    });

  const cancelEnroll = () =>
    guard(async () => {
      if (!pending) return;
      await supabase.auth.mfa.unenroll({ factorId: pending.id });
      setPending(null);
      setCode('');
      await refresh();
    });

  const remove = (factorId: string) =>
    guard(async () => {
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId });
      if (unenrollError) throw unenrollError;
      await refresh();
    });

  if (pending) {
    return (
      <Card>
        <Body>Add this secret to your authenticator app, then enter the code it shows.</Body>
        <Mono>{pending.secret}</Mono>
        {/*
          ponytail: no QR renderer — you cannot scan your own phone's screen, and the
          otpauth:// link opens the authenticator directly. Enrolling from a desktop
          browser? Render `data.totp.qr_code` (an SVG string) with react-native-svg's SvgXml.
        */}
        <Button
          title="Open in authenticator app"
          variant="secondary"
          onPress={() => void Linking.openURL(pending.uri)}
        />
        <TextInput
          value={code}
          onChangeText={setCode}
          placeholder="123456"
          placeholderTextColor={c.muted}
          keyboardType="number-pad"
          maxLength={6}
          style={[styles.input, { color: c.text, borderColor: c.border }]}
        />
        <Button
          title="Confirm"
          onPress={confirmEnroll}
          loading={busy}
          disabled={code.trim().length !== 6}
        />
        <Button title="Cancel" variant="secondary" onPress={cancelEnroll} disabled={busy} />
        <ErrorText>{error}</ErrorText>
      </Card>
    );
  }

  return (
    <Card>
      <Body>Two-factor authentication</Body>
      {factors.length === 0 ? (
        <>
          <Muted>
            No authenticator app enrolled. Adding one makes the next sign-in stop at the code
            screen{Platform.OS === 'web' ? ' — handy for testing the aal2 route guard.' : '.'}
          </Muted>
          <Button title="Enroll authenticator app" onPress={startEnroll} loading={busy} />
        </>
      ) : (
        factors.map((factor) => (
          <View key={factor.id} style={{ gap: 8 }}>
            <Muted>
              {factor.friendly_name ?? 'Authenticator'} · {factor.status}
            </Muted>
            <Button
              title="Remove"
              variant="danger"
              onPress={() => remove(factor.id)}
              loading={busy}
            />
          </View>
        ))
      )}
      <ErrorText>{error}</ErrorText>
    </Card>
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
