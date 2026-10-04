import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { useCreateCategoryMutation, useRenameCategoryMutation } from '../features/categories/queries';
import type { Category } from '../features/categories/queries';
import type { ResourceScope } from '../features/products/resources';
import { useShellWide } from '../lib/columns';
import { failureMessage, mutationNotice, postgrestError } from '../lib/errors';
import { AdaptiveDialog } from './adaptive-dialog';
import { Button } from './button';
import { HelperText } from './helper-text';
import { TextInput } from './text-input';

type Props = {
  merchantId: string;
  /** Which screen's list this category belongs to (src/features/products/resources.ts). */
  scope: ResourceScope;
  /** Create under this category — a subcategory. Null creates a top-level category. */
  parent: Category | null;
  /** Rename this one instead of creating. */
  category?: Category;
  onDismiss: () => void;
  /** The created row, so an inline picker can select what was just made. */
  onCreated?: (category: Category) => void;
};

const NAME_MAX = 60;

const PLACEHOLDER = { category: 'e.g. Beverages', subcategory: 'e.g. Hot drinks' };

// product_categories_name_unique: names are unique among siblings, not across the tree.
const saveNotice = (paused: boolean, failure: Error | null, noun: string, showInvalid: boolean) =>
  mutationNotice(
    { isPaused: paused, isError: failure !== null },
    postgrestError(failure)?.code === '23505'
      ? `There is already a ${noun} with this name here.`
      : failureMessage("Couldn't save this category. Try again."),
    showInvalid ? `Enter a name of up to ${NAME_MAX} characters.` : null
  );

/** Create and rename, read as one write: only one of them ever runs in a dialog. */
function useCategoryWrites(merchantId: string, scope: Props['scope']) {
  const create = useCreateCategoryMutation({ merchantId, scope });
  const rename = useRenameCategoryMutation();
  return {
    create,
    rename,
    pending: create.isPending || rename.isPending,
    paused: create.isPaused || rename.isPaused,
    failure: create.error ?? rename.error,
  };
}

/**
 * Create or rename a category. One field and one rule, so plain state rather than react-hook-form
 * (the same call RemoveSystemDialog makes). Mounted only while open, so the field starts fresh.
 *
 * The body of the route src/app/(app)/forms/category.tsx, which the product form's picker and the Setup
 * screen both push: a full page on a phone, a Dialog on a tablet (AdaptiveDialog `asPage`).
 */
export function CategoryDialog({ merchantId, scope, parent, category, onDismiss, onCreated }: Props) {
  const { create, rename, pending, paused, failure } = useCategoryWrites(merchantId, scope);
  const wide = useShellWide();
  const [name, setName] = useState(category?.name ?? '');
  const [submitted, setSubmitted] = useState(false);

  const trimmed = name.trim();
  const invalid = trimmed.length === 0 || trimmed.length > NAME_MAX;
  const inFlight = pending && !paused;
  const noun = parent ? 'subcategory' : 'category';
  const copy = category ? { title: 'Rename category', submit: 'Save' } : { title: `New ${noun}`, submit: 'Create' };

  const notice = saveNotice(paused, failure, noun, submitted && invalid);

  const save = () => {
    setSubmitted(true);
    if (invalid) return;
    if (category) {
      rename.mutate({ id: category.id, name: trimmed }, { onSuccess: onDismiss });
      return;
    }
    create.mutate(
      { name: trimmed, parentId: parent?.id ?? null },
      {
        onSuccess: (row) => {
          onCreated?.(row);
          onDismiss();
        },
      }
    );
  };

  return (
    <AdaptiveDialog
      asPage
      wide={wide}
      onDismiss={onDismiss}
      dismissable={!inFlight}
      kicker={parent ? `In ${parent.name}` : 'Categories'}
      title={copy.title}
      actions={
        <>
          <Button mode="outlined" onPress={onDismiss} disabled={inFlight} contentStyle={styles.action}>
            Cancel
          </Button>
          <Button mode="contained" onPress={save} loading={pending} disabled={pending} contentStyle={styles.action}>
            {copy.submit}
          </Button>
        </>
      }
    >
      <TextInput
        mode="outlined"
        dense
        autoFocus
        value={name}
        onChangeText={setName}
        onSubmitEditing={save}
        placeholder={PLACEHOLDER[noun]}
        accessibilityLabel="Name"
        error={notice?.type === 'error'}
        disabled={pending}
      />
      <HelperText type={notice?.type ?? 'error'} visible={notice !== null} padding="none">
        {notice?.text}
      </HelperText>
    </AdaptiveDialog>
  );
}

const styles = StyleSheet.create({
  // Full width in the narrow sheet, so the label sits at the left edge (instruction_mds/frontend.md §5).
  action: { justifyContent: 'flex-start' },
});
