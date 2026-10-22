import { apiRequest } from './http-client';
import type { Merchant, OwnedMerchant, RegisterMerchantRequest, WompiCheckout } from './types';

export const merchantsApi = {
  /** By part of the name or by the exact merchant code. */
  search(term: string) {
    const query = term ? `?search=${encodeURIComponent(term)}` : '';
    return apiRequest<Merchant[]>(`/merchants${query}`);
  },

  saved() {
    return apiRequest<Merchant[]>('/merchants/saved');
  },

  save(merchantId: string) {
    return apiRequest<Merchant>('/merchants/saved', { method: 'POST', body: { merchantId } });
  },

  unsave(merchantId: string) {
    return apiRequest<void>(`/merchants/saved/${encodeURIComponent(merchantId)}`, { method: 'DELETE' });
  },

  /** Public key and Wompi terms of this merchant, to tokenize a card for it. */
  wompiCheckout(merchantId: string) {
    return apiRequest<WompiCheckout>(`/merchants/${encodeURIComponent(merchantId)}/checkout/wompi`);
  },

  mine() {
    return apiRequest<OwnedMerchant[]>('/merchants/mine');
  },

  register(body: RegisterMerchantRequest) {
    return apiRequest<OwnedMerchant>('/merchants', { method: 'POST', body });
  },

  deactivate(merchantId: string) {
    return apiRequest<void>(`/merchants/${encodeURIComponent(merchantId)}`, { method: 'DELETE' });
  },
};
