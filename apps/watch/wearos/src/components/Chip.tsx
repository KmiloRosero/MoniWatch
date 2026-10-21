import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { usePressScale } from '@/hooks/usePressScale';
import { colors, radii, sizes, spacing } from '@/theme/tokens';
import { WatchText } from './WatchText';

type ChipVariant = 'primary' | 'surface';

interface ChipProps {
  label: string;
  onPress: () => void;
  secondaryLabel?: string;
  /** Identity color shown as a leading dot (provider). */
  accentColor?: string;
  variant?: ChipVariant;
  disabled?: boolean;
  accessibilityHint?: string;
}

/** Full-width pill: the primary touch target on the wrist (≥56dp tall). */
export function Chip({
  label,
  onPress,
  secondaryLabel,
  accentColor,
  variant = 'surface',
  disabled = false,
  accessibilityHint,
}: ChipProps) {
  const press = usePressScale();
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={secondaryLabel ? `${label}, ${secondaryLabel}` : label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
    >
      {({ pressed }) => (
        <Animated.View
          style={[
            styles.chip,
            {
              backgroundColor: isPrimary
                ? pressed
                  ? colors.accentPressed
                  : colors.accent
                : pressed
                  ? colors.surfacePressed
                  : colors.surface,
              opacity: disabled ? 0.4 : 1,
              justifyContent: accentColor ? 'flex-start' : 'center',
            },
            press.animatedStyle,
          ]}
        >
          {accentColor ? <View style={[styles.dot, { backgroundColor: accentColor }]} /> : null}
          <View style={accentColor ? styles.labels : styles.labelsCentered}>
            <WatchText variant="button" tone={isPrimary ? 'onAccent' : 'primary'} numberOfLines={1}>
              {label}
            </WatchText>
            {secondaryLabel ? (
              <WatchText variant="caption" tone={isPrimary ? 'onAccent' : 'secondary'} numberOfLines={1}>
                {secondaryLabel}
              </WatchText>
            ) : null}
          </View>
        </Animated.View>
      )}
    </Pressable>
  );
}

const DOT_SIZE = 12;

const styles = StyleSheet.create({
  chip: {
    minHeight: sizes.chipHeight,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  labels: {
    flex: 1,
    gap: spacing.xxs,
  },
  labelsCentered: {
    alignItems: 'center',
    gap: spacing.xxs,
  },
});
