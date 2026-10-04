import type { ComponentProps } from 'react';
import type { TextProps } from 'react-native';
import { customText } from 'react-native-paper';

// The Cap and iOS ramp columns of instruction_mds/frontend.md §3.1, one row per variant the app
// uses. Scanned and hero text caps at 1.5; body text is read, so it is never capped. Change a row
// there → change it here, same pass. The variants Paper defines and §3.1 leaves out
// (displayLarge, displayMedium, headlineLarge) have no row, so they do not type-check at a call site.
const SCALE = {
  displaySmall: { cap: 1.5, ramp: 'largeTitle' },
  headlineMedium: { cap: 1.5, ramp: 'title1' },
  headlineSmall: { cap: 1.5, ramp: 'title2' },
  titleLarge: { cap: 1.5, ramp: 'title3' },
  amount: { cap: 1.5, ramp: 'title3' },
  titleMedium: { cap: 1.5, ramp: 'headline' },
  titleSmall: { cap: 1.5, ramp: 'subheadline' },
  bodyLarge: { cap: undefined, ramp: 'body' },
  bodyMedium: { cap: undefined, ramp: 'body' },
  bodySmall: { cap: undefined, ramp: 'footnote' },
  labelLarge: { cap: 1.5, ramp: 'subheadline' },
  labelMedium: { cap: 1.5, ramp: 'caption1' },
  labelSmall: { cap: 1.5, ramp: 'caption2' },
} satisfies Record<string, { cap: number | undefined; ramp: TextProps['dynamicTypeRamp'] }>;

// Paper's own Text, typed to the variants above — `amount` included, which is the theme's custom
// key. customText is a cast of the same component (Text.tsx:185), not a second primitive
// (instruction_mds/frontend.md rule 1).
const PaperText = customText<keyof typeof SCALE>();

/**
 * The one Text (instruction_mds/frontend.md §3.2). A call site passes `variant` only; the font-scale
 * cap and the iOS Dynamic Type ramp come from the variant, after the caller's props, so no call site
 * can set its own.
 */
export function Text(props: Omit<ComponentProps<typeof PaperText>, 'variant'> & { variant?: keyof typeof SCALE }) {
  const scale = props.variant ? SCALE[props.variant] : undefined;
  return <PaperText {...props} maxFontSizeMultiplier={scale?.cap} dynamicTypeRamp={scale?.ramp} />;
}
