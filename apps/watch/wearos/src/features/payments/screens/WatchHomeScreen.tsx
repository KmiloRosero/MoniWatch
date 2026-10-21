import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { WatchStackParamList } from '@/app/navigation/types';
import { Chip } from '@/components/Chip';
import { StateView } from '@/components/StateView';
import { WatchScreen } from '@/components/WatchScreen';
import { WatchText } from '@/components/WatchText';
import { copy } from '@/i18n/es';
import { toUserMessage } from '@/services/api/error-messages';
import { useUnpair } from '@/features/session/useUnpair';
import { usePayablePaymentMethods } from '../hooks/useWatchData';
import { methodDetail, providerColor, providerName } from '../presentation';

type Props = NativeStackScreenProps<WatchStackParamList, 'Home'>;

const t = copy.home;

export function WatchHomeScreen({ navigation }: Props) {
  const { methods, isPending, isError, error, refetch } = usePayablePaymentMethods();
  const unpair = useUnpair();

  if (isPending) {
    return <StateView title={t.loadingMethods} loading />;
  }

  if (isError) {
    return (
      <StateView
        title={t.errorTitle}
        description={toUserMessage(error)}
        actionLabel={copy.common.retry}
        onAction={() => void refetch()}
      />
    );
  }

  if (methods.length === 0) {
    return (
      <StateView
        title={t.emptyTitle}
        description={t.emptyDescription}
        actionLabel={copy.common.retry}
        onAction={() => void refetch()}
      />
    );
  }

  return (
    <WatchScreen>
      <WatchText variant="caption" tone="secondary" center accessibilityRole="header">
        {t.title}
      </WatchText>
      {methods.map((method) => {
        const detail = methodDetail(method);
        return (
          <Chip
            key={method.id}
            label={t.payWith(providerName(method.provider))}
            secondaryLabel={detail}
            accentColor={providerColor(method.provider)}
            onPress={() =>
              navigation.navigate('Amount', {
                paymentMethodId: method.id,
                provider: method.provider,
                methodDetail: detail,
              })
            }
          />
        );
      })}
      {/* Rarely used and destructive: last in the list, plain surface, two taps. */}
      <Chip
        label={unpair.armed ? t.unpairConfirm : t.unpair}
        onPress={() => void unpair.press()}
        disabled={unpair.isUnpairing}
      />
    </WatchScreen>
  );
}
