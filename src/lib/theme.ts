import { useTheme } from 'react-native-paper';

import type { LightTheme } from '../themes';

/**
 * The theme's type, Merchant colour keys and added font variants included. themes.js is plain JS, so
 * this is inferred from the object itself — adding a key there is the whole change, with no interface
 * to keep in step. LightTheme and DarkTheme carry the same keys.
 */
type AppTheme = typeof LightTheme;

/**
 * Paper's useTheme() with the Merchant keys typed. Paper types `theme.colors` to MD3's roles only, so
 * `colors.accent` does not compile through the plain hook. A generic, not a type assertion, so it
 * passes .oxlintrc.json (.claude/instruction_mds/frontend.md rule 5).
 */
export const useAppTheme = () => useTheme<AppTheme>();
