import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { CheckIcon } from '@/components/ui/CheckIcon';
import { copy } from '@/i18n/es';
import type { Merchant } from '@/services/api/types';
import { useTheme } from '@/theme/useTheme';

interface MerchantPickerProps {
  merchants: Merchant[];
  selectedId: string | null;
  onSelect: (merchantId: string) => void;
  label: string;
  helper?: string;
}

const SELECTED_ICON_SIZE = 18;

/** Single choice among the user's merchants, as full-width rows (radio semantics). */
export function MerchantPicker({ merchants, selectedId, onSelect, label, helper }: MerchantPickerProps) {
  const { colors, spacing, radii, sizes } = useTheme();

  return (
    <View style={{ gap: spacing.sm }} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <AppText variant="label" tone="secondary">
        {label}
      </AppText>
      {merchants.map((merchant) => {
        const selected = merchant.id === selectedId;
        return (
          <Pressable
            key={merchant.id}
            onPress={() => onSelect(merchant.id)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={merchant.name}
            style={({ pressed }) => [
              styles.row,
              {
                minHeight: sizes.controlHeight,
                paddingHorizontal: spacing.lg,
                gap: spacing.md,
                borderRadius: radii.md,
                borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
                borderColor: selected ? colors.accent : colors.border,
                backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
              },
            ]}
          >
            <View style={styles.flex}>
              <AppText variant="headline" numberOfLines={1}>
                {merchant.name}
              </AppText>
              <AppText variant="caption" tone="tertiary">
                {copy.dashboard.merchantCode(merchant.code)}
              </AppText>
            </View>
            {selected ? <CheckIcon size={SELECTED_ICON_SIZE} color={colors.accent} strokeWidth={3} /> : null}
          </Pressable>
        );
      })}
      {helper ? (
        <AppText variant="caption" tone="tertiary">
          {helper}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flex: {
    flex: 1,
  },
});
