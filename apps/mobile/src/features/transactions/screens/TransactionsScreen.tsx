import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Badge, StateMessage } from '@/components/ui/Feedback';
import { Screen } from '@/components/ui/Screen';
import { copy } from '@/i18n/es';
import { toUserMessage } from '@/services/api/error-messages';
import type { Transaction, TransactionStatus } from '@/services/api/types';
import { useTheme } from '@/theme/useTheme';
import { formatDateTime, formatMinorUnits } from '@/utils/format';
import { useTransactions } from '../hooks/useTransactions';

const t = copy.transactions;

const STATUS_TONE: Record<TransactionStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  APPROVED: 'success',
  PENDING: 'warning',
  PROCESSING: 'warning',
  DECLINED: 'danger',
  FAILED: 'danger',
  EXPIRED: 'neutral',
  VOIDED: 'neutral',
  REFUNDED: 'neutral',
};

export function TransactionsScreen() {
  const { colors, spacing } = useTheme();
  const transactions = useTransactions();
  const items = transactions.data?.pages.flatMap((page) => page.items) ?? [];

  const empty = transactions.isPending ? (
    <StateMessage title={t.loading} loading />
  ) : transactions.isError ? (
    <StateMessage
      title={t.errorTitle}
      description={toUserMessage(transactions.error)}
      actionLabel={copy.common.retry}
      onAction={() => void transactions.refetch()}
    />
  ) : (
    <StateMessage title={t.emptyTitle} description={t.emptyDescription} />
  );

  return (
    <Screen padded={false} edges={['bottom', 'left', 'right']}>
      <FlatList
        data={items}
        keyExtractor={(transaction) => transaction.id}
        renderItem={({ item }) => <TransactionRow transaction={item} />}
        ListEmptyComponent={empty}
        ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
        contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, flexGrow: 1 }}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (transactions.hasNextPage && !transactions.isFetchingNextPage) void transactions.fetchNextPage();
        }}
        ListFooterComponent={
          transactions.isFetchingNextPage ? (
            <ActivityIndicator style={{ marginVertical: spacing.lg }} color={colors.textSecondary} />
          ) : undefined
        }
        refreshControl={
          <RefreshControl
            refreshing={transactions.isRefetching && !transactions.isFetchingNextPage}
            onRefresh={() => void transactions.refetch()}
            tintColor={colors.textSecondary}
          />
        }
      />
    </Screen>
  );
}

function TransactionRow({ transaction }: { transaction: Transaction }) {
  const { spacing } = useTheme();
  const provider = copy.paymentMethod.providers[transaction.provider];
  const title = transaction.merchant
    ? t.paymentTo(transaction.merchant.name)
    : (transaction.description ?? t.paymentWith(provider));
  const approved = transaction.status === 'APPROVED';

  return (
    <View
      style={[styles.row, { gap: spacing.md, paddingVertical: spacing.md }]}
      accessible
      accessibilityLabel={`${title}, ${formatMinorUnits(transaction.amountInCents)}, ${t.status[transaction.status]}`}
    >
      <View style={[styles.flex, { gap: spacing.xxs }]}>
        <AppText variant="callout" numberOfLines={1}>
          {title}
        </AppText>
        <AppText variant="caption" tone="secondary" numberOfLines={1}>
          {`${formatDateTime(transaction.createdAt)} · ${t.channels[transaction.channel]}`}
        </AppText>
      </View>
      <View style={[styles.trailing, { gap: spacing.xs }]}>
        <AppText variant="headline" tone={approved ? 'primary' : 'tertiary'} style={styles.amount}>
          {formatMinorUnits(transaction.amountInCents)}
        </AppText>
        <Badge label={t.status[transaction.status]} tone={STATUS_TONE[transaction.status]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  trailing: { alignItems: 'flex-end' },
  amount: { fontVariant: ['tabular-nums'] },
  separator: { height: StyleSheet.hairlineWidth },
});
