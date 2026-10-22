import { useState } from 'react';
import { FlatList, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/types';
import { AppText } from '@/components/ui/AppText';
import { InlineAlert, StateMessage } from '@/components/ui/Feedback';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { copy } from '@/i18n/es';
import { toUserMessage } from '@/services/api/error-messages';
import { useTheme } from '@/theme/useTheme';
import { useMerchantSearch, useSaveMerchant } from '../hooks/useMerchants';

type Props = NativeStackScreenProps<RootStackParamList, 'AddMerchant'>;

const t = copy.addMerchant;

export function AddMerchantScreen({ navigation }: Props) {
  const { spacing } = useTheme();
  const [term, setTerm] = useState('');
  const results = useMerchantSearch(term);
  const save = useSaveMerchant();

  const header = (
    <View style={{ gap: spacing.lg, marginBottom: spacing.lg }}>
      <View style={{ gap: spacing.xs }}>
        <AppText variant="title" accessibilityRole="header">
          {t.heading}
        </AppText>
        <AppText tone="secondary">{t.description}</AppText>
      </View>
      <TextField
        label={t.searchLabel}
        placeholder={t.searchPlaceholder}
        value={term}
        onChangeText={setTerm}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
      {save.error ? <InlineAlert message={t.saveError} /> : null}
    </View>
  );

  const empty = results.isPending ? (
    <StateMessage title={t.loading} loading />
  ) : results.isError ? (
    <StateMessage
      title={t.errorTitle}
      description={toUserMessage(results.error)}
      actionLabel={copy.common.retry}
      onAction={() => void results.refetch()}
    />
  ) : (
    <StateMessage title={t.emptyTitle} description={t.emptyDescription} />
  );

  return (
    <Screen padded={false} edges={['bottom', 'left', 'right']}>
      <FlatList
        data={results.data ?? []}
        keyExtractor={(merchant) => merchant.id}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        contentContainerStyle={{ padding: spacing.xl, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <ListRow
            title={item.name}
            subtitle={t.resultSubtitle(item.code, item.category)}
            onPress={() => {
              if (save.isPending) return;
              save.mutate(item.id, { onSuccess: () => navigation.goBack() });
            }}
          />
        )}
      />
    </Screen>
  );
}
