import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/types';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { InlineAlert, StateMessage } from '@/components/ui/Feedback';
import { MoneyField } from '@/components/ui/MoneyField';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { useCurrentUser } from '@/features/auth/hooks/useAuthQueries';
import { usePaymentMethods } from '@/features/payment-methods/hooks/usePaymentMethods';
import { paymentMethodDetail, paymentMethodTitle } from '@/features/payment-methods/utils/presentation';
import { copy } from '@/i18n/es';
import { toUserMessage } from '@/services/api/error-messages';
import type { DeviceSession } from '@/services/api/types';
import { useTheme } from '@/theme/useTheme';
import { toMajorUnits, toMinorUnits } from '@/utils/format';
import { useRevokeWatch, useUpdateWatchSettings, useWatches } from '../hooks/useDevices';
import { watchName } from '../utils/presentation';

type Props = NativeStackScreenProps<RootStackParamList, 'WatchSettings'>;

const t = copy.deviceSettings;

export function WatchSettingsScreen({ navigation, route }: Props) {
  const watches = useWatches();
  const watch = watches.data?.find((candidate) => candidate.id === route.params.deviceSessionId);

  if (watches.isPending) {
    return (
      <Screen edges={['bottom', 'left', 'right']}>
        <StateMessage title={copy.devices.loading} loading />
      </Screen>
    );
  }

  if (!watch) {
    return (
      <Screen edges={['bottom', 'left', 'right']}>
        <StateMessage title={t.notFound} actionLabel={copy.common.back} onAction={() => navigation.goBack()} />
      </Screen>
    );
  }

  // Keyed by id so the form state is initialised from the loaded watch exactly once.
  return <WatchSettingsForm key={watch.id} watch={watch} navigation={navigation} />;
}

/** Minor units from the backend -> whole currency digits for the inputs ("" = no limit). */
const toInput = (minorUnits: number | null) => (minorUnits === null ? '' : String(toMajorUnits(minorUnits)));
const toLimit = (digits: string) => (digits === '' ? null : toMinorUnits(Number(digits)));

function WatchSettingsForm({ watch, navigation }: { watch: DeviceSession; navigation: Props['navigation'] }) {
  const { colors, spacing, radii } = useTheme();
  const user = useCurrentUser();
  const paymentMethods = usePaymentMethods();
  const update = useUpdateWatchSettings(watch.id);
  const revoke = useRevokeWatch();

  const [name, setName] = useState(watchName(watch));
  const [maxPerPayment, setMaxPerPayment] = useState(toInput(watch.maxAmountPerTransaction));
  const [dailyLimit, setDailyLimit] = useState(toInput(watch.dailyLimitInCents));
  const [pinAbove, setPinAbove] = useState(toInput(watch.requirePinAboveInCents));
  const [defaultMethodId, setDefaultMethodId] = useState<string | null>(watch.defaultPaymentMethodId);

  const activeMethods = (paymentMethods.data ?? []).filter((method) => method.status === 'ACTIVE');
  const dailyBelowMax = maxPerPayment !== '' && dailyLimit !== '' && Number(dailyLimit) < Number(maxPerPayment);
  const needsPin = pinAbove !== '' && user.data?.hasPaymentPin === false;

  const save = () => {
    if (dailyBelowMax || update.isPending) return;
    update.mutate(
      {
        deviceName: name.trim() || undefined,
        maxAmountPerTransaction: toLimit(maxPerPayment),
        dailyLimitInCents: toLimit(dailyLimit),
        requirePinAboveInCents: toLimit(pinAbove),
        defaultPaymentMethodId: defaultMethodId,
      },
      { onSuccess: () => navigation.goBack() },
    );
  };

  const confirmRevoke = () =>
    Alert.alert(t.revokeConfirmTitle, t.revokeConfirmMessage, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.revoke,
        style: 'destructive',
        onPress: () => revoke.mutate(watch.id, { onSuccess: () => navigation.goBack() }),
      },
    ]);

  const saveError = update.error
    ? toUserMessage(update.error, { 400: t.errors.save, 404: t.notFound, 422: t.errors.methodUnavailable })
    : null;

  const methodOptions = [
    { id: null, title: t.accountDefault, detail: undefined },
    ...activeMethods.map((method) => ({ id: method.id, title: paymentMethodTitle(method), detail: paymentMethodDetail(method) })),
  ];

  return (
    <Screen scroll edges={['bottom', 'left', 'right']} footer={<Button label={t.save} onPress={save} loading={update.isPending} disabled={dailyBelowMax} />}>
      <TextField label={t.nameLabel} value={name} onChangeText={setName} maxLength={80} />

      <View style={{ gap: spacing.lg }}>
        <View style={{ gap: spacing.xs }}>
          <AppText variant="headline">{t.limitsHeading}</AppText>
          <AppText variant="caption" tone="secondary">
            {t.limitsDescription}
          </AppText>
        </View>
        <MoneyField label={t.maxPerPaymentLabel} value={maxPerPayment} onChange={setMaxPerPayment} />
        <MoneyField
          label={t.dailyLimitLabel}
          value={dailyLimit}
          onChange={setDailyLimit}
          error={dailyBelowMax ? t.errors.dailyBelowMax : null}
        />
      </View>

      <View style={{ gap: spacing.lg }}>
        <AppText variant="headline">{t.pinHeading}</AppText>
        <MoneyField label={t.pinAboveLabel} value={pinAbove} onChange={setPinAbove} helper={t.pinAboveHelper} />
        {needsPin ? (
          <View style={{ gap: spacing.sm }}>
            <InlineAlert message={t.noPinWarning} />
            <Button label={t.createPin} onPress={() => navigation.navigate('PaymentPin')} variant="secondary" size="sm" />
          </View>
        ) : null}
      </View>

      <View style={{ gap: spacing.md }} accessibilityRole="radiogroup" accessibilityLabel={t.defaultMethodHeading}>
        <AppText variant="headline">{t.defaultMethodHeading}</AppText>
        {methodOptions.map((option) => {
          const selected = option.id === defaultMethodId;
          return (
            <Pressable
              key={option.id ?? 'account-default'}
              onPress={() => setDefaultMethodId(option.id)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              style={[
                styles.option,
                {
                  gap: spacing.md,
                  padding: spacing.lg,
                  borderRadius: radii.md,
                  borderColor: selected ? colors.accent : colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <View style={[styles.radio, { borderColor: selected ? colors.accent : colors.borderStrong }]}>
                {selected ? <View style={[styles.radioDot, { backgroundColor: colors.accent }]} /> : null}
              </View>
              <View style={styles.flex}>
                <AppText variant="callout">{option.title}</AppText>
                {option.detail ? (
                  <AppText variant="caption" tone="secondary">
                    {option.detail}
                  </AppText>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      {saveError ? <InlineAlert message={saveError} /> : null}
      {revoke.error ? <InlineAlert message={t.errors.revoke} /> : null}
      <Button label={t.revoke} onPress={confirmRevoke} variant="danger" loading={revoke.isPending} />
    </Screen>
  );
}

const RADIO_SIZE = 20;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  option: { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  radio: {
    width: RADIO_SIZE,
    height: RADIO_SIZE,
    borderRadius: RADIO_SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: RADIO_SIZE / 2, height: RADIO_SIZE / 2, borderRadius: RADIO_SIZE / 4 },
});
