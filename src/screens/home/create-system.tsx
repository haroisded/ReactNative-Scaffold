import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, StyleSheet } from 'react-native';

import { Appbar } from '../../components/appbar';
import { Button } from '../../components/button';
import { HelperText } from '../../components/helper-text';
import { Text } from '../../components/text';
import { TextInput } from '../../components/text-input';
import { useCreateSystemMutation } from '../../features/merchants/queries';
import { createSystemSchema } from '../../features/merchants/schema';
import type { CreateSystemValues } from '../../features/merchants/schema';
import { useShellWide } from '../../lib/columns';
import { failureMessage, mutationNotice } from '../../lib/errors';
import { spacing } from '../../themes';

/**
 * One field, the system's name, on the full-screen route (src/app/(app)/create-system.tsx) at every
 * width. Everything else a system will carry arrives with the rebuild, not here.
 */
type Props = { onDismiss: () => void };

export function CreateSystem({ onDismiss }: Props) {
  const createSystem = useCreateSystemMutation();
  // Wide, the button hugs its label: a 640dp primary button reads as a banner.
  const buttonStyle = useShellWide() ? styles.hug : undefined;
  // A paused write is queued, not in flight: it must not hold the button in its spinner while the
  // device is offline (instruction_mds/data-layer.md §5). The button still stays disabled (below).
  const inFlight = createSystem.isPending && !createSystem.isPaused;
  const notice = mutationNotice(createSystem, failureMessage("Couldn't create this system. Try again."));

  // The component mounts only while its route is open, which is what makes the form fresh on every
  // open with no reset logic. onTouched: validating every keystroke while someone thumbs in a name
  // is noise.
  const { control, handleSubmit } = useForm<CreateSystemValues>({
    resolver: zodResolver(createSystemSchema),
    defaultValues: { name: '' },
    mode: 'onTouched',
  });

  // mutate, not mutateAsync: it does not throw, so there is no catch block whose only job is to
  // swallow an error that is already being rendered from the notice below. Refused while a create is
  // pending, paused included: a second tap offline would queue a second insert, and reconnecting
  // would make two systems. Guarded here, not only on the button, because the keyboard's Done
  // submits too.
  const submit = handleSubmit((values) => {
    if (!createSystem.isPending) createSystem.mutate(values, { onSuccess: onDismiss });
  });

  return (
    <>
      <Appbar.Header>
        <Appbar.BackAction onPress={onDismiss} />
        <Appbar.Content title="Merchant" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text variant="headlineSmall">Name your system</Text>
        <Controller
          control={control}
          name="name"
          render={({ field, fieldState }) => (
            <>
              <Text variant="labelMedium">System Name (required)</Text>
              <TextInput
                mode="outlined"
                placeholder="Enter system name"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                onSubmitEditing={submit}
                returnKeyType="done"
                autoFocus
                error={!!fieldState.error}
              />
              <HelperText type="error" visible={!!fieldState.error}>
                {fieldState.error?.message}
              </HelperText>
            </>
          )}
        />
        <Button
          mode="contained"
          style={buttonStyle}
          contentStyle={styles.leading}
          onPress={submit}
          loading={inFlight}
          disabled={createSystem.isPending}
        >
          Create System
        </Button>
        {/* The write's own state, distinct from the field being invalid: a provider string is
            replaced by copy the user can act on, and an offline wait says so. */}
        <HelperText type={notice?.type ?? 'error'} visible={notice !== null}>
          {notice?.text}
        </HelperText>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  // Full-width buttons put their label at the left edge (instruction_mds/frontend.md §5).
  leading: { justifyContent: 'flex-start' },
  // Capped at the single-column measure and left-aligned (instruction_mds/frontend.md rule 18, §9), so a
  // tablet's field does not span 1000dp.
  body: { gap: spacing.ms, padding: spacing.lg, width: '100%', maxWidth: 640 },
  hug: { alignSelf: 'flex-start' },
});
