import type { JwtPayload } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Body, Button, Card, Mono, Muted, Screen, Title } from '@/components/ui';
import { signOut } from '@/lib/auth';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';

export default function HomeScreen() {
  const { session } = useSession();
  const [claims, setClaims] = useState<JwtPayload | null>(null);

  useEffect(() => {
    // getClaims() verifies the JWT locally against the project's JWKS (asymmetric keys),
    // so it is the cheap way to trust the session without a round trip to the Auth server.
    supabase.auth.getClaims().then(({ data }) => setClaims(data?.claims ?? null));
  }, [session?.access_token]);

  const user = session?.user;
  const provider = user?.app_metadata?.provider ?? 'unknown';
  const expiresAt = claims?.exp ? new Date(claims.exp * 1000).toLocaleTimeString() : '—';

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 32 }}>
        <Title>Signed in</Title>

        <Card>
          <Muted>Account</Muted>
          <Body>{user?.user_metadata?.full_name ?? user?.email ?? user?.id}</Body>
          <Muted>Provider: {provider}</Muted>
        </Card>

        <Card>
          <Muted>Verified JWT claims</Muted>
          <Mono>sub: {claims?.sub ?? '…'}</Mono>
          <Mono>expires: {expiresAt}</Mono>
          <Muted>
            The token is refreshed in the background while the app is foregrounded, so this
            expiry keeps moving.
          </Muted>
        </Card>

        <View style={{ marginTop: 8 }}>
          <Button title="Sign out" variant="danger" onPress={() => void signOut()} />
        </View>
      </ScrollView>
    </Screen>
  );
}
