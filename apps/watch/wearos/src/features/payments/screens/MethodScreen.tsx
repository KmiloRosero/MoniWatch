import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { WatchStackParamList } from '@/app/navigation/types';
import { Chip } from '@/components/Chip';
import { StateView } from '@/components/StateView';
import { WatchScreen } from '@/components/WatchScreen';
import { WatchText } from '@/components/WatchText';
import { copy } from '@/i18n/es';
import { usePayees } from '../hooks/useWatchData';
import { methodDetail, providerColor, providerName } from '../presentation';

type Props = NativeStackScreenProps<WatchStackParamList, 'Method'>;

const t = copy.method;

/** Only the methods that can pay this merchant: its own cards and any wallet. */
export function MethodScreen({ navigation, route }: Props) {
  const { merchantId, merchantName } = route.params;
  const { payees, isPending } = usePayees();
  const methods = payees.find((payee) => payee.merchant.id === merchantId)?.methods ?? [];

  if (isPending) {
    return <StateView title={copy.home.loading} loading />;
  }

  if (methods.length === 0) {
    return (
      <StateView
        title={copy.home.noMethodsTitle}
        description={copy.home.noMethodsDescription}
        actionLabel={copy.common.back}
        onAction={() => navigation.goBack()}
      />
    );
  }

  return (
    <WatchScreen>
      <WatchText variant="caption" tone="secondary" center numberOfLines={1}>
        {copy.amount.payee(merchantName)}
      </WatchText>
      <WatchText variant="title" center accessibilityRole="header">
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
                ...route.params,
                paymentMethodId: method.id,
                provider: method.provider,
                methodDetail: detail,
              })
            }
          />
        );
      })}
    </WatchScreen>
  );
}
