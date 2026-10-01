import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { FormProvider, useForm, useFormState, useWatch } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { Button } from '../../components/button';
import { DiscardDialog } from '../../components/discard-dialog';
import { SectionHeading } from '../../components/form-fields';
import { PageHeader } from '../../components/page-header';
import { NarrowSteps, WideSections } from '../../components/section-stepper';
import type { StepSection } from '../../components/section-stepper';
import { Snackbar } from '../../components/snackbar';
import { saveFailure, useSaveProductMutation } from '../../features/products/queries';
import type { ProductDetail } from '../../features/products/queries';
import { RESOURCE_META, RESOURCE_ROUTE } from '../../features/products/resources';
import type { ResourceScope } from '../../features/products/resources';
import {
  FIELD_SECTION,
  SECTIONS_BY_TYPE,
  SECTION_META,
  TYPE_META,
  emptyProductForm,
  fromProductDetail,
  productFormSchema,
} from '../../features/products/schema';
import type { ProductFormValues, ProductType, SectionId } from '../../features/products/schema';
import { useShellWide } from '../../lib/columns';
import { INVALID_FORM, SKU_TAKEN, failureMessage, mutationNotice } from '../../lib/errors';
import type { Notice } from '../../lib/errors';
import { useLeaveGuard } from '../../lib/unsaved-guard';
import { ReviewSection } from './review-section';
import { AdvancedSection } from './sections/advanced-section';
import { AvailabilitySection } from './sections/availability-section';
import { GeneralSection } from './sections/general-section';
import { InventorySection } from './sections/inventory-section';
import { MediaSection } from './sections/media-section';
import { PricingSection } from './sections/pricing-section';
import { RecipeSection } from './sections/recipe-section';
import { VariantsSection } from './sections/variants-section';

type Props = {
  merchantId: string;
  currency: string;
  /** Which Resources screen this form belongs to (src/features/products/resources.ts). */
  scope: ResourceScope;
  /**
   * The type being created. The screen decides it — Products makes flat services, Inventory makes
   * stock items, and Rentables asks first — and a saved product never changes type, so this is only
   * read when `product` is null.
   */
  type: ProductType;
  /** The saved product when editing; null when creating. Mounted only once it has loaded, so the
   * form's defaultValues are right on the first render and no reset() is needed. */
  product: ProductDetail | null;
};

// Keyed by saveFailure(): the constraints a merchant can trip from this form.
const SAVE_FAILURE_COPY = new Map<ReturnType<typeof saveFailure>, string>([
  ['sku', SKU_TAKEN],
  ['cycle', 'One of the components already contains this product, so the bundle would contain itself.'],
  ['variant', 'Two variants have the same combination. Remove the repeated attribute value.'],
]);

export function ProductForm({ merchantId, currency, scope, type: newType, product }: Props) {
  const wide = useShellWide();
  const meta = RESOURCE_META[scope];
  const route = RESOURCE_ROUTE[scope];
  const save = useSaveProductMutation({ merchantId });
  const copy = formCopy(product, newType, meta.item);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: copy.defaultValues,
    mode: 'onTouched',
  });
  // useFormState rather than form.formState: it returns a new object when a flag changes, which is
  // what a compiled component needs to see the change.
  const { isDirty, errors } = useFormState({ control: form.control });
  const type = useWatch({ control: form.control, name: 'type' });
  const { sections, index, current, setSectionId, openFirstFailed } = useSections(type);
  const failedSections = sectionsWithErrors(Object.keys(errors));

  const { editing, productId } = copy;
  const guard = useLeaveGuard(isDirty, (id) => leaveAfterSave(editing, route.detail, merchantId, id));

  const { submit, invalid } = useSubmit(form, (values) =>
    save.mutate({ values, productId }, { onSuccess: (id) => guard.setSavedId(id) }), openFirstFailed);

  const notice = productNotice(save, meta.item, invalid && failedSections.size > 0);
  const saving = save.isPending && !save.isPaused;
  const saveActions = (
    <SaveActions wide={wide} saving={saving} publishing={copy.publishing} onSubmit={submit} />
  );

  const body = (
    <>
      <SectionHeading title={SECTION_META[current.id].name} hint={SECTION_META[current.id].hint} />
      <SectionBody
        id={current.id}
        merchantId={merchantId}
        currency={currency}
        scope={scope}
        productId={productId}
        sections={sections}
        onOpen={setSectionId}
      />
    </>
  );
  const steps = { sections, current, index, names: SECTION_META, failedSections, notice, body, onOpen: setSectionId };
  const layout = wide ? <WideSections {...steps} /> : <NarrowSteps {...steps} saveActions={saveActions} />;

  return (
    <FormProvider {...form}>
      <View style={styles.fill}>
        <PageHeader
          kicker={copy.kicker}
          title={copy.title}
          meta={TYPE_META[type].label}
          onBack={() => router.back()}
          actions={wide ? saveActions : undefined}
        />
        {layout}
      </View>

      <DiscardDialog guard={guard} wide={wide} message={`What you changed on this ${meta.item} has not been saved and will be lost.`} />

      {/* The one thing that still happens after a save: another one. The screen is already leaving for
          the detail, so this is the only affordance that needs to survive it. */}
      {'new' in route ? (
        <AddAnother created={guard.savedId !== null && !editing} item={meta.item} pathname={route.new} merchantId={merchantId} />
      ) : null}
    </FormProvider>
  );
}

