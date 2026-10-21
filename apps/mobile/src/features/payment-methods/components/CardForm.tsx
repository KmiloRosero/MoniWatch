import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInputInstance } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { InlineAlert } from '@/components/ui/Feedback';
import { TextField } from '@/components/ui/TextField';
import { ToggleRow } from '@/components/ui/ToggleRow';
import { copy } from '@/i18n/es';
import { useTheme } from '@/theme/useTheme';
import { useLinkWompiCard } from '../hooks/usePaymentMethods';
import {
  cvcLength,
  detectCardBrand,
  formatCardNumber,
  formatExpiryInput,
  isExpiryInFuture,
  isValidLuhn,
  MAX_CARD_LENGTH,
  onlyDigits,
  parseExpiry,
} from '../utils/card';
import { cardBrandName, linkErrorMessage } from '../utils/presentation';

const t = copy.addPaymentMethod;

interface CardFormValues {
  numberDigits: string;
  holder: string;
  expiry: string;
  cvc: string;
}

function validate(values: CardFormValues) {
  const brand = detectCardBrand(values.numberDigits);
  const expiry = parseExpiry(values.expiry);
  return {
    number: isValidLuhn(values.numberDigits) ? null : t.errors.cardNumberInvalid,
    holder: values.holder.trim() ? null : t.errors.holderRequired,
    expiry: !expiry ? t.errors.expiryInvalid : !isExpiryInFuture(expiry.month, expiry.year) ? t.errors.expiryPast : null,
    cvc: values.cvc.length === cvcLength(brand) ? null : t.errors.cvcInvalid,
  };
}

const NO_ERRORS = { number: null, holder: null, expiry: null, cvc: null };

export function CardForm({ onLinked }: { onLinked: () => void }) {
  const { spacing } = useTheme();
  const linkCard = useLinkWompiCard();
  const holderRef = useRef<TextInputInstance>(null);
  const expiryRef = useRef<TextInputInstance>(null);
  const cvcRef = useRef<TextInputInstance>(null);

  const [values, setValues] = useState<CardFormValues>({ numberDigits: '', holder: '', expiry: '', cvc: '' });
  const [alias, setAlias] = useState('');
  const [makeDefault, setMakeDefault] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const brand = detectCardBrand(values.numberDigits);
  const errors = submitted ? validate(values) : NO_ERRORS;
  const update = (patch: Partial<CardFormValues>) => setValues((current) => ({ ...current, ...patch }));

  const submit = () => {
    setSubmitted(true);
    const result = validate(values);
    const expiry = parseExpiry(values.expiry);
    if (Object.values(result).some(Boolean) || !expiry || linkCard.isPending) return;

    linkCard.mutate(
      {
        number: values.numberDigits,
        cardHolder: values.holder.trim(),
        expMonth: expiry.month,
        expYear: expiry.year,
        cvc: values.cvc,
        alias: alias.trim() || undefined,
        isDefault: makeDefault,
      },
      { onSuccess: onLinked },
    );
  };

  return (
    <View style={{ gap: spacing.lg }}>
      <TextField
        label={t.card.numberLabel}
        placeholder={t.card.numberPlaceholder}
        value={formatCardNumber(values.numberDigits)}
        onChangeText={(value) => update({ numberDigits: onlyDigits(value).slice(0, MAX_CARD_LENGTH) })}
        error={errors.number}
        keyboardType="number-pad"
        autoComplete="cc-number"
        textContentType="creditCardNumber"
        returnKeyType="next"
        onSubmitEditing={() => holderRef.current?.focus()}
        trailing={
          brand ? (
            <AppText variant="label" tone="secondary">
              {cardBrandName(brand)}
            </AppText>
          ) : null
        }
      />
      <TextField
        ref={holderRef}
        label={t.card.holderLabel}
        placeholder={t.card.holderPlaceholder}
        value={values.holder}
        onChangeText={(holder) => update({ holder })}
        error={errors.holder}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="cc-name"
        textContentType="name"
        returnKeyType="next"
        onSubmitEditing={() => expiryRef.current?.focus()}
      />
      <View style={[styles.row, { gap: spacing.md }]}>
        <View style={styles.flex}>
          <TextField
            ref={expiryRef}
            label={t.card.expiryLabel}
            placeholder={t.card.expiryPlaceholder}
            value={values.expiry}
            onChangeText={(value) => update({ expiry: formatExpiryInput(value) })}
            error={errors.expiry}
            keyboardType="number-pad"
            autoComplete="cc-exp"
            returnKeyType="next"
            onSubmitEditing={() => cvcRef.current?.focus()}
          />
        </View>
        <View style={styles.flex}>
          <TextField
            ref={cvcRef}
            label={t.card.cvcLabel}
            placeholder={t.card.cvcPlaceholder}
            value={values.cvc}
            onChangeText={(value) => update({ cvc: onlyDigits(value).slice(0, cvcLength(brand)) })}
            error={errors.cvc}
            keyboardType="number-pad"
            autoComplete="cc-csc"
            secureTextEntry
          />
        </View>
      </View>
      <TextField
        label={t.aliasLabel}
        placeholder={t.cardAliasPlaceholder}
        value={alias}
        onChangeText={setAlias}
        maxLength={50}
        returnKeyType="done"
      />
      <ToggleRow label={t.defaultToggle} value={makeDefault} onValueChange={setMakeDefault} />
      <AppText variant="caption" tone="tertiary">
        {t.card.securityNote}
      </AppText>
      {linkCard.error ? <InlineAlert message={linkErrorMessage(linkCard.error)} /> : null}
      <Button label={t.card.submit} onPress={submit} loading={linkCard.isPending} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  flex: {
    flex: 1,
  },
});
