export const queryKeys = {
  currentUser: ['auth', 'me'] as const,
  paymentMethods: ['payment-methods'] as const,
  devices: ['devices'] as const,
  transactions: ['transactions'] as const,
  wompiCheckout: ['payment-methods', 'providers', 'wompi'] as const,
};
