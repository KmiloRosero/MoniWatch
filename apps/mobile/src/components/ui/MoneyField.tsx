import { onlyDigits } from '@/features/payment-methods/utils/card';
import { formatAmountInput } from '@/utils/format';
import { AppText } from './AppText';
import { TextField } from './TextField';

const MAX_AMOUNT_DIGITS = 12;
const CURRENCY_SYMBOL = '$';

interface MoneyFieldProps {
  label: string;
  /** Whole currency units as digits ("500000"); empty means "no value". */
  value: string;
  onChange: (digits: string) => void;
  error?: string | null;
  helper?: string;
}

/** Amount input in whole pesos with live thousands separators. */
export function MoneyField({ label, value, onChange, error, helper }: MoneyFieldProps) {
  return (
    <TextField
      label={label}
      value={formatAmountInput(value)}
      onChangeText={(text) => onChange(onlyDigits(text).replace(/^0+(?=\d)/, '').slice(0, MAX_AMOUNT_DIGITS))}
      error={error}
      helper={helper}
      keyboardType="number-pad"
      leading={<AppText tone="secondary">{CURRENCY_SYMBOL}</AppText>}
    />
  );
}
