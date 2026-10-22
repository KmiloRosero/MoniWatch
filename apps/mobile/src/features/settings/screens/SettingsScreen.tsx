import { Alert, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/types';
import { AppText } from '@/components/ui/AppText';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/features/auth/AuthProvider';
import { useCurrentUser } from '@/features/auth/hooks/useAuthQueries';
import { useWatches } from '@/features/devices/hooks/useDevices';
import { copy } from '@/i18n/es';
import { useTheme } from '@/theme/useTheme';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const t = copy.settings;

export function SettingsScreen({ navigation }: Props) {
  const { spacing } = useTheme();
  const { signOut } = useAuth();
  const user = useCurrentUser();
  const watches = useWatches();

  const confirmSignOut = () =>
    Alert.alert(t.signOutConfirmTitle, t.signOutConfirmMessage, [
      { text: t.cancel, style: 'cancel' },
      { text: t.signOut, style: 'destructive', onPress: () => void signOut() },
    ]);

  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      {user.data ? (
        <View style={{ gap: spacing.xs }}>
          <AppText variant="title">{`${user.data.firstName} ${user.data.lastName}`}</AppText>
          <AppText tone="secondary">{user.data.email}</AppText>
        </View>
      ) : null}

      <View style={{ gap: spacing.md }}>
        <ListRow
          title={t.watches}
          subtitle={watches.data ? t.watchesDescription(watches.data.length) : undefined}
          onPress={() => navigation.navigate('Watches')}
        />
        <ListRow
          title={t.myMerchant}
          subtitle={t.myMerchantDescription}
          onPress={() => navigation.navigate('MyMerchant')}
        />
        <ListRow
          title={t.pin}
          subtitle={user.data ? (user.data.hasPaymentPin ? t.pinSet : t.pinNotSet) : undefined}
          onPress={() => navigation.navigate('PaymentPin')}
        />
        <ListRow title={t.activity} subtitle={t.activityDescription} onPress={() => navigation.navigate('Transactions')} />
      </View>

      <ListRow title={t.signOut} tone="danger" onPress={confirmSignOut} trailing={<View />} />
    </Screen>
  );
}
