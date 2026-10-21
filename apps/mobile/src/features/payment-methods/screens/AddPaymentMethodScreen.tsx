import { useState } from 'react';
import { View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/types';
import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { copy } from '@/i18n/es';
import { useTheme } from '@/theme/useTheme';
import { CardForm } from '../components/CardForm';
import { NequiForm } from '../components/NequiForm';

type Props = NativeStackScreenProps<RootStackParamList, 'AddPaymentMethod'>;
type MethodKind = 'nequi' | 'card';

const t = copy.addPaymentMethod;

const KIND_OPTIONS = [
  { value: 'nequi', label: t.kinds.nequi },
  { value: 'card', label: t.kinds.card },
] as const satisfies ReadonlyArray<{ value: MethodKind; label: string }>;

export function AddPaymentMethodScreen({ navigation }: Props) {
  const { spacing } = useTheme();
  const [kind, setKind] = useState<MethodKind>('nequi');
  const onLinked = () => navigation.goBack();

  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      <View style={{ gap: spacing.lg }}>
        <AppText variant="title" accessibilityRole="header">
          {t.heading}
        </AppText>
        <SegmentedControl
          options={KIND_OPTIONS}
          value={kind}
          onChange={setKind}
          accessibilityLabel={t.kindSelectorLabel}
        />
      </View>
      {/* Each form keeps its own state; switching tabs resets the other form on purpose. */}
      {kind === 'nequi' ? <NequiForm onLinked={onLinked} /> : <CardForm onLinked={onLinked} />}
    </Screen>
  );
}
