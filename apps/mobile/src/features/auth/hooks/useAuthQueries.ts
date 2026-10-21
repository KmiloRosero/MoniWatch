import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/services/api/auth.api';
import { queryKeys } from '@/services/api/query-keys';
import { useAuth } from '../AuthProvider';

export function useLogin() {
  const { signIn } = useAuth();
  return useMutation({ mutationFn: authApi.login, onSuccess: signIn });
}

export function useRegister() {
  const { signIn } = useAuth();
  return useMutation({ mutationFn: authApi.register, onSuccess: signIn });
}

export function useCurrentUser() {
  return useQuery({ queryKey: queryKeys.currentUser, queryFn: authApi.getProfile });
}

export function useSetPaymentPin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.setPaymentPin,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.currentUser }),
  });
}
