import { useState } from 'react';
import { View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { InlineAlert } from '@/components/ui/Feedback';
import { TextField } from '@/components/ui/TextField';
import { ToggleRow } from '@/components/ui/ToggleRow';
import { env } from '@/config/env';
import { copy } from '@/i18n/es';
import { useTheme } from '@/theme/useTheme';
import { useLinkNequiAccount } from '../hooks/usePaymentMethods';
import { onlyDigits } from '../utils/card';
import { formatLocalMobile, isValidLocalMobile, LOCAL_MOBILE_LENGTH } from '../utils/phone';
import { linkErrorMessage } from '../utils/presentation';

const t = copy.addPaymentMethod;

export function NequiForm({ onLinked }: { onLinked: () => void }) {
  const { spacing } = useTheme();
  const linkNequi = useLinkNequiAccount();

  const [phoneDigits, setPhoneDigits] = useState('');
  const [alias, setAlias] = useState('');
  const [makeDefault, setMakeDefault] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const phoneError = submitted && !isValidLocalMobile(phoneDigits) ? t.errors.phoneInvalid : null;

  const submit = () => {
    setSubmitted(true);
    if (!isValidLocalMobile(phoneDigits) || linkNequi.isPending) return;
    linkNequi.mutate(
      { localPhoneNumber: phoneDigits, alias: alias.trim() || undefined, isDefault: makeDefault },
      { onSuccess: onLinked },
    );
  };

  return (
    <View style={{ gap: spacing.lg }}>
      <TextField
        label={t.nequi.phoneLabel}
        placeholder={t.nequi.phonePlaceholder}
        value={formatLocalMobile(phoneDigits)}
        onChangeText={(value) => setPhoneDigits(onlyDigits(value).slice(0, LOCAL_MOBILE_LENGTH))}
        error={phoneError}
        helper={t.nequi.helper}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        leading={<AppText tone="secondary">{`+${env.defaultCountryCode}`}</AppText>}
      />
      <TextField
        label={t.aliasLabel}
        placeholder={t.nequiAliasPlaceholder}
        value={alias}
        onChangeText={setAlias}
        maxLength={50}
        returnKeyType="done"
      />
      <ToggleRow label={t.defaultToggle} value={makeDefault} onValueChange={setMakeDefault} />
      {linkNequi.error ? <InlineAlert message={linkErrorMessage(linkNequi.error)} /> : null}
      <Button label={t.nequi.submit} onPress={submit} loading={linkNequi.isPending} />
    </View>
  );
}
