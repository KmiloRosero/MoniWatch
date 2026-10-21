import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRoundInsets } from '@/hooks/useRoundInsets';
import { colors, spacing } from '@/theme/tokens';

interface WatchScreenProps {
  children: ReactNode;
  /** Centered, non-scrolling layout for status screens. */
  centered?: boolean;
}

/** Pure black canvas with round-safe insets. Scrolls by default (touch or rotary). */
export function WatchScreen({ children, centered = false }: WatchScreenProps) {
  const insets = useRoundInsets();
  const padding = {
    paddingHorizontal: insets.horizontal,
    paddingTop: insets.vertical,
    paddingBottom: insets.vertical,
  };

  if (centered) {
    return <View style={[styles.root, styles.centered, padding, { paddingHorizontal: insets.vertical }]}>{children}</View>;
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.content, padding]}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  content: {
    flexGrow: 1,
    gap: spacing.md,
  },
});
