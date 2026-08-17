/** Authenticator Assurance Levels as reported by supabase.auth.mfa. */
export type AalLevels = {
  currentLevel: string | null;
  nextLevel: string | null;
};

/**
 * True when the user has a verified TOTP factor that this session has not satisfied yet.
 *
 * nextLevel is aal2 only if a factor exists; currentLevel is aal2 only after a code was
 * verified on this session. Anything else (no factor, or already verified) means go through.
 */
export function needsMfa(aal: AalLevels): boolean {
  return aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2';
}
