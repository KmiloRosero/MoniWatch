import type { ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { usePressScale } from '@/hooks/usePressScale';
import { useTheme } from '@/theme/useTheme';
import { AppText, type TextTone } from './AppText';

interface ListRowProps {
  title: string;
  subtitle?: string;
  onPress: () => void;
  tone?: TextTone;
  trailing?: ReactNode;
  accessibilityHint?: string;
}

/** Tappable settings row. The whole row is the target; the chevron signals navigation. */
export function ListRow({ title, subtitle, onPress, tone = 'primary', trailing, accessibilityHint }: ListRowProps) {
  const { colors, spacing, radii, sizes } = useTheme();
  const press = usePressScale();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      accessibilityHint={accessibilityHint}
    >
      {({ pressed }) => (
        <Animated.View
          style={[
            styles.row,
            {
              minHeight: sizes.controlHeight + spacing.md,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
              gap: spacing.md,
              borderRadius: radii.lg,
              borderColor: colors.border,
              backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
            },
            press.animatedStyle,
          ]}
        >
          <View style={[styles.text, { gap: spacing.xxs }]}>
            <AppText variant="headline" tone={tone}>
              {title}
            </AppText>
            {subtitle ? (
              <AppText variant="caption" tone="secondary">
                {subtitle}
              </AppText>
            ) : null}
          </View>
          {trailing ?? (
            <AppText variant="title" tone="tertiary" accessibilityElementsHidden importantForAccessibility="no">
              ›
            </AppText>
          )}
        </Animated.View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: {
    flex: 1,
  },
});
