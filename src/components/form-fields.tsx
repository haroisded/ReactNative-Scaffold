import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import WheelPicker from '@quidone/react-native-wheel-picker';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { useController } from 'react-hook-form';
import type { Control, FieldPathByValue, FieldValues } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';
import type { KeyboardTypeOptions } from 'react-native';

import { useShellWide } from '../lib/columns';
import { useAppTheme } from '../lib/theme';
import { radius, spacing } from '../themes';
import { AdaptiveDialog } from './adaptive-dialog';
import { Button } from './button';
import { HelperText } from './helper-text';
import { IconButton } from './icon-button';
import { MenuSelect } from './menu-select';
import type { SelectOption } from './menu-select';
import { Switch } from './switch';
import { Text } from './text';
import { TextInput } from './text-input';

// The form layout pieces with no form path: the labelled Field and its grid, the headings, the date and
// time input, and the repeatable-row controls. In src/components/ because the product form, the stock
// item form and the receipt wizard all lay out their fields with them (instruction_mds/structure.md
// rule 7). The Controlled* fields at the end bind to any react-hook-form through its `control`; the
// product form keeps its own context-bound set beside it (src/screens/product-form/fields.tsx).
// ponytail: two sets of the same four fields. Move the product form onto these when it is next reworked.

type Span = 'half' | 'full';

export type FieldProps = {
  label: string;
  required?: boolean;
  hint?: string;
  /** An inline field action in the label row ("Auto-generate"). No onPress renders it inert ("Scan"). */
  action?: { label: string; onPress?: () => void };
  /** Half a row on a wide form, the whole row otherwise. */
  span?: Span;
  error?: string;
  children: ReactNode;
};

/** Label row, control, error. Laid out by FieldGrid. */
export function Field({ label, required, hint, action, span = 'half', error, children }: FieldProps) {
  const { colors } = useAppTheme();
  const wide = useShellWide();

  return (
    <View style={wide && span === 'half' ? styles.half : styles.full}>
      <View style={styles.labelRow}>
        <Text variant="labelMedium">
          {label}
          {/* The required mark is one of the accent's places (instruction_mds/visual-language.md §4). */}
          {required ? <Text variant="labelMedium" style={{ color: colors.accent }}> *</Text> : null}
        </Text>
        {action ? (
          <Button
            compact
            mode="text"
            textColor={colors.accent}
            onPress={action.onPress}
            disabled={!action.onPress}
            style={styles.labelAction}
          >
            {action.label}
          </Button>
        ) : hint ? (
          <Text variant="bodySmall" style={[styles.hint, { color: colors.onSurfaceMuted }]}>
            {hint}
          </Text>
        ) : null}
      </View>
      {children}
      {/* Rendered only with an error, so a quiet form does not carry an empty line under every field. */}
      {error ? (
        <HelperText type="error" padding="none">
          {error}
        </HelperText>
      ) : null}
    </View>
  );
}

