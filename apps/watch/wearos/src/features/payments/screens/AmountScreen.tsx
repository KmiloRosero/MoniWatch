import { useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { WatchStackParamList } from '@/app/navigation/types';
import { Chip } from '@/components/Chip';
import { Keypad } from '@/components/Keypad';
import { WatchScreen } from '@/components/WatchScreen';
import { WatchText } from '@/components/WatchText';
import { env } from '@/config/env';
import { usePressScale } from '@/hooks/usePressScale';
import { copy } from '@/i18n/es';
import { haptics } from '@/services/haptics';
import { colors, radii, sizes, spacing } from '@/theme/tokens';
import { formatMoney, formatThousands, toMajorUnits, toMinorUnits } from '@/utils/money';
import { useDeviceSettings } from '../hooks/useWatchData';
import { providerColor } from '../presentation';

type Props = NativeStackScreenProps<WatchStackParamList, 'Amount'>;

const t = copy.amount;
/** Past this many characters the amount switches to the smaller numeral size to stay on one line. */
const LONG_AMOUNT_CHARACTERS = 9;
const DIGIT_BASE = 10;

export function AmountScreen({ navigation, route }: Props) {
  const draft = route.params;
  const settings = useDeviceSettings();
  const [amount, setAmount] = useState(0);

  const deviceLimit =
    settings.data?.maxAmountPerTransaction != null ? toMajorUnits(settings.data.maxAmountPerTransaction) : null;
  const effectiveLimit = Math.min(env.maxKeypadAmount, deviceLimit ?? Number.POSITIVE_INFINITY);
  const quickAmounts = env.quickAmounts.filter((value) => value <= effectiveLimit);
  const isOverLimit = amount > effectiveLimit;
  // Wait for the device settings: they decide whether a PIN is required.
  const canPay = amount > 0 && !isOverLimit && !settings.isPending;
  const formattedAmount = formatMoney(amount);

  const appendDigits = (digits: string) =>
    setAmount((current) => {
      const next = Number(`${current === 0 ? '' : current}${digits}`);
      return next > env.maxKeypadAmount ? current : next;
    });

  const removeDigit = () => setAmount((current) => Math.floor(current / DIGIT_BASE));

  const pay = () => {
    const amountInCents = toMinorUnits(amount);
    const pinThreshold = settings.data?.requirePinAboveInCents ?? null;
    const next = { ...draft, amountInCents };
    if (pinThreshold !== null && amountInCents > pinThreshold) navigation.navigate('Pin', next);
    else navigation.navigate('Processing', next);
  };

  const limitHint =
    deviceLimit !== null ? t.overDeviceLimit(formatMoney(deviceLimit)) : t.overKeypadLimit(formatMoney(env.maxKeypadAmount));

  return (
    <WatchScreen>
      <View style={styles.method}>
        <View style={[styles.dot, { backgroundColor: providerColor(draft.provider) }]} />
        <WatchText variant="caption" tone="secondary" numberOfLines={1}>
          {draft.methodDetail}
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

      {isOverLimit || deviceLimit !== null ? (
        <WatchText variant="caption" tone={isOverLimit ? 'danger' : 'tertiary'} center>
          {limitHint}
        </WatchText>
      ) : null}

      {/* Primary action sits right under the amount: review, then pay. */}
      <Chip
        variant="primary"
        label={amount > 0 ? t.pay(formattedAmount) : t.enterAmount}
        onPress={pay}
        disabled={!canPay}
      />

      {quickAmounts.length > 0 ? (
        <View accessibilityLabel={t.quickAmountsLabel} style={styles.quickRow}>
          {quickAmounts.map((value) => (
            <QuickAmount
              key={value}
              value={value}
              selected={value === amount}
              onPress={() => {
                haptics.tap();
                setAmount(value);
              }}
            />
          ))}
        </View>
      ) : null}

      <Keypad onDigits={appendDigits} onDelete={removeDigit} allowTripleZero />
    </WatchScreen>
  );
}

function QuickAmount({ value, selected, onPress }: { value: number; selected: boolean; onPress: () => void }) {
  const press = usePressScale();
  const thousands = formatThousands(value);
  const fullLabel = formatMoney(value);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      accessibilityRole="button"
      accessibilityLabel={fullLabel}
      accessibilityState={{ selected }}
      style={styles.quickSlot}
    >
      {({ pressed }) => (
        <Animated.View
          style={[
            styles.quick,
            {
              backgroundColor: selected ? colors.accent : pressed ? colors.surfacePressed : colors.surface,
            },
            press.animatedStyle,
          ]}
        >
          <WatchText variant="button" tone={selected ? 'onAccent' : 'primary'} numberOfLines={1} adjustsFontSizeToFit>
            {thousands ? t.quickAmountShort(thousands) : fullLabel}
          </WatchText>
        </Animated.View>
      )}
    </Pressable>
  );
}

const DOT_SIZE = 8;
const QUICK_AMOUNTS_PER_ROW = 3;

const styles = StyleSheet.create({
  method: {
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
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickSlot: {
    flexGrow: 1,
    flexBasis: `${Math.floor(100 / QUICK_AMOUNTS_PER_ROW) - 4}%`,
  },
  quick: {
    height: sizes.minTouchTarget,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
});
