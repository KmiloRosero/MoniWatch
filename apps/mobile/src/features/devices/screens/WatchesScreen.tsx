import { View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/types';
import { Button } from '@/components/ui/Button';
import { StateMessage } from '@/components/ui/Feedback';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { copy } from '@/i18n/es';
import { toUserMessage } from '@/services/api/error-messages';
import { useTheme } from '@/theme/useTheme';
import { useWatches } from '../hooks/useDevices';
import { watchName, watchSummary } from '../utils/presentation';

type Props = NativeStackScreenProps<RootStackParamList, 'Watches'>;

const t = copy.devices;

export function WatchesScreen({ navigation }: Props) {
  const { spacing } = useTheme();
  const watches = useWatches();
  const pair = () => navigation.navigate('PairWatch');
  const hasWatches = (watches.data?.length ?? 0) > 0;

  return (
    <Screen
      scroll
      edges={['bottom', 'left', 'right']}
      footer={hasWatches ? <Button label={t.pair} onPress={pair} /> : undefined}
    >
      {watches.isPending ? (
        <StateMessage title={t.loading} loading />
      ) : watches.isError ? (
        <StateMessage
          title={t.errorTitle}
          description={toUserMessage(watches.error)}
          actionLabel={copy.common.retry}
          onAction={() => void watches.refetch()}
        />
      ) : !hasWatches ? (
        <StateMessage title={t.emptyTitle} description={t.emptyDescription} actionLabel={t.pair} onAction={pair} />
      ) : (
        <View style={{ gap: spacing.md }}>
          {watches.data.map((watch) => (
            <ListRow
              key={watch.id}
              title={watchName(watch)}
              subtitle={watchSummary(watch)}
              onPress={() => navigation.navigate('WatchSettings', { deviceSessionId: watch.id })}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}
