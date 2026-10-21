import { useCallback, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { usePreventRemove } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { WatchStackParamList } from '@/app/navigation/types';
import { Chip } from '@/components/Chip';
import { Spinner } from '@/components/Spinner';
import { StatusMark } from '@/components/StatusMark';
import { WatchScreen } from '@/components/WatchScreen';
import { WatchText } from '@/components/WatchText';
import { copy } from '@/i18n/es';
import { spacing } from '@/theme/tokens';
import { formatMoney, toMajorUnits } from '@/utils/money';
import { usePaymentFlow } from '../hooks/usePaymentFlow';
import { providerName } from '../presentation';

type Props = NativeStackScreenProps<WatchStackParamList, 'Processing'>;

/** After a success the watch returns home on its own: the wrist usually drops right away. */
const SUCCESS_AUTO_DISMISS_MS = 6_000;

const t = copy.processing;

export function PaymentProcessingScreen({ navigation, route }: Props) {
  const { paymentMethodId, provider, amountInCents, paymentPin } = route.params;
  const { state, retry } = usePaymentFlow({ paymentMethodId, amountInCents, paymentPin });

  const isBusy = state.phase === 'processing' || state.phase === 'confirming';
  // Swipe-to-dismiss and the back button are ignored while the charge is in flight.
  usePreventRemove(isBusy, () => undefined);

  const finish = useCallback(() => navigation.popToTop(), [navigation]);

  useEffect(() => {
    if (state.phase !== 'approved') return;
    const timer = setTimeout(finish, SUCCESS_AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [state.phase, finish]);

  const amountLabel = formatMoney(toMajorUnits(amountInCents));
  const providerLabel = providerName(provider);

  if (isBusy) {
    const confirming = state.phase === 'confirming';
    return (
      <WatchScreen centered>
        <Spinner accessibilityLabel={confirming ? t.confirmingTitle : t.loadingTitle} />
        <WatchText variant="title" center accessibilityLiveRegion="polite">
          {confirming ? t.confirmingTitle : t.loadingTitle}
        </WatchText>
        <WatchText variant="caption" tone="secondary" center>
          {confirming ? t.confirmingDescription : t.loadingDescription(providerLabel)}
        </WatchText>
        <WatchText variant="amountSmall" tone="tertiary" center numberOfLines={1} adjustsFontSizeToFit>
          {amountLabel}
        </WatchText>
      </WatchScreen>
    );
  }

  if (state.phase === 'approved') {
    return (
      <WatchScreen centered>
        <StatusMark kind="success" accessibilityLabel={t.successTitle} />
        <WatchText variant="amountSmall" center numberOfLines={1} adjustsFontSizeToFit>
          {formatMoney(toMajorUnits(state.transaction.amountInCents))}
        </WatchText>
        <WatchText variant="caption" tone="success" center accessibilityLiveRegion="assertive">
          {t.successTitle}
        </WatchText>
        <WatchText variant="caption" tone="secondary" center>
          {t.successDescription(providerLabel)}
        </WatchText>
        <View style={styles.actions}>
          <Chip label={t.done} onPress={finish} />
        </View>
      </WatchScreen>
    );
  }

  const declined = state.phase === 'declined';
  const canRetry = declined || state.retryable;

  return (
    <WatchScreen>
      <View style={styles.result}>
        <StatusMark kind="error" accessibilityLabel={declined ? t.declinedTitle : t.failedTitle} />
        <WatchText variant="title" center accessibilityLiveRegion="assertive">
          {declined ? t.declinedTitle : t.failedTitle}
        </WatchText>
        <WatchText variant="caption" tone="secondary" center>
          {declined ? t.declinedDescription(providerLabel) : state.message}
        </WatchText>
      </View>
      {canRetry ? <Chip variant="primary" label={copy.common.retry} onPress={retry} /> : null}
      <Chip label={copy.common.back} onPress={() => navigation.goBack()} />
    </WatchScreen>
  );
}

const styles = StyleSheet.create({
  result: {
    alignItems: 'center',
    gap: spacing.md,
  },
  actions: {
    alignSelf: 'stretch',
    marginTop: spacing.md,
  },
});
