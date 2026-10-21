import { Pressable, StyleSheet, Switch } from 'react-native';
import { useTheme } from '@/theme/useTheme';
import { AppText } from './AppText';

interface ToggleRowProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

/** The whole row is the hit target, not just the switch. */
export function ToggleRow({ label, value, onValueChange }: ToggleRowProps) {
  const { colors, spacing, sizes } = useTheme();
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      style={[styles.row, { minHeight: sizes.controlHeight, gap: spacing.lg }]}
    >
      <AppText style={styles.label}>{label}</AppText>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: colors.accent, false: colors.borderStrong }}
        importantForAccessibility="no-hide-descendants"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    flex: 1,
  },
});
