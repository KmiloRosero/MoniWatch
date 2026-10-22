import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { WatchStackParamList } from '@/app/navigation/types';
import { Chip } from '@/components/Chip';
import { Keypad } from '@/components/Keypad';
import { WatchScreen } from '@/components/WatchScreen';
import { WatchText } from '@/components/WatchText';
import { env } from '@/config/env';
import { copy } from '@/i18n/es';
import { spacing } from '@/theme/tokens';
import { formatMoney, toMajorUnits, toMinorUnits } from '@/utils/money';
import { useDeviceSettings } from '../hooks/useWatchData';
import { providerColor } from '../presentation';

type Props = NativeStackScreenProps<WatchStackParamList, 'Amount'>;

const t = copy.amount;
/** Past this many characters the amount switches to the smaller numeral size to stay on one line. */
const LONG_AMOUNT_CHARACTERS = 9;
const DIGIT_BASE = 10;

/**
 * Any amount, typed on a keypad that starts right under the number (scroll or rotary for the
 * last row and "Continuar"). Nothing is charged here: the next screen is a confirmation.
 */
export function AmountScreen({ navigation, route }: Props) {
  const draft = route.params;
  const settings = useDeviceSettings();
  const [amount, setAmount] = useState(0);

  const deviceLimit =
    settings.data?.maxAmountPerTransaction != null ? toMajorUnits(settings.data.maxAmountPerTransaction) : null;
  const effectiveLimit = Math.min(env.maxKeypadAmount, deviceLimit ?? Number.POSITIVE_INFINITY);
  const isOverLimit = amount > effectiveLimit;
  const canContinue = amount > 0 && !isOverLimit;
  const formattedAmount = formatMoney(amount);

  const appendDigits = (digits: string) =>
    setAmount((current) => {
      const next = Number(`${current === 0 ? '' : current}${digits}`);
      return next > env.maxKeypadAmount ? current : next;
    });

  const removeDigit = () => setAmount((current) => Math.floor(current / DIGIT_BASE));

  const limitHint =
    deviceLimit !== null ? t.overDeviceLimit(formatMoney(deviceLimit)) : t.overKeypadLimit(formatMoney(env.maxKeypadAmount));

  return (
    <WatchScreen>
      <View style={styles.payee}>
        <View style={[styles.dot, { backgroundColor: providerColor(draft.provider) }]} />
        <WatchText variant="caption" tone="secondary" numberOfLines={1}>
          {t.payee(draft.merchantName)}
        </WatchText>
      </View>

      <WatchText
        variant={formattedAmount.length > LONG_AMOUNT_CHARACTERS ? 'amountSmall' : 'amount'}
        tone={amount === 0 ? 'tertiary' : 'primary'}
        center
        numberOfLines={1}
        adjustsFontSizeToFit
        accessibilityLiveRegion="polite"
      >
        {formattedAmount}
      </WatchText>

      {isOverLimit ? (
        <WatchText variant="caption" tone="danger" center>
          {limitHint}
        </WatchText>
      ) : null}

      <Keypad onDigits={appendDigits} onDelete={removeDigit} allowTripleZero />

      <Chip
        variant="primary"
        label={amount > 0 ? t.continue : t.enterAmount}
        onPress={() => navigation.navigate('Confirm', { ...draft, amountInCents: toMinorUnits(amount) })}
        disabled={!canContinue}
      />
    </WatchScreen>
  );
}

const DOT_SIZE = 8;

const styles = StyleSheet.create({
  payee: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
});
