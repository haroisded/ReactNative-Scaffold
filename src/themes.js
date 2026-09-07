// styles/theme.js
import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

const lightColors = {
  primary: "#1E293B",
  onPrimary: "#FFFFFF",
  primaryContainer: "#DDE4EE",
  onPrimaryContainer: "#151E2C",
  secondary: "#475569",
  onSecondary: "#FFFFFF",
  secondaryContainer: "#E2E8F0",
  onSecondaryContainer: "#2B3646",
  tertiary: "#5A6B85",
  onTertiary: "#FFFFFF",
  tertiaryContainer: "#E4EBF5",
  onTertiaryContainer: "#3B4759",
  error: "#BA1A1A",
  onError: "#FFFFFF",
  errorContainer: "#FFDAD6",
  onErrorContainer: "#93000A",
  background: "#FFFFFF",
  onBackground: "#1E293B",
  surface: "#FFFFFF",
  onSurface: "#1E293B",
  surfaceVariant: "#E2E8F0",
  onSurfaceVariant: "#4A5768",
  outline: "#7C8898",
  outlineVariant: "#CBD5E1",
  shadow: "#000000",
  scrim: "#000000",
  inverseSurface: "#2F3B4B",
  inverseOnSurface: "#F1F5F9",
  inversePrimary: "#AEC3E0",
  surfaceDisabled: "rgba(30, 41, 59, 0.12)",
  onSurfaceDisabled: "rgba(30, 41, 59, 0.38)",
  backdrop: "rgba(45, 55, 72, 0.4)",
  elevation: {
    level0: "transparent",
    level1: "#F6F8FB",
    level2: "#F1F4F9",
    level3: "#EBEFF6",
    level4: "#E8EDF4",
    level5: "#E4EAF2",
  },
};



const darkColors = {
  primary: "#AEC3E0",
  onPrimary: "#1B2637",
  primaryContainer: "#33415A",
  onPrimaryContainer: "#DDE4EE",
  secondary: "#BDC7D6",
  onSecondary: "#29323F",
  secondaryContainer: "#3F4959",
  onSecondaryContainer: "#E2E8F0",
  tertiary: "#BCC9DE",
  onTertiary: "#2A3646",
  tertiaryContainer: "#42506A",
  onTertiaryContainer: "#E4EBF5",
  error: "#FFB4AB",
  onError: "#690005",
  errorContainer: "#93000A",
  onErrorContainer: "#FFDAD6",
  background: "#111721",
  onBackground: "#E1E7EF",
  surface: "#111721",
  onSurface: "#E1E7EF",
  surfaceVariant: "#414B59",
  onSurfaceVariant: "#C3CCDA",
  outline: "#8D97A6",
  outlineVariant: "#414B59",
  shadow: "#000000",
  scrim: "#000000",
  inverseSurface: "#E1E7EF",
  inverseOnSurface: "#2F3B4B",
  inversePrimary: "#1E293B",
  surfaceDisabled: "rgba(225, 231, 239, 0.12)",
  onSurfaceDisabled: "rgba(225, 231, 239, 0.38)",
  backdrop: "rgba(45, 55, 72, 0.4)",
  elevation: {
    level0: "transparent",
    level1: "#1A212C",
    level2: "#1E2632",
    level3: "#232B38",
    level4: "#252D3A",
    level5: "#29323F",
  },
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