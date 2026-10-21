import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type TextInputInstance } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/types';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { InlineAlert } from '@/components/ui/Feedback';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { copy } from '@/i18n/es';
import { toUserMessage } from '@/services/api/error-messages';
import { useTheme } from '@/theme/useTheme';
import { useLogin } from '../hooks/useAuthQueries';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const t = copy.login;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(email: string, password: string) {
  return {
    email: !email ? t.errors.emailRequired : !EMAIL_PATTERN.test(email) ? t.errors.emailInvalid : null,
    password: !password ? t.errors.passwordRequired : null,
  };
}

export function LoginScreen({ navigation }: Props) {
  const { spacing } = useTheme();
  const login = useLogin();
  const passwordRef = useRef<TextInputInstance>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();
  // Errors appear only after the first submit, then update live as the user fixes them.
  const errors = submitted ? validate(normalizedEmail, password) : { email: null, password: null };

  const submit = () => {
    setSubmitted(true);
    const result = validate(normalizedEmail, password);
    if (result.email || result.password || login.isPending) return;
    login.mutate({ email: normalizedEmail, password });
  };

  const apiError = login.error
    ? toUserMessage(login.error, { 401: t.errors.invalidCredentials, 403: t.errors.accountUnavailable })
    : null;

  return (
    <Screen scroll footer={<Button label={t.submit} onPress={submit} loading={login.isPending} />}>
      <View style={{ gap: spacing.sm, marginTop: spacing.xxxl }}>
        <AppText variant="label" tone="accent">
          {t.brand}
        </AppText>
        <AppText variant="display" accessibilityRole="header">
          {t.title}
        </AppText>
        <AppText tone="secondary">{t.subtitle}</AppText>
      </View>

      <View style={{ gap: spacing.lg }}>
        <TextField
          label={t.emailLabel}
          placeholder={t.emailPlaceholder}
          value={email}
          onChangeText={setEmail}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <TextField
          ref={passwordRef}
          label={t.passwordLabel}
          placeholder={t.passwordPlaceholder}
          value={password}
          onChangeText={setPassword}
          error={errors.password}
          secureTextEntry={!passwordVisible}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
          trailing={
            <Pressable
              onPress={() => setPasswordVisible((visible) => !visible)}
              accessibilityRole="button"
              accessibilityHint={t.showPasswordHint}
              hitSlop={spacing.md}
            >
              <AppText variant="callout" tone="accent">
                {passwordVisible ? t.hidePassword : t.showPassword}
              </AppText>
            </Pressable>
          }
        />
        {apiError ? <InlineAlert message={apiError} /> : null}
        <Pressable onPress={() => navigation.navigate('Register')} accessibilityRole="link" hitSlop={spacing.md}>
          <AppText variant="callout" tone="accent" style={styles.center}>
            {t.createAccount}
          </AppText>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
});
