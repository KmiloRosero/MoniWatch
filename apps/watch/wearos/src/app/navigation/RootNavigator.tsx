import { View } from 'react-native';
import { DarkTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PairingScreen } from '@/features/pairing/PairingScreen';
import { AmountScreen } from '@/features/payments/screens/AmountScreen';
import { ConfirmScreen } from '@/features/payments/screens/ConfirmScreen';
import { MethodScreen } from '@/features/payments/screens/MethodScreen';
import { PaymentProcessingScreen } from '@/features/payments/screens/PaymentProcessingScreen';
import { PinScreen } from '@/features/payments/screens/PinScreen';
import { WatchHomeScreen } from '@/features/payments/screens/WatchHomeScreen';
import { useSessionStatus } from '@/features/session/WatchSessionProvider';
import { colors } from '@/theme/tokens';
import type { WatchStackParamList } from './types';

const Stack = createNativeStackNavigator<WatchStackParamList>();

const navigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.accent,
    background: colors.background,
    card: colors.background,
    text: colors.textPrimary,
    border: colors.separator,
  },
};

export function RootNavigator() {
  const status = useSessionStatus();

  // Restoring takes a few milliseconds: a black frame avoids a flash of the pairing screen.
  if (status === 'restoring') {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  if (status === 'unpaired') {
    return <PairingScreen />;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="Home" component={WatchHomeScreen} />
        <Stack.Screen name="Method" component={MethodScreen} />
        <Stack.Screen name="Amount" component={AmountScreen} />
        <Stack.Screen name="Confirm" component={ConfirmScreen} />
        <Stack.Screen name="Pin" component={PinScreen} />
        <Stack.Screen name="Processing" component={PaymentProcessingScreen} options={{ gestureEnabled: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
