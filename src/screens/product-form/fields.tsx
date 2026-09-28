import { useState } from 'react';
import { useController, useFormContext, useFormState } from 'react-hook-form';
import type { FieldPathByValue } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import type { KeyboardTypeOptions } from 'react-native';

import { Chip } from '../../components/chip';
import { AddButton, DateTimeInput, Field, Picker, displayDate } from '../../components/form-fields';
import type { FieldProps, PickerMode } from '../../components/form-fields';
import { HelperText } from '../../components/helper-text';
import { MenuSelect } from '../../components/menu-select';
import type { SelectOption } from '../../components/menu-select';
import { SegmentedButtons } from '../../components/segmented-buttons';
import { Switch } from '../../components/switch';
import { Text } from '../../components/text';
import { TextInput } from '../../components/text-input';
import { UNIT_META, measureUnit } from '../../features/products/schema';
import type { MeasureUnit, ProductFormValues } from '../../features/products/schema';
import { useAppTheme } from '../../lib/theme';
import { spacing } from '../../themes';

// The product form's fields, one per pattern in instruction_mds/visual-language.md §5 "Forms", laid out
// with the pieces in src/components/form-fields.tsx. Every field reads the form through useFormContext,
// so a section passes a path and nothing else — and the path types below make a misspelt or wrongly typed path a compile error at the section.

type StringPath = FieldPathByValue<ProductFormValues, string>;
type BooleanPath = FieldPathByValue<ProductFormValues, boolean>;
type StringListPath = FieldPathByValue<ProductFormValues, string[]>;
type ArrayPath = 'rateTiers' | 'operatingHours' | 'variantAttributes' | 'components';

/** Every unit. What a bundle's component is counted in, which is the component's own business. */
export const UNIT_OPTIONS: SelectOption[] = measureUnit.options.map((unit) => ({
  value: unit,
  label: UNIT_META[unit].label,
}));

/**
 * The units one Resources screen offers (RESOURCE_META[scope].units). Inventory counts in pieces and
 * kilograms, Rentables in hours and nights; offering all fourteen everywhere is what put `kg` in a
 * room-night's unit list.
 */
export function unitOptions(units: MeasureUnit[]): SelectOption[] {
  return units.map((unit) => ({ value: unit, label: UNIT_META[unit].label }));
}


type TextFieldProps = Omit<FieldProps, 'children' | 'error'> & {
  name: StringPath;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  /** Left affix, e.g. the currency symbol. */
  prefix?: string;
  /** Right affix, e.g. a unit. */
  suffix?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
};

export function TextField({
  name,
  placeholder,
  keyboardType,
  multiline,
  prefix,
  suffix,
  autoCapitalize,
  ...field
}: TextFieldProps) {
  const { control } = useFormContext<ProductFormValues>();
  const { field: input, fieldState } = useController({ control, name });

  return (
    <Field {...field} error={fieldState.error?.message}>
      <TextInput
        mode="outlined"
        dense
        value={input.value}
        onChangeText={input.onChange}
        onBlur={input.onBlur}
        placeholder={placeholder}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        numberOfLines={multiline ? 4 : undefined}
        error={!!fieldState.error}
        accessibilityLabel={field.label}
        left={prefix ? <TextInput.Affix text={prefix} /> : undefined}
        right={suffix ? <TextInput.Affix text={suffix} /> : undefined}
      />
    </Field>
  );
}

type SelectFieldProps = Omit<FieldProps, 'children' | 'error'> & {
  name: StringPath;
  options: SelectOption[];
  placeholder?: string;
  /** Offer "no value" as the first option, for a select that is optional. */
  clearable?: boolean;
};

export function SelectField({ name, options, placeholder = 'Select', clearable, ...field }: SelectFieldProps) {
  const { control } = useFormContext<ProductFormValues>();
  const { field: input, fieldState } = useController({ control, name });

  return (
    <Field {...field} error={fieldState.error?.message}>
      <MenuSelect
        value={input.value}
        options={clearable ? [{ value: '', label: 'None' }, ...options] : options}
        onChange={(value) => {
          input.onChange(value);
          input.onBlur();
        }}
        placeholder={placeholder}
        accessibilityLabel={field.label}
        error={!!fieldState.error}
      />
    </Field>
  );
}

type ToggleFieldProps = Omit<FieldProps, 'children' | 'error' | 'action' | 'hint'> & {
  name: BooleanPath;
  /** The sentence beside the switch while on, and while off. */
  on: string;
  off: string;
};

export function ToggleField({ name, on, off, ...field }: ToggleFieldProps) {
  const { colors } = useAppTheme();
  const { control } = useFormContext<ProductFormValues>();
  const { field: input } = useController({ control, name });

  return (
    <Field {...field}>
      <View style={styles.toggleRow}>
        {/* A switch that is on is one of the accent's places (instruction_mds/visual-language.md §4). */}
        <Switch value={input.value} onValueChange={input.onChange} color={colors.accent} accessibilityLabel={field.label} />
        <Text variant="bodyMedium" style={styles.fill}>
          {input.value ? on : off}
        </Text>
      </View>
    </Field>
  );
}

