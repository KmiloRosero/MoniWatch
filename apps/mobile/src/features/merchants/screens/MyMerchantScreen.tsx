import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/types';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Badge, InlineAlert, StateMessage } from '@/components/ui/Feedback';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { env } from '@/config/env';
import { copy } from '@/i18n/es';
import { toUserMessage } from '@/services/api/error-messages';
import type { OwnedMerchant, RegisterMerchantRequest } from '@/services/api/types';
import { useTheme } from '@/theme/useTheme';
import { useDeactivateMerchant, useOwnedMerchants, useRegisterMerchant } from '../hooks/useMerchants';

type Props = NativeStackScreenProps<RootStackParamList, 'MyMerchant'>;

const t = copy.myMerchant;
/** Every merchant points its Wompi events here; the backend picks the merchant by payment reference. */
const WOMPI_EVENTS_PATH = '/webhooks/wompi';

export function MyMerchantScreen(_props: Props) {
  const owned = useOwnedMerchants();
  const active = owned.data?.find((merchant) => merchant.status === 'ACTIVE');

  if (owned.isPending || owned.isError) {
    return (
      <Screen edges={['bottom', 'left', 'right']}>
        <StateMessage
          title={owned.isError ? copy.errors.generic : t.loading}
          description={owned.isError ? toUserMessage(owned.error) : undefined}
          loading={owned.isPending}
          actionLabel={owned.isError ? copy.common.retry : undefined}
          onAction={owned.isError ? () => void owned.refetch() : undefined}
        />
      </Screen>
    );
  }

  return active ? <MerchantDetails merchant={active} /> : <RegisterMerchantForm />;
}

function MerchantDetails({ merchant }: { merchant: OwnedMerchant }) {
  const { colors, spacing, radii } = useTheme();
  const deactivate = useDeactivateMerchant();

  const confirmDeactivate = () =>
    Alert.alert(t.deactivateConfirmTitle, t.deactivateConfirmMessage, [
      { text: t.cancel, style: 'cancel' },
      { text: t.deactivate, style: 'destructive', onPress: () => deactivate.mutate(merchant.id) },
    ]);

  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      <View style={{ gap: spacing.sm }}>
        <AppText variant="title" accessibilityRole="header">
          {merchant.name}
        </AppText>
        {merchant.wompiEnvironment ? (
          <View style={styles.badgeRow}>
            <Badge
              label={t.environments[merchant.wompiEnvironment]}
              tone={merchant.wompiEnvironment === 'PRODUCTION' ? 'success' : 'warning'}
            />
          </View>
        ) : null}
      </View>

      <View
        style={[
          styles.codeCard,
          { padding: spacing.xl, gap: spacing.sm, borderRadius: radii.lg, backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <AppText variant="label" tone="secondary">
          {t.codeLabel}
        </AppText>
        <AppText variant="display" selectable accessibilityLabel={merchant.code.split('').join(' ')} style={styles.code}>
          {merchant.code}
        </AppText>
        <AppText variant="caption" tone="tertiary">
          {t.codeHelp}
        </AppText>
      </View>

      <View style={{ gap: spacing.xs }}>
        <AppText variant="label" tone="secondary">
          {t.eventsUrlLabel}
        </AppText>
        <AppText selectable>{`${env.apiUrl}${WOMPI_EVENTS_PATH}`}</AppText>
        <AppText variant="caption" tone="tertiary">
          {t.eventsUrlHelp}
        </AppText>
      </View>

      {deactivate.error ? <InlineAlert message={t.errors.deactivate} /> : null}
      <Button label={t.deactivate} onPress={confirmDeactivate} variant="danger" loading={deactivate.isPending} />
    </Screen>
  );
}

type KeyField = 'wompiPublicKey' | 'wompiPrivateKey' | 'wompiIntegritySecret' | 'wompiEventsSecret';

const KEY_FIELDS: ReadonlyArray<{ field: KeyField; label: string; placeholder: string; secret: boolean }> = [
  { field: 'wompiPublicKey', label: t.publicKeyLabel, placeholder: t.publicKeyPlaceholder, secret: false },
  { field: 'wompiPrivateKey', label: t.privateKeyLabel, placeholder: t.privateKeyPlaceholder, secret: true },
  { field: 'wompiIntegritySecret', label: t.integrityLabel, placeholder: t.integrityPlaceholder, secret: true },
  { field: 'wompiEventsSecret', label: t.eventsLabel, placeholder: t.eventsPlaceholder, secret: true },
];

const EMPTY_KEYS: Record<KeyField, string> = {
  wompiPublicKey: '',
  wompiPrivateKey: '',
  wompiIntegritySecret: '',
  wompiEventsSecret: '',
};

function registerErrorMessage(error: unknown): string {
  return toUserMessage(error, {
    400: t.errors.invalidKeys,
    409: t.errors.alreadyRegistered,
    422: t.errors.inactive,
    502: t.errors.unavailable,
  });
}

function RegisterMerchantForm() {
  const { spacing } = useTheme();
  const register = useRegisterMerchant();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [keys, setKeys] = useState(EMPTY_KEYS);
  const [submitted, setSubmitted] = useState(false);

  const missing = (field: KeyField) => submitted && !keys[field].trim();

  const submit = () => {
    setSubmitted(true);
    if (register.isPending || KEY_FIELDS.some(({ field }) => !keys[field].trim())) return;

    const body: RegisterMerchantRequest = {
      name: name.trim() || undefined,
      category: category.trim() || undefined,
      wompiPublicKey: keys.wompiPublicKey.trim(),
      wompiPrivateKey: keys.wompiPrivateKey.trim(),
      wompiIntegritySecret: keys.wompiIntegritySecret.trim(),
      wompiEventsSecret: keys.wompiEventsSecret.trim(),
    };
    register.mutate(body);
  };

  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      <View style={{ gap: spacing.xs }}>
        <AppText variant="title" accessibilityRole="header">
          {t.heading}
        </AppText>
        <AppText tone="secondary">{t.description}</AppText>
      </View>

      <View style={{ gap: spacing.lg }}>
        <TextField label={t.nameLabel} placeholder={t.namePlaceholder} value={name} onChangeText={setName} maxLength={60} />
        <TextField
          label={t.categoryLabel}
          placeholder={t.categoryPlaceholder}
          value={category}
          onChangeText={setCategory}
          maxLength={40}
        />
        <AppText variant="caption" tone="tertiary">
          {t.keysHelp}
        </AppText>
        {KEY_FIELDS.map(({ field, label, placeholder, secret }) => (
          <TextField
            key={field}
            label={label}
            placeholder={placeholder}
            value={keys[field]}
            onChangeText={(value) => setKeys((current) => ({ ...current, [field]: value }))}
            error={missing(field) ? t.errors.required : null}
            secureTextEntry={secret}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
          />
        ))}
        <AppText variant="caption" tone="tertiary">
          {t.securityNote}
        </AppText>
        {register.error ? <InlineAlert message={registerErrorMessage(register.error)} /> : null}
        <Button label={t.submit} onPress={submit} loading={register.isPending} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badgeRow: {
    flexDirection: 'row',
  },
  codeCard: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  code: {
    letterSpacing: 6,
  },
});
