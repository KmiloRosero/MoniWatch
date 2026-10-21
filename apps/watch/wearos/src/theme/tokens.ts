import { Easing, type TextStyle } from 'react-native';

/**
 * Wrist-first design system.
 * - Pure black canvas: OLED pixels are off, which saves battery.
 * - Color carries meaning only: provider identity, green = approved, red = failed.
 * - Everything is sized for a moving thumb on a ~200dp round screen.
 */
export const colors = {
  background: '#000000',
  surface: '#1C1C1F',
  surfacePressed: '#2C2C31',
  separator: '#2C2C31',
  textPrimary: '#FFFFFF',
  textSecondary: '#A1A1A8',
  textTertiary: '#6E6E76',
  accent: '#5B8CFF',
  accentPressed: '#4A78E8',
  onAccent: '#000000',
  success: '#32D74B',
  successSubtle: 'rgba(50, 215, 75, 0.14)',
  danger: '#FF453A',
  dangerSubtle: 'rgba(255, 69, 58, 0.14)',
  warning: '#FFD60A',
} as const;

/** Identity accents per provider. Replace with the official brand values when brand assets are available. */
export const providerColors = {
  NEQUI: '#FF3D9A',
  WOMPI: '#B18CFF',
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
  amount: { fontSize: 40, lineHeight: 46, fontWeight: '700', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  amountSmall: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  code: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: 4, fontFamily: 'monospace' },
  title: { fontSize: 18, lineHeight: 22, fontWeight: '600' },
  button: { fontSize: 16, lineHeight: 20, fontWeight: '600' },
  key: { fontSize: 22, lineHeight: 26, fontWeight: '500', fontVariant: ['tabular-nums'] },
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