/** The two-column field grid on a wide form; one column narrow. */
export function FieldGrid({ children }: { children: ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

export function SectionHeading({ title, hint }: { title: string; hint?: string }) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.heading}>
      <Text variant="headlineSmall">{title}</Text>
      {hint ? (
        <Text variant="bodySmall" style={{ color: colors.onSurfaceMuted }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

/** A labelled group inside a section ("Reorder", "Expiry"), with a 1px rule above it. */
export function GroupHeading({ title }: { title: string }) {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.group, { borderTopColor: colors.outlineVariant }]}>
      <Text variant="titleMedium">{title}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------------------------------
// Dates and times. Held in the form as "YYYY-MM-DD" and "HH:MM" — the shapes Postgres `date` and
// `time` accept — and converted to a local Date only for the picker.
// ---------------------------------------------------------------------------------------------------

export type PickerMode = 'date' | 'time';

const pad = (value: number) => String(value).padStart(2, '0');

function formatPicked(date: Date, mode: PickerMode) {
  return mode === 'date'
    ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    : `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toPickerDate(value: string, mode: PickerMode) {
  const now = new Date();
  if (value === '') return now;
  // Built from local parts: new Date("2026-09-14") parses as UTC midnight and shows the day before
  // anywhere west of Greenwich.
  return mode === 'date'
    ? new Date(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, Number(value.slice(8, 10)))
    : new Date(now.getFullYear(), now.getMonth(), now.getDate(), Number(value.slice(0, 2)), Number(value.slice(3, 5)));
}

/** "14 Sep 2026" for a stored date. */
export function displayDate(value: string) {
  return toPickerDate(value, 'date').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * "2:30 PM" for a stored "14:30". Times are held 24-hour because that is what Postgres `time` takes;
 * nobody running a till reads 14:30, so every time a merchant sees is 12-hour.
 */
function displayTime(value: string) {
  if (value === '') return '';
  const hour24 = Number(value.slice(0, 2));
  const hour = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour}:${value.slice(3, 5)} ${hour24 < 12 ? 'AM' : 'PM'}`;
}

// ---------------------------------------------------------------------------------------------------
// The time wheel
// ---------------------------------------------------------------------------------------------------

const HOUR_ITEMS = Array.from({ length: 12 }, (_, index) => ({ value: index + 1, label: String(index + 1) }));
const MINUTE_ITEMS = Array.from({ length: 60 }, (_, index) => ({ value: index, label: pad(index) }));
const MERIDIEM_ITEMS = [
  { value: 'AM', label: 'AM' },
  { value: 'PM', label: 'PM' },
];

type Meridiem = 'AM' | 'PM';

function splitTime(value: string) {
  const hour24 = value === '' ? new Date().getHours() : Number(value.slice(0, 2));
  const minute = value === '' ? 0 : Number(value.slice(3, 5));
  const meridiem: Meridiem = hour24 < 12 ? 'AM' : 'PM';
  return { hour: hour24 % 12 === 0 ? 12 : hour24 % 12, minute, meridiem };
}

function joinTime(hour: number, minute: number, meridiem: Meridiem) {
  const hour24 = meridiem === 'AM' ? (hour === 12 ? 0 : hour) : hour === 12 ? 12 : hour + 12;
  return `${pad(hour24)}:${pad(minute)}`;
}

/**
 * Hour, minute and AM/PM as three wheels, the same control on both platforms.
 *
 * Neither native picker can do this: iOS has the wheel but no 12-hour mode without the OS locale
 * saying so, and Android's Material 3 clock dial has no wheel at all (@expo/ui's own note on
 * `display: 'spinner'` — on Android it is a text input). `@quidone/react-native-wheel-picker` is
 * plain JavaScript on Reanimated, both already here, so this needed no native rebuild.
 *
 * `itemTextStyle` carries colour only — the wheel sizes its own rows, like every other native-ish
 * control whose colours are props (instruction_mds/visual-language.md §5).
 */
function TimeWheel({ value, onPick, onClose }: Omit<PickerProps, 'mode'>) {
  const { colors } = useAppTheme();
  const wide = useShellWide();
  const start = splitTime(value);
  const [hour, setHour] = useState(start.hour);
  const [minute, setMinute] = useState(start.minute);
  const [meridiem, setMeridiem] = useState<Meridiem>(start.meridiem);

  return (
    <AdaptiveDialog
      wide={wide}
      onDismiss={onClose}
      title="Pick a time"
      actions={
        <>
          <Button onPress={onClose}>Cancel</Button>
          <Button
            mode="contained"
            onPress={() => {
              onPick(joinTime(hour, minute, meridiem));
              onClose();
            }}
          >
            Done
          </Button>
        </>
      }
    >
      <View style={styles.wheels}>
        <WheelPicker
          data={HOUR_ITEMS}
          value={hour}
          onValueChanged={({ item }) => setHour(item.value)}
          itemTextStyle={{ color: colors.onSurface }}
          overlayItemStyle={{ backgroundColor: colors.surfaceMuted }}
          width={72}
          testID="time-hour"
        />
        <WheelPicker
          data={MINUTE_ITEMS}
          value={minute}
          onValueChanged={({ item }) => setMinute(item.value)}
          itemTextStyle={{ color: colors.onSurface }}
          overlayItemStyle={{ backgroundColor: colors.surfaceMuted }}
          width={72}
          testID="time-minute"
        />
        <WheelPicker
          data={MERIDIEM_ITEMS}
          value={meridiem}
          // The wheel's value type is the item's, so this is already 'AM' | 'PM'.
          onValueChanged={({ item }) => setMeridiem(item.value === 'PM' ? 'PM' : 'AM')}
          itemTextStyle={{ color: colors.onSurface }}
          overlayItemStyle={{ backgroundColor: colors.surfaceMuted }}
          width={80}
          testID="time-meridiem"
        />
      </View>
    </AdaptiveDialog>
  );
}

type PickerProps = {
  mode: PickerMode;
  value: string;
  onPick: (value: string) => void;
  onClose: () => void;
};

/**
 * A date or a time, mounted only while open. A time is the wheel above, the same on both platforms; a
 * date is the platform's own picker — Android shows its Material dialog and closes it itself, and iOS
 * has no dialog presentation, so the inline picker sits in the adaptive dialog with Done.
 */
export function Picker({ mode, value, onPick, onClose }: PickerProps) {
  const { colors } = useAppTheme();
  const wide = useShellWide();
  const [draft, setDraft] = useState(() => toPickerDate(value, mode));

  if (mode === 'time') {
    return <TimeWheel value={value} onPick={onPick} onClose={onClose} />;
  }

  if (process.env.EXPO_OS === 'android') {
    return (
      <DateTimePicker
        value={draft}
        mode={mode}
        presentation="dialog"
        is24Hour
        accentColor={colors.accent}
        onValueChange={(_event, date) => {
          onPick(formatPicked(date, mode));
          onClose();
        }}
        onDismiss={onClose}
      />
    );
  }

  return (
    <AdaptiveDialog
      wide={wide}
      onDismiss={onClose}
      title={mode === 'date' ? 'Pick a date' : 'Pick a time'}
      actions={
        <>
          <Button onPress={onClose}>Cancel</Button>
          <Button
            mode="contained"
            onPress={() => {
              onPick(formatPicked(draft, mode));
              onClose();
            }}
          >
            Done
          </Button>
        </>
      }
    >
      <DateTimePicker value={draft} mode={mode} accentColor={colors.accent} onValueChange={(_event, date) => setDraft(date)} />
    </AdaptiveDialog>
  );
}

type DateTimeInputProps = {
  mode: PickerMode;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  accessibilityLabel: string;
  error?: boolean;
  /** Offer a clear icon, for an optional date. */
  clearable?: boolean;
};

/** A read-only outlined input that opens the picker. Plain value/onChange, for the hours editor. */
export function DateTimeInput({ mode, value, onChange, placeholder, accessibilityLabel, error, clearable }: DateTimeInputProps) {
  const { colors } = useAppTheme();
  const [open, setOpen] = useState(false);

  return (
    <>
      <View style={styles.pickerRow}>
        <Pressable
          onPress={() => setOpen(true)}
          // Pressable reads no theme, so the press colour is passed every time (instruction_mds/visual-language.md §5).
          android_ripple={{ color: colors.ripple }}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          style={styles.fill}
        >
          <View pointerEvents="none">
            <TextInput
              mode="outlined"
              dense
              editable={false}
              value={mode === 'date' ? displayDate(value) : displayTime(value)}
              placeholder={placeholder}
              error={error}
              right={<TextInput.Icon icon={mode === 'date' ? 'calendar' : 'clock'} />}
            />
          </View>
        </Pressable>
        {clearable && value !== '' ? (
          <Button compact onPress={() => onChange('')} accessibilityLabel={`Clear ${accessibilityLabel}`}>
            Clear
          </Button>
        ) : null}
      </View>
      {open ? <Picker mode={mode} value={value} onPick={onChange} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

/** "+ Add rate", "+ Add component": an accent text button under a repeatable list. */
export function AddButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  const { colors } = useAppTheme();

  return (
    <Button
      mode="text"
      icon="add"
      compact
      textColor={colors.accent}
      onPress={onPress}
      disabled={disabled}
      style={styles.addButton}
    >
      {label}
    </Button>
  );
}

/** A remove control at the end of a repeatable row. */
function RowRemove({ label, onPress }: { label: string; onPress: () => void }) {
  return <IconButton icon="delete" size={18} onPress={onPress} accessibilityLabel={label} style={styles.rowRemove} />;
}

/** A repeatable row: its fields in a grid, the remove control at the end, a 1px outlineVariant box. */
export function RepeatRow({ removeLabel, onRemove, children }: { removeLabel: string; onRemove: () => void; children: ReactNode }) {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.repeatRow, { borderColor: colors.outlineVariant }]}>
      <View style={styles.fill}>{children}</View>
      <RowRemove label={removeLabel} onPress={onRemove} />
    </View>
  );
}

type ControlledProps<T extends FieldValues, V> = Omit<FieldProps, 'children' | 'error'> & {
  control: Control<T>;
  name: FieldPathByValue<T, V>;
};

/** An outlined TextInput in a Field, bound to one string of a react-hook-form. */
export function ControlledText<T extends FieldValues>({
  control,
  name,
  placeholder,
  keyboardType,
  multiline,
  suffix,
  prefix,
  maxLength,
  disabled,
  ...field
}: ControlledProps<T, string> & {
  disabled?: boolean;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  prefix?: string;
  suffix?: string;
  maxLength?: number;
}) {
  const { field: input, fieldState } = useController({ control, name });

  return (
    <Field {...field} error={fieldState.error?.message}>
      <TextInput
        mode="outlined"
        dense
        // SAFETY: `name` is a FieldPathByValue<T, string>, so the value at it is a string; TypeScript
        // cannot resolve the generic path's value type inside the component.
        value={input.value as string}
        onChangeText={input.onChange}
        onBlur={input.onBlur}
        placeholder={placeholder}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 4 : undefined}
        maxLength={maxLength}
        disabled={disabled}
        error={!!fieldState.error}
        accessibilityLabel={field.label}
        left={prefix ? <TextInput.Affix text={prefix} /> : undefined}
        right={suffix ? <TextInput.Affix text={suffix} /> : undefined}
      />
    </Field>
  );
}

/** MenuSelect in a Field, bound to one string of a react-hook-form. */
export function ControlledSelect<T extends FieldValues>({
  control,
  name,
  options,
  placeholder = 'Select',
  createLabel,
  onCreate,
  ...field
}: ControlledProps<T, string> & { options: SelectOption[]; placeholder?: string; createLabel?: string; onCreate?: () => void }) {
  const { field: input, fieldState } = useController({ control, name });

  return (
    <Field {...field} error={fieldState.error?.message}>
      <MenuSelect
        // SAFETY: `name` is a FieldPathByValue<T, string>, so the value at it is a string; TypeScript
        // cannot resolve the generic path's value type inside the component.
        value={input.value as string}
        options={options}
        onChange={(value) => {
          input.onChange(value);
          input.onBlur();
        }}
        placeholder={placeholder}
        accessibilityLabel={field.label}
        error={!!fieldState.error}
        createLabel={createLabel}
        onCreate={onCreate}
      />
    </Field>
  );
}

/** A Switch and the sentence beside it, bound to one boolean of a react-hook-form. */
export function ControlledSwitch<T extends FieldValues>({
  control,
  name,
  on,
  off,
  disabled,
  ...field
}: ControlledProps<T, boolean> & { on: string; off: string; disabled?: boolean }) {
  const { colors } = useAppTheme();
  const { field: input } = useController({ control, name });

  return (
    <Field {...field}>
      <View style={styles.toggleRow}>
        {/* A switch that is on is one of the accent's places (instruction_mds/visual-language.md §4). */}
        <Switch
          // SAFETY: `name` is a FieldPathByValue<T, boolean>, so the value at it is a boolean; TypeScript
          // cannot resolve the generic path's value type inside the component.
          value={input.value as boolean}
          onValueChange={input.onChange}
          disabled={disabled}
          color={colors.accent}
          accessibilityLabel={field.label}
        />
        <Text variant="bodyMedium" style={styles.fill}>
          {input.value ? on : off}
        </Text>
      </View>
    </Field>
  );
}

/** A DateTimeInput in date mode, bound to one YYYY-MM-DD string ('' for none) of a react-hook-form. */
export function ControlledDate<T extends FieldValues>({
  control,
  name,
  clearable,
  ...field
}: ControlledProps<T, string> & { clearable?: boolean }) {
  const { field: input, fieldState } = useController({ control, name });

  return (
    <Field {...field} error={fieldState.error?.message}>
      <DateTimeInput
        mode="date"
        // SAFETY: `name` is a FieldPathByValue<T, string>, so the value at it is a string; TypeScript
        // cannot resolve the generic path's value type inside the component.
        value={input.value as string}
        onChange={(value) => {
          input.onChange(value);
          input.onBlur();
        }}
        placeholder="Select a date"
        accessibilityLabel={field.label}
        error={!!fieldState.error}
        clearable={clearable}
      />
    </Field>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.md, rowGap: spacing.md },
  // 45% plus flexGrow rather than 50%: the column gap would otherwise push the second cell to a row
  // of its own. The gap spaces label row, control and error, so none of them carries a margin.
  half: { flexBasis: '45%', flexGrow: 1, minWidth: 0, gap: spacing.xs },
  full: { flexBasis: '100%', gap: spacing.xs },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, minHeight: 24 },
  // A compact text Button is 40dp tall and would stretch the 24dp label row. The negative margin cancels
  // Paper's own touch padding, not rhythm between siblings.
  labelAction: { marginVertical: -6 },
  hint: { flexShrink: 1, textAlign: 'right' },
  heading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: spacing.ms, rowGap: spacing.xs },
  group: { borderTopWidth: 1, paddingTop: spacing.ms, width: '100%' },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.ms },
  wheels: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  addButton: { alignSelf: 'flex-start' },
  // IconButton ships a 6dp margin of its own; zeroed so the row's gap is the only spacing.
  rowRemove: { margin: 0 },
  repeatRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    paddingVertical: spacing.ms,
    paddingLeft: spacing.ms,
    paddingRight: spacing.xs,
  },
});
