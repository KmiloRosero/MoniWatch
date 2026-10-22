import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { DarkTheme, DefaultTheme, NavigationContainer, type Theme as NavigationTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '@/features/auth/AuthProvider';
import { LoginScreen } from '@/features/auth/screens/LoginScreen';
import { RegisterScreen } from '@/features/auth/screens/RegisterScreen';
import { PairWatchScreen } from '@/features/devices/screens/PairWatchScreen';
import { AddMerchantScreen } from '@/features/merchants/screens/AddMerchantScreen';
import { MyMerchantScreen } from '@/features/merchants/screens/MyMerchantScreen';
import { WatchesScreen } from '@/features/devices/screens/WatchesScreen';
import { WatchSettingsScreen } from '@/features/devices/screens/WatchSettingsScreen';
import { AddPaymentMethodScreen } from '@/features/payment-methods/screens/AddPaymentMethodScreen';
import { DashboardScreen } from '@/features/payment-methods/screens/DashboardScreen';
import { PaymentPinScreen } from '@/features/settings/screens/PaymentPinScreen';
import { SettingsScreen } from '@/features/settings/screens/SettingsScreen';
import { TransactionsScreen } from '@/features/transactions/screens/TransactionsScreen';
import { copy } from '@/i18n/es';
import { useTheme } from '@/theme/useTheme';
import { darkTheme } from '@/theme/tokens';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const theme = useTheme();
  const { status } = useAuth();
  const { colors } = theme;

  const baseTheme = theme === darkTheme ? DarkTheme : DefaultTheme;
  const navigationTheme: NavigationTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: colors.accent,
      background: colors.background,
      card: colors.background,
      text: colors.textPrimary,
      border: colors.border,
    },
  };

  if (status === 'restoring') {
    return (
      <View style={[styles.splash, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.textSecondary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          headerTintColor: colors.textPrimary,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {status === 'signedIn' ? (
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />
            <Stack.Screen name="AddPaymentMethod" component={AddPaymentMethodScreen} options={{ title: copy.addPaymentMethod.title }} />
            <Stack.Screen name="AddMerchant" component={AddMerchantScreen} options={{ title: copy.addMerchant.title }} />
            <Stack.Screen name="MyMerchant" component={MyMerchantScreen} options={{ title: copy.myMerchant.title }} />
            <Stack.Screen name="Transactions" component={TransactionsScreen} options={{ title: copy.transactions.title }} />
            <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: copy.settings.title }} />
            <Stack.Screen name="PaymentPin" component={PaymentPinScreen} options={{ title: copy.paymentPin.title }} />
            <Stack.Screen name="Watches" component={WatchesScreen} options={{ title: copy.devices.title }} />
            <Stack.Screen name="WatchSettings" component={WatchSettingsScreen} options={{ title: copy.deviceSettings.title }} />
            <Stack.Screen name="PairWatch" component={PairWatchScreen} options={{ title: copy.pairWatch.title }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
