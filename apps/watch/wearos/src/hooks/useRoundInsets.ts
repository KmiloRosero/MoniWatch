import { useWindowDimensions } from 'react-native';
import { layout } from '@/theme/tokens';

/**
 * Insets that keep content inside the visible area of a round display.
 * Square screens simply get a bit more breathing room.
 */
export function useRoundInsets() {
  const { width, height } = useWindowDimensions();
  const size = Math.min(width, height);
  return {
    horizontal: Math.round(size * layout.horizontalInsetRatio),
    vertical: Math.round(size * layout.roundInsetRatio),
  };
}
