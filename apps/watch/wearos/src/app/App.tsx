import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WatchSessionProvider } from '@/features/session/WatchSessionProvider';
import { ApiError, SessionLostError } from '@/services/api/api-error';
import { RootNavigator } from './navigation/RootNavigator';

const MAX_QUERY_RETRIES = 2;
const STALE_TIME_MS = 30_000;

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

  // Raising the wrist brings the app to the foreground: refresh payment methods then.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      focusManager.setFocused(state === 'active');
    });
    return () => subscription.remove();
  }, []);

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
