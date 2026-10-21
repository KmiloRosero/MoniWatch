import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { WatchStackParamList } from '@/app/navigation/types';
import { Chip } from '@/components/Chip';
import { Keypad } from '@/components/Keypad';
import { WatchScreen } from '@/components/WatchScreen';
import { WatchText } from '@/components/WatchText';
import { copy } from '@/i18n/es';
import { colors, spacing } from '@/theme/tokens';
import { formatMoney, toMajorUnits } from '@/utils/money';

type Props = NativeStackScreenProps<WatchStackParamList, 'Pin'>;

/** Matches the backend PAYMENT_PIN_PATTERN (4 to 6 digits). */
const MIN_PIN_LENGTH = 4;
const MAX_PIN_LENGTH = 6;

const t = copy.pin;

export function PinScreen({ navigation, route }: Props) {
  const [pin, setPin] = useState('');
  const amountLabel = formatMoney(toMajorUnits(route.params.amountInCents));

  const confirm = () => {
    // replace(): going back from the result lands on the amount, never on a filled PIN pad.
    navigation.replace('Processing', { ...route.params, paymentPin: pin });
  };

  return (
    <WatchScreen>
      <WatchText variant="title" center accessibilityRole="header">
        {t.title}
      </WatchText>
      <WatchText variant="caption" tone="secondary" center>
        {t.subtitle(amountLabel)}
      </WatchText>

      <View
        style={styles.dots}
        accessible
        accessibilityRole="text"
        accessibilityLabel={t.progress(pin.length, MAX_PIN_LENGTH)}
        accessibilityLiveRegion="polite"
      >
        {Array.from({ length: MAX_PIN_LENGTH }, (_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index < pin.length ? styles.dotFilled : styles.dotEmpty,
              // Optional 5th/6th digits are drawn fainter so 4 digits reads as "complete".
              index >= MIN_PIN_LENGTH && index >= pin.length && styles.dotOptional,
            ]}
          />
        ))}
      </View>

      <Chip variant="primary" label={t.confirm} onPress={confirm} disabled={pin.length < MIN_PIN_LENGTH} />

      <Keypad
        onDigits={(digits) => setPin((current) => (current + digits).slice(0, MAX_PIN_LENGTH))}
        onDelete={() => setPin((current) => current.slice(0, -1))}
      />
    </WatchScreen>
  );
}

const DOT_SIZE = 12;

const styles = StyleSheet.create({
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    borderWidth: 2,
  },
  dotFilled: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  dotEmpty: {
    borderColor: colors.textTertiary,
  },
  dotOptional: {
    opacity: 0.4,
  },
});
