import { useEffect } from 'react';
import { create } from 'zustand';

type SheetResult = { key: string; id: string } | null;

/**
 * What a create form made, handed back to the picker that opened it.
 *
 * An inline-create is a full-page route under src/app/(app)/forms/ at every width
 * (instruction_mds/visual-language.md §5), so the picker and the form do not share a component tree to pass
 * `onCreated` down. One slot is enough: only one create form is ever open. The key names the field that asked ("category", "subcategory", …), so a result
 * never lands in a different picker on the same form.
 *
 * Rejected: `navigation.popTo(route, { createdId }, { merge: true })`. It leaves the id in the form
 * route's params after it is used, and ties every form to the name of each route that opens it.
 */
const useSheetResultStore = create<{ result: SheetResult }>(() => ({ result: null }));

export function setSheetResult(key: string, id: string) {
  useSheetResultStore.setState({ result: { key, id } });
}

/** Calls `take` once with the id a create form made for `key`, then clears the slot. */
export function useSheetResult(key: string, take: (id: string) => void) {
  const result = useSheetResultStore((state) => state.result);

  useEffect(() => {
    if (result?.key !== key) return;
    useSheetResultStore.setState({ result: null });
    take(result.id);
  }, [result, key, take]);
}
