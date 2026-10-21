import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { StateView } from '@/components/StateView';
import { StatusMark } from '@/components/StatusMark';
import { WatchScreen } from '@/components/WatchScreen';
import { WatchText } from '@/components/WatchText';
import { useCountdown } from '@/hooks/useCountdown';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { copy } from '@/i18n/es';
import { colors, spacing } from '@/theme/tokens';
import { useDevicePairing } from './useDevicePairing';

const t = copy.pairing;

export function PairingScreen() {
  const { state, restart } = useDevicePairing();
  const countdown = useCountdown(state.phase === 'waiting' ? state.expiresAt : null);

  switch (state.phase) {
    case 'requesting':
      return <StateView title={t.preparing} loading />;

    case 'approved':
      return (
        <WatchScreen centered>
          <StatusMark kind="success" accessibilityLabel={t.linked} />
          <WatchText variant="title" center>
            {t.linked}
          </WatchText>
        </WatchScreen>
      );

    case 'expired':
      return (
        <StateView title={t.expiredTitle} description={t.expiredDescription} actionLabel={t.newCode} onAction={restart} />
      );

    case 'error':
      return (
        <StateView title={t.errorTitle} description={state.message} actionLabel={copy.common.retry} onAction={restart} />
      );

    case 'waiting': {
      // Two groups on two lines: easier to read at arm's length on a round screen.
      const half = Math.ceil(state.userCode.length / 2);
      return (
        <WatchScreen centered>
          <WatchText variant="caption" tone="secondary" center accessibilityRole="header">
            {t.title}
          </WatchText>
          <View accessible accessibilityLabel={t.codeLabel(state.userCode)} style={styles.code}>
            <WatchText variant="code" center>
              {state.userCode.slice(0, half)}
            </WatchText>
            <WatchText variant="code" center>
              {state.userCode.slice(half)}
            </WatchText>
          </View>
          <WatchText variant="caption" tone="secondary" center>
            {t.instruction}
          </WatchText>
          <View style={styles.status}>
            <WaitingDot />
            <WatchText variant="caption" tone="tertiary">
              {countdown.isOver ? t.waiting : t.expiresIn(countdown.label)}
            </WatchText>
          </View>
        </WatchScreen>
      );
    }
  }
}

const DOT_SIZE = 6;

/** Slow breathing dot: the watch is alive and listening, without a busy spinner. */
function WaitingDot() {
  const reduceMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.25, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reduceMotion]);

  return <Animated.View style={[styles.dot, { opacity }]} accessibilityLabel={t.waiting} />;
}

const styles = StyleSheet.create({
  code: {
    gap: spacing.xxs,
    paddingVertical: spacing.xs,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: colors.accent,
  },
});
