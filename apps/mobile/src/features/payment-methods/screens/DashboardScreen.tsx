import { useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/types';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { FadeInView } from '@/components/ui/FadeInView';
import { InlineAlert, StateMessage } from '@/components/ui/Feedback';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { useCurrentUser } from '@/features/auth/hooks/useAuthQueries';
import { useSavedMerchants, useUnsaveMerchant } from '@/features/merchants/hooks/useMerchants';
import { copy } from '@/i18n/es';
import { toUserMessage } from '@/services/api/error-messages';
import type { Merchant, PaymentMethod } from '@/services/api/types';
import { useTheme } from '@/theme/useTheme';
import { PaymentMethodCard } from '../components/PaymentMethodCard';
import { usePaymentMethods, useRevokePaymentMethod, useSetDefaultPaymentMethod } from '../hooks/usePaymentMethods';
import { paymentMethodTitle } from '../utils/presentation';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

const t = copy.dashboard;

export function DashboardScreen({ navigation }: Props) {
  const { colors, spacing } = useTheme();
  const currentUser = useCurrentUser();
  const paymentMethods = usePaymentMethods();
  const setDefault = useSetDefaultPaymentMethod();
  const revoke = useRevokePaymentMethod();
  const merchants = useSavedMerchants();
  const unsaveMerchant = useUnsaveMerchant();
  const [isManualRefresh, setIsManualRefresh] = useState(false);

  const methods = paymentMethods.data ?? [];
  const hasMethods = methods.length > 0;
  const goToAdd = () => navigation.navigate('AddPaymentMethod');

  const refresh = async () => {
    setIsManualRefresh(true);
    await Promise.all([paymentMethods.refetch(), currentUser.refetch(), merchants.refetch()]);
    setIsManualRefresh(false);
  };

  const confirmRemove = (method: PaymentMethod) =>
    Alert.alert(copy.paymentMethod.removeConfirmTitle, copy.paymentMethod.removeConfirmMessage(paymentMethodTitle(method)), [
      { text: copy.paymentMethod.cancel, style: 'cancel' },
      { text: copy.paymentMethod.remove, style: 'destructive', onPress: () => revoke.mutate(method.id) },
    ]);

  const confirmRemoveMerchant = (merchant: Merchant) =>
    Alert.alert(t.removeMerchantConfirmTitle, t.removeMerchantConfirmMessage(merchant.name), [
      { text: copy.paymentMethod.cancel, style: 'cancel' },
      { text: t.removeMerchant, style: 'destructive', onPress: () => unsaveMerchant.mutate(merchant.id) },
    ]);

  const cardsFor = (merchantId: string) =>
    methods.filter((method) => method.merchant?.id === merchantId && method.status === 'ACTIVE').length;

  const merchantsSection = (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="label" tone="tertiary">
        {t.merchantsTitle.toUpperCase()}
      </AppText>
      {merchants.data && merchants.data.length > 0 ? (
        merchants.data.map((merchant) => (
          <ListRow
            key={merchant.id}
            title={merchant.name}
            subtitle={`${t.merchantCode(merchant.code)}  ·  ${t.merchantCardCount(cardsFor(merchant.id))}`}
            onPress={() => navigation.navigate('AddPaymentMethod', { merchantId: merchant.id })}
            accessibilityHint={t.addCardFor}
            trailing={
              <Button
                label={t.removeMerchant}
                onPress={() => confirmRemoveMerchant(merchant)}
                variant="ghost"
                size="sm"
                loading={unsaveMerchant.isPending && unsaveMerchant.variables === merchant.id}
              />
            }
          />
        ))
      ) : merchants.isSuccess ? (
        <AppText tone="secondary">{t.merchantsEmpty}</AppText>
      ) : null}
      {unsaveMerchant.error ? <InlineAlert message={t.removeMerchantError} /> : null}
      <Button label={t.addMerchant} onPress={() => navigation.navigate('AddMerchant')} variant="secondary" size="sm" />
    </View>
  );

  const header = (
    <View style={{ gap: spacing.xl, marginBottom: spacing.lg }}>
      <View style={[styles.headerRow, { gap: spacing.md }]}>
        <View style={[styles.flex, { gap: spacing.xs }]}>
          <AppText variant="display" accessibilityRole="header" numberOfLines={1}>
            {t.greeting(currentUser.data?.firstName)}
          </AppText>
          <AppText tone="secondary">{t.subtitle}</AppText>
        </View>
        <Button label={t.settings} onPress={() => navigation.navigate('Settings')} variant="ghost" size="sm" />
      </View>
      {merchantsSection}
      {hasMethods ? (
        <AppText variant="label" tone="tertiary">
          {t.sectionTitle.toUpperCase()}
        </AppText>
      ) : null}
      {setDefault.error ? <InlineAlert message={t.setDefaultError} /> : null}
      {revoke.error ? <InlineAlert message={t.removeError} /> : null}
    </View>
  );

  const emptyState = paymentMethods.isPending ? (
    <StateMessage title={t.loading} loading />
  ) : paymentMethods.isError ? (
    <StateMessage
      title={t.errorTitle}
      description={toUserMessage(paymentMethods.error)}
      actionLabel={copy.common.retry}
      onAction={() => void paymentMethods.refetch()}
    />
  ) : (
    <StateMessage title={t.emptyTitle} description={t.emptyDescription} actionLabel={t.addPaymentMethod} onAction={goToAdd} />
  );

  return (
    <Screen
      padded={false}
      footer={
        hasMethods ? (
          <View style={{ gap: spacing.sm }}>
            <Button label={t.addPaymentMethod} onPress={goToAdd} />
            <Button label={t.activity} onPress={() => navigation.navigate('Transactions')} variant="secondary" />
          </View>
        ) : undefined
      }
    >
      <FlatList
        data={methods}
        keyExtractor={(method) => method.id}
        ListHeaderComponent={header}
        ListEmptyComponent={emptyState}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        contentContainerStyle={{ padding: spacing.xl, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isManualRefresh} onRefresh={refresh} tintColor={colors.textSecondary} />
        }
        renderItem={({ item, index }) => (
          <FadeInView index={index}>
            <PaymentMethodCard
              method={item}
              onMakeDefault={(id) => setDefault.mutate(id)}
              onRemove={confirmRemove}
              isUpdating={setDefault.isPending && setDefault.variables === item.id}
              isRemoving={revoke.isPending && revoke.variables === item.id}
            />
          </FadeInView>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  flex: {
    flex: 1,
  },
});
