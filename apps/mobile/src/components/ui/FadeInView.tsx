import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { motion } from '@/theme/tokens';

interface FadeInViewProps {
  /** Position in a list; drives a short, capped stagger. */
  index?: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

/** Enter animation: opacity + small rise, ease-out. Reduced motion keeps only the fade. */
export function FadeInView({ index = 0, style, children }: FadeInViewProps) {
  const reduceMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: motion.duration.base,
      delay: Math.min(index, motion.staggerMaxItems) * motion.staggerDelay,
      easing: motion.easing.out,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [index, progress]);

  const translateY = reduceMotion
    ? 0
    : progress.interpolate({ inputRange: [0, 1], outputRange: [motion.enterOffset, 0] });

  return <Animated.View style={[style, { opacity: progress, transform: [{ translateY }] }]}>{children}</Animated.View>;
}
