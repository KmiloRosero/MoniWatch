import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/useTheme';

interface ScreenProps {
  children: ReactNode;
  /** Wraps content in a ScrollView (forms). */
  scroll?: boolean;
  /** Pinned to the bottom, above the keyboard. */
  footer?: ReactNode;
  /** Use ['bottom', 'left', 'right'] when the stack header already handles the top inset. */
  edges?: Edge[];
  padded?: boolean;
}

export function Screen({ children, scroll = false, footer, edges, padded = true }: ScreenProps) {
  const { colors, spacing } = useTheme();
  const padding = padded ? spacing.xl : spacing.none;

  return (
    <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={{ padding, gap: spacing.xl, flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, { padding }]}>{children}</View>
        )}
        {footer ? (
          <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.lg }}>
            {footer}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
