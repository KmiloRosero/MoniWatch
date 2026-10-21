import { Text, type TextProps } from 'react-native';
import { useTheme } from '@/theme/useTheme';
import type { ColorTokens, TypographyVariant } from '@/theme/tokens';

export type TextTone = 'primary' | 'secondary' | 'tertiary' | 'accent' | 'danger' | 'success' | 'warning' | 'onAccent';

const TONE_TO_COLOR: Record<TextTone, keyof ColorTokens> = {
  primary: 'textPrimary',
  secondary: 'textSecondary',
  tertiary: 'textTertiary',
  accent: 'accent',
  danger: 'danger',
  success: 'success',
  warning: 'warning',
  onAccent: 'onAccent',
};

interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  tone?: TextTone;
}

export function AppText({ variant = 'body', tone = 'primary', style, ...rest }: AppTextProps) {
  const { colors, typography } = useTheme();
  return <Text {...rest} style={[typography[variant], { color: colors[TONE_TO_COLOR[tone]] }, style]} />;
}
