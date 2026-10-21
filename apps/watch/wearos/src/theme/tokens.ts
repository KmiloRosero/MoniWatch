import { Easing, type TextStyle } from 'react-native';

/**
 * MoniWatch wrist design system (see DESIGN.md).
 * - Pure black canvas: OLED pixels are off, which saves battery.
 * - Color carries meaning only: lime = pay / approved, red = failed, provider dots = identity.
 * - Everything is sized for a moving thumb on a ~200dp round screen.
 */
export const colors = {
  background: '#000000',
  surface: '#16190F',
  surfacePressed: '#252A1B',
  separator: '#252A1B',
  textPrimary: '#F4F6EE',
  textSecondary: '#A7AD9C',
  textTertiary: '#6F7566',
  /** Moni Lime: the pay action and the "money moved" confirmation (see DESIGN.md). */
  accent: '#C9F45A',
  accentPressed: '#B5E33B',
  onAccent: '#0A0C08',
  success: '#C9F45A',
  successSubtle: 'rgba(201, 244, 90, 0.14)',
  danger: '#FF5F4A',
  dangerSubtle: 'rgba(255, 95, 74, 0.14)',
  warning: '#F5B83D',
} as const;

/** Identity dots only: provider colors never fill a surface. */
export const providerColors = {
  NEQUI: '#FF3D9A',
  WOMPI: '#A08CFF',
} as const;

/** Loaded in App.tsx; custom families carry their own weight. */
export const fonts = {
  display: 'SpaceGrotesk_700Bold',
  displayMedium: 'SpaceGrotesk_600SemiBold',
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
} as const;

export const radii = {
  md: 16,
  pill: 999,
} as const;

export const sizes = {
  /** Wear OS minimum touch target. */
  minTouchTarget: 48,
  /** Full-width chips (Wear OS "chip" pattern). */
  chipHeight: 56,
  keyHeight: 48,
  statusMark: 92,
  /** Error results share the screen with actions, so their mark gives up space. */
  statusMarkCompact: 56,
  statusStroke: 6,
  spinner: 56,
} as const;

/**
 * Content must survive a round screen. The square inscribed in a circle leaves
 * (1 - 1/√2) / 2 ≈ 14.6% on each side; first and last elements use it vertically.
 */
export const layout = {
  roundInsetRatio: 0.146,
  horizontalInsetRatio: 0.07,
} as const;

export const typography = {
  amount: { fontFamily: fonts.display, fontSize: 40, lineHeight: 46, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  amountSmall: { fontFamily: fonts.display, fontSize: 30, lineHeight: 36, letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  code: { fontFamily: fonts.display, fontSize: 30, lineHeight: 36, letterSpacing: 5 },
  title: { fontFamily: fonts.displayMedium, fontSize: 18, lineHeight: 22 },
  button: { fontSize: 16, lineHeight: 20, fontWeight: '600' },
  key: { fontFamily: fonts.displayMedium, fontSize: 22, lineHeight: 26, fontVariant: ['tabular-nums'] },
  body: { fontSize: 14, lineHeight: 19, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;

/** Short and decisive on the wrist: feedback under 300ms, celebration slightly longer. */
export const motion = {
  duration: {
    press: 120,
    enter: 220,
    statusRing: 280,
    statusMark: 260,
    spinnerTurn: 900,
  },
  easing: {
    out: Easing.bezier(0.23, 1, 0.32, 1),
    inOut: Easing.bezier(0.77, 0, 0.175, 1),
    linear: Easing.linear,
  },
  pressScale: 0.96,
  enterScale: 0.92,
  statusMarkDelay: 140,
} as const;
