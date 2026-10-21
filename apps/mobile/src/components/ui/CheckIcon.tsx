import Svg, { Path } from 'react-native-svg';

interface CheckIconProps {
  size: number;
  color: string;
  /** Stroke width in the 24-unit viewBox. */
  strokeWidth?: number;
}

/** Drawn check: font glyphs (✓) vary by device and never match the brand's rounded strokes. */
export function CheckIcon({ size, color, strokeWidth = 2.5 }: CheckIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">
      <Path
        d="M5 12.5 L10 17.5 L19 7.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
