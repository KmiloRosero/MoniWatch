import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/useTheme';
import { AppText } from './AppText';
import { Button } from './Button';

type BadgeTone = 'accent' | 'success' | 'warning' | 'danger' | 'neutral';

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const { colors, spacing, radii } = useTheme();
  const palette = {
    accent: { background: colors.accentSubtle, text: 'accent' as const },
    success: { background: colors.successSubtle, text: 'success' as const },
    warning: { background: colors.warningSubtle, text: 'warning' as const },
    danger: { background: colors.dangerSubtle, text: 'danger' as const },
    neutral: { background: colors.surfaceMuted, text: 'secondary' as const },
  }[tone];

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        borderRadius: radii.pill,
        backgroundColor: palette.background,
      }}
    >
      <AppText variant="label" tone={palette.text}>
        {label}
      </AppText>
    </View>
  );
}

export function InlineAlert({ message }: { message: string }) {
  const { colors, spacing, radii } = useTheme();
  return (
    <View
      accessibilityRole="alert"
      style={{ padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.dangerSubtle }}
    >
      <AppText variant="callout" tone="danger">
        {message}
      </AppText>
    </View>
  );
}

interface StateMessageProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  loading?: boolean;
}

export function StateMessage({ title, description, actionLabel, onAction, loading = false }: StateMessageProps) {
  const { colors, spacing } = useTheme();
  return (
    <View style={[styles.state, { gap: spacing.md, paddingVertical: spacing.xxxl, paddingHorizontal: spacing.lg }]}>
      {loading ? <ActivityIndicator color={colors.textSecondary} accessibilityLabel={title} /> : null}
      <AppText variant="headline" style={styles.center}>
        {title}
      </AppText>
      {description ? (
        <AppText tone="secondary" style={styles.center}>
          {description}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <View style={{ marginTop: spacing.sm }}>
          <Button label={actionLabel} onPress={onAction} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  state: {
    alignItems: 'center',
  },
  center: {
    textAlign: 'center',
  },
});
