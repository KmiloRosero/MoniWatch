import { ActivityIndicator, Animated, Pressable, StyleSheet } from 'react-native';
import { usePressScale } from '@/hooks/usePressScale';
import { useTheme } from '@/theme/useTheme';
import { AppText } from './AppText';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'md' | 'sm';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  accessibilityHint,
}: ButtonProps) {
  const { colors, radii, sizes, spacing } = useTheme();
  const press = usePressScale();
  const isDisabled = disabled || loading;

  const palette = {
    primary: { background: colors.primary, pressed: colors.primaryPressed, foreground: colors.onPrimary, border: colors.primary },
    secondary: { background: colors.surface, pressed: colors.surfaceMuted, foreground: colors.textPrimary, border: colors.borderStrong },
    ghost: { background: 'transparent', pressed: colors.accentSubtle, foreground: colors.accent, border: 'transparent' },
    danger: { background: colors.dangerSubtle, pressed: colors.dangerSubtle, foreground: colors.danger, border: 'transparent' },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      hitSlop={size === 'sm' ? spacing.sm : undefined}
    >
      {({ pressed }) => (
        <Animated.View
          style={[
            styles.base,
            {
              height: size === 'md' ? sizes.controlHeight : sizes.controlHeightSmall,
              paddingHorizontal: size === 'md' ? spacing.xl : spacing.md,
              borderRadius: size === 'md' ? radii.md : radii.sm,
              backgroundColor: pressed ? palette.pressed : palette.background,
              borderColor: palette.border,
              opacity: disabled && !loading ? 0.5 : 1,
            },
            press.animatedStyle,
          ]}
        >
          {loading ? (
            <ActivityIndicator color={palette.foreground} />
          ) : (
            <AppText variant={size === 'md' ? 'headline' : 'callout'} style={{ color: palette.foreground }}>
              {label}
            </AppText>
          )}
        </Animated.View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
