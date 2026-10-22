import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { WatchStackParamList } from '@/app/navigation/types';
import { Chip } from '@/components/Chip';
import { StateView } from '@/components/StateView';
import { WatchScreen } from '@/components/WatchScreen';
import { WatchText } from '@/components/WatchText';
import { copy } from '@/i18n/es';
import { toUserMessage } from '@/services/api/error-messages';
import { useUnpair } from '@/features/session/useUnpair';
import { usePayees, type Payee } from '../hooks/useWatchData';
import { methodDetail } from '../presentation';

type Props = NativeStackScreenProps<WatchStackParamList, 'Home'>;

const t = copy.home;

export function WatchHomeScreen({ navigation }: Props) {
  const { payees, hasMerchants, isPending, isError, error, refetch } = usePayees();
  const unpair = useUnpair();

  if (isPending) {
    return <StateView title={t.loading} loading />;
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

  if (payees.length === 0) {
    return (
      <StateView
        title={hasMerchants ? t.noMethodsTitle : t.emptyTitle}
        description={hasMerchants ? t.noMethodsDescription : t.emptyDescription}
        actionLabel={copy.common.retry}
        onAction={() => void refetch()}
      />
    );
  }

  // One way to pay skips the method screen: merchant, then amount.
  const choose = ({ merchant, methods }: Payee) => {
    const payee = { merchantId: merchant.id, merchantName: merchant.name };
    const [only] = methods;
    if (methods.length === 1 && only) {
      navigation.navigate('Amount', {
        ...payee,
        paymentMethodId: only.id,
        provider: only.provider,
        methodDetail: methodDetail(only),
      });
    } else {
      navigation.navigate('Method', payee);
    }
  };

  return (
    <WatchScreen>
      <WatchText variant="caption" tone="secondary" center accessibilityRole="header">
        {t.title}
      </WatchText>
      {payees.map((payee) => {
        const [best] = payee.methods;
        return (
          <Chip
            key={payee.merchant.id}
            label={payee.merchant.name}
            secondaryLabel={payee.methods.length === 1 && best ? methodDetail(best) : t.methodCount(payee.methods.length)}
            onPress={() => choose(payee)}
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