type Section = StepSection<SectionId>;

/** What differs between adding a product and editing one. */
function formCopy(product: ProductDetail | null, newType: ProductType, item: string) {
  if (product === null) {
    return {
      editing: false,
      productId: null,
      defaultValues: emptyProductForm(newType),
      publishing: true,
      kicker: `New ${item}`,
      title: `Add a ${item}`,
    };
  }
  return {
    editing: true,
    productId: product.id,
    defaultValues: fromProductDetail(product),
    publishing: product.status === 'draft',
    kicker: `Edit ${item}`,
    title: product.name,
  };
}

/**
 * Validate, then save; or say something needs attention and open the section it is in. The Review
 * step's buttons choose the status (see SaveActions); "Save changes" passes none and keeps it.
 */
function useSubmit(
  form: UseFormReturn<ProductFormValues>,
  onValid: (values: ProductFormValues) => void,
  onInvalid: (fields: string[]) => void
) {
  const [invalid, setInvalid] = useState(false);
  const submit = (status?: 'draft' | 'active') => {
    if (status) form.setValue('status', status, { shouldDirty: true });
    void form.handleSubmit(
      (values) => {
        setInvalid(false);
        onValid(values);
      },
      (fieldErrors) => {
        setInvalid(true);
        onInvalid(Object.keys(fieldErrors));
      }
    )();
  };
  return { submit, invalid };
}

/** The sections this type steps through, and the one open. */
function useSections(type: ProductType) {
  // Review is the last step of every form (SECTION_META.review), appended here rather than repeated in
  // the per-type table.
  const sections: Section[] = [...SECTIONS_BY_TYPE[type], { id: 'review', optional: false }];
  const [sectionId, setSectionId] = useState<SectionId>('general');
  const index = Math.max(0, sections.findIndex((entry) => entry.id === sectionId));
  const current = sections[index] ?? sections[0];

  // Open the first section, in the order the merchant sees them, that holds an error. Review itself is
  // skipped: its own field is the status, which cannot be invalid.
  const openFirstFailed = (fields: string[]) => {
    const failed = sectionsWithErrors(fields);
    const first = sections.find((entry) => entry.id !== 'review' && failed.has(entry.id));
    if (first) setSectionId(first.id);
  };

  return { sections, index, current, setSectionId, openFirstFailed };
}

type SectionBodyProps = {
  id: SectionId;
  merchantId: string;
  currency: string;
  scope: ResourceScope;
  productId: string | null;
  sections: Section[];
  onOpen: (id: SectionId) => void;
};

