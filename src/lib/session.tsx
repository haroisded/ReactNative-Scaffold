import type { Session } from '@supabase/supabase-js';
import { createContext, use, useEffect, useState, type PropsWithChildren } from 'react';

import { supabase } from './supabase';

type SessionState = {
  /** `undefined` until the first auth event arrives. */
  session: Session | null | undefined;
  /** The session is still unknown — keep the splash up. */
  isLoading: boolean;
};

const SessionContext = createContext<SessionState>({
  session: undefined,
  isLoading: true,
});

export function useSession() {
  return use(SessionContext);
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    // Fires immediately with INITIAL_SESSION (restored from storage), then on every
    // sign-in, sign-out and token refresh. No getSession() needed. Keep this callback
    // synchronous: awaiting another auth call inside it can deadlock on the auth lock.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <SessionContext value={{ session, isLoading: session === undefined }}>{children}</SessionContext>
  );
}
