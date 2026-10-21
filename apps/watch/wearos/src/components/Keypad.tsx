import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { usePressScale } from '@/hooks/usePressScale';
import { copy } from '@/i18n/es';
import { haptics } from '@/services/haptics';
import { colors, radii, sizes, spacing } from '@/theme/tokens';
import { WatchText } from './WatchText';

const DIGIT_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
] as const;

const TRIPLE_ZERO = '000';

interface KeypadProps {
  onDigits: (digits: string) => void;
  onDelete: () => void;
  /** Adds a "000" key: amounts in pesos are almost always whole thousands. */
  allowTripleZero?: boolean;
}

export function Keypad({ onDigits, onDelete, allowTripleZero = false }: KeypadProps) {
  const press = (digits: string) => {
    haptics.tap();
    onDigits(digits);
  };

  return (
    <View accessibilityLabel={copy.amount.keypadLabel} style={styles.grid}>
      {DIGIT_ROWS.map((row) => (
        <View key={row.join('')} style={styles.row}>
          {row.map((digit) => (
            <Key key={digit} label={digit} onPress={() => press(digit)} />
          ))}
        </View>
      ))}
      <View style={styles.row}>
        {allowTripleZero ? (
          <Key label={TRIPLE_ZERO} accessibilityLabel={copy.amount.tripleZero} onPress={() => press(TRIPLE_ZERO)} />
        ) : (
          <View style={styles.keySlot} />
        )}
        <Key label="0" onPress={() => press('0')} />
        <Key
          label="⌫"
          accessibilityLabel={copy.amount.delete}
          onPress={() => {
            haptics.tap();
            onDelete();
          }}
          muted
        />
      </View>
    </View>
  );
}

interface KeyProps {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  muted?: boolean;
}

function Key({ label, onPress, accessibilityLabel, muted = false }: KeyProps) {
  const scale = usePressScale();
  return (
    <Pressable
      onPress={onPress}
      onPressIn={scale.onPressIn}
      onPressOut={scale.onPressOut}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={styles.keySlot}
    >
      {({ pressed }) => (
        <Animated.View
          style={[
            styles.key,
            { backgroundColor: pressed ? colors.surfacePressed : muted ? colors.background : colors.surface },
            scale.animatedStyle,
          ]}
        >
          <WatchText variant="key" tone={muted ? 'secondary' : 'primary'}>
            {label}
          </WatchText>
        </Animated.View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  keySlot: {
    flex: 1,
  },
  key: {
    height: sizes.keyHeight,
    minWidth: sizes.minTouchTarget,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
