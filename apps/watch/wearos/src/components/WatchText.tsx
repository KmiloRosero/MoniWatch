import { Text, type TextProps } from 'react-native';
import { colors, typography, type TypographyVariant } from '@/theme/tokens';

export type WatchTextTone = 'primary' | 'secondary' | 'tertiary' | 'accent' | 'success' | 'danger' | 'warning' | 'onAccent';

const TONE_COLORS: Record<WatchTextTone, string> = {
  primary: colors.textPrimary,
  secondary: colors.textSecondary,
  tertiary: colors.textTertiary,
  accent: colors.accent,
  success: colors.success,
  danger: colors.danger,
  warning: colors.warning,
  onAccent: colors.onAccent,
};

interface WatchTextProps extends TextProps {
  variant?: TypographyVariant;
  tone?: WatchTextTone;
  center?: boolean;
}

export function WatchText({ variant = 'body', tone = 'primary', center = false, style, ...rest }: WatchTextProps) {
  return (
    <Text
      maxFontSizeMultiplier={1.3}
      {...rest}
      style={[typography[variant], { color: TONE_COLORS[tone] }, center && { textAlign: 'center' }, style]}
    />
  );
}