type SegmentedFieldProps = Omit<FieldProps, 'children' | 'error' | 'action'> & {
  name: StringPath;
  options: SelectOption[];
};

export function SegmentedField({ name, options, ...field }: SegmentedFieldProps) {
  const { control } = useFormContext<ProductFormValues>();
  const { field: input, fieldState } = useController({ control, name });

  return (
    <Field {...field} error={fieldState.error?.message}>
      <SegmentedButtons
        density="small"
        value={input.value}
        onValueChange={input.onChange}
        buttons={options.map((option) => ({ value: option.value, label: option.label }))}
      />
    </Field>
  );
}

type TagsFieldProps = Omit<FieldProps, 'children' | 'error' | 'action'> & {
  name: StringListPath;
  placeholder: string;
};

/** Chips in a wrapping row over an input that adds one on submit or on the plus. */
export function TagsField({ name, placeholder, ...field }: TagsFieldProps) {
  const { control } = useFormContext<ProductFormValues>();
  const { field: input, fieldState } = useController({ control, name });
  const [draft, setDraft] = useState('');

  const add = () => {
    const tag = draft.trim();
    if (tag !== '' && !input.value.includes(tag)) input.onChange([...input.value, tag]);
    setDraft('');
  };

  return (
    <Field {...field} error={fieldState.error?.message}>
      {input.value.length > 0 ? (
        <View style={styles.chips}>
          {input.value.map((tag) => (
            <Chip
              key={tag}
              compact
              closeIcon="close"
              onClose={() => input.onChange(input.value.filter((other) => other !== tag))}
              // On the close icon, the control that removes it. On the chip itself it would name a
              // body that does nothing, and the real control would be announced as "Close".
              closeIconAccessibilityLabel={`Remove ${tag}`}
            >
              {tag}
            </Chip>
          ))}
        </View>
      ) : null}
      <TextInput
        mode="outlined"
        dense
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={add}
        submitBehavior="submit"
        placeholder={placeholder}
        accessibilityLabel={field.label}
        right={<TextInput.Icon icon="add" onPress={add} accessibilityLabel={`Add to ${field.label}`} />}
      />
    </Field>
  );
}


type DateFieldProps = Omit<FieldProps, 'children' | 'error'> & {
  name: StringPath;
  mode: PickerMode;
  placeholder?: string;
};

export function DateField({ name, mode, placeholder, ...field }: DateFieldProps) {
  const { control } = useFormContext<ProductFormValues>();
  const { field: input, fieldState } = useController({ control, name });

  return (
    <Field {...field} error={fieldState.error?.message}>
      <DateTimeInput
        mode={mode}
        value={input.value}
        onChange={(value) => {
          input.onChange(value);
          input.onBlur();
        }}
        placeholder={placeholder ?? (mode === 'date' ? 'Pick a date' : 'Pick a time')}
        accessibilityLabel={field.label}
        error={!!fieldState.error}
        clearable={!field.required}
      />
    </Field>
  );
}

type DateListFieldProps = Omit<FieldProps, 'children' | 'error' | 'action'> & {
  name: StringListPath;
  addLabel: string;
};

/** A list of dates as chips, kept sorted, with an accent "+ Add date". Blackout dates. */
export function DateListField({ name, addLabel, ...field }: DateListFieldProps) {
  const { control } = useFormContext<ProductFormValues>();
  const { field: input } = useController({ control, name });
  const [open, setOpen] = useState(false);

  return (
    <Field {...field}>
      {input.value.length > 0 ? (
        <View style={styles.chips}>
          {input.value.map((date) => (
            <Chip
              key={date}
              compact
              closeIcon="close"
              onClose={() => input.onChange(input.value.filter((other) => other !== date))}
              // On the close icon, the control that removes it — see TagsField.
              closeIconAccessibilityLabel={`Remove ${displayDate(date)}`}
            >
              {displayDate(date)}
            </Chip>
          ))}
        </View>
      ) : null}
      <AddButton label={addLabel} onPress={() => setOpen(true)} />
      {open ? (
        <Picker
          mode="date"
          value=""
          // ISO dates sort correctly as strings.
          onPick={(date) => {
            if (!input.value.includes(date)) input.onChange([...input.value, date].sort());
          }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </Field>
  );
}


/** The error a cross-field rule put on a whole list ("Add at least one component"). */
export function ArrayError({ name }: { name: ArrayPath }) {
  const { errors } = useFormState<ProductFormValues>({ name });
  const error = errors[name];
  const message = error?.message ?? error?.root?.message;

  return message ? (
    <HelperText type="error" padding="none">
      {message}
    </HelperText>
  ) : null;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.ms, minHeight: 40 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
