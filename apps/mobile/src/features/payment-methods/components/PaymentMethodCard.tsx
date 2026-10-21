import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Feedback';
import { copy } from '@/i18n/es';
import type { PaymentMethod } from '@/services/api/types';
import { providerColors } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { paymentMethodDetail, paymentMethodTitle } from '../utils/presentation';

const t = copy.paymentMethod;

interface PaymentMethodCardProps {
  method: PaymentMethod;
  onMakeDefault: (id: string) => void;
  onRemove: (method: PaymentMethod) => void;
  isUpdating: boolean;
  isRemoving: boolean;
}

export function PaymentMethodCard({ method, onMakeDefault, onRemove, isUpdating, isRemoving }: PaymentMethodCardProps) {
  const { colors, spacing, radii, sizes } = useTheme();
  const providerName = t.providers[method.provider];
  const isActive = method.status === 'ACTIVE';
  const canMakeDefault = isActive && !method.isDefault;

  return (
    <View
      style={[
        styles.card,
        {
          padding: spacing.lg,
          gap: spacing.md,
          borderRadius: radii.lg,
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={[styles.row, { gap: spacing.md }]}>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.monogram,
            { width: sizes.avatar, height: sizes.avatar, borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
          ]}
        >
          <AppText variant="headline">{providerName.charAt(0)}</AppText>
          <View style={[styles.providerDot, { backgroundColor: providerColors[method.provider], borderColor: colors.surface }]} />
        </View>

        <View style={[styles.flex, { gap: spacing.xxs }]}>
          <AppText variant="headline" numberOfLines={1}>
            {paymentMethodTitle(method)}
          </AppText>
          <AppText variant="caption" tone="secondary" numberOfLines={1}>
            {`${providerName}  ·  ${paymentMethodDetail(method)}`}
          </AppText>
        </View>

        {method.isDefault ? <Badge label={t.defaultBadge} tone="accent" /> : null}
        {!isActive ? (
          <Badge label={t.status[method.status]} tone={method.status === 'PENDING_VALIDATION' ? 'warning' : 'danger'} />
        ) : null}
      </View>

      <View style={[styles.actions, { gap: spacing.sm }]}>
        <Button label={t.remove} onPress={() => onRemove(method)} variant="ghost" size="sm" loading={isRemoving} />
        {canMakeDefault ? (
          <Button
            label={t.makeDefault}
            accessibilityHint={t.makeDefaultHint}
            onPress={() => onMakeDefault(method.id)}
            variant="ghost"
            size="sm"
            loading={isUpdating}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flex: {
    flex: 1,
  },
  monogram: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerDot: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});
