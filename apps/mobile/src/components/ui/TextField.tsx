import { useState, type ReactNode, type Ref } from 'react';
import { StyleSheet, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';
import { useTheme } from '@/theme/useTheme';
import { AppText } from './AppText';

interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string | null;
  helper?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  ref?: Ref<TextInputInstance>;
}

export function TextField({
  label,
  error,
  helper,
  leading,
  trailing,
  ref,
  onFocus,
  onBlur,
  ...inputProps
}: TextFieldProps) {
  const { colors, spacing, radii, sizes, typography } = useTheme();
  const [focused, setFocused] = useState(false);

  // Only the border color changes on focus: no width change, so no layout shift.
  const borderColor = error ? colors.danger : focused ? colors.accent : colors.border;

  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="label" tone="secondary">
        {label}
      </AppText>
      <View
        style={[
          styles.field,
          {
            minHeight: sizes.controlHeight,
            paddingHorizontal: spacing.lg,
            gap: spacing.sm,
            borderRadius: radii.md,
            borderColor,
            backgroundColor: colors.surface,
          },
        ]}
      >
        {leading}
        <TextInput
          ref={ref}
          {...inputProps}
          accessibilityLabel={label}
          accessibilityHint={error ?? helper}
          placeholderTextColor={colors.textTertiary}
          selectionColor={colors.accent}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[styles.input, { fontSize: typography.body.fontSize, color: colors.textPrimary }]}
        />
        {trailing}
      </View>
      {error ? (
        <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : helper ? (
        <AppText variant="caption" tone="tertiary">
          {helper}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  input: {
    flex: 1,
    alignSelf: 'stretch',
  },
});
