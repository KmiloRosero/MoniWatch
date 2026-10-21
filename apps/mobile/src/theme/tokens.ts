import { Easing, type TextStyle } from 'react-native';

/**
 * MoniWatch — "lima sobre tinta" (see DESIGN.md).
 * Lime marks where money moves (primary action, success); everything else stays ink/paper.
 */
const lightColors = {
  background: '#F7F8F3',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF0E8',
  border: '#DFE2D6',
  borderStrong: '#C9CEBF',
  textPrimary: '#0A0C08',
  textSecondary: '#5A6052',
  textTertiary: '#878D7D',
  /** Filled primary action. */
  primary: '#C9F45A',
  primaryPressed: '#B5E33B',
  onPrimary: '#0A0C08',
  /** Links, focus rings and selection: lime is unreadable as text on paper, so light mode uses a deep olive. */
  accent: '#3A5600',
  accentPressed: '#2C4200',
  accentSubtle: '#EEF8D2',
  onAccent: '#FFFFFF',
  danger: '#D93A26',
  dangerSubtle: '#FCE9E5',
  success: '#3A7D00',
  successSubtle: '#E8F6D6',
  warning: '#A86A00',
  warningSubtle: '#FBF0DA',
  shadow: '#0A0C08',
};

export type ColorTokens = typeof lightColors;

const darkColors: ColorTokens = {
  background: '#0A0C08',
  surface: '#14170F',
  surfaceMuted: '#1E2218',
  border: '#2B3024',
  borderStrong: '#3A4031',
  textPrimary: '#F2F4EC',
  textSecondary: '#A7AD9C',
  textTertiary: '#737A68',
  primary: '#C9F45A',
  primaryPressed: '#B5E33B',
  onPrimary: '#0A0C08',
  accent: '#C9F45A',
  accentPressed: '#B5E33B',
  accentSubtle: '#253012',
  onAccent: '#0A0C08',
  danger: '#FF6B57',
  dangerSubtle: '#3A1A14',
  success: '#C9F45A',
  successSubtle: '#253012',
  warning: '#F5B83D',
  warningSubtle: '#33270C',
  shadow: '#000000',
};

/** Identity dots only (never fills). */
export const providerColors = {
  NEQUI: '#FF3D9A',
  WOMPI: '#A08CFF',
} as const;

/** Loaded in App.tsx; custom families carry their own weight, so no fontWeight alongside them. */
export const fonts = {
  display: 'SpaceGrotesk_700Bold',
  displayMedium: 'SpaceGrotesk_600SemiBold',
} as const;

/** 4pt scale. Every margin, padding and gap in the app comes from here. */
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const typography = {
  display: { fontFamily: fonts.display, fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },
  title: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  callout: { fontSize: 15, lineHeight: 20, fontWeight: '500' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 0.4 },
  money: { fontFamily: fonts.displayMedium, fontSize: 17, lineHeight: 22, fontVariant: ['tabular-nums'] },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;

export const sizes = {
  controlHeight: 52,
  controlHeightSmall: 36,
  avatar: 44,
} as const;

/**
 * Motion: UI stays under 300ms, ease-out for enter/press feedback,
 * ease-in-out for on-screen movement, only transform/opacity on the native driver.
 */
export const motion = {
  duration: {
    press: 160,
    base: 220,
  },
  easing: {
    out: Easing.bezier(0.23, 1, 0.32, 1),
    inOut: Easing.bezier(0.77, 0, 0.175, 1),
  },
  pressScale: 0.97,
  enterOffset: 8,
  staggerDelay: 40,
  staggerMaxItems: 6,
} as const;

export const lightTheme = { colors: lightColors, spacing, radii, typography, sizes, motion };
export const darkTheme = { colors: darkColors, spacing, radii, typography, sizes, motion };

export type Theme = typeof lightTheme;
