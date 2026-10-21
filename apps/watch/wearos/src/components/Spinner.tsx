import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { colors, motion, sizes } from '@/theme/tokens';

const VIEWBOX = 100;
const CENTER = VIEWBOX / 2;
const RADIUS = 42;
const STROKE = 8;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** Visible arc: a quarter of the ring. */
const ARC = CIRCUMFERENCE * 0.25;

/**
 * Brisk constant rotation (linear): a faster spinner reads as a faster payment.
 * With reduced motion it becomes a static track with a soft pulsing arc.
 */
export function Spinner({ accessibilityLabel, color = colors.accent }: { accessibilityLabel: string; color?: string }) {
  const reduceMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    const loop = reduceMotion
      ? Animated.loop(
          Animated.sequence([
            Animated.timing(progress, { toValue: 1, duration: motion.duration.spinnerTurn, useNativeDriver: true }),
            Animated.timing(progress, { toValue: 0, duration: motion.duration.spinnerTurn, useNativeDriver: true }),
          ]),
        )
      : Animated.loop(
          Animated.timing(progress, {
            toValue: 1,
            duration: motion.duration.spinnerTurn,
            easing: motion.easing.linear,
            useNativeDriver: true,
          }),
        );
    loop.start();
    return () => loop.stop();
  }, [progress, reduceMotion]);

  const style = reduceMotion
    ? { opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }
    : { transform: [{ rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] };

  return (
    <Animated.View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      style={[{ width: sizes.spinner, height: sizes.spinner }, style]}
    >
      <Svg width={sizes.spinner} height={sizes.spinner} viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}>
        <Circle cx={CENTER} cy={CENTER} r={RADIUS} stroke={colors.surface} strokeWidth={STROKE} fill="none" />
        <Circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${ARC} ${CIRCUMFERENCE}`}
        />
      </Svg>
    </Animated.View>
  );
}
