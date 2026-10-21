import { useState } from 'react';
import { View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/types';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { InlineAlert } from '@/components/ui/Feedback';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { useCurrentUser, useSetPaymentPin } from '@/features/auth/hooks/useAuthQueries';
import { onlyDigits } from '@/features/payment-methods/utils/card';
import { copy } from '@/i18n/es';
import { toUserMessage } from '@/services/api/error-messages';
import { useTheme } from '@/theme/useTheme';

type Props = NativeStackScreenProps<RootStackParamList, 'PaymentPin'>;

const t = copy.paymentPin;
/** Matches the backend PAYMENT_PIN_PATTERN. */
const PIN_PATTERN = /^\d{4,6}$/;
const MAX_PIN_LENGTH = 6;

export function PaymentPinScreen({ navigation }: Props) {
  const { spacing } = useTheme();
  const user = useCurrentUser();
  const setPin = useSetPaymentPin();
  const [password, setPassword] = useState('');
  const [pin, setPinValue] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const errors = {
    password: submitted && !password ? t.errors.passwordRequired : null,
    pin: submitted && !PIN_PATTERN.test(pin) ? t.errors.pinInvalid : null,
    confirmation: submitted && PIN_PATTERN.test(pin) && confirmation !== pin ? t.errors.mismatch : null,
  };

  const submit = () => {
    setSubmitted(true);
    if (!password || !PIN_PATTERN.test(pin) || confirmation !== pin || setPin.isPending) return;
    setPin.mutate({ currentPassword: password, pin }, { onSuccess: () => navigation.goBack() });
  };

  const apiError = setPin.error ? toUserMessage(setPin.error, { 401: t.errors.wrongPassword }) : null;
  const pinProps = {
    keyboardType: 'number-pad' as const,
    secureTextEntry: true,
    maxLength: MAX_PIN_LENGTH,
    autoComplete: 'off' as const,
  };

  return (
    <Screen
      scroll
      edges={['bottom', 'left', 'right']}
      footer={<Button label={t.submit} onPress={submit} loading={setPin.isPending} />}
    >
      <View style={{ gap: spacing.sm }}>
        <AppText variant="title" accessibilityRole="header">
          {user.data?.hasPaymentPin ? t.changeHeading : t.createHeading}
        </AppText>
        <AppText tone="secondary">{t.description}</AppText>
      </View>

      <View style={{ gap: spacing.lg }}>
        <TextField
          label={t.passwordLabel}
          value={password}
          onChangeText={setPassword}
          error={errors.password}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
        />
        <TextField
          label={t.pinLabel}
          value={pin}
          onChangeText={(text) => setPinValue(onlyDigits(text))}
          error={errors.pin}
          helper={t.pinHelper}
          {...pinProps}
        />
        <TextField
          label={t.confirmLabel}
          value={confirmation}
          onChangeText={(text) => setConfirmation(onlyDigits(text))}
          error={errors.confirmation}
          returnKeyType="done"
          onSubmitEditing={submit}
          {...pinProps}
        />
        {apiError ? <InlineAlert message={apiError} /> : null}
      </View>
    </Screen>
  );
}
