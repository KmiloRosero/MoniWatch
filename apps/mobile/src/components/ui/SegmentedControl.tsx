import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useTheme } from '@/theme/useTheme';
import { AppText } from './AppText';

interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: ReadonlyArray<SegmentOption<T>>;
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: SegmentedControlProps<T>) {
  const { colors, spacing, radii, sizes, motion } = useTheme();
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

  const inset = spacing.xs;
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const segmentWidth = width > 0 ? (width - inset * 2) / options.length : 0;

  useEffect(() => {
    const toValue = selectedIndex * segmentWidth;
    if (reduceMotion || segmentWidth === 0) {
      translateX.setValue(toValue);
      return;
    }
    // The indicator moves across the screen, so it uses ease-in-out.
    const animation = Animated.timing(translateX, {
      toValue,
      duration: motion.duration.base,
      easing: motion.easing.inOut,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [selectedIndex, segmentWidth, reduceMotion, translateX, motion]);

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={[
        styles.container,
        { padding: inset, borderRadius: radii.md, backgroundColor: colors.surfaceMuted, height: sizes.controlHeight - spacing.xs },
      ]}
    >
      {segmentWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.indicator,
            {
              top: inset,
              bottom: inset,
              left: inset,
              width: segmentWidth,
              borderRadius: radii.sm,
              backgroundColor: colors.surface,
              shadowColor: colors.shadow,
              transform: [{ translateX }],
            },
          ]}
        />
      ) : null}
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={styles.segment}
          >
            <AppText variant="callout" tone={selected ? 'primary' : 'secondary'}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  indicator: {
    position: 'absolute',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
