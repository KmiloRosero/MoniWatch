import * as Haptics from 'expo-haptics';

// Haptics are a bonus, never a requirement: a watch without a vibration motor must not crash a payment.
const ignore = () => undefined;

export const haptics = {
  /** Light tick for keypad presses. */
  tap() {
    Haptics.selectionAsync().catch(ignore);
  },
  success() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(ignore);
  },
  error() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(ignore);
  },
};
