import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInputInstance } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { InlineAlert, StateMessage } from '@/components/ui/Feedback';
import { TextField } from '@/components/ui/TextField';
import { ToggleRow } from '@/components/ui/ToggleRow';
import { copy } from '@/i18n/es';
import type { Merchant } from '@/services/api/types';
import { useTheme } from '@/theme/useTheme';
import { useLinkWompiCard, useWompiCheckout } from '../hooks/usePaymentMethods';
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
import { MerchantPicker } from './MerchantPicker';
import { WompiAcceptance } from './WompiAcceptance';

const t = copy.addPaymentMethod;
/** Wompi rejects card tokens whose holder name is shorter than this. */
const MIN_HOLDER_LENGTH = 5;

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
    holder: !values.holder.trim()
      ? t.errors.holderRequired
      : values.holder.trim().length < MIN_HOLDER_LENGTH
        ? t.errors.holderTooShort
        : null,
    expiry: !expiry ? t.errors.expiryInvalid : !isExpiryInFuture(expiry.month, expiry.year) ? t.errors.expiryPast : null,
    cvc: values.cvc.length === cvcLength(brand) ? null : t.errors.cvcInvalid,
  };
}

const NO_ERRORS = { number: null, holder: null, expiry: null, cvc: null };

interface CardFormProps {
  onLinked: () => void;
  /** The user's payees: a card is registered for exactly one of them. */
  merchants: Merchant[];
  initialMerchantId?: string;
  onAddMerchant: () => void;
}

export function CardForm({ onLinked, merchants, initialMerchantId, onAddMerchant }: CardFormProps) {
  const { spacing } = useTheme();
  const linkCard = useLinkWompiCard();
  const [pickedMerchantId, setMerchantId] = useState<string | null>(initialMerchantId ?? null);
  // With a single payee there is nothing to choose, even if it was added after this form opened.
  const merchantId = pickedMerchantId ?? (merchants.length === 1 ? (merchants[0]?.id ?? null) : null);
  const checkout = useWompiCheckout(merchantId);
  const holderRef = useRef<TextInputInstance>(null);
  const expiryRef = useRef<TextInputInstance>(null);
  const cvcRef = useRef<TextInputInstance>(null);

  const [values, setValues] = useState<CardFormValues>({ numberDigits: '', holder: '', expiry: '', cvc: '' });
  const [alias, setAlias] = useState('');
  const [makeDefault, setMakeDefault] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const brand = detectCardBrand(values.numberDigits);
  const errors = submitted ? validate(values) : NO_ERRORS;
  const update = (patch: Partial<CardFormValues>) => setValues((current) => ({ ...current, ...patch }));
  const acceptance = checkout.data?.acceptance ?? null;
  const acceptanceError = submitted && acceptance && !accepted ? t.errors.acceptanceRequired : null;

  const submit = () => {
    setSubmitted(true);
    const result = validate(values);
    const expiry = parseExpiry(values.expiry);
    if (Object.values(result).some(Boolean) || !expiry || linkCard.isPending || !checkout.data || !merchantId) return;
    if (acceptance && !accepted) return;

    linkCard.mutate(
      {
        number: values.numberDigits,
        cardHolder: values.holder.trim(),
        expMonth: expiry.month,
        expYear: expiry.year,
        cvc: values.cvc,
        alias: alias.trim() || undefined,
        isDefault: makeDefault,
        merchantId,
        checkout: checkout.data,
      },
      { onSuccess: onLinked },
    );
  };

  if (merchants.length === 0) {
    return (
      <StateMessage
        title={t.card.noMerchantsTitle}
        description={t.card.noMerchantsDescription}
        actionLabel={copy.dashboard.addMerchant}
        onAction={onAddMerchant}
      />
    );
  }

  return (
    <View style={{ gap: spacing.lg }}>
      <MerchantPicker
        merchants={merchants}
        selectedId={merchantId}
        onSelect={(id) => {
          setMerchantId(id);
          // Acceptance tokens belong to each merchant's Wompi account.
          setAccepted(false);
        }}
        label={t.card.merchantLabel}
        helper={t.card.merchantHelper}
      />
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
      {acceptance ? (
        <WompiAcceptance acceptance={acceptance} accepted={accepted} onChange={setAccepted} error={acceptanceError} />
      ) : null}
      {checkout.isError ? <InlineAlert message={t.errors.checkoutUnavailable} /> : null}
      {linkCard.error ? <InlineAlert message={linkErrorMessage(linkCard.error)} /> : null}
      {checkout.isError ? (
        <Button label={copy.common.retry} onPress={() => void checkout.refetch()} variant="secondary" />
      ) : (
        <Button
          label={merchantId && checkout.isPending ? t.card.checkoutLoading : t.card.submit}
          onPress={submit}
          loading={linkCard.isPending}
          disabled={!merchantId || checkout.isPending}
        />
      )}
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
