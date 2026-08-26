// styles/theme.js
import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

const lightColors = {
  primary: "#8F4C38",
  onPrimary: "#FFFFFF",
  primaryContainer: "#FFDBD1",
  onPrimaryContainer: "#723523",
  secondary: "#77574E",
  onSecondary: "#FFFFFF",
  secondaryContainer: "#FFDBD1",
  onSecondaryContainer: "#5D4037",
  tertiary: "#6C5D2F",
  onTertiary: "#FFFFFF",
  tertiaryContainer: "#F5E1A7",
  onTertiaryContainer: "#534619",
  error: "#BA1A1A",
  onError: "#FFFFFF",
  errorContainer: "#FFDAD6",
  onErrorContainer: "#93000A",
  background: "#FFF8F6",
  onBackground: "#231917",
  surface: "#FFF8F6",
  onSurface: "#231917",
  surfaceVariant: "#F5DED8",
  onSurfaceVariant: "#53433F",
  outline: "#85736E",
  outlineVariant: "#D8C2BC",
  shadow: "#000000",
  scrim: "#000000",
  inverseSurface: "#392E2B",
  inverseOnSurface: "#FFEDE8",
  inversePrimary: "#FFB5A0",
  surfaceDisabled: "rgba(35, 25, 23, 0.12)",
  onSurfaceDisabled: "rgba(35, 25, 23, 0.38)",
  backdrop: "rgba(83, 67, 63, 0.4)",
};



const darkColors = {
  primary: "#FFB5A0",
  onPrimary: "#561F0F",
  primaryContainer: "#723523",
  onPrimaryContainer: "#FFDBD1",
  secondary: "#E7BDB2",
  onSecondary: "#442A22",
  secondaryContainer: "#5D4037",
  onSecondaryContainer: "#FFDBD1",
  tertiary: "#D8C58D",
  onTertiary: "#3B2F05",
  tertiaryContainer: "#534619",
  onTertiaryContainer: "#F5E1A7",
  error: "#FFB4AB",
  onError: "#690005",
  errorContainer: "#93000A",
  onErrorContainer: "#FFDAD6",
  background: "#1A110F",
  onBackground: "#F1DFDA",
  surface: "#1A110F",
  onSurface: "#F1DFDA",
  surfaceVariant: "#53433F",
  onSurfaceVariant: "#D8C2BC",
  outline: "#A08C87",
  outlineVariant: "#53433F",
  shadow: "#000000",
  scrim: "#000000",
  inverseSurface: "#F1DFDA",
  inverseOnSurface: "#392E2B",
  inversePrimary: "#8F4C38",
  surfaceDisabled: "rgba(241, 223, 218, 0.12)",
  onSurfaceDisabled: "rgba(241, 223, 218, 0.38)",
  backdrop: "rgba(83, 67, 63, 0.4)",
};



export const LightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...lightColors,
  },
};



export const DarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    ...darkColors,
  },
};
