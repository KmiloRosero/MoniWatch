import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold, useFonts } from '@expo-google-fonts/space-grotesk';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { focusManager, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { warmUpBackend } from '@/services/api/http-client';
import { RootNavigator } from './navigation/RootNavigator';
import { createQueryClient } from './query-client';

// Keep the native splash until the brand font is ready: no flash of fallback type.
void SplashScreen.preventAutoHideAsync();

export function App() {
  const [queryClient] = useState(createQueryClient);
  const [fontsLoaded, fontError] = useFonts({ SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold });
  const ready = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  useEffect(() => {
    warmUpBackend();
  }, []);

  // Refetch stale queries when the app returns to the foreground.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      focusManager.setFocused(state === 'active');
    });
    return () => subscription.remove();
  }, []);

  // A missing font must never block payments: on error we continue with system type.
  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="auto" />
          <RootNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