function SectionBody({ id, merchantId, currency, scope, productId, sections, onOpen }: SectionBodyProps) {
  const units = RESOURCE_META[scope].units;
  switch (id) {
    case 'general':
      return <GeneralSection merchantId={merchantId} scope={scope} />;
    case 'pricing':
      return <PricingSection merchantId={merchantId} currency={currency} units={units} />;
    case 'inventory':
      return <InventorySection merchantId={merchantId} units={units} />;
    case 'availability':
      return <AvailabilitySection />;
    case 'variants':
      return <VariantsSection currency={currency} />;
    case 'recipe':
      return <RecipeSection merchantId={merchantId} currency={currency} productId={productId} />;
    case 'media':
      return <MediaSection />;
    case 'advanced':
      return <AdvancedSection />;
    case 'review':
      return (
        <ReviewSection
          sections={sections.filter((entry) => entry.id !== 'review')}
          merchantId={merchantId}
          scope={scope}
          currency={currency}
          onOpen={onOpen}
        />
      );
  }
}

type SaveActionsProps = {
  wide: boolean;
  saving: boolean;
  /** A new product or a draft: saved as active or as a draft. */
  publishing: boolean;
  onSubmit: (status?: 'draft' | 'active') => void;
};

/**
 * The ending, on the Review step only. Every earlier step moves forward instead — a "save" button on
 * every step competed with the real one. The status is chosen by the button rather than a toggle
 * above it: a new product or a draft is saved as active or as a draft; a product already past draft
 * keeps its status (Archive and Restore on the detail change it). Cancel is plain back, so the
 * unsaved-changes guard still asks before anything is lost.
 * Rejected: Archive on this step — archiving something never saved has no meaning.
 */
function SaveActions({ wide, saving, publishing, onSubmit }: SaveActionsProps) {
  const buttonStyle = wide ? undefined : styles.stretch;
  const cancel = (
    <Button mode="text" onPress={() => router.back()} disabled={saving} style={buttonStyle}>
      Cancel
    </Button>
  );

  return (
    <>
      {wide ? cancel : null}
      {publishing ? (
        <Button mode="outlined" onPress={() => onSubmit('draft')} disabled={saving} style={buttonStyle}>
          Save as draft
        </Button>
      ) : null}
      <Button
        mode="contained"
        icon="check"
        onPress={() => onSubmit(publishing ? 'active' : undefined)}
        loading={saving}
        disabled={saving}
        style={buttonStyle}
      >
        {publishing ? 'Save as active' : 'Save changes'}
      </Button>
      {wide ? null : cancel}
    </>
  );
}

type Route = (typeof RESOURCE_ROUTE)[ResourceScope];

/** Assets has no create route (resources.ts), so only the screens that create have one to go back to. */
type AddAnotherProps = { created: boolean; item: string; pathname: Extract<Route, { new: string }>['new']; merchantId: string };

function AddAnother({ created, item, pathname, merchantId }: AddAnotherProps) {
  return (
    <Snackbar
      visible={created}
      onDismiss={() => undefined}
      duration={5000}
      action={{ label: 'Add another', onPress: () => router.replace({ pathname, params: { id: merchantId } }) }}
    >
      {`${item.charAt(0).toUpperCase()}${item.slice(1)} saved`}
    </Snackbar>
  );
}

/** After a save: an edit goes back to the detail it came from; a new product replaces the form with its detail. */
function leaveAfterSave(editing: boolean, pathname: Route['detail'], merchantId: string, productId: string) {
  if (editing) router.back();
  else router.replace({ pathname, params: { id: merchantId, productId } });
}

/** The sections holding one of these fields. */
function sectionsWithErrors(fields: string[]) {
  const failed = new Set(fields);
  return new Set<SectionId>(
    Object.entries(FIELD_SECTION)
      .filter(([field]) => failed.has(field))
      .map(([, section]) => section)
  );
}

function productNotice(save: { isPaused: boolean; isError: boolean; error: Error | null }, item: string, invalid: boolean): Notice | null {
  const text = SAVE_FAILURE_COPY.get(saveFailure(save.error)) ?? failureMessage(`Couldn't save this ${item}. Try again.`);
  return mutationNotice(save, text, invalid ? INVALID_FORM : null);
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  stretch: { alignSelf: 'stretch' },
});
