import type { Session } from '@supabase/supabase-js';
import { createContext, use, useEffect, useState, type PropsWithChildren } from 'react';

import { needsMfa as computeNeedsMfa } from './aal';
import { supabase } from './supabase';

type SessionState = {
  /** `undefined` until the first auth event arrives. */
  session: Session | null | undefined;
  /** User has a TOTP factor but has not passed it on this session yet. */
  needsMfa: boolean | undefined;
  /** Session and MFA level are both still unknown — keep the splash up. */
  isLoading: boolean;
};

const SessionContext = createContext<SessionState>({
  session: undefined,
  needsMfa: undefined,
  isLoading: true,
});

export function useSession() {
  return use(SessionContext);
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [needsMfa, setNeedsMfa] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    // Fires immediately with INITIAL_SESSION (restored from storage), then on every
    // sign-in, sign-out, token refresh and MFA verification. No getSession() needed.
    // Keep this callback synchronous: awaiting another auth call inside it can deadlock
    // on the auth lock, so the AAL lookup lives in its own effect below.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === undefined) return;
    if (session === null) {
      setNeedsMfa(false);
      return;
    }

    let cancelled = false;
    supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data, error }) => {
      if (cancelled) return;
      setNeedsMfa(!error && computeNeedsMfa(data));
    });
    return () => {
      cancelled = true;
    };
  }, [session]);

  const isLoading = session === undefined || needsMfa === undefined;

  return <SessionContext value={{ session, needsMfa, isLoading }}>{children}</SessionContext>;
}
