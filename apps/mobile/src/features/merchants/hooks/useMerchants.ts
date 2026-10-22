import { useEffect, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { merchantsApi } from '@/services/api/merchants.api';
import { queryKeys } from '@/services/api/query-keys';

/** Waits for the user to stop typing before searching. */
const SEARCH_DEBOUNCE_MS = 300;

export function useSavedMerchants() {
  return useQuery({ queryKey: queryKeys.savedMerchants, queryFn: merchantsApi.saved });
}

export function useMerchantSearch(term: string) {
  const [debounced, setDebounced] = useState(term.trim());

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [term]);

  return useQuery({
    queryKey: queryKeys.merchantSearch(debounced),
    queryFn: () => merchantsApi.search(debounced),
    placeholderData: keepPreviousData,
  });
}

export function useSaveMerchant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: merchantsApi.save,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.savedMerchants }),
  });
}

export function useUnsaveMerchant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: merchantsApi.unsave,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.savedMerchants }),
  });
}

export function useOwnedMerchants() {
  return useQuery({ queryKey: queryKeys.ownedMerchants, queryFn: merchantsApi.mine });
}

export function useRegisterMerchant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: merchantsApi.register,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['merchants'] }),
  });
}

export function useDeactivateMerchant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: merchantsApi.deactivate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['merchants'] }),
  });
}
