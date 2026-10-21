import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/types';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { FadeInView } from '@/components/ui/FadeInView';
import { InlineAlert } from '@/components/ui/Feedback';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { copy } from '@/i18n/es';
import { toUserMessage } from '@/services/api/error-messages';
import { useTheme } from '@/theme/useTheme';
import { useApproveWatchPairing } from '../hooks/useDevices';
import { formatPairingCode, normalizePairingCode, PAIRING_CODE_LENGTH } from '../utils/pairing-code';

type Props = NativeStackScreenProps<RootStackParamList, 'PairWatch'>;

const t = copy.pairWatch;

export function PairWatchScreen({ navigation }: Props) {
  const { colors, spacing, radii } = useTheme();
  const approve = useApproveWatchPairing();
  const [code, setCode] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const isComplete = code.length === PAIRING_CODE_LENGTH;
  const codeError = submitted && !isComplete ? t.errors.incomplete : null;

  const submit = () => {
    setSubmitted(true);
    if (!isComplete || approve.isPending) return;
    approve.mutate(code);
  };

  if (approve.isSuccess) {
    const deviceName = approve.data.deviceName ?? approve.data.deviceModel ?? t.genericWatch;
    return (
      <Screen edges={['bottom', 'left', 'right']} footer={<Button label={t.done} onPress={() => navigation.goBack()} />}>
        <FadeInView style={[styles.center, { gap: spacing.md }]}>
          <View
            style={[styles.successMark, { borderRadius: radii.pill, backgroundColor: colors.successSubtle }]}
            accessibilityElementsHidden
          >
            <AppText variant="display" tone="success">
              ✓
            </AppText>
          </View>
          <AppText variant="title" accessibilityRole="header" style={styles.centerText}>
            {t.successTitle}
          </AppText>
          <AppText tone="secondary" style={styles.centerText}>
            {t.successDescription(deviceName)}
          </AppText>
        </FadeInView>
      </Screen>
    );
  }

  const apiError = approve.error ? toUserMessage(approve.error, { 404: t.errors.invalidOrExpired }) : null;

  return (
    <Screen
      scroll
      edges={['bottom', 'left', 'right']}
      footer={<Button label={t.submit} onPress={submit} loading={approve.isPending} />}
    >
      <View style={{ gap: spacing.sm }}>
        <AppText variant="title" accessibilityRole="header">
          {t.heading}
        </AppText>
        <AppText tone="secondary">{t.description}</AppText>
      </View>

      <View style={{ gap: spacing.md }}>
        {t.steps.map((step, index) => (
          <View key={step} style={[styles.step, { gap: spacing.md }]}>
            <View style={[styles.stepIndex, { borderRadius: radii.pill, backgroundColor: colors.accentSubtle }]}>
              <AppText variant="label" tone="accent">
                {index + 1}
              </AppText>
            </View>
            <AppText style={styles.flex}>{step}</AppText>
          </View>
        ))}
      </View>

      <View style={{ gap: spacing.lg }}>
        <TextField
          label={t.codeLabel}
          placeholder={t.codePlaceholder}
          value={formatPairingCode(code)}
          onChangeText={(value) => setCode(normalizePairingCode(value))}
          error={codeError}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          spellCheck={false}
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        {apiError ? <InlineAlert message={apiError} /> : null}
        <AppText variant="caption" tone="tertiary">
          {t.securityNote}
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerText: { textAlign: 'center' },
  successMark: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  step: { flexDirection: 'row', alignItems: 'center' },
  stepIndex: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
});
