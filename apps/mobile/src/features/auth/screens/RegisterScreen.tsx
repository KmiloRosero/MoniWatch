import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/types';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { InlineAlert } from '@/components/ui/Feedback';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TextField } from '@/components/ui/TextField';
import { env } from '@/config/env';
import { onlyDigits } from '@/features/payment-methods/utils/card';
import { formatLocalMobile, isValidLocalMobile, LOCAL_MOBILE_LENGTH, toE164 } from '@/features/payment-methods/utils/phone';
import { copy } from '@/i18n/es';
import { toUserMessage } from '@/services/api/error-messages';
import { useTheme } from '@/theme/useTheme';
import { useRegister } from '../hooks/useAuthQueries';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;
type PersonalDocumentType = 'CC' | 'CE' | 'PP';

const t = copy.register;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOCUMENT_NUMBER_PATTERN = /^[A-Za-z0-9]{4,20}$/;
const MIN_PASSWORD_LENGTH = 8;

const DOCUMENT_OPTIONS = [
  { value: 'CC', label: t.documentTypes.CC },
  { value: 'CE', label: t.documentTypes.CE },
  { value: 'PP', label: t.documentTypes.PP },
] as const satisfies ReadonlyArray<{ value: PersonalDocumentType; label: string }>;

interface FormValues {
  firstName: string;
  lastName: string;
  email: string;
  phoneDigits: string;
  documentType: PersonalDocumentType;
  documentNumber: string;
  password: string;
}

function validate(values: FormValues) {
  const email = values.email.trim();
  return {
    firstName: values.firstName.trim() ? null : t.errors.required,
    lastName: values.lastName.trim() ? null : t.errors.required,
    email: !email ? t.errors.required : EMAIL_PATTERN.test(email) ? null : t.errors.emailInvalid,
    phone: isValidLocalMobile(values.phoneDigits) ? null : t.errors.phoneInvalid,
    documentNumber: DOCUMENT_NUMBER_PATTERN.test(values.documentNumber.trim()) ? null : t.errors.documentInvalid,
    password: values.password.length >= MIN_PASSWORD_LENGTH ? null : t.errors.passwordShort,
  };
}

const NO_ERRORS: ReturnType<typeof validate> = {
  firstName: null,
  lastName: null,
  email: null,
  phone: null,
  documentNumber: null,
  password: null,
};

export function RegisterScreen({ navigation }: Props) {
  const { spacing } = useTheme();
  const register = useRegister();
  const [submitted, setSubmitted] = useState(false);
  const [values, setValues] = useState<FormValues>({
    firstName: '',
    lastName: '',
    email: '',
    phoneDigits: '',
    documentType: 'CC',
    documentNumber: '',
    password: '',
  });

  const errors = submitted ? validate(values) : NO_ERRORS;
  const update = (patch: Partial<FormValues>) => setValues((current) => ({ ...current, ...patch }));

  const submit = () => {
    setSubmitted(true);
    if (Object.values(validate(values)).some(Boolean) || register.isPending) return;
    register.mutate({
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim().toLowerCase(),
      phoneNumber: toE164(values.phoneDigits),
      documentType: values.documentType,
      documentNumber: values.documentNumber.trim(),
      password: values.password,
    });
  };

  const apiError = register.error
    ? toUserMessage(register.error, { 409: t.errors.duplicate, 400: t.errors.invalidData })
    : null;

  return (
    <Screen scroll footer={<Button label={t.submit} onPress={submit} loading={register.isPending} />}>
      <View style={{ gap: spacing.sm, marginTop: spacing.xl }}>
        <AppText variant="display" accessibilityRole="header">
          {t.title}
        </AppText>
        <AppText tone="secondary">{t.subtitle}</AppText>
      </View>

      <View style={{ gap: spacing.lg }}>
        <View style={[styles.row, { gap: spacing.md }]}>
          <View style={styles.flex}>
            <TextField
              label={t.firstNameLabel}
              value={values.firstName}
              onChangeText={(firstName) => update({ firstName })}
              error={errors.firstName}
              autoComplete="given-name"
              textContentType="givenName"
              maxLength={80}
            />
          </View>
          <View style={styles.flex}>
            <TextField
              label={t.lastNameLabel}
              value={values.lastName}
              onChangeText={(lastName) => update({ lastName })}
              error={errors.lastName}
              autoComplete="family-name"
              textContentType="familyName"
              maxLength={80}
            />
          </View>
        </View>
        <TextField
          label={t.emailLabel}
          placeholder={t.emailPlaceholder}
          value={values.email}
          onChangeText={(email) => update({ email })}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
        />
        <TextField
          label={t.phoneLabel}
          placeholder={t.phonePlaceholder}
          value={formatLocalMobile(values.phoneDigits)}
          onChangeText={(text) => update({ phoneDigits: onlyDigits(text).slice(0, LOCAL_MOBILE_LENGTH) })}
          error={errors.phone}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          leading={<AppText tone="secondary">{`+${env.defaultCountryCode}`}</AppText>}
        />
        <View style={{ gap: spacing.sm }}>
          <AppText variant="label" tone="secondary">
            {t.documentTypeLabel}
          </AppText>
          <SegmentedControl
            options={DOCUMENT_OPTIONS}
            value={values.documentType}
            onChange={(documentType) => update({ documentType })}
            accessibilityLabel={t.documentTypeLabel}
          />
        </View>
        <TextField
          label={t.documentNumberLabel}
          value={values.documentNumber}
          onChangeText={(documentNumber) => update({ documentNumber })}
          error={errors.documentNumber}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={20}
        />
        <TextField
          label={t.passwordLabel}
          value={values.password}
          onChangeText={(password) => update({ password })}
          error={errors.password}
          helper={t.passwordHelper}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          maxLength={128}
        />
        {apiError ? <InlineAlert message={apiError} /> : null}
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="link" hitSlop={spacing.md}>
          <AppText variant="callout" tone="accent" style={styles.center}>
            {t.haveAccount}
          </AppText>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
});
