import { useNavigation } from 'expo-router';
import { StackActions, usePreventRemove } from 'expo-router/react-navigation';
import type { NavigationAction } from 'expo-router/react-navigation';
import { createContext, use, useEffect, useEffectEvent, useState } from 'react';
import type { RefObject } from 'react';

/** Runs `proceed` now, or holds it behind a "Discard your changes?" confirm. */
export type LeaveGuard = (proceed: () => void) => void;

/**
 * The shell's rail and drawer ask this before switching destination.
 *
 * `usePreventRemove` only sees a screen being removed from its own navigator. A drawer switch removes
 * nothing — the Products stack stays mounted underneath — so a form with unsaved changes would be left
 * without a word. The shell provides one ref; a screen with unsaved changes puts its guard in it while
 * they exist and takes it out after, and `SystemNav` calls it instead of navigating when it is set.
 *
 * A ref rather than state: the rail reads it at press time and nothing re-renders when it changes.
 */
export const UnsavedGuardContext = createContext<RefObject<LeaveGuard | null>>({ current: null });

/** What a blocked exit was about to do: a removal from the stack, or a rail switch. */
type Leave = { kind: 'remove'; action: NavigationAction } | { kind: 'rail'; proceed: () => void };

/**
 * The unsaved-changes guard every form screen shares. Two ways out need it: removing the screen from
 * the stack (hardware back, the header's arrow), which beforeRemove catches; and switching rail
 * destination, which removes nothing — the stack stays mounted — so it reaches the form only through
 * the shell's ref above. Both hold what they were about to do until the merchant decides in
 * `DiscardDialog` (src/components/discard-dialog.tsx).
 *
 * `setSavedId` turns the guard off, and `onSaved` leaves in the render after that — never in the same
 * tick as the save, or the guard would still be armed and would catch its own navigation. Keyed on
 * `savedId` alone: the refetch after a save hands the form a new `product`, and an effect that also
 * read it ran twice — two router.back() calls, landing on the list instead of the detail.
 */
export function useLeaveGuard(dirty: boolean, onSaved: (id: string) => void) {
  const navigation = useNavigation();
  const [blocked, setBlocked] = useState<Leave | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  // Set by Discard on a rail switch, so the guards are off in the render that pops the form.
  const [leaving, setLeaving] = useState<Leave | null>(null);
  const guarded = dirty && savedId === null && leaving === null;
  usePreventRemove(guarded, ({ data }) => setBlocked({ kind: 'remove', action: data.action }));

  const leaveGuard = use(UnsavedGuardContext);
  useEffect(() => {
    if (!guarded) return;
    leaveGuard.current = (proceed) => setBlocked({ kind: 'rail', proceed });
    return () => {
      leaveGuard.current = null;
    };
  }, [guarded, leaveGuard]);

  const leaveAfterSave = useEffectEvent(onSaved);
  useEffect(() => {
    if (savedId !== null) leaveAfterSave(savedId);
  }, [savedId]);

  // Discard on a rail switch: the stack goes back to its list, then the tapped destination opens, so
  // coming back to this screen shows the list rather than the abandoned form.
  useEffect(() => {
    if (leaving?.kind !== 'rail') return;
    navigation.dispatch(StackActions.popToTop());
    leaving.proceed();
  }, [leaving, navigation]);

  const discard = () => {
    if (!blocked) return;
    setBlocked(null);
    if (blocked.kind === 'remove') navigation.dispatch(blocked.action);
    // A rail switch pops the form in an effect, after the render that turns the guards off.
    else setLeaving(blocked);
  };

  return { savedId, setSavedId, blocked: blocked !== null, keepEditing: () => setBlocked(null), discard };
}

export type LeaveGuardState = ReturnType<typeof useLeaveGuard>;
