export const queryKeys = {
  currentUser: ['auth', 'me'] as const,
  paymentMethods: ['payment-methods'] as const,
  devices: ['devices'] as const,
  transactions: ['transactions'] as const,
  savedMerchants: ['merchants', 'saved'] as const,
  ownedMerchants: ['merchants', 'mine'] as const,
  merchantSearch: (term: string) => ['merchants', 'search', term] as const,
  wompiCheckout: (merchantId: string) => ['merchants', merchantId, 'checkout', 'wompi'] as const,
};
