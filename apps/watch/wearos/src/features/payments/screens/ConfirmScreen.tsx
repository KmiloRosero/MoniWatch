import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { WatchStackParamList } from '@/app/navigation/types';
import { Chip } from '@/components/Chip';
import { WatchScreen } from '@/components/WatchScreen';
import { WatchText } from '@/components/WatchText';
import { copy } from '@/i18n/es';
import { formatMoney, toMajorUnits } from '@/utils/money';
import { useDeviceSettings } from '../hooks/useWatchData';

type Props = NativeStackScreenProps<WatchStackParamList, 'Confirm'>;

const t = copy.confirm;

/**
 * Last look before money moves: who, how much, with what. Sized so "Pagar" is fully
 * visible on a round screen without scrolling; "Cancelar" sits just below.
 */
export function ConfirmScreen({ navigation, route }: Props) {
  const draft = route.params;
  const settings = useDeviceSettings();
  const amountLabel = formatMoney(toMajorUnits(draft.amountInCents));
  // The device settings decide whether a PIN is required, so wait for them.
  const pinThreshold = settings.data?.requirePinAboveInCents ?? null;

  const pay = () => {
    if (pinThreshold !== null && draft.amountInCents > pinThreshold) navigation.navigate('Pin', draft);
    else navigation.navigate('Processing', draft);
  };

  return (
    <WatchScreen>
      <WatchText
        variant="title"
        center
        numberOfLines={2}
        accessibilityRole="header"
        accessibilityLabel={t.summary(draft.merchantName, amountLabel, draft.methodDetail)}
      >
        {draft.merchantName}
      </WatchText>
      <WatchText variant="amountSmall" center numberOfLines={1} adjustsFontSizeToFit>
        {amountLabel}
      </WatchText>
      <WatchText variant="caption" tone="secondary" center numberOfLines={1}>
        {t.paidWith(draft.methodDetail)}
      </WatchText>
      <Chip variant="primary" label={t.pay(amountLabel)} onPress={pay} disabled={settings.isPending} />
      <Chip label={t.cancel} onPress={() => navigation.popToTop()} />
    </WatchScreen>
  );
}
