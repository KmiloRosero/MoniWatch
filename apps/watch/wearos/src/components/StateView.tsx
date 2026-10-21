import { View } from 'react-native';
import { spacing } from '@/theme/tokens';
import { Chip } from './Chip';
import { Spinner } from './Spinner';
import { WatchScreen } from './WatchScreen';
import { WatchText } from './WatchText';

interface StateViewProps {
  title: string;
  description?: string;
  loading?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}

/** Shared loading / empty / error layout, centered for a glance. */
export function StateView({ title, description, loading = false, actionLabel, onAction }: StateViewProps) {
  return (
    <WatchScreen centered>
      {loading ? <Spinner accessibilityLabel={title} /> : null}
      <WatchText variant="title" center accessibilityRole="header">
        {title}
      </WatchText>
      {description ? (
        <WatchText tone="secondary" center>
          {description}
        </WatchText>
      ) : null}
      {actionLabel && onAction ? (
        <View style={{ alignSelf: 'stretch', marginTop: spacing.md }}>
          <Chip label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </WatchScreen>
  );
}
