import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold, useFonts } from '@expo-google-fonts/space-grotesk';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WatchSessionProvider } from '@/features/session/WatchSessionProvider';
import { ApiError, SessionLostError } from '@/services/api/api-error';
import { RootNavigator } from './navigation/RootNavigator';

const MAX_QUERY_RETRIES = 2;
const STALE_TIME_MS = 30_000;

// Keep the black splash until the numerals font is ready: amounts never re-flow on screen.
void SplashScreen.preventAutoHideAsync();

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME_MS,
        // 4xx and a lost session will not fix themselves on retry.
        retry: (failureCount, error) =>
          !(error instanceof SessionLostError) &&
          !(error instanceof ApiError && error.status < 500) &&
          failureCount < MAX_QUERY_RETRIES,
      },
      mutations: { retry: false },
    },
  });
}

export function App() {
  const [queryClient] = useState(createQueryClient);
  const [fontsLoaded, fontError] = useFonts({ SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold });
  const ready = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  // Raising the wrist brings the app to the foreground: refresh payment methods then.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      focusManager.setFocused(state === 'active');
    });
    return () => subscription.remove();
  }, []);

  // A missing font must never block a payment: on error we continue with system type.
  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <WatchSessionProvider>
          <StatusBar hidden />
          <RootNavigator />
        </WatchSessionProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
