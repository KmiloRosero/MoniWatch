import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { copy } from '@/i18n/es';
import type { WompiCheckout } from '@/services/api/types';
import { useTheme } from '@/theme/useTheme';

const t = copy.addPaymentMethod.card;
const BOX_SIZE = 22;

interface WompiAcceptanceProps {
  acceptance: NonNullable<WompiCheckout['acceptance']>;
  accepted: boolean;
  onChange: (accepted: boolean) => void;
  error: string | null;
}

/** Wompi requires explicit consent to its terms and to personal data processing before saving a card. */
export function WompiAcceptance({ acceptance, accepted, onChange, error }: WompiAcceptanceProps) {
  const { colors, spacing, radii } = useTheme();
  const open = (url: string) => () => void Linking.openURL(url);

  return (
    <View style={{ gap: spacing.xs }}>
      <View style={[styles.row, { gap: spacing.md }]}>
        <Pressable
          onPress={() => onChange(!accepted)}
          accessibilityRole="checkbox"
          accessibilityLabel={t.acceptanceLabel}
          accessibilityState={{ checked: accepted }}
          hitSlop={spacing.md}
          style={[
            styles.box,
            {
              borderRadius: radii.sm / 2,
              borderColor: error ? colors.danger : accepted ? colors.primary : colors.borderStrong,
              backgroundColor: accepted ? colors.primary : colors.surface,
            },
          ]}
        >
          {accepted ? (
            <AppText variant="label" style={{ color: colors.onPrimary }}>
              ✓
            </AppText>
          ) : null}
        </Pressable>
        <AppText variant="caption" tone="secondary" style={styles.flex}>
          {t.acceptancePrefix}
          <AppText variant="caption" tone="accent" onPress={open(acceptance.termsUrl)} accessibilityRole="link">
            {t.acceptanceTerms}
          </AppText>
          {t.acceptanceMiddle}
          <AppText variant="caption" tone="accent" onPress={open(acceptance.personalDataUrl)} accessibilityRole="link">
            {t.acceptanceData}
          </AppText>
          {t.acceptanceSuffix}
        </AppText>
      </View>
      {error ? (
        <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  flex: { flex: 1 },
  box: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
