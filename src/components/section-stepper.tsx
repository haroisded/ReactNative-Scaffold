import type { ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { SECTION_LIST } from '../lib/columns';
import type { Notice } from '../lib/errors';
import { useAppTheme } from '../lib/theme';
import { spacing } from '../themes';
import { Button } from './button';
import { FormNoticeText, FormFooter } from './form-footer';
import { StepHeader } from './step-header';
import { Text } from './text';

// A long form split into sections: every section in a list beside the open one when wide, one step at a
// time when narrow. The product form and the Inventory item form; the last section is where the save
// buttons go.

export type StepSection<Id extends string> = { id: Id; optional: boolean };

export type SectionStepsProps<Id extends string> = {
  sections: StepSection<Id>[];
  current: StepSection<Id>;
  index: number;
  /** Each section's name, as the list row and the step header show it. */
  names: Record<Id, { name: string }>;
  failedSections: ReadonlySet<Id>;
  notice: Notice | null;
  body: ReactElement;
  onOpen: (id: Id) => void;
};

/** Wide, every section is a row in a list beside the one open. */
export function WideSections<Id extends string>({ sections, current, names, failedSections, notice, body, onOpen }: SectionStepsProps<Id>) {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.split, { borderTopColor: colors.outlineVariant }]}>
      <ScrollView style={[styles.sectionList, { borderRightColor: colors.outlineVariant }]}>
        {sections.map((entry, position) => (
          <SectionRow
            key={entry.id}
            name={names[entry.id].name}
            optional={entry.optional}
            position={position}
            active={entry.id === current.id}
            failed={failedSections.has(entry.id)}
            onPress={() => onOpen(entry.id)}
          />
        ))}
      </ScrollView>
      <ScrollView key={current.id} style={styles.fill} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <FormNoticeText notice={notice} />
        {body}
      </ScrollView>
    </View>
  );
}

type SectionRowProps = { name: string; optional: boolean; position: number; active: boolean; failed: boolean; onPress: () => void };

function SectionRow({ name, optional, position, active, failed, onPress }: SectionRowProps) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      // Pressable reads no theme, so the press colour is passed every time (instruction_mds/frontend.md §5).
      android_ripple={{ color: colors.ripple }}
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityState={{ selected: active }}
      // The 3px bar is a border on every row, transparent when inactive, so selecting a
      // row never shifts its text (the rail item does the same).
      style={[styles.sectionRow, active && { backgroundColor: colors.surfaceMuted, borderLeftColor: colors.accent }]}
    >
      <View style={styles.sectionRowInner}>
        <Text variant="labelMedium" style={{ color: colors.onSurfaceFaint }}>
          {String(position + 1).padStart(2, '0')}
        </Text>
        <Text variant={active ? 'titleMedium' : 'bodyMedium'} style={[styles.fill, failed && { color: colors.error }]} numberOfLines={1}>
          {name}
        </Text>
        {optional ? (
          <Text variant="labelMedium" style={{ color: colors.onSurfaceFaint }}>
            Opt
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

type NarrowStepsProps<Id extends string> = SectionStepsProps<Id> & {
  saveActions: ReactElement;
  /** Skip step on an optional section: undo what it set, then move on. Without it, an optional step has Next only. */
  onSkip?: () => void;
};

/** Narrow, one section at a time: Next (and Skip step, when given) until the last, which ends in the save buttons. */
export function NarrowSteps<Id extends string>(props: NarrowStepsProps<Id>) {
  const { sections, current, index, names, failedSections, notice, body, onOpen, saveActions, onSkip } = props;
  const last = index === sections.length - 1;

  return (
    <>
      <StepHeader
        index={index}
        count={sections.length}
        title={names[current.id].name}
        optional={current.optional}
        failed={failedSections.has(current.id)}
        backLabel="Previous section"
        onBack={() => onOpen(sections[Math.max(index - 1, 0)].id)}
      />
      <ScrollView key={current.id} style={styles.fill} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {body}
      </ScrollView>
      <FormFooter notice={notice}>
        <View style={last ? styles.footerStack : styles.footerRow}>
          {last ? (
            saveActions
          ) : (
            <>
              <Button
                mode="contained"
                icon="chevron-right"
                contentStyle={styles.trailingIcon}
                onPress={() => onOpen(sections[index + 1].id)}
                style={styles.fill}
              >
                Next
              </Button>
              {current.optional && onSkip ? (
                <Button mode="text" onPress={onSkip}>
                  Skip step
                </Button>
              ) : null}
            </>
          )}
        </View>
      </FormFooter>
    </>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  split: { flex: 1, flexDirection: 'row', borderTopWidth: 1 },
  sectionList: { width: SECTION_LIST, flexGrow: 0, borderRightWidth: 1 },
  sectionRow: { borderLeftWidth: 3, borderLeftColor: 'transparent' },
  sectionRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.ms,
    paddingVertical: spacing.ms,
    paddingLeft: spacing.ms,
    paddingRight: spacing.ms,
  },
  content: { gap: spacing.md, padding: spacing.md, paddingBottom: spacing.xl },
  footerRow: { flexDirection: 'row', gap: spacing.sm },
  // Three full-width buttons on the last step do not fit a phone-width row, so they stack.
  footerStack: { gap: spacing.sm },
  // row-reverse turns Paper's leading icon slot into the trailing one; flex-end is the LEFT edge on the
  // reversed main axis, so a full-width button's label still starts there (instruction_mds/frontend.md §5).
  trailingIcon: { flexDirection: 'row-reverse', justifyContent: 'flex-end' },
});
