import { useCallback, useRef } from 'react';
import { Animated } from 'react-native';
import { motion } from '@/theme/tokens';
import { useReducedMotion } from './useReducedMotion';

/** Scale-down on press: the wrist gets instant visual confirmation before any network call. */
export function usePressScale() {
  const reduceMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = useCallback(
    (toValue: number) => {
      Animated.timing(scale, {
        toValue,
        duration: motion.duration.press,
        easing: motion.easing.out,
        useNativeDriver: true,
      }).start();
    },
    [scale],
  );

  const onPressIn = useCallback(() => {
    if (!reduceMotion) animateTo(motion.pressScale);
  }, [animateTo, reduceMotion]);

  const onPressOut = useCallback(() => animateTo(1), [animateTo]);

  return { animatedStyle: { transform: [{ scale }] }, onPressIn, onPressOut };
}
