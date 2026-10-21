import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { colors, motion, sizes } from '@/theme/tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

type StatusKind = 'success' | 'error';

const VIEWBOX = 100;
const CENTER = VIEWBOX / 2;
const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Glyph paths drawn inside the ring; lengths are precomputed for the stroke-draw animation. */
const GLYPHS: Record<StatusKind, { paths: string[]; length: number }> = {
  success: { paths: ['M30 51 L44 65 L71 37'], length: 60 },
  error: { paths: ['M36 36 L64 64', 'M64 36 L36 64'], length: 40 },
};

const PALETTE: Record<StatusKind, { stroke: string; fill: string }> = {
  success: { stroke: colors.success, fill: colors.successSubtle },
  error: { stroke: colors.danger, fill: colors.dangerSubtle },
};

/**
 * Large result mark: the ring draws itself, then the glyph strokes in.
 * Rare and meaningful (once per payment), so it earns a little more motion.
 */
interface StatusMarkProps {
  kind: StatusKind;
  accessibilityLabel: string;
  compact?: boolean;
}

export function StatusMark({ kind, accessibilityLabel, compact = false }: StatusMarkProps) {
  const reduceMotion = useReducedMotion();
  const entrance = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const glyph = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      entrance.setValue(1);
      ring.setValue(1);
      glyph.setValue(1);
      return;
    }
    // Stroke offsets are SVG props, which cannot run on the native driver.
    const animation = Animated.parallel([
      Animated.timing(entrance, {
        toValue: 1,
        duration: motion.duration.statusRing,
        easing: motion.easing.out,
        useNativeDriver: true,
      }),
      Animated.timing(ring, {
        toValue: 1,
        duration: motion.duration.statusRing,
        easing: motion.easing.out,
        useNativeDriver: false,
      }),
      // The glyph starts while the ring is still closing, so both read as one gesture.
      Animated.timing(glyph, {
        toValue: 1,
        duration: motion.duration.statusMark,
        delay: motion.statusMarkDelay,
        easing: motion.easing.out,
        useNativeDriver: false,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [kind, reduceMotion, entrance, ring, glyph]);

  const { paths, length } = GLYPHS[kind];
  const palette = PALETTE[kind];
  const size = compact ? sizes.statusMarkCompact : sizes.statusMark;
  const scale = entrance.interpolate({ inputRange: [0, 1], outputRange: [motion.enterScale, 1] });

  return (
    <Animated.View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={[styles.container, { opacity: entrance, transform: [{ scale }] }]}
    >
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}>
          <Circle cx={CENTER} cy={CENTER} r={RADIUS} fill={palette.fill} />
          <AnimatedCircle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            stroke={palette.stroke}
            strokeWidth={sizes.statusStroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={ring.interpolate({ inputRange: [0, 1], outputRange: [CIRCUMFERENCE, 0] })}
            // Start drawing from 12 o'clock.
            transform={`rotate(-90 ${CENTER} ${CENTER})`}
          />
          {paths.map((d) => (
            <AnimatedPath
              key={d}
              d={d}
              stroke={palette.stroke}
              strokeWidth={sizes.statusStroke + 2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              strokeDasharray={length}
              strokeDashoffset={glyph.interpolate({ inputRange: [0, 1], outputRange: [length, 0] })}
            />
          ))}
        </Svg>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
