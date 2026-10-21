import { Easing, type TextStyle } from 'react-native';

const lightColors = {
  background: '#F7F7F8',
  surface: '#FFFFFF',
  surfaceMuted: '#F0F1F3',
  border: '#E4E5E9',
  borderStrong: '#CDD0D6',
  textPrimary: '#101114',
  textSecondary: '#5C6170',
  textTertiary: '#8B909C',
  accent: '#3355FF',
  accentPressed: '#2443D9',
  accentSubtle: '#EBEFFF',
  onAccent: '#FFFFFF',
  danger: '#D92D20',
  dangerSubtle: '#FDECEA',
  success: '#0F9F5F',
  successSubtle: '#E7F6EE',
  warning: '#B54708',
  warningSubtle: '#FEF3E6',
  shadow: '#101114',
};

export type ColorTokens = typeof lightColors;

const darkColors: ColorTokens = {
  background: '#0C0D10',
  surface: '#16181D',
  surfaceMuted: '#1E2128',
  border: '#2A2D35',
  borderStrong: '#3A3E48',
  textPrimary: '#F3F4F6',
  textSecondary: '#A3A8B4',
  textTertiary: '#737885',
  accent: '#7C93FF',
  accentPressed: '#6A82F5',
  accentSubtle: '#1C2340',
  onAccent: '#0C0D10',
  danger: '#F97066',
  dangerSubtle: '#3A1A18',
  success: '#47CD89',
  successSubtle: '#13291E',
  warning: '#FDB022',
  warningSubtle: '#33240B',
  shadow: '#000000',
};

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
  display: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.4 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '600', letterSpacing: -0.2 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  callout: { fontSize: 15, lineHeight: 20, fontWeight: '500' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  label: { fontSize: 13, lineHeight: 16, fontWeight: '600', letterSpacing: 0.2 },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;

export const sizes = {
  controlHeight: 52,
  controlHeightSmall: 36,
  avatar: 44,
} as const;

/**
 * Motion follows the design-engineering rules: UI stays under 300ms,
 * ease-out for enter/press feedback, ease-in-out for on-screen movement,
 * and only transform/opacity are animated (native driver).
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
