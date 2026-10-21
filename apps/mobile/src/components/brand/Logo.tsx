import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { AppText } from '@/components/ui/AppText';
import { useTheme } from '@/theme/useTheme';

const LIME = '#C9F45A';
const INK = '#0A0C08';
const BRAND_NAME = 'MoniWatch';

/** The MoniWatch mark: a lime coin with a crown (a watch face) and a rounded M. Same geometry as design/brand. */
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size * 1.12} height={size} viewBox="170 170 730 684" accessibilityElementsHidden>
      <Rect x={828} y={468} width={58} height={88} rx={20} fill={LIME} />
      <Circle cx={512} cy={512} r={330} fill={LIME} />
      <Path
        d="M382 640 V392 L512 530 L642 392 V640"
        fill="none"
        stroke={INK}
        strokeWidth={74}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Mark + wordmark lockup for auth screens. */
export function Logo() {
  const { spacing } = useTheme();
  return (
    <View style={[styles.row, { gap: spacing.sm }]} accessible accessibilityRole="header" accessibilityLabel={BRAND_NAME}>
      <LogoMark size={32} />
      <AppText variant="title">{BRAND_NAME}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
