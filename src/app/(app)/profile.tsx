import { router, useLocalSearchParams } from 'expo-router';

import { useShellWide } from '../../lib/columns';
import { ProfileScreen } from '../../screens/profile';

// Profile pushed over a system's shell, or over Home on a tablet (where Home has no Account tab). A
// Dialog over that screen on a tablet, a page on a phone (src/app/(app)/_layout.tsx DIALOG_ROUTES).
// From a system it has two exits, and they differ:
// - back returns to the same system and destination;
// - "Back to your systems" leaves the system. dismissTo pops to the (tabs) route already in the
//   stack — the anchor in (app)/_layout.tsx guarantees one is there — instead of pushing a second.
//   Opened from Home (`from=home`) there is no system to leave, so it is not offered.
//
// Not the Account tab. From the shell, navigate('/account') pops the system off the stack, and
// push('/account') stacks a second tab navigator on top of it (getNavigationAction.js:51).
export default function Profile() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const wide = useShellWide();

  return (
    <ProfileScreen
      asDialog={wide}
      onBack={() => router.back()}
      onExitSystem={from === 'home' ? undefined : () => router.dismissTo('/')}
    />
  );
}
