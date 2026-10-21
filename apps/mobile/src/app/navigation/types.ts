export type RootStackParamList = {
  // Signed out
  Login: undefined;
  Register: undefined;
  // Signed in
  Dashboard: undefined;
  AddPaymentMethod: undefined;
  Transactions: undefined;
  Settings: undefined;
  PaymentPin: undefined;
  Watches: undefined;
  WatchSettings: { deviceSessionId: string };
  PairWatch: undefined;
};
