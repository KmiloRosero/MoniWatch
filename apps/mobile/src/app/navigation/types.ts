export type RootStackParamList = {
  // Signed out
  Login: undefined;
  Register: undefined;
  // Signed in
  Dashboard: undefined;
  /** Opens on the card tab with this merchant selected. */
  AddPaymentMethod: { merchantId?: string } | undefined;
  AddMerchant: undefined;
  MyMerchant: undefined;
  Transactions: undefined;
  Settings: undefined;
  PaymentPin: undefined;
  Watches: undefined;
  WatchSettings: { deviceSessionId: string };
  PairWatch: undefined;
};
